import { useState, Fragment } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { XMarkIcon, CalendarIcon, CreditCardIcon, ChatBubbleBottomCenterTextIcon } from "@heroicons/react/24/outline";
import type { MetodoPago } from "../services/pagos.service";
import { formatCurrency, type Moneda } from "../utils/currency";

interface OwnerPaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (p: { fechaPago: string, metodoPago: string, observaciones?: string }) => void;
    suggestedAmount?: number;
    moneda?: Moneda;
}

export default function OwnerPaymentModal({ isOpen, onClose, onSave, suggestedAmount, moneda = "ARS" }: OwnerPaymentModalProps) {
    const [fechaPago, setFechaPago] = useState(new Date().toISOString().split('T')[0]);
    const [metodoPago, setMetodoPago] = useState<MetodoPago>("EFECTIVO");
    const [observaciones, setObservaciones] = useState("");

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({
            fechaPago,
            metodoPago,
            observaciones: observaciones || undefined
        });
        // Reset
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
                                        <p className="text-gray-500 text-sm mt-1 font-medium italic">Registrar entrega de dinero al dueño</p>
                                    </div>
                                    <button
                                        onClick={onClose}
                                        className="grid h-11 w-11 shrink-0 place-items-center text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-all focus:outline-none"
                                    >
                                        <XMarkIcon className="w-6 h-6" />
                                    </button>
                                </div>

                                <form onSubmit={handleSubmit} className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-8 sm:pt-5 space-y-6">
                                    {/* Info Amount */}
                                    <div className="bg-orange-50/50 p-4 sm:p-6 rounded-2xl border border-orange-100/50">
                                        <label className="block text-[10px] font-black text-orange-600 uppercase tracking-widest mb-1">
                                            Monto a Entregar (Total Neto)
                                        </label>
	                                        <div className="text-2xl sm:text-3xl font-black text-orange-900">
	                                            {formatCurrency(suggestedAmount || 0, moneda)}
	                                        </div>
                                        <p className="text-[10px] text-orange-400 mt-2 font-medium uppercase">
                                            Este monto se registrará como un EGRESO en caja chica.
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-1 gap-4 min-[380px]:grid-cols-2">
                                        {/* Date Input */}
                                        <div>
                                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                                                Fecha de Pago
                                            </label>
                                            <div className="relative">
                                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                    <CalendarIcon className="w-4 h-4 text-gray-400" />
                                                </div>
                                                <input
                                                    type="date"
                                                    required
                                                    className="block min-h-11 w-full pl-9 pr-3 py-2.5 text-base font-bold text-gray-900 bg-gray-50 border border-transparent focus:border-indigo-500 focus:ring-0 rounded-xl transition-all sm:text-sm"
                                                    value={fechaPago}
                                                    onChange={(e) => setFechaPago(e.target.value)}
                                                />
                                            </div>
                                        </div>

                                        {/* Method Selection */}
                                        <div>
                                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                                                Método
                                            </label>
                                            <div className="relative">
                                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                    <CreditCardIcon className="w-4 h-4 text-gray-400" />
                                                </div>
                                                <select
                                                    className="block min-h-11 w-full pl-9 pr-3 py-2.5 text-base font-bold text-gray-900 bg-gray-50 border border-transparent focus:border-indigo-500 focus:ring-0 rounded-xl transition-all appearance-none sm:text-sm"
                                                    value={metodoPago}
                                                    onChange={(e) => setMetodoPago(e.target.value as MetodoPago)}
                                                >
                                                    <option value="EFECTIVO">Efectivo</option>
                                                    <option value="TRANSFERENCIA">Transferencia</option>
                                                    <option value="CHEQUE">Cheque</option>
                                                    <option value="OTROS">Otros</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Observations */}
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                                            Observaciones (Opcional)
                                        </label>
                                        <div className="relative">
                                            <div className="absolute top-3 left-3 pointer-events-none">
                                                <ChatBubbleBottomCenterTextIcon className="w-4 h-4 text-gray-400" />
                                            </div>
                                            <textarea
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
                                            className="w-full py-4 text-base font-black text-white bg-orange-600 rounded-2xl hover:bg-orange-700 transition-all shadow-xl shadow-orange-100 cursor-pointer flex items-center justify-center gap-2"
                                        >
                                            Confirmar Pago a Propietario
                                        </button>
                                        <button
                                            type="button"
                                            onClick={onClose}
                                            className="w-full py-3 text-sm font-bold text-gray-400 hover:text-gray-600 transition-colors"
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
