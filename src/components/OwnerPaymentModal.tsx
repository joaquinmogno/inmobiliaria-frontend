import { useState, Fragment } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { XMarkIcon, CalendarIcon, CreditCardIcon, ChatBubbleBottomCenterTextIcon } from "@heroicons/react/24/outline";
import { PAYMENT_METHOD_OPTIONS, type MetodoPago } from "../services/pagos.service";
import { formatCurrency, type Moneda } from "../utils/currency";
import AppSelect from "./AppSelect";
import { todayDateInput } from "../utils/date";
import { isValidBankAlias, isValidCbu, maskCbu, normalizeBankAlias } from "../utils/bankDetails";

interface OwnerPaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (p: { monto: number, fechaPago: string, metodoPago: MetodoPago, propietarioId: number, comprobante?: string, observaciones?: string, motivoAdelanto?: string }) => void;
    suggestedAmount?: number;
    moneda?: Moneda;
    owner: {
        id: number;
        nombreCompleto: string;
        cbu?: string | null;
        aliasBancario?: string | null;
        titularCuentaBancaria?: string | null;
        titularidadBancariaVerificada?: boolean;
    } | null;
    disponibleCobrado?: number;
    capitalPropioExpuesto?: number;
    puedeAdelantar?: boolean;
}

export default function OwnerPaymentModal({ isOpen, onClose, onSave, suggestedAmount, moneda = "ARS", owner, disponibleCobrado = 0, capitalPropioExpuesto = 0, puedeAdelantar = false }: OwnerPaymentModalProps) {
    const [fechaPago, setFechaPago] = useState(() => todayDateInput());
    const [metodoPago, setMetodoPago] = useState<MetodoPago>("EFECTIVO");
    const [comprobante, setComprobante] = useState("");
    const [observaciones, setObservaciones] = useState("");
    const [monto, setMonto] = useState<number | "">(suggestedAmount || "");
    const [motivoAdelanto, setMotivoAdelanto] = useState("");
    const validCbu = isValidCbu(owner?.cbu);
    const validAlias = isValidBankAlias(owner?.aliasBancario);
    const bankDestinationReady = (validCbu || validAlias) && Boolean(owner?.titularidadBancariaVerificada);
    const accountHolder = owner?.titularCuentaBancaria?.trim() || owner?.nombreCompleto;
    const adelantoEstimado = Math.max(0, Number(monto || 0) - disponibleCobrado);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!owner) return;
        onSave({
            monto: Number(monto),
            fechaPago,
            metodoPago,
            propietarioId: owner.id,
            comprobante: comprobante.trim() || undefined,
            observaciones: observaciones || undefined,
            motivoAdelanto: adelantoEstimado > 0 ? motivoAdelanto.trim() : undefined
        });
        // Reset
        setObservaciones("");
        setComprobante("");
    };

    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-[60]" onClose={onClose}>
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" />
                </Transition.Child>

                <div className="fixed inset-0 overflow-hidden">
                    <div className="flex min-h-full items-end justify-center text-center sm:items-center sm:p-4">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 scale-95"
                            enterTo="opacity-100 scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 scale-100"
                            leaveTo="opacity-0 scale-95"
                        >
                            <Dialog.Panel className="flex max-h-[100dvh] w-full max-w-md transform flex-col overflow-hidden rounded-t-3xl bg-white text-left align-middle shadow-2xl transition-all border border-gray-100 sm:max-h-[90dvh] sm:rounded-3xl">
                                <div className="flex shrink-0 justify-between items-start gap-3 border-b border-gray-100 p-5 sm:p-8 sm:pb-5">
                                    <div>
                                        <Dialog.Title as="h3" className="text-xl sm:text-2xl font-black leading-6 text-gray-900 tracking-tight">
                                            Pagar a Propietario
                                        </Dialog.Title>
                                        <p className="text-content-muted text-sm mt-1 font-medium italic">Registrar entrega de dinero al dueño</p>
                                    </div>
                                    <button
                                        onClick={onClose}
                                        className="grid h-11 w-11 shrink-0 place-items-center text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-all focus:outline-none"
                                    >
                                        <XMarkIcon className="w-6 h-6" />
                                    </button>
                                </div>

                                <form onSubmit={handleSubmit} className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-8 sm:pt-5 space-y-6">
                                    {/* Info Amount */}
                                    <div className="bg-orange-50/50 p-4 sm:p-6 rounded-2xl border border-orange-100/50">
                                        <p className="mb-3 text-sm font-bold text-orange-950">
                                            Destinatario: <span className="font-black">{owner?.nombreCompleto || 'Falta definir un propietario principal'}</span>
                                        </p>
                                        <p className="block text-xs font-black text-status-warning uppercase tracking-widest mb-1">
                                            Saldo pendiente del propietario
                                        </p>
	                                        <div className="text-2xl sm:text-3xl font-black text-orange-900">
	                                            {formatCurrency(suggestedAmount || 0, moneda)}
	                                        </div>
                                        <p className="text-xs text-status-warning mt-2 font-semibold uppercase">Podés entregar un importe parcial. Si el inquilino aún debe, se registrará como adelanto autorizado.</p>
                                        <p className="mt-2 text-xs font-semibold text-orange-900">Fondos de cobros disponibles: {formatCurrency(disponibleCobrado, moneda)} · Capital propio actualmente expuesto: {formatCurrency(capitalPropioExpuesto, moneda)}.</p>
                                    </div>

                                    <div>
                                        <label htmlFor="owner-payment-amount" className="block text-xs font-black text-gray-600 uppercase tracking-widest mb-2">Importe a entregar</label>
                                        <input id="owner-payment-amount" type="number" min="0.01" max={suggestedAmount} step="0.01" required value={monto} onChange={e => setMonto(e.target.value === '' ? '' : Number(e.target.value))} className="block min-h-11 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 font-bold text-gray-900 focus:border-indigo-500 focus:ring-0" />
                                    </div>

                                    {adelantoEstimado > 0 && <section className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
                                        <p className="font-black text-rose-950">Esta entrega incluye {formatCurrency(adelantoEstimado, moneda)} de fondos propios.</p>
                                        <p className="mt-1 text-sm text-rose-900">Se registrará como adelanto a recuperar del inquilino. Requiere autorización y motivo.</p>
                                        {!puedeAdelantar && <p className="mt-2 text-sm font-bold text-red-800">Tu usuario no tiene permiso para adelantar fondos propios.</p>}
                                        <label htmlFor="owner-advance-reason" className="mt-3 block text-xs font-black uppercase tracking-wide text-rose-900">Motivo del adelanto</label>
                                        <textarea id="owner-advance-reason" rows={2} required minLength={5} value={motivoAdelanto} onChange={event => setMotivoAdelanto(event.target.value)} className="mt-2 block w-full rounded-xl border border-rose-200 bg-white p-3 text-sm font-medium text-gray-900" placeholder="Ej.: inquilino de confianza, cobrará el viernes" />
                                    </section>}

                                    <div className="grid grid-cols-1 gap-4 min-[380px]:grid-cols-2">
                                        {/* Date Input */}
                                        <div>
                                            <label htmlFor="owner-payment-date" className="block text-xs font-black text-gray-600 uppercase tracking-widest mb-2">
                                                Fecha de Pago
                                            </label>
                                            <div className="relative">
                                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                    <CalendarIcon className="w-4 h-4 text-gray-600" />
                                                </div>
                                                <input
                                                    id="owner-payment-date"
                                                    type="date"
                                                    required
                                                    max={todayDateInput()}
                                                    className="block min-h-11 w-full pl-9 pr-3 py-2.5 text-base font-bold text-gray-900 bg-gray-50 border border-transparent focus:border-indigo-500 focus:ring-0 rounded-xl transition-all sm:text-sm"
                                                    value={fechaPago}
                                                    onChange={(e) => setFechaPago(e.target.value)}
                                                />
                                            </div>
                                        </div>

                                        {/* Method Selection */}
                                        <div>
                                            <label htmlFor="owner-payment-method" className="block text-xs font-black text-gray-600 uppercase tracking-widest mb-2">
                                                Método
                                            </label>
                                            <AppSelect
                                                id="owner-payment-method"
                                                ariaLabel="Método de pago"
                                                value={metodoPago}
                                                onChange={(value) => setMetodoPago(value as MetodoPago)}
                                                icon={<CreditCardIcon className="h-4 w-4" />}
                                                options={PAYMENT_METHOD_OPTIONS}
                                                buttonClassName="border-transparent bg-gray-50 font-bold"
                                            />
                                        </div>
                                    </div>

                                    {metodoPago === 'TRANSFERENCIA' && (
                                        <section className={`rounded-xl border p-4 text-sm ${bankDestinationReady ? 'border-emerald-200 bg-emerald-50 text-emerald-950' : 'border-red-200 bg-red-50 text-red-950'}`} aria-live="polite">
                                            {bankDestinationReady ? <>
                                                <p className="font-bold">Destino bancario verificado</p>
                                                <p className="mt-1">{validCbu ? `CBU ${maskCbu(owner?.cbu)}` : `Alias ${normalizeBankAlias(owner?.aliasBancario)}`} · Titular: <strong>{accountHolder}</strong>.</p>
                                                {validCbu && validAlias && <p className="mt-1 text-xs">También consta el alias {normalizeBankAlias(owner?.aliasBancario)}.</p>}
                                            </> : <>
                                                <p className="font-bold">Transferencia bloqueada por seguridad</p>
                                                <p className="mt-1">{!validCbu && !validAlias
                                                    ? 'El propietario no tiene un CBU o alias válido cargado.'
                                                    : 'Falta confirmar la titularidad de la cuenta en la ficha del propietario.'}</p>
                                                <p className="mt-1 text-xs">Podés elegir efectivo/cheque o actualizar y verificar los datos bancarios antes de continuar.</p>
                                            </>}
                                        </section>
                                    )}

                                    <div>
                                        <label htmlFor="owner-payment-receipt" className="block text-xs font-black text-gray-600 uppercase tracking-widest mb-2">
                                            Comprobante o referencia (opcional)
                                        </label>
                                        <input
                                            id="owner-payment-receipt"
                                            type="text"
                                            maxLength={120}
                                            placeholder="Ej: TRX-849201, cheque 000123"
                                            className="block w-full px-4 py-3 text-base font-medium text-gray-900 bg-gray-50 border border-transparent focus:border-indigo-500 focus:ring-0 rounded-xl transition-all sm:text-sm"
                                            value={comprobante}
                                            onChange={(e) => setComprobante(e.target.value)}
                                        />
                                    </div>

                                    {/* Observations */}
                                    <div>
                                        <label htmlFor="owner-payment-observations" className="block text-xs font-black text-gray-600 uppercase tracking-widest mb-2">
                                            Observaciones (opcional)
                                        </label>
                                        <div className="relative">
                                            <div className="absolute top-3 left-3 pointer-events-none">
                                                <ChatBubbleBottomCenterTextIcon className="w-4 h-4 text-gray-600" />
                                            </div>
                                            <textarea
                                                id="owner-payment-observations"
                                                rows={2}
                                                placeholder="Ej: Número de transferencia, nota adicional..."
                                                className="block w-full pl-9 pr-4 py-3 text-base font-medium text-gray-900 bg-gray-50 border border-transparent focus:border-indigo-500 focus:ring-0 rounded-xl transition-all sm:text-sm"
                                                value={observaciones}
                                                onChange={(e) => setObservaciones(e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    <div className="sticky bottom-0 -mx-5 -mb-5 flex flex-col gap-3 border-t border-gray-100 bg-white p-5 sm:-mx-8 sm:-mb-8 sm:p-6">
                                        <button
                                            type="submit"
                                            disabled={!owner || !monto || Number(monto) <= 0 || (adelantoEstimado > 0 && (!puedeAdelantar || motivoAdelanto.trim().length < 5)) || (metodoPago === 'TRANSFERENCIA' && !bankDestinationReady)}
                                            className="w-full py-4 text-base font-black text-white bg-orange-600 rounded-2xl hover:bg-orange-700 disabled:cursor-not-allowed disabled:bg-gray-400 transition-all shadow-xl shadow-orange-100 cursor-pointer flex items-center justify-center gap-2"
                                        >
                                            Confirmar Pago a Propietario
                                        </button>
                                        <button
                                            type="button"
                                            onClick={onClose}
                                            className="w-full py-3 text-sm font-bold text-gray-600 hover:text-gray-600 transition-colors"
                                        >
                                            Cancelar
                                        </button>
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
