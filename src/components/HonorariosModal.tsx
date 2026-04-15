import { useState, Fragment, useEffect } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import NumericInput from "./NumericInput";

interface HonorariosModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: { montoHonorarios: number, porcentajeHonorarios?: number }) => void;
    currentMonto: number;
    currentPorcentaje: number | null;
}

export default function HonorariosModal({ isOpen, onClose, onSave, currentMonto, currentPorcentaje }: HonorariosModalProps) {
    const [monto, setMonto] = useState<string>("");
    const [porcentaje, setPorcentaje] = useState<string>("");

    useEffect(() => {
        if (isOpen) {
            setMonto(currentMonto.toString());
            setPorcentaje(currentPorcentaje?.toString() || "");
        }
    }, [isOpen, currentMonto, currentPorcentaje]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({
            montoHonorarios: Number(monto),
            porcentajeHonorarios: porcentaje ? Number(porcentaje) : undefined
        });
    };

    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-50" onClose={onClose}>
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
                            <Dialog.Panel className="w-full max-w-sm transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                                <div className="flex justify-between items-center mb-6">
                                    <Dialog.Title as="h3" className="text-lg font-bold text-gray-900">
                                        Editar Honorarios
                                    </Dialog.Title>
                                    <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
                                        <XMarkIcon className="w-6 h-6" />
                                    </button>
                                </div>

                                <form onSubmit={handleSubmit} className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Porcentaje (%)</label>
                                        <NumericInput
                                            className="w-full rounded-lg border-gray-300 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                                            value={porcentaje}
                                            onChange={(val) => setPorcentaje(val.toString())}
                                            placeholder="Ej: 5"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Monto Fijo ($)</label>
                                        <NumericInput
                                            className="w-full rounded-lg border-gray-300 focus:ring-indigo-500 focus:border-indigo-500 text-sm font-bold"
                                            value={monto}
                                            onChange={(val) => setMonto(val.toString())}
                                            required
                                        />
                                    </div>
                                    <div className="flex justify-end gap-3 mt-8">
                                        <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-xl transition-all">
                                            Cancelar
                                        </button>
                                        <button type="submit" className="px-6 py-2 text-sm font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-all">
                                            Guardar
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
