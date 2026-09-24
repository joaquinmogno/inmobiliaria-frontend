import api from './api';
import type { TipoMovimiento } from './liquidaciones.service';
import type { Moneda } from '../utils/currency';

export interface PlanCuotas {
    id: number;
    concepto: string;
	    montoTotal: number;
	    moneda: Moneda;
    tipoMovimiento: TipoMovimiento;
    estado: 'VIGENTE' | 'CUMPLIDO' | 'CANCELADO' | 'REPROGRAMADO' | 'CONDONADO';
    fechaCreacion: string;
    fechaCierre?: string | null;
    motivoCierre?: string | null;
    contratoId: number;
    esParaInmobiliaria: boolean;
    planOrigenId?: number | null;
    planOrigen?: { id: number; concepto: string } | null;
    planesReprogramados?: Array<{ id: number; estado: PlanCuotas['estado'] }>;
    cerradoPor?: { id: number; nombreCompleto: string } | null;
    cuotas?: CuotaPlan[];
}

export interface CuotaPlan {
    id: number;
    planId: number;
    numeroCuota: number;
	fechaVencimiento: string;
	    monto: number;
	    moneda: Moneda;
    estado: 'PENDIENTE' | 'PAGADA' | 'CANCELADA' | 'REPROGRAMADA' | 'CONDONADA';
    movimientoId?: number;
    liquidacionId?: number;
    correspondeAlPeriodo?: boolean;
    vencida?: boolean;
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
        fechaPrimeraCuota: string;
        tipoMovimiento: TipoMovimiento;
        esParaInmobiliaria?: boolean;
    }) {
        return api.post<PlanCuotas>('/planes-cuotas', data);
    },

    async getByContrato(contratoId: number) {
        return api.get<PlanCuotas[]>(`/planes-cuotas/contrato/${contratoId}`);
    },

    async getPendientes(contratoId: number, periodo: string) {
        return api.get<CuotaPlan[]>(`/planes-cuotas/contrato/${contratoId}/pendientes`, {
            params: { periodo }
        });
    },

    async cancelar(id: number, motivo: string) {
        return api.post<PlanCuotas>(`/planes-cuotas/${id}/cancelar`, { motivo });
    },

    async condonar(id: number, motivo: string) {
        return api.post<PlanCuotas>(`/planes-cuotas/${id}/condonar`, { motivo });
    },

    async reprogramar(id: number, data: {
        motivo: string;
        montoTotal: number;
        cantidadCuotas: number;
        fechaPrimeraCuota: string;
    }) {
        return api.post<{ original: PlanCuotas; successor: PlanCuotas }>(`/planes-cuotas/${id}/reprogramar`, data);
    }
};
