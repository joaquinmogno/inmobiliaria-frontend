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

export interface PaginatedSalaries {
    data: PagoSueldo[];
    meta: { total: number; page: number; limit: number; totalPages: number };
}

export const sueldosService = {
    getAll: async (page = 1, limit = 25, search = '', periodo = '') => {
        return api.get<PaginatedSalaries>('/sueldos', { params: { page: String(page), limit: String(limit), ...(search ? { search } : {}), ...(periodo ? { periodo } : {}) } });
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
