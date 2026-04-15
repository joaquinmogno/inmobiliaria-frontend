import api from './api';

export interface Inmobiliaria {
    id: number;
    nombre: string;
}

export const inmobiliariaService = {
    getMe: async (): Promise<Inmobiliaria> => {
        return await api.get<Inmobiliaria>('/inmobiliaria/me');
    },

    updateMe: async (data: Partial<Inmobiliaria>): Promise<Inmobiliaria> => {
        return await api.put<Inmobiliaria>('/inmobiliaria/me', data);
    }
};
