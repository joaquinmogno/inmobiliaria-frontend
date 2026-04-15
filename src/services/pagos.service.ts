import api from './api';
import type { Liquidacion, PaginatedResponse } from './liquidaciones.service';

export type MetodoPago = 'EFECTIVO' | 'TRANSFERENCIA' | 'CHEQUE' | 'OTROS';

export interface Pago {
    id: number;
    monto: number;
    fechaPago: string;
    metodoPago: MetodoPago;
    observaciones: string | null;
    fechaCreacion: string;
    contratoId: number;
    liquidacionId: number;
    liquidacion?: Partial<Liquidacion>;
}

export interface DeudaResumen {
    totalDeuda: number;
    detalle: {
        periodo: string;
        neto: number;
        pagado: number;
        deuda: number;
        estado: string;
    }[];
}

export const pagosService = {
    registrarPago: async (data: {
        contratoId: number;
        monto: number;
        fechaPago: string;
        metodoPago: MetodoPago;
        observaciones?: string;
    }) => {
        return api.post<{ pagos: Pago[], montoSobrante: number }>('/pagos', data);
    },

    getHistorialPorContrato: async (contratoId: number) => {
        return api.get<Pago[]>(`/pagos/contrato/${contratoId}`);
    },

    getDeudaPorContrato: async (contratoId: number) => {
        return api.get<DeudaResumen>(`/pagos/deuda/contrato/${contratoId}`);
    },

    getAll: async (page: number = 1, limit: number = 50, search?: string) => {
        return api.get<PaginatedResponse<Pago>>('/pagos', {
            params: {
                page: page.toString(),
                limit: limit.toString(),
                ...(search ? { search } : {})
            }
        });
    }
};
