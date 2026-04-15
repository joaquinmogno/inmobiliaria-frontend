import api from './api';

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
    getAll: async (search?: string) => {
        return api.get<Property[]>('/propiedades', { params: search ? { search } : undefined });
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
