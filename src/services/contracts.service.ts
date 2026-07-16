import api from './api';
import type { PaginatedResponse } from './api';
import type { AuditLogItem } from '../components/AuditTrail';
import type { Moneda } from '../utils/currency';

export type EstadoContrato = 'ACTIVO' | 'PAPELERA' | 'FINALIZADO' | 'RESCINDIDO';
export type PagadorHonorarios = 'INQUILINO' | 'PROPIETARIO';

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

export interface Contract {
    id: number;
    fechaInicio: string;
    fechaFin: string;
    fechaProximaActualizacion: string | null;
    estado: EstadoContrato;
    eliminadoEn?: string | null;
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
    porcentajeActualizacion: number | null;
    tipoAjuste: string | null;
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
        };
        esPrincipal: boolean;
    }[];
    inquilinos: {
        id: number;
        persona: {
            id: number;
            nombreCompleto: string;
            telefono: string | null;
        };
        esPrincipal: boolean;
    }[];
    adjuntos?: {
        id: number;
        rutaArchivo: string;
        nombreArchivo: string | null;
    }[];
    actualizaciones?: ContractUpdateHistory[];
    auditLogs?: AuditLogItem[];
    creadoPor?: { id: number; nombreCompleto: string; email: string };
    actualizadoPor?: { id: number; nombreCompleto: string; email: string };
}

export const getDaysLeft = (dateString: string) => {
    const today = new Date();
    const targetDate = new Date(dateString);
    const diffTime = targetDate.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};


export const contractsService = {
    getAll: async (options: { search?: string; page?: number; limit?: number; expired?: boolean; status?: EstadoContrato; signal?: AbortSignal } = {}) => {
        const params: Record<string, string> = {
            page: String(options.page ?? 1),
            limit: String(options.limit ?? 10)
        };
        if (options.search) params.search = options.search;
        if (options.expired !== undefined) params.expired = String(options.expired);
        if (options.status) params.status = options.status;
        return api.get<PaginatedResponse<Contract>>('/contratos', { params, signal: options.signal });
    },

    search: async (search?: string) => {
        const response = await contractsService.getAll({ search, limit: 100, status: 'ACTIVO' });
        return response.data;
    },

    create: async (data: FormData) => {
        return api.post<Contract>('/contratos', data);
    },

    update: async (id: number, data: FormData) => {
        return api.put<Contract>(`/contratos/${id}`, data);
    },

    getById: async (id: number) => {
        return api.get<Contract>(`/contratos/${id}`);
    },

    delete: async (id: number) => {
        return api.delete(`/contratos/${id}`);
    },

    addAttachment: async (contractId: number, file: File, fileName?: string) => {
        const formData = new FormData();
        formData.append('archivo', file);
        if (fileName) {
            formData.append('nombreArchivo', fileName);
        }
        return api.post(`/contratos/${contractId}/adjuntos`, formData);
    },

    restore: async (id: number) => {
        return api.post(`/contratos/${id}/restaurar`);
    },

    permanentlyDelete: async (id: number) => {
        return api.delete(`/contratos/${id}/permanente`);
    },

    updateStatus: async (id: number, estado: EstadoContrato) => {
        return api.patch(`/contratos/${id}/estado`, { estado });
    },
    actualizarMonto: async (id: number, data: { montoNuevo: number; fechaProximaNueva: string; observaciones?: string }) => {
        return api.post<Contract>(`/contratos/${id}/actualizar`, data);
    },
    getAlertas: async () => {
        return api.get<Contract[]>('/contratos/alertas');
    }
};
