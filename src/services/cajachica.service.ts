import api from './api';
import type { Moneda } from '../utils/currency';
import type { CashFinancialMetrics } from './reportes.service';

export type CuentaCaja = 'CAJA' | 'BANCO';

export interface MovimientoCaja {
    id: number;
    tipo: 'INGRESO' | 'EGRESO';
    concepto: string;
	    monto: number | string;
	    moneda: Moneda;
    fecha: string;
    metodoPago: string;
    cuenta: CuentaCaja;
    observaciones?: string;
    fechaCreacion: string;
    anuladoEn?: string | null;
    motivoAnulacion?: string | null;
    anuladoPorId?: number | null;
    pagoId?: number | null;
    pagoSueldoId?: number | null;
    liquidacionId?: number | null;
    contratoId?: number | null;
    reversionDeId?: number | null;
    reversion?: { id: number; fechaCreacion: string } | null;
    ajustePagoSueldoDe?: { id: number } | null;
    creadoPor?: { id: number; nombreCompleto: string };
    anuladoPor?: { id: number; nombreCompleto: string } | null;
    contrato?: {
        propiedad?: {
            direccion: string;
            piso?: string;
            departamento?: string;
        };
    };
}

export interface CajaChicaResponse {
    data: MovimientoCaja[];
    meta: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
}

export interface CajaChicaSummary {
        criterio?: 'CAJA';
        periodo?: string;
        desde?: string;
        hasta?: string;
        saldoAlCierre?: Record<Moneda, CashFinancialMetrics>;
        movimientosDelPeriodo?: Record<Moneda, CashFinancialMetrics>;
        balanceGeneral: number;
        totalIngresos: number;
        totalEgresos: number;
        balanceCaja: number;
	        balanceBanco: number;
	        totalIngresosARS: number;
	        totalEgresosARS: number;
	        balanceARS: number;
	        totalIngresosUSD: number;
	        totalEgresosUSD: number;
	        balanceUSD: number;
	        totalesPorMoneda: Record<Moneda, {
	            totalIngresos: number;
	            totalEgresos: number;
	            balance: number;
	            balanceCaja: number;
	            balanceBanco: number;
	            totalCobrado: number;
	            totalPagadoPropietarios: number;
	            gastosGenerales: number;
	            gananciaBruta: number;
	            resultadoNeto: number;
	            fondosEnCustodia: number;
	            pagosSueldos?: number;
	            otrosIngresos?: number;
	            otrosEgresos?: number;
	        }>;
        totalCobrado: number;
        totalPagadoPropietarios: number;
        gastosGenerales: number;
        gananciaBruta: number;
        resultadoNeto: number;
        fondosEnCustodia: number;
}

export interface EventoCierreCaja {
    id: number;
    tipo: 'CIERRE' | 'REAPERTURA';
    version: number;
    saldoSistema: number | string;
    saldoDeclarado: number | string;
    diferencia: number | string;
    motivo?: string | null;
    fechaCreacion: string;
    usuario: { nombreCompleto: string };
}

export interface CierreCaja {
    id: number;
    version: number;
    periodo: string;
    cuenta: CuentaCaja;
    moneda: Moneda;
    saldoSistema: number | string;
    saldoDeclarado: number | string;
    diferencia: number | string;
    estado: 'CERRADO' | 'REABIERTO';
    motivoDiferencia?: string | null;
    cerradoEn: string;
    reabiertoEn?: string | null;
    motivoReapertura?: string | null;
    cerradoPor: { nombreCompleto: string };
    reabiertoPor?: { nombreCompleto: string } | null;
    eventos: EventoCierreCaja[];
}

export const cajachicaService = {
    getAll: async (page: number = 1, limit: number = 50, tipo?: string, cuenta?: string, search?: string, mes?: number, anio?: number) => {
        const params: any = { page, limit };
        if (tipo) params.tipo = tipo;
        if (cuenta) params.cuenta = cuenta;
        if (search) params.search = search;
        if (mes) params.mes = mes;
        if (anio) params.anio = anio;
        
        return api.get<CajaChicaResponse>('/cajachica', { params });
    },

    getSummary: async (mes: number, anio: number) =>
        api.get<CajaChicaSummary>('/cajachica/resumen', { params: { mes: String(mes), anio: String(anio) } }),

    create: async (data: {
        tipo: 'INGRESO' | 'EGRESO';
        concepto: string;
	        monto: number;
	        moneda?: Moneda;
        fecha: string;
        metodoPago: string;
        cuenta?: CuentaCaja;
        observaciones?: string;
    }) => {
        return api.post<MovimientoCaja>('/cajachica', data);
    },

    anular: async (movimientoId: number, motivo: string) => {
        return api.post<{
            movimientoId: number;
            anuladoEn: string;
            motivoAnulacion: string;
            reversion: MovimientoCaja;
        }>(`/cajachica/${movimientoId}/anular`, { motivo });
    },
    getCierres: () => api.get<CierreCaja[]>('/cajachica/cierres'),
    cerrarPeriodo: (data: { periodo: string; cuenta: CuentaCaja; moneda: Moneda; saldoDeclarado: number; motivoDiferencia?: string }) => api.post('/cajachica/cierres', data),
    reabrirPeriodo: (id: number, motivo: string) => api.post<CierreCaja>(`/cajachica/cierres/${id}/reabrir`, { motivo })
};
