import { Fragment, useState } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { XMarkIcon, DocumentArrowUpIcon } from "@heroicons/react/24/outline";

interface NewContractModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: any) => void;
}

export default function NewContractModal({
    isOpen,
    onClose,
    onSave,
}: NewContractModalProps) {
    const [formData, setFormData] = useState({
        address: "",
        floor: "",
        unit: "",
        ownerName: "",
        ownerPhone: "",
        tenantName: "",
        tenantPhone: "",
        startDate: "",
        endDate: "",
        updateDate: "",
        file: null as File | null,
        observations: "",
        additionalFiles: [] as File[],
    });

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFormData((prev) => ({ ...prev, file: e.target.files![0] }));
        }
    };

    const handleAdditionalFilesChange = (
        e: React.ChangeEvent<HTMLInputElement>
    ) => {
        if (e.target.files) {
            const filesArray = Array.from(e.target.files);
            setFormData((prev) => ({
                ...prev,
                additionalFiles: [...prev.additionalFiles, ...filesArray],
            }));
        }
    };

    const removeAdditionalFile = (index: number) => {
        setFormData((prev) => ({
            ...prev,
            additionalFiles: prev.additionalFiles.filter((_, i) => i !== index),
        }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData);
        onClose();
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
                            <Dialog.Panel className="w-full max-w-3xl transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                                <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4">
                                    <Dialog.Title
                                        as="h3"
                                        className="text-xl font-bold leading-6 text-gray-900"
                                    >
                                        Nuevo Contrato
                                    </Dialog.Title>
                                    <button
                                        onClick={onClose}
                                        className="text-gray-400 hover:text-gray-500 transition-colors focus:outline-none"
                                    >
                                        <XMarkIcon className="w-6 h-6" />
                                    </button>
                                </div>

                                <form onSubmit={handleSubmit} className="space-y-6">
                                    {/* Sección Inmueble */}
                                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                        <h4 className="text-sm font-semibold text-indigo-900 mb-3 uppercase tracking-wide">
                                            Datos del Inmueble
                                        </h4>
                                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                                            <div className="sm:col-span-8">
                                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                                    Dirección
                                                </label>
                                                <input
                                                    type="text"
                                                    name="address"
                                                    required
                                                    className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-2 px-3"
                                                    placeholder="Ej: Av. Rivadavia 1234"
                                                    value={formData.address}
                                                    onChange={handleChange}
                                                />
                                            </div>
                                            <div className="sm:col-span-2">
                                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                                    Piso
                                                </label>
                                                <input
                                                    type="text"
                                                    name="floor"
                                                    className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-2 px-3"
                                                    placeholder="Ej: 3"
                                                    value={formData.floor}
                                                    onChange={handleChange}
                                                />
                                            </div>
                                            <div className="sm:col-span-2">
                                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                                    Depto
                                                </label>
                                                <input
                                                    type="text"
                                                    name="unit"
                                                    className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-2 px-3"
                                                    placeholder="Ej: B"
                                                    value={formData.unit}
                                                    onChange={handleChange}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {/* Sección Propietario */}
                                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                            <h4 className="text-sm font-semibold text-indigo-900 mb-3 uppercase tracking-wide">
                                                Propietario
                                            </h4>
                                            <div className="space-y-3">
                                                <div>
                                                    <label className="block text-xs font-medium text-gray-700 mb-1">
                                                        Nombre Completo
                                                    </label>
                                                    <input
                                                        type="text"
                                                        name="ownerName"
                                                        required
                                                        className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-2 px-3"
                                                        value={formData.ownerName}
                                                        onChange={handleChange}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium text-gray-700 mb-1">
                                                        Teléfono / Contacto
                                                    </label>
                                                    <input
                                                        type="text"
                                                        name="ownerPhone"
                                                        required
                                                        className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-2 px-3"
                                                        value={formData.ownerPhone}
                                                        onChange={handleChange}
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Sección Inquilino */}
                                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                            <h4 className="text-sm font-semibold text-indigo-900 mb-3 uppercase tracking-wide">
                                                Inquilino
                                            </h4>
                                            <div className="space-y-3">
                                                <div>
                                                    <label className="block text-xs font-medium text-gray-700 mb-1">
                                                        Nombre Completo
                                                    </label>
                                                    <input
                                                        type="text"
                                                        name="tenantName"
                                                        required
                                                        className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-2 px-3"
                                                        value={formData.tenantName}
                                                        onChange={handleChange}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium text-gray-700 mb-1">
                                                        Teléfono / Contacto
                                                    </label>
                                                    <input
                                                        type="text"
                                                        name="tenantPhone"
                                                        required
                                                        className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-2 px-3"
                                                        value={formData.tenantPhone}
                                                        onChange={handleChange}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Sección Fechas */}
                                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                        <h4 className="text-sm font-semibold text-indigo-900 mb-3 uppercase tracking-wide">
                                            Vigencia y Fechas
                                        </h4>
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                            <div>
                                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                                    Fecha Inicio
                                                </label>
                                                <input
                                                    type="date"
                                                    name="startDate"
                                                    required
                                                    className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-2 px-3"
                                                    value={formData.startDate}
                                                    onChange={handleChange}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                                    Fecha Fin
                                                </label>
                                                <input
                                                    type="date"
                                                    name="endDate"
                                                    required
                                                    className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-2 px-3"
                                                    value={formData.endDate}
                                                    onChange={handleChange}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                                    Próxima Actualización
                                                </label>
                                                <input
                                                    type="date"
                                                    name="updateDate"
                                                    required
                                                    className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-2 px-3"
                                                    value={formData.updateDate}
                                                    onChange={handleChange}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Sección Observaciones */}
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">
                                            Observaciones (Opcional)
                                        </label>
                                        <textarea
                                            name="observations"
                                            rows={3}
                                            className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-2 px-3"
                                            placeholder="Ingrese cualquier observación relevante..."
                                            value={formData.observations}
                                            onChange={handleChange}
                                        />
                                    </div>

                                    {/* Sección Archivos */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {/* Contrato Principal */}
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1">
                                                Contrato Principal (PDF)
                                            </label>
                                            <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:bg-gray-50 transition-colors cursor-pointer relative h-32 flex items-center justify-center">
                                                <input
                                                    type="file"
                                                    accept=".pdf"
                                                    onChange={handleFileChange}
                                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                                />
                                                <div className="flex flex-col items-center justify-center gap-2">
                                                    <DocumentArrowUpIcon className="w-8 h-8 text-indigo-400" />
                                                    <div className="text-sm text-gray-600">
                                                        {formData.file ? (
                                                            <span className="font-semibold text-indigo-600 truncate max-w-[200px] block">
                                                                {formData.file.name}
                                                            </span>
                                                        ) : (
                                                            <span className="font-semibold text-indigo-600">
                                                                Subir Contrato
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Archivos Adicionales */}
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1">
                                                Archivos Adicionales (Opcional)
                                            </label>
                                            <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:bg-gray-50 transition-colors cursor-pointer relative h-32 flex items-center justify-center">
                                                <input
                                                    type="file"
                                                    accept=".pdf"
                                                    multiple
                                                    onChange={handleAdditionalFilesChange}
                                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                                />
                                                <div className="flex flex-col items-center justify-center gap-2">
                                                    <DocumentArrowUpIcon className="w-8 h-8 text-gray-400" />
                                                    <div className="text-sm text-gray-600">
                                                        <span className="font-semibold text-indigo-600">
                                                            Agregar PDFs
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Lista de archivos adicionales seleccionados */}
                                    {formData.additionalFiles.length > 0 && (
                                        <div className="bg-gray-50 rounded-lg p-3">
                                            <h5 className="text-xs font-medium text-gray-700 mb-2">
                                                Archivos adicionales seleccionados:
                                            </h5>
                                            <ul className="space-y-2">
                                                {formData.additionalFiles.map((file, index) => (
                                                    <li
                                                        key={index}
                                                        className="flex items-center justify-between text-sm bg-white p-2 rounded border border-gray-200"
                                                    >
                                                        <span className="truncate text-gray-600">
                                                            {file.name}
                                                        </span>
                                                        <button
                                                            type="button"
                                                            onClick={() => removeAdditionalFile(index)}
                                                            className="text-red-500 hover:text-red-700"
                                                        >
                                                            <XMarkIcon className="w-4 h-4" />
                                                        </button>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    {/* Footer Actions */}
                                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                                        <button
                                            type="button"
                                            onClick={onClose}
                                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                        >
                                            Cancelar
                                        </button>
                                        <button
                                            type="submit"
                                            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 shadow-sm"
                                        >
                                            Guardar Contrato
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
