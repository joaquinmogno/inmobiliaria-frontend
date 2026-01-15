import api from './api';

export interface Owner {
    id: number;
    nombreCompleto: string;
    telefono: string | null;
    email: string | null;
}

export const ownersService = {
    getAll: async () => {
        return api.get<Owner[]>('/propietarios');
    },

    create: async (data: Omit<Owner, 'id'>) => {
        return api.post<Owner>('/propietarios', data);
    },

    update: async (id: number, data: Partial<Owner>) => {
        return api.put<Owner>(`/propietarios/${id}`, data);
    },

    delete: async (id: number) => {
        await api.delete(`/propietarios/${id}`);
    }
};
