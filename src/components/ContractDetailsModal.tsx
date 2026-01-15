import { formatDate } from "../utils/date";
import { Fragment } from "react";
import { Dialog, Transition } from "@headlessui/react";
import {
    XMarkIcon,
    DocumentTextIcon,
    CalendarIcon,
    UserIcon,
    HomeIcon,
    PhoneIcon,
    TrashIcon,
} from "@heroicons/react/24/outline";
import { type Contract } from "../services/contracts.service";
import { getFileUrl } from "../services/api";
import WhatsAppLink from "./WhatsAppLink";

export interface ContractDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    contract: Contract | null;
    onDelete: (id: number) => void;
}

export default function ContractDetailsModal({
    isOpen,
    onClose,
    contract,
    onDelete,
}: ContractDetailsModalProps) {
    if (!contract) return null;

    const handleViewPdf = (path: string | null) => {
        if (path) {
            window.open(getFileUrl(path), "_blank");
        } else {
            alert("Este documento no tiene un archivo asociado.");
        }
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
                            <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                                <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4">
                                    <Dialog.Title
                                        as="h3"
                                        className="text-xl font-bold leading-6 text-gray-900"
                                    >
                                        Detalles del Contrato
                                    </Dialog.Title>
                                    <button
                                        onClick={onClose}
                                        className="text-gray-400 hover:text-gray-500 transition-colors focus:outline-none"
                                    >
                                        <XMarkIcon className="w-6 h-6" />
                                    </button>
                                </div>

                                <div className="space-y-6">
                                    {/* Inmueble */}
                                    <div className="flex gap-4">
                                        <div className="bg-indigo-50 p-3 rounded-xl h-fit">
                                            <HomeIcon className="w-6 h-6 text-indigo-600" />
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-1">
                                                Inmueble
                                            </h4>
                                            <p className="text-lg text-gray-700 font-medium">
                                                {contract.propiedad.direccion}
                                            </p>
                                            {(contract.propiedad.piso ||
                                                contract.propiedad.departamento) && (
                                                    <p className="text-sm text-gray-500">
                                                        {contract.propiedad.piso &&
                                                            `Piso ${contract.propiedad.piso}`}{" "}
                                                        {contract.propiedad.departamento &&
                                                            `Depto ${contract.propiedad.departamento}`}
                                                    </p>
                                                )}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {/* Propietario */}
                                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                            <div className="flex items-center gap-2 mb-3">
                                                <UserIcon className="w-5 h-5 text-indigo-600" />
                                                <h4 className="text-sm font-bold text-indigo-900 uppercase tracking-wide">
                                                    Propietario
                                                </h4>
                                            </div>
                                            <p className="text-base font-semibold text-gray-900">
                                                {contract.propietario.nombreCompleto}
                                            </p>
                                            <div className="mt-2 flex items-center gap-2 text-sm text-gray-600">
                                                <PhoneIcon className="w-4 h-4" />
                                                <WhatsAppLink phone={contract.propietario.telefono} />
                                            </div>
                                        </div>

                                        {/* Inquilino */}
                                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                            <div className="flex items-center gap-2 mb-3">
                                                <UserIcon className="w-5 h-5 text-indigo-600" />
                                                <h4 className="text-sm font-bold text-indigo-900 uppercase tracking-wide">
                                                    Inquilino
                                                </h4>
                                            </div>
                                            <p className="text-base font-semibold text-gray-900">
                                                {contract.inquilino.nombreCompleto}
                                            </p>
                                            <div className="mt-2 flex items-center gap-2 text-sm text-gray-600">
                                                <PhoneIcon className="w-4 h-4" />
                                                <WhatsAppLink phone={contract.inquilino.telefono} />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Fechas */}
                                    <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100">
                                        <div className="flex items-center gap-2 mb-4">
                                            <CalendarIcon className="w-5 h-5 text-indigo-600" />
                                            <h4 className="text-sm font-bold text-indigo-900 uppercase tracking-wide">
                                                Vigencia y Fechas
                                            </h4>
                                        </div>
                                        <div className="grid grid-cols-3 gap-4">
                                            <div>
                                                <p className="text-xs text-gray-500 mb-1">Inicio</p>
                                                <p className="text-sm font-bold text-gray-900">
                                                    {formatDate(contract.fechaInicio)}

                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-500 mb-1">Fin</p>
                                                <p className="text-sm font-bold text-gray-900">
                                                    {formatDate(contract.fechaFin)}

                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-500 mb-1">Actualización</p>
                                                <p className="text-sm font-bold text-indigo-600">
                                                    {formatDate(
                                                        contract.fechaProximaActualizacion || contract.fechaActualizacion
                                                    )}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Documentos */}
                                    <div className="space-y-3">
                                        <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wide">
                                            Documentación
                                        </h4>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <div className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg">
                                                <div className="flex items-center gap-2">
                                                    <DocumentTextIcon className="w-5 h-5 text-indigo-500" />
                                                    <span className="text-sm font-medium text-gray-700">Contrato Principal</span>
                                                </div>
                                                <button
                                                    onClick={() => handleViewPdf(contract.rutaPdf)}
                                                    className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors"
                                                >
                                                    VER PDF
                                                </button>
                                            </div>

                                            {contract.adjuntos?.map((adjunto) => (
                                                <div key={adjunto.id} className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg">
                                                    <div className="flex items-center gap-2">
                                                        <DocumentTextIcon className="w-5 h-5 text-gray-400" />
                                                        <span className="text-sm font-medium text-gray-700 truncate max-w-[120px]">
                                                            {adjunto.nombreArchivo || 'Adjunto'}
                                                        </span>
                                                    </div>
                                                    <button
                                                        onClick={() => handleViewPdf(adjunto.rutaArchivo)}
                                                        className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors"
                                                    >
                                                        VER PDF
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Observaciones */}
                                    {contract.observaciones && (
                                        <div>
                                            <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-2">
                                                Observaciones
                                            </h4>
                                            <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                                                <p className="text-sm text-gray-600 italic">
                                                    "{contract.observaciones}"
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="mt-8 flex justify-between items-center pt-6 border-t border-gray-100">
                                    <button
                                        onClick={() => onDelete(contract.id)}
                                        className="flex items-center gap-2 text-sm font-medium text-red-600 hover:text-red-800 transition-colors"
                                    >
                                        <TrashIcon className="w-5 h-5" />
                                        Mover a papelera
                                    </button>
                                    <button
                                        type="button"
                                        className="px-6 py-2 text-sm font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-all shadow-md shadow-indigo-100"
                                        onClick={onClose}
                                    >
                                        Cerrar
                                    </button>
                                </div>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
}

