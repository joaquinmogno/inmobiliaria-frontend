import api from './api';

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
