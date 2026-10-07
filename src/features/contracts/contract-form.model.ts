import type { Contract } from '../../services/contracts.service';
import type { Persona } from '../../services/personas.service';
import type { Property } from '../../services/properties.service';
import type { Moneda } from '../../utils/currency';
import { validateAttachmentFile, validateMainContractFile } from '../../utils/documentFiles';
import { addDaysToDateInput, addMonthsToDateInput, toDateInputValue } from '../../utils/date';

export type ContractParty = { id?: number; nombreCompleto: string; telefono: string };
export type ContractServiceExpense = {
    id?: number;
    concepto: string;
    responsable: 'INQUILINO' | 'PROPIETARIO';
};

export const CONTRACT_SERVICE_EXPENSE_SUGGESTIONS = [
    'ABL',
    'LUZ',
    'GAS',
    'AGUA',
    'WIFI / CABLE',
    'SEGURO CONTRAINCENDIOS',
    'EXPENSAS COMUNES',
    'EXPENSAS EXTRAORDINARIAS'
] as const;

export type ContractFormData = {
    address: string;
    floor: string;
    unit: string;
    startDate: string;
    endDate: string;
    updateDate: string;
    montoAlquiler: string;
    moneda: Moneda;
    montoHonorarios: string;
    porcentajeHonorarios: string;
    porcentajeActualizacion: string;
    pagaHonorarios: string;
    diaVencimiento: string;
    modalidadCobroInquilino: string;
    modalidadPagoPropietario: string;
    cuentaCobroAcordadaId: string;
    tipoAjuste: string;
    file: File | null;
    observacionDocumento: string;
    observations: string;
    serviciosGastos: ContractServiceExpense[];
    additionalFiles: File[];
    tipoArchivosAdicionales: 'ADENDA' | 'ADJUNTO';
    administrado: boolean;
    requiereActualizacion: boolean;
    frecuenciaActualizacion: string;
    honorarioInicial: string;
    monedaHonorarioInicial: Moneda;
    honorarioInicialMetodoPago: string;
    honorarioInicialCuentaBancariaId: string;
};

export type ContractDraftData = {
    form: Omit<ContractFormData, 'file' | 'additionalFiles'>;
    selectedProperty: Pick<Property, 'id' | 'direccion' | 'piso' | 'departamento'> | null;
    owners: ContractParty[];
    tenants: ContractParty[];
};

export const emptyContractParty = (): ContractParty => ({ nombreCompleto: '', telefono: '' });

const isEmptyParty = (party: ContractParty) =>
    !party.id && !party.nombreCompleto.trim() && !party.telefono.trim();

export const selectExistingParty = (parties: ContractParty[], person: Persona): ContractParty[] => {
    const selected = { id: person.id, nombreCompleto: person.nombreCompleto, telefono: person.telefono || '' };
    if (parties.some(party => party.id === person.id)) return parties.filter(party => !isEmptyParty(party));
    const emptyIndex = parties.findIndex(isEmptyParty);
    return emptyIndex === -1
        ? [...parties, selected]
        : parties.map((party, index) => index === emptyIndex ? selected : party);
};

export const createEmptyContractForm = (): ContractFormData => ({
    address: '', floor: '', unit: '', startDate: '', endDate: '', updateDate: '',
    montoAlquiler: '', moneda: 'ARS', montoHonorarios: '', porcentajeHonorarios: '5',
    porcentajeActualizacion: '', pagaHonorarios: 'PROPIETARIO', diaVencimiento: '10',
    modalidadCobroInquilino: '', modalidadPagoPropietario: '', cuentaCobroAcordadaId: '',
    tipoAjuste: '', file: null, observacionDocumento: '', observations: '', additionalFiles: [],
    serviciosGastos: [],
    tipoArchivosAdicionales: 'ADJUNTO', administrado: true,
    requiereActualizacion: true, frecuenciaActualizacion: '3', honorarioInicial: '', monedaHonorarioInicial: 'ARS',
    honorarioInicialMetodoPago: '', honorarioInicialCuentaBancariaId: ''
});

export const createContractFormFromContract = (contract: Contract): ContractFormData => ({
    address: contract.propiedad.direccion,
    floor: contract.propiedad.piso || '',
    unit: contract.propiedad.departamento || '',
    startDate: toDateInputValue(contract.fechaInicio),
    endDate: toDateInputValue(contract.fechaFin),
    updateDate: toDateInputValue(contract.fechaProximaActualizacion),
    montoAlquiler: contract.montoAlquiler.toString(),
    moneda: contract.moneda || 'ARS',
    montoHonorarios: contract.montoHonorarios.toString(),
    porcentajeHonorarios: contract.porcentajeHonorarios?.toString() ?? '5',
    porcentajeActualizacion: contract.porcentajeActualizacion?.toString() || '',
    pagaHonorarios: 'PROPIETARIO',
    diaVencimiento: contract.diaVencimiento.toString(),
    modalidadCobroInquilino: contract.modalidadCobroInquilino || '',
    modalidadPagoPropietario: contract.modalidadPagoPropietario || '',
    cuentaCobroAcordadaId: contract.cuentaCobroAcordadaId?.toString() || '',
    tipoAjuste: contract.tipoAjuste || '',
    file: null,
    observacionDocumento: '',
    observations: contract.observaciones || '',
    serviciosGastos: (contract.serviciosGastos || []).map(({ concepto, responsable }) => ({ concepto, responsable })),
    additionalFiles: [],
    tipoArchivosAdicionales: 'ADJUNTO',
    administrado: contract.administrado,
    requiereActualizacion: contract.requiereActualizacion ?? true,
    frecuenciaActualizacion: '3',
    honorarioInicial: '', monedaHonorarioInicial: 'ARS',
    honorarioInicialMetodoPago: '', honorarioInicialCuentaBancariaId: ''
});

/**
 * Copies only reusable commercial terms. The new contract starts after the
 * previous effective term and deliberately starts with no documents or money.
 */
export const createRenewalContractForm = (contract: Contract): ContractFormData => {
    const previousStart = toDateInputValue(contract.fechaInicio);
    const previousEffectiveEnd = toDateInputValue(contract.fechaRescision || contract.fechaFin);
    const previousOriginalEnd = toDateInputValue(contract.fechaFin);
    const nextStart = addDaysToDateInput(previousEffectiveEnd, 1);
    const durationDays = previousStart && previousOriginalEnd
        ? Math.max(0, Math.round((Date.parse(`${previousOriginalEnd}T00:00:00.000Z`) - Date.parse(`${previousStart}T00:00:00.000Z`)) / 86_400_000))
        : 0;
    const copied = createContractFormFromContract(contract);

    return {
        ...copied,
        startDate: nextStart,
        endDate: addDaysToDateInput(nextStart, durationDays),
        updateDate: contract.requiereActualizacion ? addMonthsToDateInput(nextStart, 3) : '',
        observations: `Renovación del contrato #${contract.id}.`,
        file: null,
        observacionDocumento: '',
        additionalFiles: [],
        honorarioInicial: '',
        monedaHonorarioInicial: 'ARS',
        honorarioInicialMetodoPago: '', honorarioInicialCuentaBancariaId: ''
    };
};

export const getContractFormError = (
    form: ContractFormData,
    owners: ContractParty[],
    tenants: ContractParty[]
): string | null => {
    if (owners.length === 0 || owners.some(owner => !owner.nombreCompleto.trim())) {
        return 'Agregá al menos un propietario con nombre completo.';
    }
    if (tenants.length === 0 || tenants.some(tenant => !tenant.nombreCompleto.trim())) {
        return 'Agregá al menos un inquilino con nombre completo.';
    }
    const ownerIds = owners.flatMap(owner => owner.id ? [owner.id] : []);
    const tenantIds = tenants.flatMap(tenant => tenant.id ? [tenant.id] : []);
    if (new Set(ownerIds).size !== ownerIds.length) {
        return 'No se puede repetir una persona entre los propietarios del mismo contrato.';
    }
    if (new Set(tenantIds).size !== tenantIds.length) {
        return 'No se puede repetir una persona entre los inquilinos del mismo contrato.';
    }
    if (ownerIds.some(id => tenantIds.includes(id))) {
        return 'Una persona no puede ser a la vez propietario e inquilino del mismo contrato.';
    }
    if (!form.startDate || !form.endDate) return 'Las fechas de inicio y fin son obligatorias.';
    if (form.porcentajeHonorarios === '' || !Number.isFinite(Number(form.porcentajeHonorarios)) || Number(form.porcentajeHonorarios) < 0 || Number(form.porcentajeHonorarios) > 100) {
        return 'Indicá un porcentaje de honorarios entre 0 y 100.';
    }
    if (form.requiereActualizacion && !form.updateDate) {
        return 'La próxima actualización es obligatoria si el contrato tiene actualización programada.';
    }
    const emptyServiceExpense = form.serviciosGastos.find(serviceExpense => !serviceExpense.concepto.trim());
    if (emptyServiceExpense) return 'Indicá el nombre de cada servicio o gasto que agregaste.';
    const normalizedServiceExpenses = form.serviciosGastos.map(serviceExpense => serviceExpense.concepto
        .trim()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLocaleUpperCase('es-AR'));
    if (new Set(normalizedServiceExpenses).size !== normalizedServiceExpenses.length) {
        return 'No se puede repetir un servicio o gasto en el mismo contrato.';
    }
    if (form.honorarioInicial && !form.honorarioInicialMetodoPago) {
        return 'Seleccioná un método de pago para el honorario inicial.';
    }
    if (form.modalidadCobroInquilino === 'TRANSFERENCIA' && !form.cuentaCobroAcordadaId) {
        return 'Seleccioná la cuenta acordada para cobrar las transferencias del inquilino.';
    }
    if (Number(form.honorarioInicial) > 0 && form.honorarioInicialMetodoPago && form.honorarioInicialMetodoPago !== 'EFECTIVO' && !form.honorarioInicialCuentaBancariaId) {
        return 'Seleccioná la cuenta bancaria donde ingresó el honorario inicial.';
    }
    if (form.file) {
        const error = validateMainContractFile(form.file);
        if (error) return error;
    }
    const invalidAttachment = form.additionalFiles.find(file => validateAttachmentFile(file));
    return invalidAttachment ? validateAttachmentFile(invalidAttachment) || 'Formato no permitido' : null;
};

export const buildContractPayload = (
    form: ContractFormData,
    selectedProperty: Property | null,
    owners: ContractParty[],
    tenants: ContractParty[]
) => ({
    ...form,
    propiedadId: selectedProperty?.id,
    propiedad: selectedProperty ? undefined : {
        direccion: form.address,
        piso: form.floor || null,
        departamento: form.unit || null,
        tipo: 'DEPARTAMENTO',
        estado: 'DISPONIBLE',
        observaciones: null
    },
    propietarios: owners.map(owner => ({
        id: owner.id,
        nombreCompleto: owner.nombreCompleto.trim(),
        telefono: owner.telefono.trim() || null,
        estado: 'ACTIVO'
    })),
    inquilinos: tenants.map(tenant => ({
        id: tenant.id,
        nombreCompleto: tenant.nombreCompleto.trim(),
        telefono: tenant.telefono.trim() || null,
        estado: 'ACTIVO'
    }))
});

export const buildContractDraftData = (
    form: ContractFormData,
    selectedProperty: Property | null,
    owners: ContractParty[],
    tenants: ContractParty[]
): ContractDraftData => {
    const { file: _file, additionalFiles: _additionalFiles, ...draftForm } = form;
    return {
        form: draftForm,
        selectedProperty: selectedProperty ? {
            id: selectedProperty.id,
            direccion: selectedProperty.direccion,
            piso: selectedProperty.piso,
            departamento: selectedProperty.departamento
        } : null,
        owners,
        tenants
    };
};

export const createContractFormFromDraft = (draft: ContractDraftData) => ({
    form: {
        ...createEmptyContractForm(),
        ...draft.form,
        file: null,
        additionalFiles: []
    },
    selectedProperty: draft.selectedProperty as Property | null,
    owners: draft.owners.length ? draft.owners : [emptyContractParty()],
    tenants: draft.tenants.length ? draft.tenants : [emptyContractParty()]
});
