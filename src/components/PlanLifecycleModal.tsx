import { Fragment, useEffect, useState } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { planesCuotasService, type InstallmentPlanSummary, type PlanCuotas } from "../services/planes-cuotas.service";
import NumericInput from "./NumericInput";
import FormError, { useFormError } from "./FormError";
import InstallmentPreviewPanel, { useInstallmentPreview } from "../features/contracts/InstallmentPreview";
import { formatCurrencyWithCents } from "../utils/currency";
import { currentMonthInput } from "../utils/date";

export type PlanLifecycleAction = "CANCELAR" | "CONDONAR" | "REPROGRAMAR";

interface PlanLifecycleModalProps {
    isOpen: boolean;
    plan: PlanCuotas | null;
    action: PlanLifecycleAction | null;
    onClose: () => void;
    onConfirm: (data: {
        motivo: string;
        montoTotal?: number;
        montoPendienteEsperado?: number;
        cantidadCuotas?: number;
        fechaPrimeraCuota?: string;
    }) => Promise<void>;
}

const actionCopy: Record<PlanLifecycleAction, { title: string; button: string; description: string; buttonClass: string }> = {
    CANCELAR: {
        title: "Cancelar plan de cuotas",
        button: "Cancelar plan",
        description: "Las cuotas aún pendientes quedarán canceladas. Las ya cobradas se conservan sin cambios.",
        buttonClass: "bg-orange-600 hover:bg-orange-700"
    },
    CONDONAR: {
        title: "Condonar cuotas pendientes",
        button: "Condonar cuotas",
        description: "Registra que las cuotas pendientes no se exigirán. Las cuotas cobradas conservan su historial.",
        buttonClass: "bg-emerald-600 hover:bg-emerald-700"
    },
    REPROGRAMAR: {
        title: "Reprogramar plan de cuotas",
        button: "Crear plan reprogramado",
        description: "El plan actual quedará cerrado como reprogramado y se creará un nuevo plan vinculado para las cuotas futuras.",
        buttonClass: "bg-indigo-600 hover:bg-indigo-700"
    }
};

export default function PlanLifecycleModal({ isOpen, plan, action, onClose, onConfirm }: PlanLifecycleModalProps) {
    const [motivo, setMotivo] = useState("");
    const [montoTotal, setMontoTotal] = useState("");
    const [cantidadCuotas, setCantidadCuotas] = useState("1");
    const [fechaPrimeraCuota, setFechaPrimeraCuota] = useState(currentMonthInput());
    const [isSubmitting, setIsSubmitting] = useState(false);

    const { error: formError, setError: setFormError, reportError, formRef } = useFormError();
    const [summary, setSummary] = useState<InstallmentPlanSummary | null>(null);
    const [loading, setLoading] = useState(false);
    const [currentState, setCurrentState] = useState<PlanCuotas['estado'] | null>(null);
    const quote = useInstallmentPreview(isOpen && action === 'REPROGRAMAR' && !loading, {
        contratoId: plan?.contratoId || 0, planId: plan?.id,
        montoTotal: Number(montoTotal), cantidadCuotas: Number(cantidadCuotas), fechaPrimeraCuota: `${fechaPrimeraCuota}-01`
    });

    useEffect(() => {
        if (!isOpen || !plan) return;
        let active = true;
        setMotivo(''); setFormError(''); setSummary(null); setCurrentState(null);
        setMontoTotal(''); setCantidadCuotas('1'); setFechaPrimeraCuota(currentMonthInput());
        setLoading(true);
        planesCuotasService.getByContrato(plan.contratoId).then(plans => {
            if (!active) return;
            const current = plans.find(item => item.id === plan.id);
            if (!current?.resumen) throw new Error('No se pudo recuperar el saldo actual del plan. Cerrá y volvé a abrir esta ventana.');
            setSummary(current.resumen); setCurrentState(current.estado);
            setMontoTotal(current.resumen.montoPendienteDisponible);
            setCantidadCuotas(String(current.resumen.cantidadPendienteDisponible || 1));
        }).catch(error => { if (active) reportError(error, 'No se pudo recuperar el plan. Cerrá y volvé a abrir esta ventana.'); })
          .finally(() => { if (active) setLoading(false); });
        return () => { active = false; };
    }, [isOpen, plan?.id, action]);

    if (!plan || !action) return null;
    const copy = actionCopy[action];
    const effectiveSummary = quote.preview?.resumen || summary;
    const activeState = action === 'REPROGRAMAR' ? quote.preview?.estadoPlan || currentState : currentState;
    const balanceChanged = summary && quote.preview?.resumen && summary.montoPendienteDisponible !== quote.preview.resumen.montoPendienteDisponible;
    const blocked = balanceChanged || !effectiveSummary || activeState !== 'VIGENTE' || effectiveSummary.cantidadPendienteVinculada > 0 || effectiveSummary.cantidadPendienteDisponible === 0;
    const totalChanged = effectiveSummary && Number(montoTotal) !== Number(effectiveSummary.montoPendienteDisponible);

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        if (isSubmitting || loading || blocked || motivo.trim().length < 5 || (action === 'REPROGRAMAR' && !quote.preview)) return;
        setFormError('');
        if (action === "REPROGRAMAR" && (!Number(montoTotal) || !Number(cantidadCuotas) || !fechaPrimeraCuota)) return;
        setIsSubmitting(true);
        try {
            await onConfirm({
                motivo: motivo.trim(),
                ...(action === "REPROGRAMAR" ? {
                    montoTotal: Number(montoTotal),
                    montoPendienteEsperado: Number(effectiveSummary!.montoPendienteDisponible),
                    cantidadCuotas: Number(cantidadCuotas),
                    fechaPrimeraCuota: `${fechaPrimeraCuota}-01`
                } : {})
            });
        } catch (error) {
            reportError(error, 'No se pudo actualizar el plan');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-[70]" onClose={isSubmitting ? () => undefined : onClose}>
                <Transition.Child as={Fragment} enter="ui-modal-enter-transition" enterFrom="opacity-0" enterTo="opacity-100" leave="ui-modal-leave-transition" leaveFrom="opacity-100" leaveTo="opacity-0">
                    <div className="fixed inset-0 bg-black/35 backdrop-blur-sm" />
                </Transition.Child>
                <div className="fixed inset-0 overflow-hidden">
                    <div className="flex h-full min-h-0 items-center justify-center p-4">
                        <Transition.Child as={Fragment} enter="ui-modal-enter-transition" enterFrom="opacity-0 scale-[0.98]" enterTo="opacity-100 scale-100" leave="ui-modal-leave-transition" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-[0.98]">
                            <Dialog.Panel className="flex max-h-full w-full max-w-lg flex-col rounded-2xl bg-white p-6 shadow-xl">
                                <div className="mb-4 flex shrink-0 items-start justify-between gap-4 border-b border-gray-100 pb-4">
                                    <div>
                                        <Dialog.Title className="text-lg font-bold text-gray-900">{copy.title}</Dialog.Title>
                                        <p className="mt-1 text-sm font-medium text-gray-700">{plan.concepto} · Plan #{plan.id}</p>
                                    </div>
                                    <button type="button" onClick={onClose} disabled={isSubmitting} className="text-gray-500 transition-colors hover:text-gray-800 disabled:opacity-50" aria-label="Cerrar">
                                        <XMarkIcon className="h-6 w-6" />
                                    </button>
                                </div>

                                <form ref={formRef} onSubmit={handleSubmit} className="flex min-h-0 flex-col">
                                    <div className="modal-scroll -mx-6 min-h-0 space-y-4 px-6 pb-4">
                                    <FormError message={formError} />
                                    <p className="rounded-xl border border-gray-100 bg-gray-50 p-3 text-xs leading-relaxed text-gray-700">{copy.description}</p>
                                    {balanceChanged && <p role="alert" className="text-sm text-amber-900">El pendiente cambió desde que abriste la ventana. Cerrá y volvé a abrir para revisar el nuevo saldo.</p>}
                                    {loading && <p role="status" className="text-sm text-slate-600">Consultando cuotas y saldos actuales…</p>}
                                    {effectiveSummary && <div className="rounded-xl border border-slate-200 p-3 text-sm tabular-nums" aria-label="Importes del plan">
                                        <p>Cuotas pagadas: <strong>{plan.moneda} {formatCurrencyWithCents(effectiveSummary.montoCuotasPagadas, plan.moneda)}</strong></p>
                                        <p>Pendiente disponible: <strong>{formatCurrencyWithCents(effectiveSummary.montoPendienteDisponible, plan.moneda)}</strong></p>
                                        {effectiveSummary.cantidadPendienteVinculada > 0 && <p className="mt-2 text-amber-900">Cuotas pendientes vinculadas a liquidaciones (importe original): {formatCurrencyWithCents(effectiveSummary.montoPendienteVinculado, plan.moneda)}. Eliminá el borrador correspondiente o regularizá el cobro antes de modificar el plan.</p>}
                                        {activeState !== 'VIGENTE' && <p className="mt-2 text-amber-900">El plan ya no está vigente.</p>}
                                        {effectiveSummary.cantidadPendienteDisponible === 0 && <p className="mt-2 text-amber-900">No hay cuotas pendientes disponibles.</p>}
                                        <p className="mt-2 text-xs text-slate-600">Las cuotas pagadas quedan intactas. Una cuota pendiente ya vinculada, incluso con cobros parciales, no se incluye en la reprogramación.</p>
                                    </div>}
                                    <div>
                                        <label htmlFor="plan-lifecycle-reason" className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-gray-700">Motivo</label>
                                        <textarea id="plan-lifecycle-reason" required minLength={5} maxLength={1000} value={motivo} onChange={event => setMotivo(event.target.value)} rows={3} placeholder="Explicá la decisión para conservar el historial" className="block w-full rounded-xl border border-gray-300 bg-gray-50/50 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500" />
                                    </div>

                                    {action === "REPROGRAMAR" && (
                                        <>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <label htmlFor="reprogram-total" className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-gray-700">Nuevo total ({plan.moneda})</label>
                                                    <NumericInput id="reprogram-total" min="0.01" required value={montoTotal} onChange={value => setMontoTotal(String(value))} className="block w-full rounded-xl border border-gray-300 bg-gray-50/50 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500" />
                                                </div>
                                                <div>
                                                    <label htmlFor="reprogram-count" className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-gray-700">Cantidad</label>
                                                    <input id="reprogram-count" type="number" min="1" max="120" required value={cantidadCuotas} onChange={event => setCantidadCuotas(event.target.value)} className="block w-full rounded-xl border border-gray-300 bg-gray-50/50 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500" />
                                                </div>
                                            </div>
                                            <div>
                                                <label htmlFor="reprogram-first-period" className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-gray-700">Primer período</label>
                                                <input id="reprogram-first-period" type="month" required value={fechaPrimeraCuota} onChange={event => setFechaPrimeraCuota(event.target.value)} className="block min-h-11 w-full rounded-xl border border-gray-300 bg-gray-50/50 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500" />
                                            </div>
                                            {totalChanged && !loading && Number(montoTotal) > 0 && <p role="status" className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">El nuevo total cambia de {formatCurrencyWithCents(effectiveSummary!.montoPendienteDisponible, plan.moneda)} a {formatCurrencyWithCents(montoTotal, plan.moneda)}. Explicá esa diferencia en el motivo; quedará registrada.</p>}
                                            <InstallmentPreviewPanel {...quote} />
                                        </>
                                    )}

                                    </div>
                                    <div className="flex shrink-0 flex-wrap justify-end gap-3 border-t border-gray-100 pt-4">
                                        <button type="button" onClick={onClose} disabled={isSubmitting} className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">Volver</button>
                                        <button type="submit" disabled={isSubmitting || loading || blocked || motivo.trim().length < 5 || (action === 'REPROGRAMAR' && !quote.preview)} className={`rounded-xl px-4 py-2 text-sm font-bold text-white shadow-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${copy.buttonClass}`}>{isSubmitting ? "Guardando..." : copy.button}</button>
                                    </div>
                                </form>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
}
