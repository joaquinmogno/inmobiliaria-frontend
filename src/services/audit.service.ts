import api from './api';
import type { PaginatedResponse } from './api';

export interface AuditLog {
    id: number;
    accion: string;
    entidad: string;
    entidadId?: number;
    detalle?: string;
    ipAddress?: string;
    userAgent?: string;
    requestId?: string;
    severidad: 'INFO' | 'WARNING' | 'CRITICAL';
    resultado: 'EXITO' | 'FALLIDO';
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
    usuario?: string;
    resultado?: 'EXITO' | 'FALLIDO';
    requestId?: string;
}

export const auditService = {
    getLogs: async (filters?: LogFilters): Promise<PaginatedResponse<AuditLog>> => {
        const params = new URLSearchParams();
        if (filters?.page) params.append('page', String(filters.page));
        if (filters?.limit) params.append('limit', String(filters.limit));
        if (filters?.accion) params.append('accion', filters.accion);
        if (filters?.fechaDesde) params.append('fechaDesde', filters.fechaDesde);
        if (filters?.fechaHasta) params.append('fechaHasta', filters.fechaHasta);
        if (filters?.usuario) params.append('usuario', filters.usuario);
        if (filters?.resultado) params.append('resultado', filters.resultado);
        if (filters?.requestId) params.append('requestId', filters.requestId);

        const queryString = params.toString() ? `?${params.toString()}` : '';
        return await api.get<PaginatedResponse<AuditLog>>(`/inmobiliaria/logs${queryString}`);
    }
};
