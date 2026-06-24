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
    finanzas: {
	        recaudadoTotal: number;
	        gananciaBruta: number;
	        gastosAgencia: number;
	        utilidadNeta: number;
	        fondoCustodia: number;
	        morosidad: number;
	        porMoneda?: Record<Moneda, FinancialMetrics>;
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
