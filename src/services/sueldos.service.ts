import api from './api';

export interface PagoSueldo {
    id: number;
    monto: number;
    fecha: string;
    periodo: string;
    metodoPago: string;
    observaciones: string | null;
    usuarioId: number;
    usuario: {
        nombreCompleto: string;
        email: string;
    };
    creadoPor: {
        nombreCompleto: string;
    };
}

export const sueldosService = {
    getAll: async () => {
        return api.get<PagoSueldo[]>('/sueldos');
    },
    create: async (data: {
        usuarioId: number;
        monto: number;
        fecha: string;
        periodo: string;
        metodoPago?: string;
        observaciones?: string;
    }) => {
        return api.post<PagoSueldo>('/sueldos', data);
    }
};
