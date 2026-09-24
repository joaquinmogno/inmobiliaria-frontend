import { useState, Fragment, useEffect } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { XMarkIcon, BanknotesIcon, CalendarIcon, CreditCardIcon, ChatBubbleBottomCenterTextIcon } from "@heroicons/react/24/outline";
import NumericInput from "./NumericInput";
import { PAYMENT_METHOD_OPTIONS, type MetodoPago } from "../services/pagos.service";
import { formatCurrency, type Moneda } from "../utils/currency";
import FormError, { useFormError } from "./FormError";
import AppSelect from "./AppSelect";
import { todayDateInput } from "../utils/date";

interface PaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (p: { monto: number, fechaPago: string, metodoPago: MetodoPago, observaciones?: string }) => void;
    suggestedAmount?: number;
    moneda?: Moneda;
    targetLabel?: string;
    otherDebtAmount?: number;
}

export default function PaymentModal({ isOpen, onClose, onSave, suggestedAmount, moneda = "ARS", targetLabel, otherDebtAmount = 0 }: PaymentModalProps) {
    const { error: formError, setError: setFormError, formRef } = useFormError();
    const [monto, setMonto] = useState("");
    const [fechaPago, setFechaPago] = useState(() => todayDateInput());
    const [metodoPago, setMetodoPago] = useState<MetodoPago>("EFECTIVO");
    const [observaciones, setObservaciones] = useState("");

    useEffect(() => {
        if (isOpen && suggestedAmount) {
            setMonto(suggestedAmount.toString());
        }
    }, [isOpen, suggestedAmount]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const amount = Number(monto);
        setFormError("");
        if (!Number.isFinite(amount) || amount <= 0) return setFormError("El monto debe ser mayor a cero.");
        if (suggestedAmount !== undefined && amount > suggestedAmount) return setFormError(`El monto no puede superar ${formatCurrency(suggestedAmount, moneda)}.`);
        onSave({
            monto: amount,
            fechaPago,
            metodoPago,
            observaciones: observaciones || undefined
        });
        // Reset
        setMonto("");
        setObservaciones("");
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

                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4 text-center">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 scale-95"
                            enterTo="opacity-100 scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 scale-100"
                            leaveTo="opacity-0 scale-95"
                        >
                            <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-3xl bg-white p-8 text-left align-middle shadow-2xl transition-all border border-gray-100">
                                <div className="flex justify-between items-center mb-8">
                                    <div>
                                        <Dialog.Title as="h3" className="text-2xl font-black leading-6 text-gray-900 tracking-tight">
                                            Registrar pago
                                        </Dialog.Title>
                                        <p className="text-content-muted text-sm mt-1 font-medium italic">Cobro del inquilino</p>
                                    </div>
                                    <button
                                        onClick={onClose}
                                        className="flex h-11 w-11 items-center justify-center text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-all focus:outline-none"
                                    >
                                        <XMarkIcon className="w-6 h-6" />
                                    </button>
                                </div>

                                <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
                                    <FormError message={formError} />
                                    {/* Amount Input */}
	                                    <div className="bg-indigo-50/50 p-6 rounded-2xl border border-indigo-100/50">
                                        {suggestedAmount !== undefined && (
                                            <p className="text-xs font-bold text-indigo-700 mb-3">
                                                Saldo sugerido: {formatCurrency(suggestedAmount, moneda)}
                                            </p>
                                        )}
	                                        {targetLabel && (
	                                            <div className="mb-4 rounded-xl border border-indigo-200 bg-white p-3 text-sm text-indigo-950">
	                                                <p className="font-bold">Este pago se aplicará únicamente a {targetLabel}.</p>
	                                                <p className="mt-1 text-xs text-indigo-700">No se imputará automáticamente a liquidaciones anteriores.</p>
	                                                {otherDebtAmount > 0 && (
	                                                    <p className="mt-2 text-xs font-semibold text-amber-800">
	                                                        El contrato además registra {formatCurrency(otherDebtAmount, moneda)} de deuda en otros períodos.
	                                                    </p>
	                                                )}
	                                            </div>
	                                        )}
	                                        <label htmlFor="tenant-payment-amount" className="block text-xs font-black text-indigo-600 uppercase tracking-widest mb-2">
                                            Monto Entregado
                                        </label>
                                        <NumericInput
                                            id="tenant-payment-amount"
                                            required
                                            min="0.01"
                                            max={suggestedAmount}
                                            placeholder="0.00"
                                            className="block w-full pl-12 pr-4 py-4 text-2xl font-black text-indigo-900 bg-white border-2 border-transparent focus:border-indigo-500 focus:ring-0 rounded-2xl transition-all shadow-sm"
                                            value={monto}
                                            onChange={(val) => setMonto(val.toString())}
                                            icon={<BanknotesIcon className="w-6 h-6 text-status-accent" />}
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        {/* Date Input */}
                                        <div>
                                            <label htmlFor="tenant-payment-date" className="block text-xs font-black text-gray-600 uppercase tracking-widest mb-2">
                                                Fecha
                                            </label>
                                            <div className="relative">
                                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                    <CalendarIcon className="w-4 h-4 text-gray-600" />
                                                </div>
                                                <input
                                                    id="tenant-payment-date"
                                                    type="date"
                                                    required
                                                    max={todayDateInput()}
                                                    className="block w-full pl-9 pr-3 py-2.5 text-sm font-bold text-gray-900 bg-gray-50 border border-transparent focus:border-indigo-500 focus:ring-0 rounded-xl transition-all"
                                                    value={fechaPago}
                                                    onChange={(e) => setFechaPago(e.target.value)}
                                                />
                                            </div>
                                        </div>

                                        {/* Method Selection */}
                                        <div>
                                            <label htmlFor="tenant-payment-method" className="block text-xs font-black text-gray-600 uppercase tracking-widest mb-2">
                                                Método
                                            </label>
                                            <AppSelect
                                                id="tenant-payment-method"
                                                ariaLabel="Método de pago"
                                                value={metodoPago}
                                                onChange={(value) => setMetodoPago(value as MetodoPago)}
                                                icon={<CreditCardIcon className="h-4 w-4" />}
                                                options={PAYMENT_METHOD_OPTIONS}
                                                buttonClassName="border-transparent bg-gray-50 font-bold"
                                            />
                                        </div>
                                    </div>

                                    {/* Observations */}
                                    <div>
                                        <label htmlFor="tenant-payment-observations" className="block text-xs font-black text-gray-600 uppercase tracking-widest mb-2">
                                            Observaciones (opcional)
                                        </label>
                                        <div className="relative">
                                            <div className="absolute top-3 left-3 pointer-events-none">
                                                <ChatBubbleBottomCenterTextIcon className="w-4 h-4 text-gray-600" />
                                            </div>
                                            <textarea
                                                id="tenant-payment-observations"
                                                rows={2}
                                                placeholder="Ej: Número de comprobante, quien entregó el dinero..."
                                                className="block w-full pl-9 pr-4 py-3 text-sm font-medium text-gray-900 bg-gray-50 border border-transparent focus:border-indigo-500 focus:ring-0 rounded-xl transition-all"
                                                value={observaciones}
                                                onChange={(e) => setObservaciones(e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    <div className="pt-6 flex flex-col gap-3">
                                        <button
                                            type="submit"
                                            className="w-full py-4 text-base font-black text-white bg-indigo-600 rounded-2xl hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 cursor-pointer flex items-center justify-center gap-2"
                                        >
                                            Confirmar Ingreso de Pago
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
