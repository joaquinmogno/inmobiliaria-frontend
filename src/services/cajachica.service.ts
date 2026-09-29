import api from './api';
import type { Moneda } from '../utils/currency';
import type { CashFinancialMetrics } from './reportes.service';
import type { CuentaBancaria } from './cuentas-bancarias.service';

export type CuentaCaja = 'CAJA' | 'BANCO';

export interface AdjuntoMovimientoCaja {
    id: number;
    rutaArchivo: string;
    nombreArchivo: string;
    fechaCreacion: string;
}

export interface MovimientoCaja {
    id: number;
    tipo: 'INGRESO' | 'EGRESO';
    concepto: string;
	    monto: number | string;
	    moneda: Moneda;
    fecha: string;
    metodoPago: string;
    cuenta: CuentaCaja;
    cuentaBancariaId?: number | null;
    cuentaBancaria?: Pick<CuentaBancaria, 'id' | 'banco' | 'nombre' | 'moneda'> | null;
    transferenciaInternaId?: number | null;
    transferenciaInterna?: { id: number; concepto: string } | null;
    observaciones?: string;
    fechaCreacion: string;
    anuladoEn?: string | null;
    motivoAnulacion?: string | null;
    anuladoPorId?: number | null;
    pagoId?: number | null;
    liquidacionId?: number | null;
    contratoId?: number | null;
    reversionDeId?: number | null;
    reversion?: { id: number; fechaCreacion: string } | null;
    adjuntos?: AdjuntoMovimientoCaja[];
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
	        saldosBancarios?: Record<string, { id: number; banco: string; nombre: string; moneda: Moneda; activa: boolean; ingresos: number; egresos: number; saldo: number }>;
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
    cuentaBancariaId?: number | null;
    cuentaBancaria?: Pick<CuentaBancaria, 'id' | 'banco' | 'nombre' | 'moneda' | 'activa' | 'esHistorica'> | null;
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
    getAll: async (page: number = 1, limit: number = 50, tipo?: string, cuenta?: string, search?: string, mes?: number, anio?: number, estado?: 'REVERSIONES') => {
        const params: any = { page, limit };
        if (tipo) params.tipo = tipo;
        if (cuenta?.startsWith('BANCO:')) params.cuentaBancariaId = cuenta.slice('BANCO:'.length);
        else if (cuenta) params.cuenta = cuenta;
        if (search) params.search = search;
        if (mes) params.mes = mes;
        if (anio) params.anio = anio;
        if (estado) params.estado = estado;
        
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
        cuentaBancariaId?: number;
        observaciones?: string;
        comprobantes?: File[];
    }) => {
        const formData = new FormData();
        formData.append('tipo', data.tipo);
        formData.append('concepto', data.concepto);
        formData.append('monto', String(data.monto));
        formData.append('moneda', data.moneda || 'ARS');
        formData.append('fecha', data.fecha);
        formData.append('metodoPago', data.metodoPago);
        if (data.cuentaBancariaId) formData.append('cuentaBancariaId', String(data.cuentaBancariaId));
        if (data.observaciones) formData.append('observaciones', data.observaciones);
        data.comprobantes?.forEach(file => formData.append('comprobantes', file));
        return api.post<MovimientoCaja>('/cajachica', formData);
    },

    adjuntarComprobantes: (movimientoId: number, comprobantes: File[]) => {
        const formData = new FormData();
        comprobantes.forEach(file => formData.append('comprobantes', file));
        return api.post<{ data: AdjuntoMovimientoCaja[] }>(`/cajachica/${movimientoId}/comprobantes`, formData);
    },

    anular: async (movimientoId: number, motivo: string) => {
        return api.post<{
            movimientoId: number;
            anuladoEn: string;
            motivoAnulacion: string;
            reversion: MovimientoCaja;
        }>(`/cajachica/${movimientoId}/anular`, { motivo });
    },
    transferirEntreCuentas: (data: {
        fecha: string;
        moneda: Moneda;
        monto: number;
        cuentaOrigenId: number;
        cuentaDestinoId: number;
        concepto: string;
        observaciones?: string;
    }) => api.post('/cajachica/transferencias', data),
    getCierres: () => api.get<CierreCaja[]>('/cajachica/cierres'),
    cerrarPeriodo: (data: { periodo: string; cuenta: CuentaCaja; cuentaBancariaId?: number; moneda: Moneda; saldoDeclarado: number; motivoDiferencia?: string }) => api.post('/cajachica/cierres', data),
    reabrirPeriodo: (id: number, motivo: string) => api.post<CierreCaja>(`/cajachica/cierres/${id}/reabrir`, { motivo })
};
