import { useState, Fragment, useEffect } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { XMarkIcon, BanknotesIcon, CalendarIcon, CreditCardIcon, ChatBubbleBottomCenterTextIcon } from "@heroicons/react/24/outline";
import NumericInput from "./NumericInput";
import type { MetodoPago } from "../services/pagos.service";

interface PaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (p: { monto: number, fechaPago: string, metodoPago: MetodoPago, observaciones?: string }) => void;
    suggestedAmount?: number;
}

export default function PaymentModal({ isOpen, onClose, onSave, suggestedAmount }: PaymentModalProps) {
    const [monto, setMonto] = useState("");
    const [fechaPago, setFechaPago] = useState(new Date().toISOString().split('T')[0]);
    const [metodoPago, setMetodoPago] = useState<MetodoPago>("EFECTIVO");
    const [observaciones, setObservaciones] = useState("");

    useEffect(() => {
        if (isOpen && suggestedAmount) {
            setMonto(suggestedAmount.toString());
        }
    }, [isOpen, suggestedAmount]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({
            monto: Number(monto),
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
                                            Registrar Pago
                                        </Dialog.Title>
                                        <p className="text-gray-500 text-sm mt-1 font-medium italic">Ingreso de dinero efectivo o transferencia</p>
                                    </div>
                                    <button
                                        onClick={onClose}
                                        className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-all focus:outline-none"
                                    >
                                        <XMarkIcon className="w-6 h-6" />
                                    </button>
                                </div>

                                <form onSubmit={handleSubmit} className="space-y-6">
                                    {/* Amount Input */}
                                    <div className="bg-indigo-50/50 p-6 rounded-2xl border border-indigo-100/50">
                                        <label className="block text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-2">
                                            Monto Entregado
                                        </label>
                                        <NumericInput
                                            required
                                            min="0.01"
                                            placeholder="0.00"
                                            className="block w-full pl-12 pr-4 py-4 text-2xl font-black text-indigo-900 bg-white border-2 border-transparent focus:border-indigo-500 focus:ring-0 rounded-2xl transition-all shadow-sm"
                                            value={monto}
                                            onChange={(val) => setMonto(val.toString())}
                                            icon={<BanknotesIcon className="w-6 h-6 text-indigo-400" />}
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        {/* Date Input */}
                                        <div>
                                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                                                Fecha
                                            </label>
                                            <div className="relative">
                                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                    <CalendarIcon className="w-4 h-4 text-gray-400" />
                                                </div>
                                                <input
                                                    type="date"
                                                    required
                                                    className="block w-full pl-9 pr-3 py-2.5 text-sm font-bold text-gray-900 bg-gray-50 border border-transparent focus:border-indigo-500 focus:ring-0 rounded-xl transition-all"
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
                                                    className="block w-full pl-9 pr-3 py-2.5 text-sm font-bold text-gray-900 bg-gray-50 border border-transparent focus:border-indigo-500 focus:ring-0 rounded-xl transition-all appearance-none"
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
