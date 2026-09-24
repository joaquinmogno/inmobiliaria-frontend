import api from './api';
import type { PaginatedResponse } from './api';

export interface Persona {
    id: number;
    version: number;
    nombreCompleto: string;
    dni: string | null;
    email: string | null;
    telefono: string;
    direccion: string | null;
    cuit: string | null;
    banco: string | null;
    cbu: string | null;
    aliasBancario: string | null;
    titularCuentaBancaria: string | null;
    titularidadBancariaVerificada: boolean;
    contactoAlternativo: string | null;
    telefonoAlternativo: string | null;
    estado: 'ACTIVO' | 'INACTIVO';
    roles?: string[];
}

export type CreatePersonaData = Omit<Persona, 'id' | 'version' | 'roles'>;

export type PersonaCoincidencia = Pick<Persona, 'id' | 'version' | 'nombreCompleto' | 'dni' | 'cuit' | 'email' | 'telefono' | 'estado'> & {
    coincidencias: Array<{ field: 'dni' | 'cuit' | 'email' | 'telefono'; label: string }>;
};

export const personasService = {
    getAll: async (options: { search?: string; id?: number; page?: number; limit?: number; signal?: AbortSignal } = {}) => {
        const params: Record<string, string> = { page: String(options.page ?? 1), limit: String(options.limit ?? 25) };
        if (options.search) params.search = options.search;
        if (options.id) params.id = String(options.id);
        return api.get<PaginatedResponse<Persona>>('/personas', { params, signal: options.signal });
    },

    search: async (search = '', page = 1) => personasService.getAll({ search, page, limit: 25 }),

    getById: async (id: number) => {
        const response = await personasService.getAll({ page: 1, limit: 1, id });
        return response.data[0] || null;
    },

    findMatches: async (identity: { dni?: string | null; cuit?: string | null; email?: string | null; telefono?: string | null; excluirId?: number }) => {
        const params = Object.fromEntries(Object.entries(identity)
            .filter(([, value]) => value !== undefined && value !== null && String(value).trim() !== '')
            .map(([key, value]) => [key, String(value)]));
        return api.get<{ coincidencias: PersonaCoincidencia[] }>('/personas/coincidencias', { params });
    },

    create: async (data: Partial<Persona>) => {
        return api.post<Persona>('/personas', data);
    },

    update: async (id: number, data: Partial<Persona>) => {
        return api.put<Persona>(`/personas/${id}`, data);
    },

    delete: async (id: number) => {
        return api.delete(`/personas/${id}`);
    },

    merge: async (sourceId: number, data: { personaDestinoId: number; version: number; motivo: string }) => {
        return api.post<{ message: string; destinoId: number }>(`/personas/${sourceId}/fusionar`, data);
    }
};
