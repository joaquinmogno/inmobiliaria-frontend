import api from './api';
import type { Liquidacion, PaginatedResponse } from './liquidaciones.service';
import type { AuditLogItem } from '../components/AuditTrail';
import type { Moneda } from '../utils/currency';

export type MetodoPago = 'EFECTIVO' | 'TRANSFERENCIA' | 'CHEQUE';

export const PAYMENT_METHOD_OPTIONS: Array<{ value: MetodoPago; label: string }> = [
    { value: 'EFECTIVO', label: 'Efectivo' },
    { value: 'TRANSFERENCIA', label: 'Transferencia' },
    { value: 'CHEQUE', label: 'Cheque' }
];

export interface Pago {
    id: number;
	    monto: number;
	    moneda: Moneda;
    fechaPago: string;
    metodoPago: MetodoPago;
    observaciones: string | null;
    fechaCreacion: string;
    anuladoEn?: string | null;
    motivoAnulacion?: string | null;
    anuladoPor?: { id: number; nombreCompleto: string; email: string } | null;
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
        id: number;
        periodo: string;
        neto: number;
        pagado: number;
        creditosAplicados?: number;
        deuda: number;
        moneda: Moneda;
        estado: string;
    }[];
}

export type PaymentHistoryFilters = {
    moneda?: string;
    metodoPago?: string;
    estado?: string;
    propietarioId?: string;
    inquilinoId?: string;
    desde?: string;
    hasta?: string;
    cuenta?: string;
};

/** No envía placeholders de UI como `undefined` o valores vacíos en la URL. */
export const buildPaymentHistoryQueryParams = (
    page: number,
    limit: number,
    search?: string,
    filters: PaymentHistoryFilters = {}
): Record<string, string> => {
    const entries: Array<[string, string | undefined]> = [
        ['page', page.toString()],
        ['limit', limit.toString()],
        ['search', search?.trim() || undefined],
        ...Object.entries(filters)
    ];

    return Object.fromEntries(entries.flatMap(([key, value]) => {
        const normalized = typeof value === 'string' ? value.trim() : '';
        return normalized && normalized !== 'undefined' && normalized !== 'null'
            ? [[key, normalized]]
            : [];
    }));
};

export const pagosService = {
    registrarPago: async (data: {
        contratoId: number;
        liquidacionId?: number;
        expectedLiquidationVersion?: number;
        monto: number;
        fechaPago: string;
        metodoPago: MetodoPago;
        observaciones?: string;
    }) => {
        return api.post<{ pagos: Pago[], montoSobrante: number }>('/pagos', data);
    },

    getHistorialPorContrato: async (contratoId: number) => {
        return api.get<PaginatedResponse<Pago>>(`/pagos/contrato/${contratoId}`, {
            params: { page: '1', limit: '50' }
        });
    },

    getDeudaPorContrato: async (contratoId: number, excludeLiquidacionId?: number) => {
        return api.get<DeudaResumen>(`/pagos/deuda/contrato/${contratoId}`, {
            params: excludeLiquidacionId ? { excludeLiquidacionId: String(excludeLiquidacionId) } : undefined
        });
    },

    getAll: async (page: number = 1, limit: number = 50, search?: string, filters: PaymentHistoryFilters = {}) => {
        return api.get<PaginatedResponse<Pago>>('/pagos', {
            params: buildPaymentHistoryQueryParams(page, limit, search, filters)
        });
    },

    anular: async (pagoId: number, motivo: string) => {
        return api.post<{
            pagoId: number;
            anuladoEn: string;
            motivoAnulacion: string;
            liquidacion: { id: number; estadoCobroInquilino: string };
        }>(`/pagos/${pagoId}/anular`, { motivo });
    }
};
