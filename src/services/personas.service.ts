import api from './api';
import type { PaginatedResponse } from './api';

export interface Persona {
    id: number;
    nombreCompleto: string;
    dni: string | null;
    email: string | null;
    telefono: string;
    direccion: string | null;
    estado: 'ACTIVO' | 'INACTIVO';
    roles?: string[];
}

export type CreatePersonaData = Omit<Persona, 'id' | 'roles'>;

export const personasService = {
    getAll: async (options: { search?: string; page?: number; limit?: number; signal?: AbortSignal } = {}) => {
        const params: Record<string, string> = { page: String(options.page ?? 1), limit: String(options.limit ?? 25) };
        if (options.search) params.search = options.search;
        return api.get<PaginatedResponse<Persona>>('/personas', { params, signal: options.signal });
    },

    search: async (search?: string) => {
        const response = await personasService.getAll({ search, limit: 100 });
        return response.data;
    },

    create: async (data: Partial<Persona>) => {
        return api.post<Persona>('/personas', data);
    },

    update: async (id: number, data: Partial<Persona>) => {
        return api.put<Persona>(`/personas/${id}`, data);
    },

    delete: async (id: number) => {
        return api.delete(`/personas/${id}`);
    }
};
