import { Fragment, useState } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { XMarkIcon, CalendarIcon, BanknotesIcon, InformationCircleIcon } from "@heroicons/react/24/outline";
import { contractsService, type Contract } from "../services/contracts.service";
import NumericInput from "./NumericInput";
import { formatDate } from "../utils/date";

export interface UpdateContractModalProps {
    isOpen: boolean;
    onClose: () => void;
    contract: Contract | null;
    onUpdate: () => void;
}

export default function UpdateContractModal({
    isOpen,
    onClose,
    contract,
    onUpdate,
}: UpdateContractModalProps) {
    const [montoNuevo, setMontoNuevo] = useState<number>(contract?.montoAlquiler || 0);
    const [fechaProximaNueva, setFechaProximaNueva] = useState<string>("");
    const [observaciones, setObservaciones] = useState<string>("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Resetear form cuando se abre para un contrato diferente
    useState(() => {
        if (contract) {
            setMontoNuevo(Number(contract.montoAlquiler));
            setFechaProximaNueva("");
            setObservaciones("");
            setError(null);
        }
    });

    if (!contract) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!montoNuevo || montoNuevo <= 0) {
            setError("El monto debe ser mayor a 0");
            return;
        }
        if (!fechaProximaNueva) {
            setError("La próxima fecha de actualización es obligatoria");
            return;
        }

        setIsSubmitting(true);
        setError(null);
        try {
            await contractsService.actualizarMonto(contract.id, {
                montoNuevo,
                fechaProximaNueva,
                observaciones
            });
            onUpdate();
            onClose();
        } catch (err: any) {
            setError(err.response?.data?.message || "Error al actualizar el contrato");
        } finally {
            setIsSubmitting(false);
        }
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
                                    <Dialog.Title as="h3" className="text-xl font-bold leading-6 text-gray-900 flex items-center gap-2">
                                        Actualizar Alquiler
                                    </Dialog.Title>
                                    <button onClick={onClose} className="text-gray-400 hover:text-gray-500 transition-colors">
                                        <XMarkIcon className="w-6 h-6" />
                                    </button>
                                </div>

                                <form onSubmit={handleSubmit} className="space-y-5">
                                    {/* Información Actual */}
                                    <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 flex flex-col gap-2">
                                        <div className="flex items-center gap-2 text-indigo-700 font-bold text-xs uppercase tracking-wider">
                                            <InformationCircleIcon className="w-4 h-4" />
                                            Valores Actuales
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <p className="text-[10px] text-indigo-500 font-bold uppercase">Monto Actual</p>
                                                <p className="text-sm font-black text-indigo-900">
                                                    ${Number(contract.montoAlquiler).toLocaleString('es-AR')}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] text-indigo-500 font-bold uppercase">Próxima Fecha</p>
                                                <p className="text-sm font-black text-indigo-900">
                                                    {formatDate(contract.fechaProximaActualizacion || "")}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Nuevo Monto */}
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1 flex items-center gap-1.5 font-display">
                                            <BanknotesIcon className="w-4 h-4 text-gray-400" />
                                            Nuevo Monto de Alquiler
                                        </label>
                                        <NumericInput
                                            value={montoNuevo}
                                            onChange={setMontoNuevo}
                                            placeholder="Ingrese el nuevo monto"
                                        />
                                    </div>

                                    {/* Próxima Fecha */}
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1 flex items-center gap-1.5 font-display">
                                            <CalendarIcon className="w-4 h-4 text-gray-400" />
                                            Nueva Próxima Fecha de Actualización
                                        </label>
                                        <input
                                            type="date"
                                            value={fechaProximaNueva}
                                            onChange={(e) => setFechaProximaNueva(e.target.value)}
                                            required
                                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none font-medium"
                                        />
                                    </div>

                                    {/* Observaciones */}
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1 flex items-center gap-1.5 font-display">
                                            <InformationCircleIcon className="w-4 h-4 text-gray-400" />
                                            Observaciones (opcional)
                                        </label>
                                        <textarea
                                            value={observaciones}
                                            onChange={(e) => setObservaciones(e.target.value)}
                                            rows={2}
                                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none font-medium text-sm"
                                            placeholder="Detalle de la actualización..."
                                        />
                                    </div>

                                    {error && (
                                        <p className="text-xs font-bold text-red-600 bg-red-50 p-3 rounded-lg border border-red-100">
                                            {error}
                                        </p>
                                    )}

                                    <div className="flex gap-3 pt-4">
                                        <button
                                            type="button"
                                            onClick={onClose}
                                            className="flex-1 px-4 py-2.5 text-sm font-bold text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-all font-display"
                                        >
                                            Cancelar
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={isSubmitting}
                                            className="flex-1 px-4 py-2.5 text-sm font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-md shadow-indigo-100 font-display"
                                        >
                                            {isSubmitting ? "Actualizando..." : "Confirmar"}
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
