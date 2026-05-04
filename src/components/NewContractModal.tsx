import { Fragment, useState, useEffect } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { XMarkIcon, DocumentArrowUpIcon, BanknotesIcon, MagnifyingGlassIcon, PlusCircleIcon } from "@heroicons/react/24/outline";
import NumericInput from "./NumericInput";
import AutocompleteSelector from "./AutocompleteSelector";
import { propertiesService, type Property } from "../services/properties.service";
import { personasService, type Persona } from "../services/personas.service";
import { type Contract } from "../services/contracts.service";
import { toast } from "react-hot-toast";

interface NewContractModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: any) => void | Promise<void>;
    editingContract?: Contract | null;
}

const emptyPerson = () => ({ nombreCompleto: "", telefono: "" });
const MAX_FILE_SIZE_BYTES = 30 * 1024 * 1024;
const allowedMainContractTypes = new Set(['application/pdf']);
const allowedAdditionalTypes = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp']);
const allowedAdditionalExtensions = ['.pdf', '.jpg', '.jpeg', '.png', '.webp'];

function hasAllowedExtension(file: File, extensions: string[]) {
    return extensions.some(ext => file.name.toLowerCase().endsWith(ext));
}

function validateMainContractFile(file: File) {
    if (!allowedMainContractTypes.has(file.type) || !hasAllowedExtension(file, ['.pdf'])) {
        return "Formato no permitido. El contrato principal debe ser PDF.";
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
        return "El archivo supera el límite máximo de 30 MB.";
    }
    return null;
}

function validateAdditionalFile(file: File) {
    if (!allowedAdditionalTypes.has(file.type) || !hasAllowedExtension(file, allowedAdditionalExtensions)) {
        return "Formato no permitido. Solo se aceptan PDF, JPG, PNG o WEBP.";
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
        return "El archivo supera el límite máximo de 30 MB.";
    }
    return null;
}

export default function NewContractModal({
    isOpen,
    onClose,
    onSave,
    editingContract
}: NewContractModalProps) {
    const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
    // false = manual entry (default); true = searching existing
    const [searchingExistingProperty, setSearchingExistingProperty] = useState(false);
    const [searchingExistingOwner, setSearchingExistingOwner] = useState(false);
    const [searchingExistingTenant, setSearchingExistingTenant] = useState(false);

    const [owners, setOwners] = useState<{ id?: number; nombreCompleto: string; telefono: string }[]>([emptyPerson()]);
    const [tenants, setTenants] = useState<{ id?: number; nombreCompleto: string; telefono: string }[]>([emptyPerson()]);

    const [formData, setFormData] = useState({
        address: "",
        floor: "",
        unit: "",
        startDate: "",
        endDate: "",
        updateDate: "",
        montoAlquiler: "",
        montoHonorarios: "",
        porcentajeHonorarios: "",
        pagaHonorarios: "INQUILINO",
        diaVencimiento: "10",
        tipoAjuste: "",
        file: null as File | null,
        observations: "",
        additionalFiles: [] as File[],
        administrado: true,
        frecuenciaActualizacion: "3",
        honorarioInicial: "",
        honorarioInicialMetodoPago: ""   // empty by default — user must choose
    });

    // Effect to populate form when editing
    useEffect(() => {
        if (isOpen && editingContract) {
            setSelectedProperty(editingContract.propiedad as any);
            setOwners(editingContract.propietarios.map(p => ({
                id: p.persona.id,
                nombreCompleto: p.persona.nombreCompleto,
                telefono: p.persona.telefono || ""
            })));
            setTenants(editingContract.inquilinos.map(i => ({
                id: i.persona.id,
                nombreCompleto: i.persona.nombreCompleto,
                telefono: i.persona.telefono || ""
            })));

            setFormData({
                address: editingContract.propiedad.direccion,
                floor: editingContract.propiedad.piso || "",
                unit: editingContract.propiedad.departamento || "",
                startDate: editingContract.fechaInicio ? new Date(editingContract.fechaInicio).toISOString().split('T')[0] : "",
                endDate: editingContract.fechaFin ? new Date(editingContract.fechaFin).toISOString().split('T')[0] : "",
                updateDate: editingContract.fechaProximaActualizacion ? new Date(editingContract.fechaProximaActualizacion).toISOString().split('T')[0] : "",
                montoAlquiler: editingContract.montoAlquiler.toString(),
                montoHonorarios: editingContract.montoHonorarios.toString(),
                porcentajeHonorarios: editingContract.porcentajeHonorarios?.toString() || "",
                pagaHonorarios: editingContract.pagaHonorarios as string,
                diaVencimiento: editingContract.diaVencimiento.toString(),
                tipoAjuste: editingContract.tipoAjuste || "",
                file: null,
                observations: editingContract.observaciones || "",
                additionalFiles: [],
                administrado: editingContract.administrado,
                frecuenciaActualizacion: "3",
                honorarioInicial: "",
                honorarioInicialMetodoPago: ""
            });
        } else if (isOpen && !editingContract) {
            // Reset for new contract
            setFormData({
                address: "",
                floor: "",
                unit: "",
                startDate: "",
                endDate: "",
                updateDate: "",
                montoAlquiler: "",
                montoHonorarios: "",
                porcentajeHonorarios: "",
                pagaHonorarios: "INQUILINO",
                diaVencimiento: "10",
                tipoAjuste: "",
                file: null,
                observations: "",
                additionalFiles: [],
                administrado: true,
                frecuenciaActualizacion: "3",
                honorarioInicial: "",
                honorarioInicialMetodoPago: ""
            });
            setSelectedProperty(null);
            setOwners([emptyPerson()]);
            setTenants([emptyPerson()]);
            setSearchingExistingProperty(false);
            setSearchingExistingOwner(false);
            setSearchingExistingTenant(false);
        }
    }, [isOpen, editingContract]);

    // Cálculo automático de fecha de actualización
    useEffect(() => {
        if (!editingContract && formData.startDate && formData.frecuenciaActualizacion) {
            const date = new Date(formData.startDate + "T00:00:00");
            const months = parseInt(formData.frecuenciaActualizacion);
            if (!isNaN(date.getTime()) && !isNaN(months)) {
                date.setMonth(date.getMonth() + months);
                const suggestedDate = date.toISOString().split('T')[0];
                setFormData(prev => ({ ...prev, updateDate: suggestedDate }));
            }
        }
    }, [formData.startDate, formData.frecuenciaActualizacion, editingContract]);

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handlePropertySelect = (property: Property | null) => {
        setSelectedProperty(property);
        if (property) {
            setFormData(prev => ({
                ...prev,
                address: property.direccion,
                floor: property.piso || "",
                unit: property.departamento || "",
            }));
        }
    };

    const addOwner = (owner: Persona | null) => {
        if (owner) {
            setOwners(prev => [...prev, { id: owner.id, nombreCompleto: owner.nombreCompleto, telefono: owner.telefono || "" }]);
        } else {
            setOwners(prev => [...prev, emptyPerson()]);
        }
        setSearchingExistingOwner(false);
    };

    const updateOwner = (index: number, field: string, value: string) => {
        setOwners(prev => {
            const next = [...prev];
            next[index] = { ...next[index], [field]: value };
            return next;
        });
    };

    const removeOwner = (index: number) => {
        setOwners(prev => prev.filter((_, i) => i !== index));
    };

    const addTenant = (tenant: Persona | null) => {
        if (tenant) {
            setTenants(prev => [...prev, { id: tenant.id, nombreCompleto: tenant.nombreCompleto, telefono: tenant.telefono || "" }]);
        } else {
            setTenants(prev => [...prev, emptyPerson()]);
        }
        setSearchingExistingTenant(false);
    };

    const updateTenant = (index: number, field: string, value: string) => {
        setTenants(prev => {
            const next = [...prev];
            next[index] = { ...next[index], [field]: value };
            return next;
        });
    };

    const removeTenant = (index: number) => {
        setTenants(prev => prev.filter((_, i) => i !== index));
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const error = validateMainContractFile(file);
            if (error) {
                toast.error(error);
                e.target.value = "";
                setFormData((prev) => ({ ...prev, file: null }));
                return;
            }
            setFormData((prev) => ({ ...prev, file }));
        }
    };

    const handleAdditionalFilesChange = (
        e: React.ChangeEvent<HTMLInputElement>
    ) => {
        if (e.target.files) {
            const filesArray = Array.from(e.target.files);
            const invalid = filesArray.find(file => validateAdditionalFile(file));
            if (invalid) {
                toast.error(validateAdditionalFile(invalid) || "Formato no permitido");
                e.target.value = "";
                return;
            }
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validate required parties
        if (owners.length === 0 || owners.some(o => !o.nombreCompleto.trim())) {
            toast.error("Debe agregar al menos un propietario con nombre completo.");
            return;
        }
        if (tenants.length === 0 || tenants.some(t => !t.nombreCompleto.trim())) {
            toast.error("Debe agregar al menos un inquilino con nombre completo.");
            return;
        }

        // Validate dates
        if (!formData.startDate || !formData.endDate || !formData.updateDate) {
            toast.error("Las fechas de inicio, fin y próxima actualización son obligatorias.");
            return;
        }

        // Validate método de pago si hay honorario
        if (formData.honorarioInicial && !formData.honorarioInicialMetodoPago) {
            toast.error("Debe seleccionar un método de pago para el honorario inicial.");
            return;
        }

        if (formData.file) {
            const error = validateMainContractFile(formData.file);
            if (error) {
                toast.error(error);
                return;
            }
        }

        const invalidAdditionalFile = formData.additionalFiles.find(file => validateAdditionalFile(file));
        if (invalidAdditionalFile) {
            toast.error(validateAdditionalFile(invalidAdditionalFile) || "Formato no permitido");
            return;
        }

        // 1. Process Owners
        const ownerIds = [];
        for (const owner of owners) {
            if (owner.id) {
                ownerIds.push(owner.id);
            } else {
                const created = await personasService.create({
                    nombreCompleto: owner.nombreCompleto,
                    telefono: owner.telefono,
                    estado: 'ACTIVO'
                });
                ownerIds.push(created.id);
            }
        }

        // 2. Process Tenants
        const tenantIds = [];
        for (const tenant of tenants) {
            if (tenant.id) {
                tenantIds.push(tenant.id);
            } else {
                const created = await personasService.create({
                    nombreCompleto: tenant.nombreCompleto,
                    telefono: tenant.telefono,
                    estado: 'ACTIVO'
                });
                tenantIds.push(created.id);
            }
        }

        // 3. Process Property
        let propertyId = selectedProperty?.id;
        if (!propertyId) {
            const property = await propertiesService.create({
                direccion: formData.address,
                piso: formData.floor || null,
                departamento: formData.unit || null,
                tipo: 'DEPARTAMENTO',
                estado: 'DISPONIBLE',
                observaciones: null
            });
            propertyId = property.id;
        }

        const dataToSave = {
            ...formData,
            propertyId,
            propietarioIds: ownerIds,
            inquilinoIds: tenantIds,
            administrado: formData.administrado,
            honorarioInicial: formData.honorarioInicial,
            honorarioInicialMetodoPago: formData.honorarioInicialMetodoPago
        };

        await onSave(dataToSave);

        // Reset state
        setSelectedProperty(null);
        setOwners([emptyPerson()]);
        setTenants([emptyPerson()]);
        onClose();
    };

    return (
        <Transition appear show={isOpen} as={Fragment}>
            {/* onClose={() => {}} prevents accidental close on backdrop click */}
            <Dialog as="div" className="relative z-50" onClose={() => {}}>
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
                                        {editingContract ? 'Editar Contrato' : 'Nuevo Contrato'}
                                    </Dialog.Title>
                                    <button
                                        onClick={onClose}
                                        className="text-gray-400 hover:text-gray-500 transition-colors focus:outline-none"
                                    >
                                        <XMarkIcon className="w-6 h-6" />
                                    </button>
                                </div>

                                <form onSubmit={handleSubmit} className="space-y-6">
                                    {/* ─── Sección Inmueble ─── */}
                                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                        <div className="flex justify-between items-center mb-3">
                                            <h4 className="text-sm font-semibold text-indigo-900 uppercase tracking-wide">
                                                Datos del Inmueble
                                            </h4>
                                            {!editingContract && (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setSearchingExistingProperty(v => !v);
                                                        setSelectedProperty(null);
                                                        setFormData(prev => ({ ...prev, address: "", floor: "", unit: "" }));
                                                    }}
                                                    className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-semibold"
                                                >
                                                    {searchingExistingProperty
                                                        ? <><PlusCircleIcon className="w-4 h-4" /> Ingresar manualmente</>
                                                        : <><MagnifyingGlassIcon className="w-4 h-4" /> Buscar inmueble existente</>
                                                    }
                                                </button>
                                            )}
                                        </div>

                                        {searchingExistingProperty && !editingContract ? (
                                            <AutocompleteSelector<Property>
                                                label="Buscar Propiedad"
                                                placeholder="Buscar por dirección..."
                                                onSearch={propertiesService.getAll}
                                                onSelect={handlePropertySelect}
                                                renderItem={(p) => `${p.direccion}${p.piso ? ` ${p.piso}°` : ""}${p.departamento ? ` ${p.departamento}` : ""}`}
                                                renderSelection={(p) => `${p.direccion}${p.piso ? ` ${p.piso}°` : ""}${p.departamento ? ` ${p.departamento}` : ""}`}
                                                idField="id"
                                                value={selectedProperty}
                                            />
                                        ) : (
                                            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                                                <div className="sm:col-span-8">
                                                    <label className="block text-xs font-medium text-gray-700 mb-1">
                                                        Dirección *
                                                    </label>
                                                    <input
                                                        type="text"
                                                        name="address"
                                                        required
                                                        className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-2 px-3"
                                                        placeholder="Ej: Av. Corrientes 1234"
                                                        value={selectedProperty ? `${selectedProperty.direccion}` : formData.address}
                                                        onChange={handleChange}
                                                        disabled={!!selectedProperty || !!editingContract}
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
                                                        disabled={!!selectedProperty || !!editingContract}
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
                                                        disabled={!!selectedProperty || !!editingContract}
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* ─── Propietarios & Inquilinos ─── */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {/* Propietarios */}
                                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                            <div className="flex justify-between items-center mb-3">
                                                <h4 className="text-sm font-semibold text-indigo-900 uppercase tracking-wide">
                                                    Propietarios *
                                                </h4>
                                                {!editingContract && (
                                                    <button
                                                        type="button"
                                                        onClick={() => addOwner(null)}
                                                        className="text-indigo-600 hover:text-indigo-800 text-xs font-bold"
                                                    >
                                                        + AGREGAR OTRO
                                                    </button>
                                                )}
                                            </div>
                                            <div className="space-y-3">
                                                {owners.map((owner, index) => (
                                                    <div key={index} className="p-3 bg-white rounded-lg border border-gray-200 relative">
                                                        {owners.length > 1 && !editingContract && (
                                                            <button
                                                                type="button"
                                                                onClick={() => removeOwner(index)}
                                                                className="absolute top-2 right-2 text-red-500 hover:text-red-700"
                                                            >
                                                                <XMarkIcon className="w-4 h-4" />
                                                            </button>
                                                        )}
                                                        <p className="text-[10px] font-bold text-indigo-400 mb-2">
                                                            {index === 0 ? "PROPIETARIO PRINCIPAL" : `CO-PROPIETARIO ${index}`}
                                                            {owner.id && <span className="ml-2 text-green-500">(existente)</span>}
                                                        </p>
                                                        <div className="space-y-2">
                                                            <input
                                                                type="text"
                                                                placeholder="Nombre Completo *"
                                                                required
                                                                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-xs py-1.5 px-3"
                                                                value={owner.nombreCompleto}
                                                                onChange={(e) => updateOwner(index, 'nombreCompleto', e.target.value)}
                                                                disabled={!!owner.id || !!editingContract}
                                                            />
                                                            <input
                                                                type="text"
                                                                placeholder="Teléfono"
                                                                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-xs py-1.5 px-3"
                                                                value={owner.telefono}
                                                                onChange={(e) => updateOwner(index, 'telefono', e.target.value)}
                                                                disabled={!!owner.id || !!editingContract}
                                                            />
                                                        </div>
                                                    </div>
                                                ))}

                                                {/* Búsqueda de propietario existente como opción secundaria */}
                                                {!editingContract && (
                                                    <div>
                                                        {!searchingExistingOwner ? (
                                                            <button
                                                                type="button"
                                                                onClick={() => setSearchingExistingOwner(true)}
                                                                className="flex items-center gap-1 text-xs text-indigo-500 hover:text-indigo-700 mt-1"
                                                            >
                                                                <MagnifyingGlassIcon className="w-4 h-4" />
                                                                ¿Buscar propietario existente?
                                                            </button>
                                                        ) : (
                                                            <div>
                                                                <AutocompleteSelector<Persona>
                                                                    label="Buscar Propietario"
                                                                    placeholder="Nombre o DNI..."
                                                                    onSearch={personasService.getAll}
                                                                    onSelect={addOwner}
                                                                    renderItem={(p) => `${p.nombreCompleto} ${p.dni ? `(${p.dni})` : ""}`}
                                                                    renderSelection={() => ""}
                                                                    idField="id"
                                                                    value={null}
                                                                />
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setSearchingExistingOwner(false)}
                                                                    className="text-xs text-gray-400 hover:text-gray-600 mt-1"
                                                                >
                                                                    Cancelar búsqueda
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Inquilinos */}
                                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                            <div className="flex justify-between items-center mb-3">
                                                <h4 className="text-sm font-semibold text-indigo-900 uppercase tracking-wide">
                                                    Inquilinos *
                                                </h4>
                                                {!editingContract && (
                                                    <button
                                                        type="button"
                                                        onClick={() => addTenant(null)}
                                                        className="text-indigo-600 hover:text-indigo-800 text-xs font-bold"
                                                    >
                                                        + AGREGAR OTRO
                                                    </button>
                                                )}
                                            </div>
                                            <div className="space-y-3">
                                                {tenants.map((tenant, index) => (
                                                    <div key={index} className="p-3 bg-white rounded-lg border border-gray-200 relative">
                                                        {tenants.length > 1 && !editingContract && (
                                                            <button
                                                                type="button"
                                                                onClick={() => removeTenant(index)}
                                                                className="absolute top-2 right-2 text-red-500 hover:text-red-700"
                                                            >
                                                                <XMarkIcon className="w-4 h-4" />
                                                            </button>
                                                        )}
                                                        <p className="text-[10px] font-bold text-indigo-400 mb-2">
                                                            {index === 0 ? "INQUILINO PRINCIPAL" : `CO-INQUILINO ${index}`}
                                                            {tenant.id && <span className="ml-2 text-green-500">(existente)</span>}
                                                        </p>
                                                        <div className="space-y-2">
                                                            <input
                                                                type="text"
                                                                placeholder="Nombre Completo *"
                                                                required
                                                                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-xs py-1.5 px-3"
                                                                value={tenant.nombreCompleto}
                                                                onChange={(e) => updateTenant(index, 'nombreCompleto', e.target.value)}
                                                                disabled={!!tenant.id || !!editingContract}
                                                            />
                                                            <input
                                                                type="text"
                                                                placeholder="Teléfono"
                                                                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-xs py-1.5 px-3"
                                                                value={tenant.telefono}
                                                                onChange={(e) => updateTenant(index, 'telefono', e.target.value)}
                                                                disabled={!!tenant.id || !!editingContract}
                                                            />
                                                        </div>
                                                    </div>
                                                ))}

                                                {/* Búsqueda de inquilino existente como opción secundaria */}
                                                {!editingContract && (
                                                    <div>
                                                        {!searchingExistingTenant ? (
                                                            <button
                                                                type="button"
                                                                onClick={() => setSearchingExistingTenant(true)}
                                                                className="flex items-center gap-1 text-xs text-indigo-500 hover:text-indigo-700 mt-1"
                                                            >
                                                                <MagnifyingGlassIcon className="w-4 h-4" />
                                                                ¿Buscar inquilino existente?
                                                            </button>
                                                        ) : (
                                                            <div>
                                                                <AutocompleteSelector<Persona>
                                                                    label="Buscar Inquilino"
                                                                    placeholder="Nombre o DNI..."
                                                                    onSearch={personasService.getAll}
                                                                    onSelect={addTenant}
                                                                    renderItem={(p) => `${p.nombreCompleto} ${p.dni ? `(${p.dni})` : ""}`}
                                                                    renderSelection={() => ""}
                                                                    idField="id"
                                                                    value={null}
                                                                />
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setSearchingExistingTenant(false)}
                                                                    className="text-xs text-gray-400 hover:text-gray-600 mt-1"
                                                                >
                                                                    Cancelar búsqueda
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* ─── Condiciones Económicas ─── */}
                                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                        <h4 className="text-sm font-semibold text-indigo-900 mb-3 uppercase tracking-wide">
                                            Condiciones Económicas
                                        </h4>
                                        <div className="grid grid-cols-1 gap-4">
                                            <div>
                                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                                    Alquiler Mensual *
                                                </label>
                                                <NumericInput
                                                    name="montoAlquiler"
                                                    required
                                                    className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-2 px-3"
                                                    value={formData.montoAlquiler}
                                                    onChange={(val) => setFormData(prev => ({ ...prev, montoAlquiler: val.toString() }))}
                                                    icon={<BanknotesIcon className="w-5 h-5 text-gray-400" />}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* ─── Honorarios por Alta de Contrato ─── */}
                                    {!editingContract && (
                                        <div className="bg-green-50 p-4 rounded-xl border border-green-100">
                                            <h4 className="text-sm font-semibold text-green-900 mb-3 uppercase tracking-wide">
                                                Honorarios por Alta de Contrato
                                            </h4>
                                            <p className="text-xs text-green-700 mb-3">
                                                Si se cobra un honorario único por firmar este contrato, regístralo aquí. Se sumará automáticamente a la Caja Chica.
                                            </p>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-xs font-medium text-green-800 mb-1">
                                                        Monto Honorario de Alta
                                                    </label>
                                                    <NumericInput
                                                        name="honorarioInicial"
                                                        className="w-full rounded-lg border-green-300 bg-white shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm py-2 px-3"
                                                        placeholder="Monto a cobrar hoy..."
                                                        value={formData.honorarioInicial}
                                                        onChange={(val) => setFormData(prev => ({ ...prev, honorarioInicial: val.toString() }))}
                                                        icon={<BanknotesIcon className="w-5 h-5 text-green-400" />}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium text-green-800 mb-1">
                                                        Método de Pago *
                                                    </label>
                                                    <select
                                                        name="honorarioInicialMetodoPago"
                                                        required
                                                        className="w-full rounded-lg border-green-300 bg-white shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm py-2 px-3"
                                                        value={formData.honorarioInicialMetodoPago}
                                                        onChange={(e) => setFormData(prev => ({ ...prev, honorarioInicialMetodoPago: e.target.value }))}
                                                    >
                                                        <option value="" disabled>Seleccione un método...</option>
                                                        <option value="EFECTIVO">Efectivo</option>
                                                        <option value="TRANSFERENCIA">Transferencia</option>
                                                        <option value="DEPOSITO">Depósito</option>
                                                    </select>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* ─── Administración ─── */}
                                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 flex items-center justify-between">
                                        <div>
                                            <h4 className="text-sm font-semibold text-indigo-900 uppercase tracking-wide">
                                                Administración
                                            </h4>
                                            <p className="text-xs text-gray-500">¿La inmobiliaria administra este contrato mensualmente?</p>
                                        </div>
                                        <div className="flex items-center">
                                            <span className={`mr-3 text-xs font-bold ${!formData.administrado ? 'text-indigo-600' : 'text-gray-400'}`}>NO</span>
                                            <button
                                                type="button"
                                                onClick={() => setFormData(prev => ({ ...prev, administrado: !prev.administrado }))}
                                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${formData.administrado ? 'bg-indigo-600' : 'bg-gray-200'}`}
                                            >
                                                <span
                                                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${formData.administrado ? 'translate-x-6' : 'translate-x-1'}`}
                                                />
                                            </button>
                                            <span className={`ml-3 text-xs font-bold ${formData.administrado ? 'text-indigo-600' : 'text-gray-400'}`}>SÍ</span>
                                        </div>
                                    </div>

                                    {/* ─── Vigencia y Fechas ─── */}
                                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                        <h4 className="text-sm font-semibold text-indigo-900 mb-3 uppercase tracking-wide">
                                            Vigencia y Fechas *
                                        </h4>
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                            <div>
                                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                                    Fecha Inicio *
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
                                                    Fecha Fin *
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
                                                    Frecuencia Actualiz. (Meses) *
                                                </label>
                                                <NumericInput
                                                    className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-2 px-3"
                                                    required
                                                    placeholder="Ej: 3"
                                                    value={formData.frecuenciaActualizacion}
                                                    onChange={(val) => setFormData(prev => ({ ...prev, frecuenciaActualizacion: val.toString() }))}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                                    Próxima Actualización *
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

                                    {/* ─── Tipo de Ajuste ─── */}
                                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                        <h4 className="text-sm font-semibold text-indigo-900 mb-3 uppercase tracking-wide">
                                            Tipo de Ajuste
                                        </h4>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-700 mb-1">
                                                Tipo de Ajuste (Ej: IPC trimestral) *
                                            </label>
                                            <input
                                                type="text"
                                                name="tipoAjuste"
                                                required
                                                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-2 px-3"
                                                placeholder="Ej: IPC trimestral, ICL semestral..."
                                                value={formData.tipoAjuste}
                                                onChange={handleChange}
                                            />
                                        </div>
                                    </div>

                                    {/* ─── Observaciones ─── */}
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

                                    {/* ─── Archivos ─── */}
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
                                                    accept=".pdf,.jpg,.jpeg,.png,.webp"
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

                                    {/* ─── Footer Actions ─── */}
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
                                            {editingContract ? 'Guardar Cambios' : 'Guardar Contrato'}
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
