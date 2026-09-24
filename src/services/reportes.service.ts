import api from './api';
import type { Moneda } from '../utils/currency';

export interface FinancialMetrics {
    recaudadoTotal: number;
    gananciaBruta: number;
    gastosAgencia: number;
    utilidadNeta: number;
    fondoCustodia: number;
    morosidad: number;
}

export interface AccruedFinancialMetrics {
    facturado: number;
    honorariosDevengados: number;
    importePropietariosDevengado: number;
    cobradoAplicado: number;
    saldoPendienteInquilinos: number;
}

export interface CashFinancialMetrics {
    ingresos: number;
    egresos: number;
    saldo: number;
    cobrosInquilinos: number;
    pagosPropietarios: number;
    pagosSueldos: number;
    otrosIngresos: number;
    otrosEgresos: number;
    cuentas: Record<'CAJA' | 'BANCO', { ingresos: number; egresos: number; saldo: number }>;
}

export interface AccruedFinancialReport {
    criterio: 'DEVENGADO';
    periodo: string;
    desde: string;
    hasta: string;
    porMoneda: Record<Moneda, AccruedFinancialMetrics>;
}

export interface CashFinancialReport {
    criterio: 'CAJA';
    periodo: string;
    desde: string;
    hasta: string;
    saldoAlCierre: Record<Moneda, CashFinancialMetrics>;
    movimientosDelPeriodo: Record<Moneda, CashFinancialMetrics>;
}

export interface DashboardReportes {
    propiedades: {
        total: number;
        disponibles: number;
        alquiladas: number;
    };
    contratos: {
        activos: number;
        porVencer: number;
    };
    operacion: {
        alquileresVencidos: number;
        cobrosPendientes: number;
        pagosPropietarioPendientes: number;
        adelantosARecuperar: {
            cantidad: number;
            porAntiguedad: { '0_15': number; '16_30': number; '31_mas': number };
            porMoneda: Record<string, number>;
        };
        contratosPorVencer: number;
    };
    finanzas: {
	        recaudadoTotal: number;
	        gananciaBruta: number;
	        gastosAgencia: number;
	        utilidadNeta: number;
	        fondoCustodia: number;
	        morosidad: number;
	        porMoneda?: Record<Moneda, FinancialMetrics>;
            devengado?: AccruedFinancialReport | null;
            caja?: CashFinancialReport | null;
        honorarios: {
            cobrados: number;
            totalInmo: number;
        };
    };
}

export const reportesService = {
    getDashboardReport: async () => {
        return api.get<DashboardReportes>('/reportes/dashboard');
    }
};
