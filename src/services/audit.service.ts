import api from './api';

export interface AuditLog {
    id: number;
    accion: string;
    entidad: string;
    entidadId?: number;
    detalle?: string;
    fechaCreacion: string;
    usuario?: {
        nombreCompleto: string;
    };
}

export interface LogFilters {
    page?: number;
    limit?: number;
    accion?: string;
    fechaDesde?: string;
    fechaHasta?: string;
}

export interface PaginatedLogsResponse {
    data: AuditLog[];
    total: number;
    page: number;
    limit: number;
}

export const auditService = {
    getLogs: async (filters?: LogFilters): Promise<PaginatedLogsResponse> => {
        const params = new URLSearchParams();
        if (filters?.page) params.append('page', String(filters.page));
        if (filters?.limit) params.append('limit', String(filters.limit));
        if (filters?.accion) params.append('accion', filters.accion);
        if (filters?.fechaDesde) params.append('fechaDesde', filters.fechaDesde);
        if (filters?.fechaHasta) params.append('fechaHasta', filters.fechaHasta);

        const queryString = params.toString() ? `?${params.toString()}` : '';
        return await api.get<PaginatedLogsResponse>(`/inmobiliaria/logs${queryString}`);
    }
};
