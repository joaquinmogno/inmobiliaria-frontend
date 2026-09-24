import api from './api';

export interface Inmobiliaria {
    id: number;
    nombre: string;
    razonSocial: string | null;
    cuit: string | null;
    direccion: string | null;
    domicilioFiscal: string | null;
    email: string | null;
    telefono: string | null;
    contactoAdministrativo: string | null;
    slogan: string | null;
    logoUrl: string | null;
    condicionIva: CondicionIva;
    ingresosBrutos: string | null;
    puntoVenta: number | null;
    inicioActividades: string | null;
}

export type CondicionIva = 'NO_INFORMADO' | 'RESPONSABLE_INSCRIPTO' | 'MONOTRIBUTISTA' | 'EXENTO' | 'CONSUMIDOR_FINAL';

export type InmobiliariaProfileInput = Omit<Inmobiliaria, 'id'>;

export const inmobiliariaService = {
    getMe: async (): Promise<Inmobiliaria> => {
        return await api.get<Inmobiliaria>('/inmobiliaria/me');
    },

    updateMe: async (data: InmobiliariaProfileInput): Promise<Inmobiliaria> => {
        return await api.put<Inmobiliaria>('/inmobiliaria/me', data);
    }
};
