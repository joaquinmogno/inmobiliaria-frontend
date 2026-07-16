import api from './api';
import type { Contract } from './contracts.service';
import type { Pago } from './pagos.service';
import type { AuditLogItem } from '../components/AuditTrail';
import type { Moneda } from '../utils/currency';

export type EstadoLiquidacion = 'BORRADOR' | 'PENDIENTE_PAGO' | 'PAGADA_POR_INQUILINO' | 'LIQUIDADA';
export type TipoMovimiento = 'INGRESO' | 'DESCUENTO';

export interface Movimiento {
    id: number;
    tipo: TipoMovimiento;
    concepto: string;
    monto: number;
    moneda: Moneda;
    observaciones: string | null;
    fechaCreacion: string;
    esParaInmobiliaria: boolean;
}

export interface Liquidacion {
    id: number;
    periodo: string;
    estado: EstadoLiquidacion;
    totalIngresos: number;
    totalDescuentos: number;
    netoACobrar: number;
    porcentajeHonorarios: number | null;
    montoHonorarios: number;
    moneda: Moneda;
    fechaCreacion: string;
    fechaLiquidacion: string | null;
    fechaPagoPropietario?: string | null;
    metodoPagoPropietario?: string | null;
    contratoId: number;
    contrato?: Contract;
    movimientos?: Movimiento[];
    pagos?: Pago[];
    auditLogs?: AuditLogItem[];
    creadoPor?: { id: number; nombreCompleto: string; email: string };
    cerradoPor?: { id: number; nombreCompleto: string; email: string };
}

export interface PaginatedResponse<T> {
    data: T[];
    meta: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
}

export const liquidacionesService = {
    getAll: async (contratoId?: number, page: number = 1, limit: number = 50, search?: string, filters: { estado?: string; periodo?: string; propietarioId?: string; soloDeuda?: boolean } = {}) => {
        return api.get<PaginatedResponse<Liquidacion>>('/liquidaciones', {
            params: { 
                ...(contratoId ? { contratoId: contratoId.toString() } : {}),
                page: page.toString(),
                limit: limit.toString(),
                ...(search ? { search } : {}),
                ...(filters.estado ? { estado: filters.estado } : {}),
                ...(filters.periodo ? { periodo: filters.periodo } : {}),
                ...(filters.propietarioId ? { propietarioId: filters.propietarioId } : {}),
                ...(filters.soloDeuda ? { soloDeuda: 'true' } : {})
            }
        });
    },

    getFilters: async () => api.get<{ periodos: string[]; propietarios: Array<{ id: number; nombreCompleto: string }> }>('/liquidaciones/filtros'),

    getById: async (id: number) => {
        return api.get<Liquidacion>(`/liquidaciones/${id}`);
    },

    create: async (contratoId: number, periodo: string, montoHonorarios?: number, porcentajeHonorarios?: number, cuotasIds?: number[]) => {
        return api.post<Liquidacion>('/liquidaciones', { contratoId, periodo, montoHonorarios, porcentajeHonorarios, cuotasIds });
    },

    addMovimiento: async (liquidacionId: number, data: {
        tipo: TipoMovimiento;
        concepto: string;
        monto: number;
        observaciones?: string;
    }) => {
        return api.post<Liquidacion>(`/liquidaciones/${liquidacionId}/movimientos`, data);
    },

    deleteMovimiento: async (movimientoId: number) => {
        return api.delete<Liquidacion>(`/liquidaciones/movimientos/${movimientoId}`);
    },

    liquidar: async (id: number) => {
        return api.patch<Liquidacion>(`/liquidaciones/${id}/liquidar`);
    },
    updateHonorarios: async (id: number, data: { montoHonorarios?: number, porcentajeHonorarios?: number }) => {
        return api.patch<Liquidacion>(`/liquidaciones/${id}/honorarios`, data);
    },

    confirmar: async (id: number) => {
        return api.patch<Liquidacion>(`/liquidaciones/${id}/confirmar`);
    },

    pagarPropietario: async (id: number, data: { fechaPago: string, metodoPago: string, observaciones?: string }) => {
        return api.patch<Liquidacion>(`/liquidaciones/${id}/pagar-propietario`, data);
    },
    delete: async (id: number) => {
        return api.delete(`/liquidaciones/${id}`);
    },

    downloadPdf: (id: number) => {
        const envUrl = import.meta.env.VITE_API_URL;
        const baseUrl = envUrl ? (envUrl.endsWith('/api') ? envUrl : `${envUrl}/api`) : 'http://localhost:3000/api';
        const url = `${baseUrl}/liquidaciones/${id}/pdf`;
        fetch(url, { credentials: 'include' })
            .then(res => res.blob())
            .then(blob => {
                const blobUrl = URL.createObjectURL(blob);
                window.open(blobUrl, '_blank');
            });
    },

    downloadPdfPropietario: (id: number) => {
        const envUrl = import.meta.env.VITE_API_URL;
        const baseUrl = envUrl ? (envUrl.endsWith('/api') ? envUrl : `${envUrl}/api`) : 'http://localhost:3000/api';
        const url = `${baseUrl}/liquidaciones/${id}/pdf-propietario`;
        fetch(url, { credentials: 'include' })
            .then(res => res.blob())
            .then(blob => {
                const blobUrl = URL.createObjectURL(blob);
                window.open(blobUrl, '_blank');
            });
    }
};
