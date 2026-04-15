import api from './api';

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
    getAll: async (search?: string) => {
        return api.get<Persona[]>('/personas', { params: search ? { search } : undefined });
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
