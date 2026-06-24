import api from './api';
import type { TipoMovimiento } from './liquidaciones.service';
import type { Moneda } from '../utils/currency';

export interface PlanCuotas {
    id: number;
    concepto: string;
	    montoTotal: number;
	    moneda: Moneda;
    tipoMovimiento: TipoMovimiento;
    estado: 'ACTIVO' | 'FINALIZADO' | 'CANCELADO';
    fechaCreacion: string;
    contratoId: number;
    esParaInmobiliaria: boolean;
    cuotas?: CuotaPlan[];
}

export interface CuotaPlan {
    id: number;
    planId: number;
    numeroCuota: number;
	    monto: number;
	    moneda: Moneda;
    estado: 'PENDIENTE' | 'PAGADA';
    movimientoId?: number;
    liquidacionId?: number;
    plan?: PlanCuotas;
    liquidacion?: {
        id: number;
        periodo: string;
        estado: string;
    };
}

export const planesCuotasService = {
    async create(data: {
        contratoId: number;
        concepto: string;
        montoTotal: number;
        cantidadCuotas: number;
        tipoMovimiento: TipoMovimiento;
        esParaInmobiliaria?: boolean;
    }) {
        return api.post<PlanCuotas>('/planes-cuotas', data);
    },

    async getByContrato(contratoId: number) {
        return api.get<PlanCuotas[]>(`/planes-cuotas/contrato/${contratoId}`);
    },

    async getPendientes(contratoId: number) {
        return api.get<CuotaPlan[]>(`/planes-cuotas/contrato/${contratoId}/pendientes`);
    },

    async delete(id: number) {
        return api.delete(`/planes-cuotas/${id}`);
    }
};
