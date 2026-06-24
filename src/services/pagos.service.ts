import api from './api';
import type { Liquidacion, PaginatedResponse } from './liquidaciones.service';
import type { AuditLogItem } from '../components/AuditTrail';
import type { Moneda } from '../utils/currency';

export type MetodoPago = 'EFECTIVO' | 'TRANSFERENCIA' | 'CHEQUE' | 'OTROS';

export interface Pago {
    id: number;
	    monto: number;
	    moneda: Moneda;
    fechaPago: string;
    metodoPago: MetodoPago;
    observaciones: string | null;
    fechaCreacion: string;
    contratoId: number;
    liquidacionId: number;
    liquidacion?: Partial<Liquidacion>;
    creadoPor?: { id: number; nombreCompleto: string; email: string };
    auditLogs?: AuditLogItem[];
}

export interface DeudaResumen {
    totalDeuda: number;
    moneda: Moneda;
    detalle: {
        periodo: string;
        neto: number;
        pagado: number;
        deuda: number;
        moneda: Moneda;
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

    getDeudaPorContrato: async (contratoId: number, excludeLiquidacionId?: number) => {
        return api.get<DeudaResumen>(`/pagos/deuda/contrato/${contratoId}`, {
            params: excludeLiquidacionId ? { excludeLiquidacionId: String(excludeLiquidacionId) } : undefined
        });
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
