import api from './api';
import type { Moneda } from '../utils/currency';

export interface PagoSueldo {
    id: number;
	    monto: number;
	    moneda: Moneda;
    fecha: string;
    periodo: string;
    metodoPago: string;
    observaciones: string | null;
    usuarioId: number;
    usuario: {
        id: number;
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
	        moneda?: Moneda;
        fecha: string;
        periodo: string;
        metodoPago?: string;
        observaciones?: string;
    }) => {
        return api.post<PagoSueldo>('/sueldos', data);
    },
    update: async (id: number, data: Partial<{
        usuarioId: number;
	        monto: number;
	        moneda: Moneda;
        fecha: string;
        periodo: string;
        metodoPago: string;
        observaciones: string;
    }>) => {
        return api.put<PagoSueldo>(`/sueldos/${id}`, data);
    },
    delete: async (id: number) => {
        return api.delete<{ message: string }>(`/sueldos/${id}`);
    }
};
