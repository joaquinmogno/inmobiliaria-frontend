import type { Contract } from '../../services/contracts.service';
import type { Persona } from '../../services/personas.service';
import type { Property } from '../../services/properties.service';
import type { Moneda } from '../../utils/currency';
import { validateAttachmentFile, validateMainContractFile } from '../../utils/documentFiles';
import { addDaysToDateInput, addMonthsToDateInput, toDateInputValue } from '../../utils/date';

export type ContractParty = { id?: number; nombreCompleto: string; telefono: string };

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
    tipoAjuste: string;
    file: File | null;
    observacionDocumento: string;
    observations: string;
    additionalFiles: File[];
    tipoArchivosAdicionales: 'ADENDA' | 'ADJUNTO';
    administrado: boolean;
    requiereActualizacion: boolean;
    frecuenciaActualizacion: string;
    honorarioInicial: string;
    honorarioInicialMetodoPago: string;
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
    montoAlquiler: '', moneda: 'ARS', montoHonorarios: '', porcentajeHonorarios: '',
    porcentajeActualizacion: '', pagaHonorarios: 'INQUILINO', diaVencimiento: '10',
    tipoAjuste: '', file: null, observacionDocumento: '', observations: '', additionalFiles: [],
    tipoArchivosAdicionales: 'ADJUNTO', administrado: true,
    requiereActualizacion: true, frecuenciaActualizacion: '3', honorarioInicial: '',
    honorarioInicialMetodoPago: ''
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
    porcentajeHonorarios: contract.porcentajeHonorarios?.toString() || '',
    porcentajeActualizacion: contract.porcentajeActualizacion?.toString() || '',
    pagaHonorarios: contract.pagaHonorarios as string,
    diaVencimiento: contract.diaVencimiento.toString(),
    tipoAjuste: contract.tipoAjuste || '',
    file: null,
    observacionDocumento: '',
    observations: contract.observaciones || '',
    additionalFiles: [],
    tipoArchivosAdicionales: 'ADJUNTO',
    administrado: contract.administrado,
    requiereActualizacion: contract.requiereActualizacion ?? true,
    frecuenciaActualizacion: '3',
    honorarioInicial: '',
    honorarioInicialMetodoPago: ''
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
        honorarioInicialMetodoPago: ''
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
    if (form.requiereActualizacion && !form.updateDate) {
        return 'La próxima actualización es obligatoria si el contrato tiene actualización programada.';
    }
    if (form.honorarioInicial && !form.honorarioInicialMetodoPago) {
        return 'Seleccioná un método de pago para el honorario inicial.';
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
