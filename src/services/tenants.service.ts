import api from './api';

export interface Tenant {
    id: number;
    nombreCompleto: string;
    telefono: string | null;
    email: string | null;
}

export const tenantsService = {
    getAll: async () => {
        return api.get<Tenant[]>('/inquilinos');
    },

    create: async (data: Omit<Tenant, 'id'>) => {
        return api.post<Tenant>('/inquilinos', data);
    },

    update: async (id: number, data: Partial<Tenant>) => {
        return api.put<Tenant>(`/inquilinos/${id}`, data);
    },

    delete: async (id: number) => {
        await api.delete(`/inquilinos/${id}`);
    }
};
