import api from './api';
import type { PaginatedResponse } from './api';

export type TipoPropiedad = 'DEPARTAMENTO' | 'CASA' | 'LOCAL' | 'OTRO';
export type EstadoPropiedad = 'DISPONIBLE' | 'ALQUILADO' | 'INACTIVO';

export interface Property {
    id: number;
    direccion: string;
    piso: string | null;
    departamento: string | null;
    tipo: TipoPropiedad;
    estado: EstadoPropiedad;
    observaciones: string | null;
}

export const propertiesService = {
    getAll: async (options: { search?: string; page?: number; limit?: number; signal?: AbortSignal } = {}) => {
        const params: Record<string, string> = { page: String(options.page ?? 1), limit: String(options.limit ?? 25) };
        if (options.search) params.search = options.search;
        return api.get<PaginatedResponse<Property>>('/propiedades', { params, signal: options.signal });
    },

    search: async (search?: string) => {
        const response = await propertiesService.getAll({ search, limit: 100 });
        return response.data;
    },

    create: async (data: Omit<Property, 'id'>) => {
        return api.post<Property>('/propiedades', data);
    },

    update: async (id: number, data: Partial<Property>) => {
        return api.put<Property>(`/propiedades/${id}`, data);
    },

    delete: async (id: number) => {
        await api.delete(`/propiedades/${id}`);
    }
};
