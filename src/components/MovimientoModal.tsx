import { useState, Fragment } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { XMarkIcon, BanknotesIcon } from "@heroicons/react/24/outline";
import NumericInput from "./NumericInput";
import type { TipoMovimiento } from "../services/liquidaciones.service";

interface MovimientoModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (m: { tipo: TipoMovimiento, concepto: string, monto: number, observaciones?: string }) => void;
}

export default function MovimientoModal({ isOpen, onClose, onSave }: MovimientoModalProps) {
    const [tipo, setTipo] = useState<TipoMovimiento>("INGRESO");
    const [concepto, setConcepto] = useState("");
    const [monto, setMonto] = useState("");
    const [observaciones, setObservaciones] = useState("");

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({
            tipo,
            concepto,
            monto: Number(monto),
            observaciones: observaciones || undefined
        });
        // Reset
        setConcepto("");
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
                            <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                                <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4">
                                    <Dialog.Title as="h3" className="text-xl font-bold leading-6 text-gray-900">
                                        Agregar Movimiento
                                    </Dialog.Title>
                                    <button
                                        onClick={onClose}
                                        className="text-gray-400 hover:text-gray-500 transition-colors focus:outline-none"
                                    >
                                        <XMarkIcon className="w-6 h-6" />
                                    </button>
                                </div>

                                <form onSubmit={handleSubmit} className="space-y-6">
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 uppercase tracking-wide mb-3">
                                            Tipo de Movimiento
                                        </label>
                                        <div className="flex gap-4">
                                            <button
                                                type="button"
                                                onClick={() => setTipo("INGRESO")}
                                                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 transition-all ${tipo === "INGRESO"
                                                    ? "border-green-500 bg-green-50 text-green-700 shadow-sm"
                                                    : "border-gray-100 bg-gray-50 text-gray-500 hover:border-gray-200"
                                                    }`}
                                            >
                                                <div className={`w-3 h-3 rounded-full ${tipo === "INGRESO" ? "bg-green-500" : "bg-gray-300"}`} />
                                                <span className="font-bold">Ingreso</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setTipo("DESCUENTO")}
                                                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 transition-all ${tipo === "DESCUENTO"
                                                    ? "border-red-500 bg-red-50 text-red-700 shadow-sm"
                                                    : "border-gray-100 bg-gray-50 text-gray-500 hover:border-gray-200"
                                                    }`}
                                            >
                                                <div className={`w-3 h-3 rounded-full ${tipo === "DESCUENTO" ? "bg-red-500" : "bg-gray-300"}`} />
                                                <span className="font-bold">Descuento</span>
                                            </button>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 uppercase tracking-wide mb-1">
                                            Concepto
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            placeholder="Ej: Alquiler, Arreglo Cocina, Expensas..."
                                            className="block w-full px-4 py-2 text-gray-900 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all sm:text-sm bg-white"
                                            value={concepto}
                                            onChange={(e) => setConcepto(e.target.value)}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 uppercase tracking-wide mb-1">
                                            Monto
                                        </label>
                                        <NumericInput
                                            required
                                            min="0.01"
                                            placeholder="0.00"
                                            className="block w-full pr-4 py-2 text-gray-900 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all sm:text-sm bg-white font-semibold"
                                            value={monto}
                                            onChange={(val) => setMonto(val.toString())}
                                            icon={<BanknotesIcon className="w-5 h-5 text-gray-400" />}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 uppercase tracking-wide mb-1">
                                            Observaciones (Opcional)
                                        </label>
                                        <textarea
                                            rows={2}
                                            placeholder="Detalles adicionales..."
                                            className="block w-full px-4 py-2 text-gray-900 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all sm:text-sm bg-white"
                                            value={observaciones}
                                            onChange={(e) => setObservaciones(e.target.value)}
                                        />
                                    </div>

                                    <div className="mt-8 flex justify-end gap-3 pt-4 border-t border-gray-100">
                                        <button
                                            type="button"
                                            onClick={onClose}
                                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
                                        >
                                            Cancelar
                                        </button>
                                        <button
                                            type="submit"
                                            className="px-6 py-2 text-sm font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-all shadow-md shadow-indigo-100 cursor-pointer"
                                        >
                                            Guardar Movimiento
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
