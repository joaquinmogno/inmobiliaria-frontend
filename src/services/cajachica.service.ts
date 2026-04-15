import api from './api';

export type CuentaCaja = 'CAJA' | 'BANCO';

export interface MovimientoCaja {
    id: number;
    tipo: 'INGRESO' | 'EGRESO';
    concepto: string;
    monto: number | string;
    fecha: string;
    metodoPago: string;
    cuenta: CuentaCaja;
    observaciones?: string;
    fechaCreacion: string;
    creadoPor?: { nombreCompleto: string };
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
        balanceGeneral: number;
        totalIngresos: number;
        totalEgresos: number;
        balanceCaja: number;
        balanceBanco: number;
        totalCobrado: number;
        totalPagadoPropietarios: number;
        gastosGenerales: number;
        gananciaBruta: number;
        resultadoNeto: number;
        fondosEnCustodia: number;
    };
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

    create: async (data: {
        tipo: 'INGRESO' | 'EGRESO';
        concepto: string;
        monto: number;
        fecha: string;
        metodoPago: string;
        cuenta?: CuentaCaja;
        observaciones?: string;
    }) => {
        return api.post<MovimientoCaja>('/cajachica', data);
    }
};
