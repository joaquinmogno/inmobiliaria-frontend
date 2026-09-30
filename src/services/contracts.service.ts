import api from './api';
import type { PaginatedResponse } from './api';
import type { PaginationMeta } from './api';
import type { AuditLogItem } from '../components/AuditTrail';
import type { Moneda } from '../utils/currency';
import { getDaysFromToday } from '../utils/date';
import type { ContractDraftData, ContractServiceExpense } from '../features/contracts/contract-form.model';

export type EstadoContrato = 'PROGRAMADO' | 'ACTIVO' | 'PAPELERA' | 'FINALIZADO' | 'RESCINDIDO';
export type PagadorHonorarios = 'INQUILINO' | 'PROPIETARIO';
export type TipoDocumentoContrato = 'CONTRATO_PRINCIPAL' | 'ADENDA' | 'ADJUNTO';

export interface ContractUpdateHistory {
    id: number;
    fechaActualizacion: string;
    montoAnterior: number;
    montoNuevo: number;
    moneda: Moneda;
    fechaProximaAnterior: string | null;
    fechaProximaNueva: string;
    observaciones: string | null;
    usuario?: {
        nombreCompleto: string;
    };
}

export interface ContractRenewalTimelineEntry {
    id: number;
    contratoAnteriorId: number | null;
    fechaInicio: string;
    fechaFin: string;
    fechaRescision: string | null;
    estado: EstadoContrato;
    montoAlquiler: number;
    moneda: Moneda;
    propiedad: {
        direccion: string;
        piso: string | null;
        departamento: string | null;
    };
    inquilinoPrincipal: string | null;
}

export interface Contract {
    id: number;
    version: number;
    contratoAnteriorId: number | null;
    fechaInicio: string;
    fechaFin: string;
    fechaProximaActualizacion: string | null;
    estado: EstadoContrato;
    eliminadoEn?: string | null;
    fechaRescision?: string | null;
    motivoRescision?: string | null;
    rescindidoPor?: { id: number; nombreCompleto: string; email: string } | null;
    daysUntilDeletion?: number;
    administrado: boolean;
    requiereActualizacion: boolean;
    rutaArchivoContrato: string | null;
    observaciones: string | null;
	    montoAlquiler: number;
	    montoHonorarios: number;
	    moneda: Moneda;
    porcentajeHonorarios: number | null;
    pagaHonorarios: PagadorHonorarios;
    diaVencimiento: number;
    modalidadCobroInquilino: 'EFECTIVO' | 'TRANSFERENCIA' | 'CHEQUE' | null;
    modalidadPagoPropietario: 'EFECTIVO' | 'TRANSFERENCIA' | 'CHEQUE' | null;
    cuentaCobroAcordadaId: number | null;
    cuentaCobroAcordada?: { id: number; banco: string; nombre: string } | null;
    porcentajeActualizacion: number | null;
    tipoAjuste: string | null;
    serviciosGastos?: ContractServiceExpense[];
    propiedad: {
        id: number;
        direccion: string;
        piso: string | null;
        departamento: string | null;
    };
    propietarios: {
        id: number;
        persona: {
            id: number;
            nombreCompleto: string;
            telefono: string | null;
            cbu: string | null;
            aliasBancario: string | null;
            titularCuentaBancaria: string | null;
            titularidadBancariaVerificada: boolean;
        };
        esPrincipal: boolean;
    }[];
    inquilinos: {
        id: number;
        persona: {
            id: number;
            nombreCompleto: string;
            telefono: string | null;
            cbu: string | null;
            aliasBancario: string | null;
            titularCuentaBancaria: string | null;
            titularidadBancariaVerificada: boolean;
        };
        esPrincipal: boolean;
    }[];
    adjuntos?: {
        id: number;
        rutaArchivo: string;
        nombreArchivo: string | null;
        tipo: TipoDocumentoContrato;
        fechaDocumento: string;
        observacion: string | null;
        versionDocumento: number | null;
        esVigente: boolean;
        creadoPor?: { id: number; nombreCompleto: string } | null;
    }[];
    actualizaciones?: ContractUpdateHistory[];
    historialRenovaciones?: ContractRenewalTimelineEntry[];
    auditLogs?: AuditLogItem[];
    auditMeta?: PaginationMeta;
    creadoPor?: { id: number; nombreCompleto: string; email: string };
    actualizadoPor?: { id: number; nombreCompleto: string; email: string };
}

export interface ContractDraftAttachment {
    id: number;
    rutaArchivo: string;
    nombreArchivo: string;
    tipo: TipoDocumentoContrato;
    fechaCreacion: string;
}

export interface ContractDraft {
    id: number;
    version: number;
    datos: ContractDraftData;
    fechaCreacion: string;
    fechaActualizacion: string;
    creadoPor: { id: number; nombreCompleto: string };
    adjuntos: ContractDraftAttachment[];
    resumen: { direccion: string; propietario: string | null; inquilino: string | null };
}

export const getDaysLeft = (dateString: string) => {
    return getDaysFromToday(dateString);
};


export const contractsService = {
    getAll: async (options: { search?: string; page?: number; limit?: number; status?: EstadoContrato; alert?: 'POR_VENCER'; signal?: AbortSignal } = {}) => {
        const params: Record<string, string> = {
            page: String(options.page ?? 1),
            limit: String(options.limit ?? 10)
        };
        if (options.search) params.search = options.search;
        if (options.status) params.status = options.status;
        if (options.alert) params.alerta = options.alert;
        return api.get<PaginatedResponse<Contract>>('/contratos', { params, signal: options.signal });
    },

    search: async (search = '', page = 1) => contractsService.getAll({ search, page, limit: 25, status: 'ACTIVO' }),

    create: async (data: FormData) => {
        return api.post<Contract>('/contratos', data);
    },

    getDrafts: async () => api.get<ContractDraft[]>('/contratos/borradores'),

    getDraft: async (id: number) => api.get<ContractDraft>(`/contratos/borradores/${id}`),

    createDraft: async (datos: ContractDraftData) => api.post<ContractDraft>('/contratos/borradores', { datos }),

    updateDraft: async (id: number, datos: ContractDraftData, version: number) =>
        api.put<ContractDraft>(`/contratos/borradores/${id}`, { datos, version }),

    addDraftAttachment: async (draftId: number, file: File, tipo: TipoDocumentoContrato) => {
        const formData = new FormData();
        formData.append('archivo', file);
        formData.append('tipo', tipo);
        return api.post<ContractDraftAttachment>(`/contratos/borradores/${draftId}/adjuntos`, formData);
    },

    deleteDraftAttachment: async (draftId: number, attachmentId: number) =>
        api.delete(`/contratos/borradores/${draftId}/adjuntos/${attachmentId}`),

    deleteDraft: async (id: number) => api.delete(`/contratos/borradores/${id}`),

    update: async (id: number, data: FormData) => {
        return api.put<Contract>(`/contratos/${id}`, data);
    },

    getById: async (id: number, auditPage = 1, auditLimit = 10) => {
        return api.get<Contract>(`/contratos/${id}`, {
            params: { auditPage: String(auditPage), auditLimit: String(auditLimit) }
        });
    },

    delete: async (id: number) => {
        return api.delete(`/contratos/${id}`);
    },

    addAttachment: async (
        contractId: number,
        file: File,
        fileName?: string,
        tipo: Exclude<TipoDocumentoContrato, 'CONTRATO_PRINCIPAL'> = 'ADJUNTO'
    ) => {
        const formData = new FormData();
        formData.append('archivo', file);
        if (fileName) {
            formData.append('nombreArchivo', fileName);
        }
        formData.append('tipo', tipo);
        return api.post(`/contratos/${contractId}/adjuntos`, formData);
    },

    restore: async (id: number) => {
        return api.post(`/contratos/${id}/restaurar`);
    },

    permanentlyDelete: async (id: number) => {
        return api.delete(`/contratos/${id}/permanente`);
    },

    rescindir: async (id: number, data: { motivo: string; fechaRescision: string; version: number }) => {
        return api.post(`/contratos/${id}/rescindir`, data);
    },
    actualizarMonto: async (id: number, data: { montoNuevo: number; fechaProximaNueva: string; observaciones?: string; version: number }) => {
        return api.post<Contract>(`/contratos/${id}/actualizar`, data);
    },
    getAlertas: async () => {
        return api.get<Contract[]>('/contratos/alertas');
    }
};
