import { Fragment, useEffect, useState } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import type { PlanCuotas } from "../services/planes-cuotas.service";
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

    useEffect(() => {
        if (!isOpen || !plan) return;
        const pendingCount = plan.cuotas?.filter(cuota => cuota.estado === "PENDIENTE").length || 1;
        setMotivo("");
        setMontoTotal(String(plan.montoTotal));
        setCantidadCuotas(String(pendingCount));
        setFechaPrimeraCuota(currentMonthInput());
    }, [isOpen, plan?.id, action]);

    if (!plan || !action) return null;
    const copy = actionCopy[action];

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        if (motivo.trim().length < 5) return;
        if (action === "REPROGRAMAR" && (!Number(montoTotal) || !Number(cantidadCuotas) || !fechaPrimeraCuota)) return;
        setIsSubmitting(true);
        try {
            await onConfirm({
                motivo: motivo.trim(),
                ...(action === "REPROGRAMAR" ? {
                    montoTotal: Number(montoTotal),
                    cantidadCuotas: Number(cantidadCuotas),
                    fechaPrimeraCuota: `${fechaPrimeraCuota}-01`
                } : {})
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-[70]" onClose={isSubmitting ? () => undefined : onClose}>
                <Transition.Child as={Fragment} enter="ease-out duration-200" enterFrom="opacity-0" enterTo="opacity-100" leave="ease-in duration-150" leaveFrom="opacity-100" leaveTo="opacity-0">
                    <div className="fixed inset-0 bg-black/35 backdrop-blur-sm" />
                </Transition.Child>
                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4">
                        <Transition.Child as={Fragment} enter="ease-out duration-200" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100" leave="ease-in duration-150" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95">
                            <Dialog.Panel className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
                                <div className="mb-5 flex items-start justify-between gap-4 border-b border-gray-100 pb-4">
                                    <div>
                                        <Dialog.Title className="text-lg font-bold text-gray-900">{copy.title}</Dialog.Title>
                                        <p className="mt-1 text-sm font-medium text-gray-700">{plan.concepto} · Plan #{plan.id}</p>
                                    </div>
                                    <button type="button" onClick={onClose} disabled={isSubmitting} className="text-gray-500 transition-colors hover:text-gray-800 disabled:opacity-50" aria-label="Cerrar">
                                        <XMarkIcon className="h-6 w-6" />
                                    </button>
                                </div>

                                <form onSubmit={handleSubmit} className="space-y-4">
                                    <p className="rounded-xl border border-gray-100 bg-gray-50 p-3 text-xs leading-relaxed text-gray-700">{copy.description}</p>
                                    <div>
                                        <label htmlFor="plan-lifecycle-reason" className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-gray-700">Motivo</label>
                                        <textarea id="plan-lifecycle-reason" required minLength={5} maxLength={1000} value={motivo} onChange={event => setMotivo(event.target.value)} rows={3} placeholder="Explicá la decisión para conservar el historial" className="block w-full rounded-xl border border-gray-300 bg-gray-50/50 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500" />
                                    </div>

                                    {action === "REPROGRAMAR" && (
                                        <>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <label htmlFor="reprogram-total" className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-gray-700">Nuevo total</label>
                                                    <input id="reprogram-total" type="number" min="0.01" step="0.01" required value={montoTotal} onChange={event => setMontoTotal(event.target.value)} className="block w-full rounded-xl border border-gray-300 bg-gray-50/50 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500" />
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
                                        </>
                                    )}

                                    <div className="flex justify-end gap-3 border-t border-gray-100 pt-5">
                                        <button type="button" onClick={onClose} disabled={isSubmitting} className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">Volver</button>
                                        <button type="submit" disabled={isSubmitting || motivo.trim().length < 5} className={`rounded-xl px-4 py-2 text-sm font-bold text-white shadow-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${copy.buttonClass}`}>{isSubmitting ? "Guardando..." : copy.button}</button>
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
