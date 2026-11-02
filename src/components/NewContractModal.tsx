import FieldError, { useFieldValidation } from './FieldError';
import { Fragment, useState, useEffect } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { XMarkIcon, BanknotesIcon, MagnifyingGlassIcon, PlusCircleIcon } from "@heroicons/react/24/outline";
import NumericInput from "./NumericInput";
import AutocompleteSelector from "./AutocompleteSelector";
import { propertiesService, type Property } from "../services/properties.service";
import type { Persona } from "../services/personas.service";
import { type Contract, type ContractDraft } from "../services/contracts.service";
import { toast } from "react-hot-toast";
import { formatCurrency, MONEDA_LABELS, type Moneda } from "../utils/currency";
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
    buildContractDraftData,
    createContractFormFromContract,
    createContractFormFromDraft,
    createEmptyContractForm,
    createRenewalContractForm,
    CONTRACT_SERVICE_EXPENSE_SUGGESTIONS,
    emptyContractParty,
    getContractFormIssue,
    selectExistingParty,
    type ContractParty,
    type ContractServiceExpense
} from "../features/contracts/contract-form.model";
import ContractPartyFields from "../features/contracts/ContractPartyFields";
import { cuentasBancariasService, type CuentaBancaria } from "../services/cuentas-bancarias.service";

interface NewContractModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: any) => void | Promise<void>;
    editingContract?: Contract | null;
    renewingContract?: Contract | null;
    draft?: ContractDraft | null;
    onSaveDraft?: (data: {
        datos: ReturnType<typeof buildContractDraftData>;
        principalFile: File | null;
        additionalFiles: File[];
        additionalFilesType: 'ADENDA' | 'ADJUNTO';
    }, draft: ContractDraft | null) => Promise<ContractDraft>;
    onDeleteDraftAttachment?: (attachmentId: number) => Promise<void>;
}

export default function NewContractModal({
    isOpen,
    onClose,
    onSave,
    editingContract,
    renewingContract,
    draft = null,
    onSaveDraft,
    onDeleteDraftAttachment
}: NewContractModalProps) {
    const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
    // false = manual entry (default); true = searching existing
    const [searchingExistingProperty, setSearchingExistingProperty] = useState(false);
    const [searchingExistingOwner, setSearchingExistingOwner] = useState(false);
    const [searchingExistingTenant, setSearchingExistingTenant] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const validation = useFieldValidation();
    const { error: formError, setError: setFormError, reportError, formRef } = useFormError();

    const [owners, setOwners] = useState<ContractParty[]>([emptyContractParty()]);
    const [tenants, setTenants] = useState<ContractParty[]>([emptyContractParty()]);
    const [formData, setFormData] = useState(createEmptyContractForm);
    const [cuentasBancarias, setCuentasBancarias] = useState<CuentaBancaria[]>([]);

    useEffect(() => {
        if (!isOpen) return;
        void cuentasBancariasService.getAll().then(setCuentasBancarias).catch(() => setCuentasBancarias([]));
    }, [isOpen]);

    useEffect(() => { validation.reset(); setFormError(''); }, [isOpen, editingContract?.id, draft?.id]);

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
        } else if (isOpen && draft) {
            const restored = createContractFormFromDraft(draft.datos);
            setFormData(restored.form);
            setSelectedProperty(restored.selectedProperty);
            setOwners(restored.owners);
            setTenants(restored.tenants);
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
    }, [isOpen, editingContract, renewingContract, draft]);

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
            cuentaCobroAcordadaId: moneda === prev.moneda ? prev.cuentaCobroAcordadaId : '',
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
        validation.clear('contract-owner-group');
        if (owner) {
            setOwners(prev => selectExistingParty(prev, owner));
        } else {
            setOwners(prev => [...prev, emptyContractParty()]);
        }
        setSearchingExistingOwner(false);
    };

    const updateOwner = (index: number, field: string, value: string) => {
        validation.clear('contract-owner-group');
        setOwners(prev => {
            const next = [...prev];
            next[index] = { ...next[index], [field]: value };
            return next;
        });
    };

    const removeOwner = (index: number) => {
        validation.clear('contract-owner-group');
        setOwners(prev => prev.filter((_, i) => i !== index));
    };

    const addTenant = (tenant: Persona | null) => {
        validation.clear('contract-tenant-group');
        if (tenant) {
            setTenants(prev => selectExistingParty(prev, tenant));
        } else {
            setTenants(prev => [...prev, emptyContractParty()]);
        }
        setSearchingExistingTenant(false);
    };

    const updateTenant = (index: number, field: string, value: string) => {
        validation.clear('contract-tenant-group');
        setTenants(prev => {
            const next = [...prev];
            next[index] = { ...next[index], [field]: value };
            return next;
        });
    };

    const removeTenant = (index: number) => {
        validation.clear('contract-tenant-group');
        setTenants(prev => prev.filter((_, i) => i !== index));
    };

    const handleFileSelection = (files: File[]) => {
        validation.clear('contract-main-file');
        setFormData(prev => ({ ...prev, file: files[0] || null }));
    };

    const handleAdditionalFilesSelection = (files: File[]) => {
        validation.clear('contract-additional-files');
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

    const isSuggestedServiceExpense = (concepto: string) =>
        CONTRACT_SERVICE_EXPENSE_SUGGESTIONS.includes(concepto.trim().toLocaleUpperCase('es-AR') as typeof CONTRACT_SERVICE_EXPENSE_SUGGESTIONS[number]);

    const addServiceExpense = () => {
        setFormData(prev => ({
            ...prev,
            serviciosGastos: [...prev.serviciosGastos, { concepto: '', responsable: 'INQUILINO' }]
        }));
    };

    const updateServiceExpense = (index: number, changes: Partial<ContractServiceExpense>) => {
        validation.clear('contract-services');
        setFormData(prev => ({
            ...prev,
            serviciosGastos: prev.serviciosGastos.map((serviceExpense, currentIndex) =>
                currentIndex === index ? { ...serviceExpense, ...changes } : serviceExpense
            )
        }));
    };

    const removeServiceExpense = (index: number) => {
        validation.clear('contract-services');
        setFormData(prev => ({
            ...prev,
            serviciosGastos: prev.serviciosGastos.filter((_, currentIndex) => currentIndex !== index)
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isSubmitting) return;
        setFormError("");

        const validationError = getContractFormIssue(formData, owners, tenants);
        if (validationError) {
            validation.showErrors({ [validationError.field]: validationError.message });
            return;
        }

        validation.reset();
        const dataToSave = {
            ...buildContractPayload(formData, selectedProperty, owners, tenants),
            ...(renewingContract ? { contratoAnteriorId: renewingContract.id } : {}),
            ...(draft ? { borradorId: draft.id } : {})
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

    const handleSaveDraft = async () => {
        if (isSubmitting || !onSaveDraft || editingContract || renewingContract) return;
        setFormError("");
        setIsSubmitting(true);
        try {
            await onSaveDraft({
                datos: buildContractDraftData(formData, selectedProperty, owners, tenants),
                principalFile: formData.file,
                additionalFiles: formData.additionalFiles,
                additionalFilesType: formData.tipoArchivosAdicionales
            }, draft);
            setFormData(prev => ({ ...prev, file: null, additionalFiles: [], observacionDocumento: '' }));
            toast.success('Borrador guardado. Podés retomarlo cuando quieras.');
        } catch (error) {
            reportError(error, 'No se pudo guardar el borrador');
        } finally {
            setIsSubmitting(false);
        }
    };

    const monthlyRent = Number(formData.montoAlquiler);
    const managementFeeRate = Number(formData.porcentajeHonorarios);
    const hasValidMonthlyRent = Number.isFinite(monthlyRent) && monthlyRent > 0;
    const hasValidManagementFeeRate = Number.isFinite(managementFeeRate)
        && managementFeeRate >= 0
        && managementFeeRate <= 100;
    const monthlyManagementFee = hasValidMonthlyRent && hasValidManagementFeeRate
        ? monthlyRent * managementFeeRate / 100
        : null;

    return (
        <Transition appear show={isOpen} as={Fragment}>
            {/* onClose={() => {}} prevents accidental close on backdrop click */}
            <Dialog as="div" className="relative z-50" onClose={() => {}}>
                <Transition.Child
                    as={Fragment}
                    enter="ui-modal-enter-transition"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ui-modal-leave-transition"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" />
                </Transition.Child>

                <div className="fixed inset-0 overflow-hidden">
                    <div className="flex h-full min-h-0 items-end justify-center text-center sm:items-center sm:p-4">
                        <Transition.Child
                            as={Fragment}
                            enter="ui-modal-enter-transition"
                            enterFrom="opacity-0 scale-[0.98]"
                            enterTo="opacity-100 scale-100"
                            leave="ui-modal-leave-transition"
                            leaveFrom="opacity-100 scale-100"
                            leaveTo="opacity-0 scale-[0.98]"
                        >
                            <Dialog.Panel className="flex max-h-[100dvh] w-full max-w-3xl transform flex-col overflow-hidden rounded-t-2xl bg-white text-left align-middle shadow-xl transition-all sm:max-h-[90dvh] sm:rounded-2xl">
                                <div className="shrink-0 flex justify-between items-center border-b border-gray-100 p-4 sm:p-6">
                                    <Dialog.Title
                                        as="h3"
                                        className="text-xl font-bold leading-6 text-gray-900"
                                    >
                                        {editingContract ? 'Editar contrato' : renewingContract ? `Renovar contrato #${renewingContract.id}` : draft ? 'Continuar borrador' : 'Nuevo contrato'}
                                    </Dialog.Title>
                                    <button
                                        onClick={() => !isSubmitting && onClose()}
                                        disabled={isSubmitting}
                                        className="text-gray-600 hover:text-content-muted transition-colors focus:outline-none"
                                    >
                                        <XMarkIcon className="w-6 h-6" />
                                    </button>
                                </div>

                                <form id="contract-form" ref={formRef} onSubmit={handleSubmit} className="modal-scroll flex-1 p-4 sm:p-6 space-y-6">
                                    <FormError message={formError} />
                                    {renewingContract && (
                                        <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4 text-sm text-indigo-950">
                                            <p className="font-semibold">Renovación guiada del contrato #{renewingContract.id}</p>
                                            <p className="mt-1 text-indigo-800">Se copiaron el inmueble, las partes y las condiciones comerciales. Revisá las fechas e importes antes de guardar; no se trasladan liquidaciones, pagos, cuotas ni documentos.</p>
                                        </div>
                                    )}
                                    <div><h3 className="text-base font-semibold text-slate-900">Datos principales del contrato</h3><p className="mt-1 text-sm text-slate-600">Completá los campos obligatorios (*). Después podés agregar acuerdos, observaciones y documentos.</p></div>
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
                                                        {...validation.inputProps('contract-property-address')}
                                                        type="text"
                                                        name="address"
                                                        required
                                                        className="ui-field"
                                                        placeholder="Ej: Av. Corrientes 1234"
                                                        value={selectedProperty ? `${selectedProperty.direccion}` : formData.address}
                                                        onChange={handleChange}
                                                        disabled={!!selectedProperty || !!editingContract || !!renewingContract}
                                                    />
                                                    <FieldError id="contract-property-address" message={validation.errors['contract-property-address']} />
                                                </div>
                                                <div className="sm:col-span-2">
                                                    <label htmlFor="contract-property-floor" className="block text-xs font-medium text-gray-700 mb-1">
                                                        Piso
                                                    </label>
                                                    <input
                                                        id="contract-property-floor"
                                                        type="text"
                                                        name="floor"
                                                        className="ui-field"
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
                                                        className="ui-field"
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
                                            validation={validation}
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
                                            validation={validation}
                                            kind="tenant"
                                            parties={tenants}
                                            editing={!!editingContract || !!renewingContract}
                                            searching={searchingExistingTenant}
                                            onSearchingChange={setSearchingExistingTenant}
                                            onAdd={addTenant}
                                            onUpdate={updateTenant}
                                            onRemove={removeTenant}
                                        />
                                    </div>
                                    {renewingContract && <p className="mt-2 rounded-lg bg-violet-50 p-3 text-xs text-violet-900">La renovación conserva al mismo inquilino. Si va a ocupar el inmueble otra persona, elegí «Nuevo contrato · otro inquilino» para mantener separados ambos historiales.</p>}

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
                                                    {...validation.inputProps('contract-rent-amount')}
                                                    name="montoAlquiler"
                                                    required
                                                    className="ui-field"
                                                    value={formData.montoAlquiler}
                                                    onChange={(val) => setFormData(prev => ({ ...prev, montoAlquiler: val.toString() }))}
                                                    icon={<BanknotesIcon className="w-5 h-5 text-gray-600" />}
                                                />
                                                <FieldError id="contract-rent-amount" message={validation.errors['contract-rent-amount']} />
                                            </div>
                                        </div>
                                        <div className="mt-4 rounded-xl border border-indigo-100 bg-indigo-50 p-4">
                                            <label htmlFor="contract-management-fee-rate" className="block text-sm font-bold text-indigo-950">Honorarios mensuales de gestión (%)</label>
                                            <p className="mt-1 text-xs text-indigo-900">Los abona siempre el propietario. Se calculan únicamente sobre el alquiler mensual vigente y se descuentan de su liquidación.</p>
                                            <input
                                                {...validation.inputProps('contract-management-fee-rate')}
                                                name="porcentajeHonorarios"
                                                type="number"
                                                required
                                                min="0"
                                                max="100"
                                                step="0.01"
                                                value={formData.porcentajeHonorarios}
                                                onChange={event => setFormData(current => ({ ...current, porcentajeHonorarios: event.target.value, pagaHonorarios: 'PROPIETARIO' }))}
                                                className="mt-3 min-h-11 w-full max-w-40 rounded-lg border border-indigo-200 bg-white px-3 text-sm font-bold text-gray-900"
                                            />
                                            <FieldError id="contract-management-fee-rate" message={validation.errors['contract-management-fee-rate']} />
                                            <output
                                                aria-live="polite"
                                                className="mt-3 block rounded-lg border border-indigo-200 bg-white px-3 py-2 text-sm text-indigo-950"
                                            >
                                                {monthlyManagementFee === null
                                                    ? 'Ingresá el alquiler mensual y un porcentaje válido para ver el importe.'
                                                    : <>Honorarios mensuales de gestión: <strong>{formatCurrency(monthlyManagementFee, formData.moneda)}</strong></>}
                                            </output>
                                        </div>
                                    </div>

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
                                                    {...validation.inputProps('contract-start-date')}
                                                    type="date"
                                                    name="startDate"
                                                    required
                                                    className="ui-field"
                                                    value={formData.startDate}
                                                    onChange={handleChange}
                                                />
                                                <FieldError id="contract-start-date" message={validation.errors['contract-start-date']} />
                                            </div>
                                            <div>
                                                <label htmlFor="contract-end-date" className="block text-xs font-medium text-gray-700 mb-1">
                                                    Fecha Fin *
                                                </label>
                                                <input
                                                    {...validation.inputProps('contract-end-date')}
                                                    type="date"
                                                    name="endDate"
                                                    required
                                                    className="ui-field"
                                                    value={formData.endDate}
                                                    onChange={handleChange}
                                                />
                                                <FieldError id="contract-end-date" message={validation.errors['contract-end-date']} />
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
                                                            {...validation.inputProps('contract-update-frequency')}
                                                            className="ui-field"
                                                            required
                                                            placeholder="Ej: 3"
                                                            value={formData.frecuenciaActualizacion}
                                                            onChange={(val) => setFormData(prev => ({ ...prev, frecuenciaActualizacion: val.toString() }))}
                                                        />
                                                        <FieldError id="contract-update-frequency" message={validation.errors['contract-update-frequency']} />
                                                    </div>
                                                    <div>
                                                        <label htmlFor="contract-next-update" className="block text-xs font-medium text-gray-700 mb-1">
                                                            Próxima Actualización *
                                                        </label>
                                                        <input
                                                            {...validation.inputProps('contract-next-update')}
                                                            type="date"
                                                            name="updateDate"
                                                            required
                                                            className="ui-field"
                                                            value={formData.updateDate}
                                                            onChange={handleChange}
                                                        />
                                                        <FieldError id="contract-next-update" message={validation.errors['contract-next-update']} />
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
                                                {...validation.inputProps('contract-adjustment-type')}
                                                type="text"
                                                name="tipoAjuste"
                                                required
                                                className="ui-field"
                                                placeholder="Ej: IPC trimestral, ICL semestral..."
                                                value={formData.tipoAjuste}
	                                                onChange={handleChange}
	                                            />
	                                            <FieldError id="contract-adjustment-type" message={validation.errors['contract-adjustment-type']} />
	                                        </div>
	                                    </div>}

                                    <div className="border-t border-slate-200 pt-6"><h3 className="text-base font-semibold text-slate-900">Acuerdos e información opcional</h3><p className="mt-1 text-sm text-slate-600">Completá sólo lo que corresponda. Si registrás un cobro o una transferencia, indicá también su medio y cuenta.</p></div>
                                    <section className="rounded-xl border border-gray-200 bg-white p-4">
                                        <h4 className="text-sm font-semibold uppercase tracking-wide text-indigo-900">Pago del alquiler y entrega al propietario</h4>
                                        <p className="mt-1 text-xs text-gray-600">Estas modalidades son las acordadas. Cada cobro y entrega conservará el medio realmente utilizado.</p>
                                        <div className="mt-3 grid gap-3 sm:grid-cols-3">
                                            <label className="text-sm font-medium text-gray-800">Día de vencimiento
                                                <NumericInput min="1" max="31" value={formData.diaVencimiento} onChange={value => setFormData(current => ({ ...current, diaVencimiento: String(value) }))} className="mt-1 w-full rounded-lg border-gray-300" />
                                            </label>
                                            <div><label className="text-sm font-medium text-gray-800">Cobro acordado con inquilino</label><AppSelect ariaLabel="Cobro acordado con inquilino" value={formData.modalidadCobroInquilino} onChange={value => setFormData(current => ({ ...current, modalidadCobroInquilino: value, cuentaCobroAcordadaId: value === 'TRANSFERENCIA' ? current.cuentaCobroAcordadaId : '' }))} options={[{ value: '', label: 'Sin acordar' }, ...PAYMENT_METHOD_OPTIONS]} className="mt-1" /></div>
                                            <div><label className="text-sm font-medium text-gray-800">Pago acordado con propietario</label><AppSelect ariaLabel="Pago acordado con propietario" value={formData.modalidadPagoPropietario} onChange={value => setFormData(current => ({ ...current, modalidadPagoPropietario: value }))} options={[{ value: '', label: 'Sin acordar' }, ...PAYMENT_METHOD_OPTIONS]} className="mt-1" /></div>
                                        </div>
                                        {formData.modalidadCobroInquilino === 'TRANSFERENCIA' && <div className="mt-3"><label className="text-sm font-medium text-gray-800">Cuenta acordada para recibir la transferencia</label><AppSelect {...validation.ariaProps('contract-agreed-account')} ariaLabel="Cuenta acordada para recibir la transferencia" value={formData.cuentaCobroAcordadaId} onChange={value => { validation.clear('contract-agreed-account'); setFormData(current => ({ ...current, cuentaCobroAcordadaId: value })); }} options={[{ value: '', label: 'Seleccionar cuenta bancaria' }, ...cuentasBancarias.filter(account => account.activa && account.moneda === formData.moneda).map(account => ({ value: String(account.id), label: `${account.banco} · ${account.nombre}` }))]} className="mt-1" /><p className="mt-1 text-xs text-gray-600">Se mostrará por nombre y banco en la liquidación y el comprobante.</p><FieldError id="contract-agreed-account" message={validation.errors['contract-agreed-account']} /></div>}
                                    </section>

                                    {/* ─── Servicios y gastos ─── */}
                                    <section className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-4">
                                        <div className="flex flex-wrap items-start justify-between gap-3">
                                            <div>
                                                <h4 id="contract-services" tabIndex={-1} className="text-sm font-semibold uppercase tracking-wide text-indigo-900">Servicios y gastos</h4><FieldError id="contract-services" message={validation.errors['contract-services']} />
                                                <p className="mt-1 text-xs text-indigo-800">Indicá a quién corresponde cada concepto según el contrato. Es sólo una referencia: no genera importes ni movimientos.</p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={addServiceExpense}
                                                className="inline-flex min-h-10 shrink-0 items-center gap-1 rounded-lg border border-indigo-200 bg-white px-3 text-xs font-semibold text-indigo-700 hover:bg-indigo-50"
                                            >
                                                <PlusCircleIcon className="h-4 w-4" />
                                                Agregar concepto
                                            </button>
                                        </div>

                                        {formData.serviciosGastos.length > 0 && (
                                            <div className="mt-4 space-y-3">
                                                {formData.serviciosGastos.map((serviceExpense, index) => {
                                                    const isSuggested = isSuggestedServiceExpense(serviceExpense.concepto);
                                                    return (
                                                        <div key={index} className="grid grid-cols-1 gap-3 rounded-lg border border-indigo-100 bg-white p-3 sm:grid-cols-[minmax(0,1fr)_minmax(10rem,0.7fr)_auto] sm:items-start">
                                                            <div>
                                                                <label htmlFor={`contract-service-expense-${index}`} className="sr-only">Servicio o gasto</label>
                                                                <AppSelect
                                                                    id={`contract-service-expense-${index}`}
                                                                    ariaLabel={`Servicio o gasto ${index + 1}`}
                                                                    value={isSuggested ? serviceExpense.concepto.trim().toLocaleUpperCase('es-AR') : '__OTRO__'}
                                                                    onChange={value => updateServiceExpense(index, { concepto: value === '__OTRO__' ? '' : value })}
                                                                    options={[
                                                                        ...CONTRACT_SERVICE_EXPENSE_SUGGESTIONS.map(concepto => ({ value: concepto, label: concepto })),
                                                                        { value: '__OTRO__', label: 'Otro concepto…' }
                                                                    ]}
                                                                    buttonClassName="border-gray-300 bg-white font-medium"
                                                                />
                                                                {!isSuggested && (
                                                                    <input
                                                                        aria-label={`Otro servicio o gasto ${index + 1}`}
                                                                        value={serviceExpense.concepto}
                                                                        onChange={event => updateServiceExpense(index, { concepto: event.target.value })}
                                                                        maxLength={120}
                                                                        placeholder="Ej.: mantenimiento de pileta"
                                                                        className="mt-2 min-h-11 w-full rounded-lg border border-gray-300 px-3 text-sm text-gray-900 focus:border-indigo-500 focus:ring-indigo-500"
                                                                    />
                                                                )}
                                                            </div>
                                                            <div>
                                                                <label htmlFor={`contract-service-expense-owner-${index}`} className="sr-only">Responsable</label>
                                                                <AppSelect
                                                                    id={`contract-service-expense-owner-${index}`}
                                                                    ariaLabel={`Responsable de ${serviceExpense.concepto || 'servicio o gasto'}`}
                                                                    value={serviceExpense.responsable}
                                                                    onChange={value => updateServiceExpense(index, { responsable: value as ContractServiceExpense['responsable'] })}
                                                                    options={[
                                                                        { value: 'INQUILINO', label: 'Inquilino' },
                                                                        { value: 'PROPIETARIO', label: 'Propietario' }
                                                                    ]}
                                                                    buttonClassName="border-gray-300 bg-white font-medium"
                                                                />
                                                            </div>
                                                            <button
                                                                type="button"
                                                                onClick={() => removeServiceExpense(index)}
                                                                className="flex min-h-11 items-center justify-center rounded-lg border border-red-200 px-3 text-sm font-medium text-red-700 hover:bg-red-50"
                                                                aria-label={`Quitar ${serviceExpense.concepto || 'servicio o gasto'}`}
                                                            >
                                                                <XMarkIcon className="h-4 w-4" />
                                                            </button>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </section>

                                    {/* ─── Honorarios por Alta de Contrato ─── */}
                                    {!editingContract && (
                                        <div className="bg-green-50 p-4 rounded-xl border border-green-100">
                                            <h4 className="text-sm font-semibold text-green-900 mb-3 uppercase tracking-wide">
                                                Honorarios por Alta de Contrato
                                            </h4>
                                            <p className="text-xs text-green-700 mb-3">
                                                Si se cobra un honorario único por firmar este contrato, regístralo aquí. Se sumará automáticamente a Gestión financiera.
                                            </p>
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
                                                        icon={<span className="text-sm font-semibold text-green-700">{formData.monedaHonorarioInicial === 'USD' ? 'US$' : '$'}</span>}
                                                    />
                                                </div>
                                                <div>
                                                    <label htmlFor="contract-initial-fee-currency" className="block text-xs font-medium text-green-800 mb-1">
                                                        Moneda del honorario
                                                    </label>
                                                    <AppSelect
                                                        id="contract-initial-fee-currency"
                                                        name="monedaHonorarioInicial"
                                                        ariaLabel="Moneda del honorario de alta"
                                                        value={formData.monedaHonorarioInicial}
                                                        onChange={(value) => setFormData(prev => ({ ...prev, monedaHonorarioInicial: value as Moneda, honorarioInicialCuentaBancariaId: '' }))}
                                                        options={[
                                                            { value: 'ARS', label: `ARS — ${MONEDA_LABELS.ARS}` },
                                                            { value: 'USD', label: `USD — ${MONEDA_LABELS.USD}` }
                                                        ]}
                                                        buttonClassName="border-green-300 focus-visible:border-green-500 focus-visible:ring-green-100 data-open:border-green-500 data-open:ring-green-100"
                                                    />
                                                </div>
                                                <div>
                                                    <label htmlFor="contract-initial-fee-method" className="block text-xs font-medium text-green-800 mb-1">
                                                        Método de Pago *
                                                    </label>
                                                    <AppSelect
                                                        {...validation.ariaProps('contract-initial-fee-method')}
                                                        name="honorarioInicialMetodoPago"
                                                        required
                                                        ariaLabel="Método de pago del honorario inicial"
                                                        value={formData.honorarioInicialMetodoPago}
                                                        onChange={(value) => setFormData(prev => ({ ...prev, honorarioInicialMetodoPago: value, honorarioInicialCuentaBancariaId: value === 'EFECTIVO' ? '' : prev.honorarioInicialCuentaBancariaId }))}
                                                        options={[
                                                            { value: "", label: "Seleccionar un método…", disabled: true },
                                                            ...PAYMENT_METHOD_OPTIONS
                                                        ]}
                                                        buttonClassName="border-green-300 focus-visible:border-green-500 focus-visible:ring-green-100 data-open:border-green-500 data-open:ring-green-100"
                                                    />
                                                    <FieldError id="contract-initial-fee-method" message={validation.errors['contract-initial-fee-method']} />
                                                </div>
                                            </div>
                                            {formData.honorarioInicialMetodoPago && formData.honorarioInicialMetodoPago !== 'EFECTIVO' && <div className="mt-4">
                                                <label htmlFor="contract-initial-fee-bank" className="block text-xs font-medium text-green-800 mb-1">Banco / cuenta donde ingresó *</label>
                                                <AppSelect
                                                    {...validation.ariaProps('contract-initial-fee-bank')}
                                                    ariaLabel="Cuenta bancaria del honorario inicial"
                                                    required
                                                    value={formData.honorarioInicialCuentaBancariaId}
                                                    onChange={value => setFormData(prev => ({ ...prev, honorarioInicialCuentaBancariaId: value }))}
                                                    options={[{ value: '', label: cuentasBancarias.some(cuenta => cuenta.moneda === formData.monedaHonorarioInicial) ? 'Seleccionar cuenta' : 'No hay cuentas activas para esta moneda' }, ...cuentasBancarias.filter(cuenta => cuenta.moneda === formData.monedaHonorarioInicial).map(cuenta => ({ value: String(cuenta.id), label: `${cuenta.banco} — ${cuenta.nombre}` }))]}
                                                    buttonClassName="border-green-300 focus-visible:border-green-500 focus-visible:ring-green-100"
                                                />
                                                <FieldError id="contract-initial-fee-bank" message={validation.errors['contract-initial-fee-bank']} />
                                            </div>}
                                        </div>
                                    )}

                                    {/* ─── Observaciones ─── */}
                                    <div>
                                        <label htmlFor="contract-observations" className="block text-xs font-medium text-gray-700 mb-1">
                                            Observaciones (opcional)
                                        </label>
                                        <textarea
                                            id="contract-observations"
                                            name="observations"
                                            rows={3}
                                            className="ui-field"
                                            placeholder="Ingresá cualquier observación relevante..."
                                            value={formData.observations}
                                            onChange={handleChange}
                                        />
                                    </div>

                                    {/* ─── Archivos ─── */}
                                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                                        <LocalizedFilePicker
                                            id="contract-main-file"
                                            errorMessage={validation.errors['contract-main-file']}
                                            label="Contrato principal"
                                            accept={MAIN_CONTRACT_ACCEPT}
                                            formatsLabel={MAIN_CONTRACT_FORMATS_LABEL}
                                            selectedFiles={formData.file ? [formData.file] : []}
                                            onFilesSelected={handleFileSelection}
                                            validateFile={validateMainContractFile}
                                            onValidationError={message => validation.showErrors({ 'contract-main-file': message })}
                                            disabled={isSubmitting}
                                        />
                                        <LocalizedFilePicker
                                            id="contract-additional-files"
                                            errorMessage={validation.errors['contract-additional-files']}
                                            label="Archivos adicionales"
                                            accept={ATTACHMENT_ACCEPT}
                                            formatsLabel={ATTACHMENT_FORMATS_LABEL}
                                            selectedFiles={formData.additionalFiles}
                                            onFilesSelected={handleAdditionalFilesSelection}
                                            validateFile={validateAttachmentFile}
                                            onValidationError={message => validation.showErrors({ 'contract-additional-files': message })}
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
                                                className="ui-field"
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

                                    {draft && draft.adjuntos.length > 0 && (
                                        <div className="rounded-lg border border-indigo-100 bg-indigo-50 p-3" aria-label="Documentos guardados en el borrador">
                                            <p className="text-xs font-semibold text-indigo-900">Documentos guardados en el borrador</p>
                                            <p className="mt-1 text-xs text-indigo-800">Se incorporarán al contrato al finalizarlo.</p>
                                            <ul className="mt-2 space-y-2">
                                                {draft.adjuntos.map(attachment => (
                                                    <li key={attachment.id} className="flex items-center justify-between gap-3 rounded bg-white px-3 py-2 text-sm text-gray-700">
                                                        <span className="min-w-0 truncate">{attachment.nombreArchivo} <span className="text-xs text-gray-500">({attachment.tipo === 'CONTRATO_PRINCIPAL' ? 'principal' : attachment.tipo.toLowerCase()})</span></span>
                                                        <button
                                                            type="button"
                                                            disabled={isSubmitting}
                                                            onClick={() => void onDeleteDraftAttachment?.(attachment.id)}
                                                            className="shrink-0 text-xs font-semibold text-red-600 hover:text-red-800 disabled:opacity-50"
                                                        >
                                                            Quitar
                                                        </button>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                </form>
                                    {/* ─── Footer Actions ─── */}
                                    <div className="grid shrink-0 grid-cols-2 gap-2 border-t border-gray-100 bg-white p-4 sm:flex sm:justify-end sm:px-6">
                                        <button
                                            type="button"
                                            onClick={onClose}
                                            disabled={isSubmitting}
                                            className="min-h-11 flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:flex-none"
                                        >
                                            Cancelar
                                        </button>
                                        {!editingContract && !renewingContract && onSaveDraft && (
                                            <button
                                                type="button"
                                                onClick={handleSaveDraft}
                                                disabled={isSubmitting}
                                                className="min-h-11 flex-1 rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 sm:flex-none"
                                            >
                                                {isSubmitting ? 'Guardando...' : 'Guardar borrador'}
                                            </button>
                                        )}
                                        <button
                                            type="submit"
                                            form="contract-form"
                                            disabled={isSubmitting}
                                            className={`ui-button ui-button-primary ${!editingContract && !renewingContract && onSaveDraft ? 'col-span-2' : ''} sm:flex-none`}
                                        >
                                            {isSubmitting ? 'Guardando...' : editingContract ? 'Guardar cambios' : 'Guardar contrato'}
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
