import api from './api';
import type { Owner } from './owners.service';

export interface Property {
    id: number;
    direccion: string;
    piso: string | null;
    departamento: string | null;
    propietarioId: number;
    propietario?: Owner;
}

export const propertiesService = {
    getAll: async () => {
        return api.get<Property[]>('/propiedades');
    },

    create: async (data: Omit<Property, 'id' | 'propietario'>) => {
        return api.post<Property>('/propiedades', data);
    },

    update: async (id: number, data: Partial<Property>) => {
        return api.put<Property>(`/propiedades/${id}`, data);
    },

    delete: async (id: number) => {
        await api.delete(`/propiedades/${id}`);
    }
};
