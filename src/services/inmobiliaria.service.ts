import api, { apiBaseUrl } from './api';

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
    logoArchivo: string | null;
    condicionIva: CondicionIva;
    ingresosBrutos: string | null;
    puntoVenta: number | null;
    inicioActividades: string | null;
}

export type CondicionIva = 'NO_INFORMADO' | 'RESPONSABLE_INSCRIPTO' | 'MONOTRIBUTISTA' | 'EXENTO' | 'CONSUMIDOR_FINAL';

export type InmobiliariaProfileInput = Omit<Inmobiliaria, 'id' | 'logoArchivo'>;

export const inmobiliariaService = {
    getMe: async (): Promise<Inmobiliaria> => {
        return await api.get<Inmobiliaria>('/inmobiliaria/me');
    },

    updateMe: async (data: InmobiliariaProfileInput): Promise<Inmobiliaria> => {
        return await api.put<Inmobiliaria>('/inmobiliaria/me', data);
    },

    uploadLogo: async (file: File): Promise<Inmobiliaria> => {
        const data = new FormData();
        data.append('logo', file);
        return await api.post<Inmobiliaria>('/inmobiliaria/me/logo', data);
    },

    removeLogo: async (): Promise<Inmobiliaria> => {
        return await api.delete<Inmobiliaria>('/inmobiliaria/me/logo');
    }
};

export const getAgencyLogoUrl = (inmobiliaria?: { logoUrl?: string | null; logoArchivo?: string | null } | null) => {
    if (inmobiliaria?.logoArchivo) return `${apiBaseUrl}/inmobiliaria/me/logo`;
    return inmobiliaria?.logoUrl || null;
};
