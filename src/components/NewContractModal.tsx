import { Fragment, useState, useEffect } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { XMarkIcon, BanknotesIcon, MagnifyingGlassIcon, PlusCircleIcon } from "@heroicons/react/24/outline";
import NumericInput from "./NumericInput";
import AutocompleteSelector from "./AutocompleteSelector";
import { propertiesService, type Property } from "../services/properties.service";
import type { Persona } from "../services/personas.service";
import { type Contract } from "../services/contracts.service";
import { toast } from "react-hot-toast";
import { MONEDA_LABELS, type Moneda } from "../utils/currency";
import {
    ATTACHMENT_ACCEPT,
    ATTACHMENT_FORMATS_LABEL,
    MAIN_CONTRACT_ACCEPT,
    MAIN_CONTRACT_FORMATS_LABEL,
    validateAttachmentFile,
    validateMainContractFile,
} from "../utils/documentFiles";
import FormError, { useFormError } from "./FormError";
import AppSelect from "./AppSelect";
import LocalizedFilePicker from "./LocalizedFilePicker";
import { PAYMENT_METHOD_OPTIONS } from "../services/pagos.service";
import { addMonthsToDateInput } from "../utils/date";
import {
    buildContractPayload,
    createContractFormFromContract,
    createEmptyContractForm,
    createRenewalContractForm,
    emptyContractParty,
    getContractFormError,
    selectExistingParty,
    type ContractParty
} from "../features/contracts/contract-form.model";
import ContractPartyFields from "../features/contracts/ContractPartyFields";

interface NewContractModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: any) => void | Promise<void>;
    editingContract?: Contract | null;
    renewingContract?: Contract | null;
}

export default function NewContractModal({
    isOpen,
    onClose,
    onSave,
    editingContract,
    renewingContract
}: NewContractModalProps) {
    const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
    // false = manual entry (default); true = searching existing
    const [searchingExistingProperty, setSearchingExistingProperty] = useState(false);
    const [searchingExistingOwner, setSearchingExistingOwner] = useState(false);
    const [searchingExistingTenant, setSearchingExistingTenant] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { error: formError, setError: setFormError, reportError, formRef } = useFormError();

    const [owners, setOwners] = useState<ContractParty[]>([emptyContractParty()]);
    const [tenants, setTenants] = useState<ContractParty[]>([emptyContractParty()]);
    const [formData, setFormData] = useState(createEmptyContractForm);

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

            setFormData(createContractFormFromContract(editingContract));
        } else if (isOpen && renewingContract) {
            setSelectedProperty(renewingContract.propiedad as Property);
            setOwners(renewingContract.propietarios.map(p => ({
                id: p.persona.id,
                nombreCompleto: p.persona.nombreCompleto,
                telefono: p.persona.telefono || ""
            })));
            setTenants(renewingContract.inquilinos.map(i => ({
                id: i.persona.id,
                nombreCompleto: i.persona.nombreCompleto,
                telefono: i.persona.telefono || ""
            })));
            setFormData(createRenewalContractForm(renewingContract));
            setSearchingExistingProperty(false);
            setSearchingExistingOwner(false);
            setSearchingExistingTenant(false);
        } else if (isOpen && !editingContract) {
            setFormData(createEmptyContractForm());
            setSelectedProperty(null);
            setOwners([emptyContractParty()]);
            setTenants([emptyContractParty()]);
            setSearchingExistingProperty(false);
            setSearchingExistingOwner(false);
            setSearchingExistingTenant(false);
        }
    }, [isOpen, editingContract, renewingContract]);

    // Cálculo automático de fecha de actualización
    useEffect(() => {
        if (!editingContract && formData.requiereActualizacion && formData.startDate && formData.frecuenciaActualizacion) {
            const months = parseInt(formData.frecuenciaActualizacion);
            if (!isNaN(months)) {
                const suggestedDate = addMonthsToDateInput(formData.startDate, months);
                setFormData(prev => ({ ...prev, updateDate: suggestedDate }));
            }
        }
    }, [formData.startDate, formData.frecuenciaActualizacion, formData.requiereActualizacion, editingContract]);

    const handleCurrencyChange = (moneda: Moneda) => {
        setFormData(prev => ({
            ...prev,
            moneda,
            ...(!editingContract && moneda === "USD" ? {
                requiereActualizacion: false,
                updateDate: "",
                tipoAjuste: "",
                porcentajeActualizacion: ""
            } : {}),
            ...(!editingContract && moneda === "ARS" ? { requiereActualizacion: true } : {})
        }));
    };

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
            setOwners(prev => selectExistingParty(prev, owner));
        } else {
            setOwners(prev => [...prev, emptyContractParty()]);
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
            setTenants(prev => selectExistingParty(prev, tenant));
        } else {
            setTenants(prev => [...prev, emptyContractParty()]);
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

    const handleFileSelection = (files: File[]) => {
        setFormData(prev => ({ ...prev, file: files[0] || null }));
    };

    const handleAdditionalFilesSelection = (files: File[]) => {
        setFormData(prev => ({
            ...prev,
            additionalFiles: [...prev.additionalFiles, ...files],
        }));
    };

    const removeAdditionalFile = (index: number) => {
        setFormData((prev) => ({
            ...prev,
            additionalFiles: prev.additionalFiles.filter((_, i) => i !== index),
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isSubmitting) return;
        setFormError("");

        const validationError = getContractFormError(formData, owners, tenants);
        if (validationError) {
            setFormError(validationError);
            return;
        }

        const dataToSave = {
            ...buildContractPayload(formData, selectedProperty, owners, tenants),
            ...(renewingContract ? { contratoAnteriorId: renewingContract.id } : {})
        };

        setIsSubmitting(true);
        try {
            await onSave(dataToSave);
            setSelectedProperty(null);
            setOwners([emptyContractParty()]);
            setTenants([emptyContractParty()]);
            onClose();
        } catch (error) {
            reportError(error, "No se pudo guardar el contrato");
        } finally {
            setIsSubmitting(false);
        }
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
                            <Dialog.Panel className="flex max-h-[100dvh] w-full max-w-3xl transform flex-col overflow-hidden rounded-t-2xl bg-white text-left align-middle shadow-xl transition-all sm:max-h-[90dvh] sm:rounded-2xl">
                                <div className="shrink-0 flex justify-between items-center border-b border-gray-100 p-4 sm:p-6">
                                    <Dialog.Title
                                        as="h3"
                                        className="text-xl font-bold leading-6 text-gray-900"
                                    >
                                        {editingContract ? 'Editar contrato' : renewingContract ? `Renovar contrato #${renewingContract.id}` : 'Nuevo contrato'}
                                    </Dialog.Title>
                                    <button
                                        onClick={() => !isSubmitting && onClose()}
                                        disabled={isSubmitting}
                                        className="text-gray-600 hover:text-content-muted transition-colors focus:outline-none"
                                    >
                                        <XMarkIcon className="w-6 h-6" />
                                    </button>
                                </div>

                                <form ref={formRef} onSubmit={handleSubmit} className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
                                    <FormError message={formError} />
                                    {renewingContract && (
                                        <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4 text-sm text-indigo-950">
                                            <p className="font-semibold">Renovación guiada del contrato #{renewingContract.id}</p>
                                            <p className="mt-1 text-indigo-800">Se copiaron el inmueble, las partes y las condiciones comerciales. Revisá las fechas e importes antes de guardar; no se trasladan liquidaciones, pagos, cuotas ni documentos.</p>
                                        </div>
                                    )}
                                    {/* ─── Sección Inmueble ─── */}
                                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                        <div className="flex justify-between items-center mb-3">
                                            <h4 className="text-sm font-semibold text-indigo-900 uppercase tracking-wide">
                                                Datos del Inmueble
                                            </h4>
                                            {!editingContract && !renewingContract && (
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

                                        {searchingExistingProperty && !editingContract && !renewingContract ? (
                                            <AutocompleteSelector<Property>
                                                label="Buscar Propiedad"
                                                placeholder="Buscar por dirección..."
                                                onSearch={propertiesService.search}
                                                onSelect={handlePropertySelect}
                                                renderItem={(p) => `${p.direccion}${p.piso ? ` ${p.piso}°` : ""}${p.departamento ? ` ${p.departamento}` : ""}`}
                                                renderSelection={(p) => `${p.direccion}${p.piso ? ` ${p.piso}°` : ""}${p.departamento ? ` ${p.departamento}` : ""}`}
                                                idField="id"
                                                value={selectedProperty}
                                            />
                                        ) : (
                                            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                                                <div className="sm:col-span-8">
                                                    <label htmlFor="contract-property-address" className="block text-xs font-medium text-gray-700 mb-1">
                                                        Dirección *
                                                    </label>
                                                    <input
                                                        id="contract-property-address"
                                                        type="text"
                                                        name="address"
                                                        required
                                                        className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-2 px-3"
                                                        placeholder="Ej: Av. Corrientes 1234"
                                                        value={selectedProperty ? `${selectedProperty.direccion}` : formData.address}
                                                        onChange={handleChange}
                                                        disabled={!!selectedProperty || !!editingContract || !!renewingContract}
                                                    />
                                                </div>
                                                <div className="sm:col-span-2">
                                                    <label htmlFor="contract-property-floor" className="block text-xs font-medium text-gray-700 mb-1">
                                                        Piso
                                                    </label>
                                                    <input
                                                        id="contract-property-floor"
                                                        type="text"
                                                        name="floor"
                                                        className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-2 px-3"
                                                        placeholder="Ej: 3"
                                                        value={formData.floor}
                                                        onChange={handleChange}
                                                        disabled={!!selectedProperty || !!editingContract || !!renewingContract}
                                                    />
                                                </div>
                                                <div className="sm:col-span-2">
                                                    <label htmlFor="contract-property-unit" className="block text-xs font-medium text-gray-700 mb-1">
                                                        Depto
                                                    </label>
                                                    <input
                                                        id="contract-property-unit"
                                                        type="text"
                                                        name="unit"
                                                        className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-2 px-3"
                                                        placeholder="Ej: B"
                                                        value={formData.unit}
                                                        onChange={handleChange}
                                                        disabled={!!selectedProperty || !!editingContract || !!renewingContract}
                                                    />
			                                        </div>
                                            </div>
		                                        )}
                                    </div>

                                    {/* ─── Propietarios & Inquilinos ─── */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <ContractPartyFields
                                            kind="owner"
                                            parties={owners}
                                            editing={!!editingContract}
                                            searching={searchingExistingOwner}
                                            onSearchingChange={setSearchingExistingOwner}
                                            onAdd={addOwner}
                                            onUpdate={updateOwner}
                                            onRemove={removeOwner}
                                        />
                                        <ContractPartyFields
                                            kind="tenant"
                                            parties={tenants}
                                            editing={!!editingContract}
                                            searching={searchingExistingTenant}
                                            onSearchingChange={setSearchingExistingTenant}
                                            onAdd={addTenant}
                                            onUpdate={updateTenant}
                                            onRemove={removeTenant}
                                        />
                                    </div>

                                    {/* ─── Condiciones Económicas ─── */}
                                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                        <h4 className="text-sm font-semibold text-indigo-900 mb-3 uppercase tracking-wide">
                                            Condiciones Económicas
                                        </h4>
	                                        <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-4">
	                                            <div>
	                                                <label htmlFor="contract-currency" className="block text-xs font-medium text-gray-700 mb-1">
	                                                    Moneda *
	                                                </label>
	                                                <AppSelect
	                                                    id="contract-currency"
	                                                    name="moneda"
	                                                    required
	                                                    ariaLabel="Moneda del contrato"
	                                                    value={formData.moneda}
	                                                    onChange={(value) => handleCurrencyChange(value as Moneda)}
	                                                    options={[
	                                                        { value: "ARS", label: `ARS — ${MONEDA_LABELS.ARS}`, description: "Moneda local" },
	                                                        { value: "USD", label: `USD — ${MONEDA_LABELS.USD}`, description: "Moneda extranjera" }
	                                                    ]}
	                                                />
	                                                {editingContract && (
	                                                    <p className="mt-1 text-xs text-content-muted">
	                                                        Si el contrato ya tiene liquidaciones, pagos o caja asociada, no se puede modificar.
	                                                    </p>
	                                                )}
	                                            </div>
	                                            <div>
	                                                <label htmlFor="contract-rent-amount" className="block text-xs font-medium text-gray-700 mb-1">
	                                                    Alquiler Mensual *
                                                </label>
                                                <NumericInput
                                                    id="contract-rent-amount"
                                                    name="montoAlquiler"
                                                    required
                                                    className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-2 px-3"
                                                    value={formData.montoAlquiler}
                                                    onChange={(val) => setFormData(prev => ({ ...prev, montoAlquiler: val.toString() }))}
                                                    icon={<BanknotesIcon className="w-5 h-5 text-gray-600" />}
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
                                                Si se cobra un honorario único por firmar este contrato, regístralo aquí. Se sumará automáticamente a Gestión financiera.
                                            </p>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                    <label htmlFor="contract-initial-fee" className="block text-xs font-medium text-green-800 mb-1">
                                                        Monto Honorario de Alta
                                                    </label>
                                                    <NumericInput
                                                        id="contract-initial-fee"
                                                        name="honorarioInicial"
                                                        className="w-full rounded-lg border-green-300 bg-white shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm py-2 px-3"
                                                        placeholder="Monto a cobrar hoy..."
                                                        value={formData.honorarioInicial}
                                                        onChange={(val) => setFormData(prev => ({ ...prev, honorarioInicial: val.toString() }))}
                                                        icon={<BanknotesIcon className="w-5 h-5 text-green-400" />}
                                                    />
                                                </div>
                                                <div>
                                                    <label htmlFor="contract-initial-fee-method" className="block text-xs font-medium text-green-800 mb-1">
                                                        Método de Pago *
                                                    </label>
                                                    <AppSelect
                                                        id="contract-initial-fee-method"
                                                        name="honorarioInicialMetodoPago"
                                                        required
                                                        ariaLabel="Método de pago del honorario inicial"
                                                        value={formData.honorarioInicialMetodoPago}
                                                        onChange={(value) => setFormData(prev => ({ ...prev, honorarioInicialMetodoPago: value }))}
                                                        options={[
                                                            { value: "", label: "Seleccionar un método…", disabled: true },
                                                            ...PAYMENT_METHOD_OPTIONS
                                                        ]}
                                                        buttonClassName="border-green-300 focus-visible:border-green-500 focus-visible:ring-green-100 data-open:border-green-500 data-open:ring-green-100"
                                                    />
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
                                            <p className="text-xs text-content-muted">¿La inmobiliaria administra este contrato mensualmente?</p>
                                        </div>
                                        <div className="flex items-center">
                                            <span className={`mr-3 text-xs font-bold ${!formData.administrado ? 'text-indigo-600' : 'text-gray-600'}`}>NO</span>
                                            <button
                                                type="button"
                                                aria-label="La inmobiliaria administra el contrato"
                                                aria-pressed={formData.administrado}
                                                onClick={() => setFormData(prev => ({ ...prev, administrado: !prev.administrado }))}
                                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${formData.administrado ? 'bg-indigo-600' : 'bg-gray-200'}`}
                                            >
                                                <span
                                                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${formData.administrado ? 'translate-x-6' : 'translate-x-1'}`}
                                                />
                                            </button>
                                            <span className={`ml-3 text-xs font-bold ${formData.administrado ? 'text-indigo-600' : 'text-gray-600'}`}>SÍ</span>
                                        </div>
                                    </div>

                                    {/* ─── Vigencia y Fechas ─── */}
                                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                        <h4 className="text-sm font-semibold text-indigo-900 mb-3 uppercase tracking-wide">
                                            Vigencia y Fechas *
                                        </h4>
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                            <div>
                                                <label htmlFor="contract-start-date" className="block text-xs font-medium text-gray-700 mb-1">
                                                    Fecha Inicio *
                                                </label>
                                                <input
                                                    id="contract-start-date"
                                                    type="date"
                                                    name="startDate"
                                                    required
                                                    className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-2 px-3"
                                                    value={formData.startDate}
                                                    onChange={handleChange}
                                                />
                                            </div>
                                            <div>
                                                <label htmlFor="contract-end-date" className="block text-xs font-medium text-gray-700 mb-1">
                                                    Fecha Fin *
                                                </label>
                                                <input
                                                    id="contract-end-date"
                                                    type="date"
                                                    name="endDate"
                                                    required
                                                    className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-2 px-3"
                                                    value={formData.endDate}
                                                    onChange={handleChange}
                                                />
                                            </div>
                                            </div>
                                            <div className="mt-4 flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3">
                                                <div>
                                                    <p className="text-sm font-semibold text-gray-800">Actualización de alquiler</p>
                                                    <p className="text-xs text-content-muted">Define si este contrato tendrá una actualización programada.</p>
                                                </div>
                                                <div className="flex items-center">
                                                    <span className={`mr-3 text-xs font-bold ${!formData.requiereActualizacion ? 'text-indigo-600' : 'text-gray-600'}`}>NO</span>
                                                    <button
                                                        type="button"
                                                        aria-label="El contrato tiene actualización programada"
                                                        aria-pressed={formData.requiereActualizacion}
                                                        onClick={() => setFormData(prev => ({
                                                            ...prev,
                                                            requiereActualizacion: !prev.requiereActualizacion,
                                                            updateDate: prev.requiereActualizacion ? "" : prev.updateDate,
                                                            tipoAjuste: prev.requiereActualizacion ? "" : prev.tipoAjuste,
                                                            porcentajeActualizacion: prev.requiereActualizacion ? "" : prev.porcentajeActualizacion
                                                        }))}
                                                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${formData.requiereActualizacion ? 'bg-indigo-600' : 'bg-gray-200'}`}
                                                    >
                                                        <span
                                                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${formData.requiereActualizacion ? 'translate-x-6' : 'translate-x-1'}`}
                                                        />
                                                    </button>
                                                    <span className={`ml-3 text-xs font-bold ${formData.requiereActualizacion ? 'text-indigo-600' : 'text-gray-600'}`}>SÍ</span>
                                                </div>
                                            </div>
                                            {formData.requiereActualizacion && (
                                                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                    <div>
                                                        <label htmlFor="contract-update-frequency" className="block text-xs font-medium text-gray-700 mb-1">
                                                            Frecuencia Actualiz. (Meses) *
                                                        </label>
                                                        <NumericInput
                                                            id="contract-update-frequency"
                                                            className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-2 px-3"
                                                            required
                                                            placeholder="Ej: 3"
                                                            value={formData.frecuenciaActualizacion}
                                                            onChange={(val) => setFormData(prev => ({ ...prev, frecuenciaActualizacion: val.toString() }))}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label htmlFor="contract-next-update" className="block text-xs font-medium text-gray-700 mb-1">
                                                            Próxima Actualización *
                                                        </label>
                                                        <input
                                                            id="contract-next-update"
                                                            type="date"
                                                            name="updateDate"
                                                            required
                                                            className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-2 px-3"
                                                            value={formData.updateDate}
                                                            onChange={handleChange}
                                                        />
                                                    </div>
                                                </div>
                                            )}
		                                        </div>

		                                    {/* ─── Tipo de Ajuste ─── */}
	                                    {formData.requiereActualizacion && <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
	                                        <h4 className="text-sm font-semibold text-indigo-900 mb-3 uppercase tracking-wide">
	                                            Tipo de Ajuste
                                        </h4>
                                        <div>
                                            <label htmlFor="contract-adjustment-type" className="block text-xs font-medium text-gray-700 mb-1">
                                                Tipo de Ajuste (Ej: IPC trimestral) *
                                            </label>
                                            <input
                                                id="contract-adjustment-type"
                                                type="text"
                                                name="tipoAjuste"
                                                required
                                                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-2 px-3"
                                                placeholder="Ej: IPC trimestral, ICL semestral..."
                                                value={formData.tipoAjuste}
	                                                onChange={handleChange}
	                                            />
	                                        </div>
	                                    </div>}

                                    {/* ─── Observaciones ─── */}
                                    <div>
                                        <label htmlFor="contract-observations" className="block text-xs font-medium text-gray-700 mb-1">
                                            Observaciones (opcional)
                                        </label>
                                        <textarea
                                            id="contract-observations"
                                            name="observations"
                                            rows={3}
                                            className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-2 px-3"
                                            placeholder="Ingresá cualquier observación relevante..."
                                            value={formData.observations}
                                            onChange={handleChange}
                                        />
                                    </div>

                                    {/* ─── Archivos ─── */}
                                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                                        <LocalizedFilePicker
                                            id="contract-main-file"
                                            label="Contrato principal"
                                            accept={MAIN_CONTRACT_ACCEPT}
                                            formatsLabel={MAIN_CONTRACT_FORMATS_LABEL}
                                            selectedFiles={formData.file ? [formData.file] : []}
                                            onFilesSelected={handleFileSelection}
                                            validateFile={validateMainContractFile}
                                            onValidationError={message => toast.error(message)}
                                            disabled={isSubmitting}
                                        />
                                        <LocalizedFilePicker
                                            id="contract-additional-files"
                                            label="Archivos adicionales"
                                            accept={ATTACHMENT_ACCEPT}
                                            formatsLabel={ATTACHMENT_FORMATS_LABEL}
                                            selectedFiles={formData.additionalFiles}
                                            onFilesSelected={handleAdditionalFilesSelection}
                                            validateFile={validateAttachmentFile}
                                            onValidationError={message => toast.error(message)}
                                            multiple
                                            disabled={isSubmitting}
                                        />
                                    </div>

                                    {formData.file && (
                                        <div>
                                            <label htmlFor="contract-document-observation" className="block text-xs font-medium text-gray-700 mb-1">
                                                Observación de esta versión (opcional)
                                            </label>
                                            <textarea
                                                id="contract-document-observation"
                                                name="observacionDocumento"
                                                rows={2}
                                                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-2 px-3"
                                                placeholder="Ej.: Reemplaza el contrato firmado el 01/03/2026"
                                                value={formData.observacionDocumento}
                                                onChange={handleChange}
                                            />
                                            <p className="mt-1 text-xs text-gray-500">
                                                Al reemplazar el contrato principal, la versión anterior se conserva en el historial.
                                            </p>
                                        </div>
                                    )}

                                    {/* Lista de archivos adicionales seleccionados */}
                                    {formData.additionalFiles.length > 0 && (
                                        <div className="bg-gray-50 rounded-lg p-3">
                                            <div className="mb-3 max-w-sm">
                                                <label className="mb-1 block text-xs font-medium text-gray-700">
                                                    Tipo de archivos adicionales
                                                </label>
                                                <AppSelect
                                                    value={formData.tipoArchivosAdicionales}
                                                    onChange={value => setFormData(prev => ({
                                                        ...prev,
                                                        tipoArchivosAdicionales: value as 'ADENDA' | 'ADJUNTO'
                                                    }))}
                                                    options={[
                                                        { value: 'ADJUNTO', label: 'Adjuntos', description: 'Documentación complementaria.' },
                                                        { value: 'ADENDA', label: 'Adendas', description: 'Modifican o complementan el contrato.' }
                                                    ]}
                                                    ariaLabel="Tipo de archivos adicionales"
                                                    disabled={isSubmitting}
                                                />
                                            </div>
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
                                    <div className="sticky bottom-0 -mx-4 -mb-4 flex justify-end gap-3 border-t border-gray-100 bg-white p-4 sm:-mx-6 sm:-mb-6 sm:p-6">
                                        <button
                                            type="button"
                                            onClick={onClose}
                                            disabled={isSubmitting}
                                            className="min-h-11 flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:flex-none"
                                        >
                                            Cancelar
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={isSubmitting}
                                            className="min-h-11 flex-1 px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 shadow-sm sm:flex-none"
                                        >
                                            {isSubmitting ? 'Guardando...' : editingContract ? 'Guardar cambios' : 'Guardar contrato'}
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
