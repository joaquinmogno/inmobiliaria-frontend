import api, { openAuthenticatedPdf } from './api';
import type { Contract } from './contracts.service';
import type { Pago } from './pagos.service';
import type { AuditLogItem } from '../components/AuditTrail';
import type { PaginationMeta } from './api';
import type { Moneda } from '../utils/currency';

export type EstadoLiquidacion = 'BORRADOR' | 'CONFIRMADA' | 'ANULADA';
export type EstadoCobroInquilino = 'PENDIENTE' | 'PARCIAL' | 'COBRADO';
export type EstadoPagoPropietario = 'PENDIENTE' | 'PARCIAL' | 'PAGADO';
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

export interface MovimientoPagoPropietario {
    id: number;
    tipo: 'PAGO' | 'REVERSION';
    estado: 'VIGENTE' | 'REVERTIDO' | 'ANULADO' | 'REVERSION';
    monto: number;
    fecha: string;
    fechaCreacion: string;
    metodoPago: string;
    cuenta: string;
    observaciones: string | null;
    motivoAnulacion: string | null;
    creadoPor: { id: number; nombreCompleto: string } | null;
    anuladoPor: { id: number; nombreCompleto: string } | null;
    comprobante: string;
    saldoPosterior: number;
    reversionDeId: number | null;
    reversionId: number | null;
    pagoPropietarioId: number;
    propietario: { id: number; nombreCompleto: string };
    origen: 'FONDOS_COBRADOS' | 'ADELANTO_PROPIO' | 'MIXTO';
    montoFondosCobrados: number;
    montoAdelantoPropio: number;
    motivoAdelanto: string | null;
}

export interface Liquidacion {
    id: number;
    version: number;
    periodo: string;
    estado: EstadoLiquidacion;
    estadoCobroInquilino: EstadoCobroInquilino;
    estadoPagoPropietario: EstadoPagoPropietario;
    totalIngresos: number;
    totalDescuentos: number;
    netoACobrar: number;
    porcentajeHonorarios: number | null;
    montoHonorarios: number;
    montoAlquilerBase: number;
    montoPropietario: number;
    montoPagadoPropietario?: number;
    pagaHonorarios: 'INQUILINO' | 'PROPIETARIO';
    moneda: Moneda;
    fechaCreacion: string;
    fechaLiquidacion: string | null;
    fechaConfirmacion?: string | null;
    fechaPagoPropietario?: string | null;
    fechaVencimiento?: string | null;
    metodoPagoPropietario?: string | null;
    propietarioPagoId?: number | null;
    propietarioPago?: {
        id: number;
        nombreCompleto: string;
        cbu: string | null;
        aliasBancario: string | null;
        titularCuentaBancaria: string | null;
        titularidadBancariaVerificada: boolean;
    } | null;
    pagoPropietarioMovimientoId?: number | null;
    propiedadDireccion?: string | null;
    inquilinoNombre?: string | null;
    propietarioNombre?: string | null;
    contratoId: number;
    contrato?: Contract;
    movimientos?: Movimiento[];
    historialPagosPropietario?: MovimientoPagoPropietario[];
    resumenOperativo?: {
        cobradoInquilino: number;
        creditoAplicadoInquilino: number;
        saldoInquilino: number;
        pagadoPropietario: number;
        saldoPropietario: number;
        capitalPropioExpuesto: number;
    };
    ajustes?: Array<{
        id: number;
        tipo: 'CREDITO' | 'DEBITO';
        concepto: string;
        motivo: string;
        monto: number;
        impactoInquilino: number;
        impactoPropietario: number;
        fechaCreacion: string;
        creadoPor: { id: number; nombreCompleto: string };
        creditoInquilino?: {
            id: number;
            montoOriginal: number;
            saldoPendiente: number;
            destino: 'DEVOLUCION' | 'SALDO_A_FAVOR' | 'COMPENSACION';
            estado: 'DISPONIBLE' | 'APLICADO' | 'DEVUELTO';
            aplicaciones: Array<{ id: number; monto: number; fechaAplicacion: string; liquidacion: { id: number; periodo: string } }>;
            movimientoDevolucion?: { id: number; fecha: string; metodoPago: string } | null;
        } | null;
    }>;
    aplicacionesCredito?: Array<{
        id: number;
        monto: number;
        fechaAplicacion: string;
        creditoInquilinoId: number;
        creditoInquilino: { ajusteLiquidacion: { id: number; concepto: string } };
    }>;
    pagos?: Pago[];
    comprobantes?: Array<{
        id: number;
        version: number;
        fechaEmision: string;
        creadoPor: { id: number; nombreCompleto: string };
        moneda: Moneda;
        importeOriginal: number;
        importeCorregido: number;
        importePropietarioOriginal: number;
        importePropietarioCorregido: number;
        ajustes: Array<{
            id: number;
            tipo: 'CREDITO' | 'DEBITO';
            concepto: string;
            motivo: string;
            impactoInquilino: number;
            impactoPropietario: number;
            creadoPor: { id: number; nombreCompleto: string };
            fechaCreacion: string;
        }>;
    }>;
    auditLogs?: AuditLogItem[];
    auditMeta?: PaginationMeta;
    creadoPor?: { id: number; nombreCompleto: string; email: string };
    confirmadoPor?: { id: number; nombreCompleto: string; email: string };
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

export type PreparationStatus = 'LISTA' | 'REVISAR' | 'GENERADA' | 'NO_ELEGIBLE';
export interface LiquidationPreparationRow {
    contratoId: number;
    contratoVersion: number;
    status: PreparationStatus;
    motivos: string[];
    problemas: Array<{
        codigo: string;
        mensaje: string;
        accion: 'REVISAR_CONTRATO' | 'REVISAR_CUOTAS' | 'VER_LIQUIDACION' | null;
        etiquetaAccion: string | null;
    }>;
    descartada: boolean;
    puedeGenerarseAlResolverCuotas: boolean;
    liquidacionId: number | null;
    estadoLiquidacion: EstadoLiquidacion | null;
    estadoCobroInquilino: EstadoCobroInquilino | null;
    estadoPagoPropietario: EstadoPagoPropietario | null;
    fechaVencimiento: string;
    proximaAccion: string;
    montoAlquiler: string;
    montoHonorarios: string;
    totalLiquidacion: string | null;
    pagado: string;
    pendiente: string;
    vencida: boolean;
    cuotasPeriodo: Array<{
        id: number;
        numeroCuota: number;
        concepto: string;
        fechaVencimiento: string;
        monto: string;
        tipoMovimiento: 'INGRESO' | 'DESCUENTO' | 'EGRESO';
        esParaInmobiliaria: boolean;
    }>;
    cuotasVencidas: Array<{
        id: number;
        numeroCuota: number;
        concepto: string;
        fechaVencimiento: string;
        monto: string;
        moneda: Moneda;
        tipoMovimiento: 'INGRESO' | 'DESCUENTO' | 'EGRESO';
        esParaInmobiliaria: boolean;
    }>;
    moneda: Moneda;
    propiedad: { id: number; direccion: string; piso: string | null; departamento: string | null };
    inquilino: { id: number; nombreCompleto: string } | null;
    propietario: { id: number; nombreCompleto: string } | null;
}
export interface MonthlyLiquidationPreparation {
    periodo: string;
    resumen: {
        total: number;
        pendientesGenerar: number;
        borradores: number;
        pendientesCobro: number;
        pendientesPagoPropietario: number;
        finalizadas: number;
        revisar: number;
        noElegibles: number;
        listas: number;
        generadas: number;
    };
    data: LiquidationPreparationRow[];
}

export const liquidacionesService = {
    getAll: async (contratoId?: number, page: number = 1, limit: number = 50, search?: string, filters: { estado?: string; periodo?: string; propietarioId?: string; inquilinoId?: string; propiedadId?: string; moneda?: string; soloDeuda?: boolean; vencidas?: boolean; pendientePropietario?: boolean; adelantos?: boolean } = {}) => {
        return api.get<PaginatedResponse<Liquidacion>>('/liquidaciones', {
            params: { 
                ...(contratoId ? { contratoId: contratoId.toString() } : {}),
                page: page.toString(),
                limit: limit.toString(),
                ...(search ? { search } : {}),
                ...(filters.estado ? { estado: filters.estado } : {}),
                ...(filters.periodo ? { periodo: filters.periodo } : {}),
                ...(filters.propietarioId ? { propietarioId: filters.propietarioId } : {}),
                ...(filters.inquilinoId ? { inquilinoId: filters.inquilinoId } : {}),
                ...(filters.propiedadId ? { propiedadId: filters.propiedadId } : {}),
                ...(filters.moneda ? { moneda: filters.moneda } : {}),
                ...(filters.soloDeuda ? { soloDeuda: 'true' } : {}),
                ...(filters.vencidas ? { vencidas: 'true' } : {}),
                ...(filters.pendientePropietario ? { pendientePropietario: 'true' } : {}),
                ...(filters.adelantos ? { adelantos: 'true' } : {})
            }
        });
    },

    getFilters: async () => api.get<{
        periodos: string[];
        monedas: Moneda[];
    }>('/liquidaciones/filtros'),

    searchFilterPeople: async (rol: 'PROPIETARIO' | 'INQUILINO', search = '', page = 1, id?: number) => api.get<PaginatedResponse<{ id: number; nombreCompleto: string }>>('/liquidaciones/filtros/personas', {
        params: { rol, search, page: String(page), limit: '25', ...(id ? { id: String(id) } : {}) }
    }),

    searchFilterProperties: async (search = '', page = 1, id?: number) => api.get<PaginatedResponse<{ id: number; direccion: string; piso: string | null; departamento: string | null }>>('/liquidaciones/filtros/propiedades', {
        params: { search, page: String(page), limit: '25', ...(id ? { id: String(id) } : {}) }
    }),

    getPreparation: async (periodo: string) => api.get<MonthlyLiquidationPreparation>('/liquidaciones/preparacion', { params: { periodo } }),

    generatePeriod: async (periodo: string, contratoIds?: number[], selecciones?: Array<{
        contratoId: number;
        contratoVersion?: number;
        cuotasVencidasIds?: number[];
        cuotasVencidasRevisadas?: boolean;
    }>) => api.post<{
        periodo: string;
        created: Array<{ contratoId: number; liquidacionId: number }>;
        skipped: Array<{ contratoId: number; status: PreparationStatus; motivos: string[]; liquidacionId: number | null }>;
    }>('/liquidaciones/generar-periodo', { periodo, contratoIds, selecciones }),

    dismissPreparation: async (contratoId: number, periodo: string, motivo: string) =>
        api.post('/liquidaciones/preparacion/descartar', { contratoId, periodo, motivo }),

    reopenPreparation: async (contratoId: number, periodo: string) =>
        api.post('/liquidaciones/preparacion/reabrir', { contratoId, periodo }),

    getById: async (id: number, auditPage = 1, auditLimit = 10) => {
        return api.get<Liquidacion>(`/liquidaciones/${id}`, {
            params: { auditPage: String(auditPage), auditLimit: String(auditLimit) }
        });
    },

    create: async (contratoId: number, periodo: string, montoHonorarios?: number, porcentajeHonorarios?: number, cuotasIds?: number[]) => {
        return api.post<Liquidacion>('/liquidaciones', { contratoId, periodo, montoHonorarios, porcentajeHonorarios, cuotasIds });
    },

    addMovimiento: async (liquidacionId: number, data: {
        tipo: TipoMovimiento;
        concepto: string;
        monto: number;
        observaciones?: string;
        expectedVersion?: number;
    }) => {
        return api.post<Liquidacion>(`/liquidaciones/${liquidacionId}/movimientos`, data);
    },

    deleteMovimiento: async (movimientoId: number) => {
        return api.delete<Liquidacion>(`/liquidaciones/movimientos/${movimientoId}`);
    },

    updateHonorarios: async (id: number, data: { montoHonorarios?: number, porcentajeHonorarios?: number, expectedVersion?: number }) => {
        return api.patch<Liquidacion>(`/liquidaciones/${id}/honorarios`, data);
    },

    confirmar: async (id: number, expectedVersion?: number) => {
        return api.patch<Liquidacion>(`/liquidaciones/${id}/confirmar`, { expectedVersion });
    },

    pagarPropietario: async (id: number, data: { monto: number, fechaPago: string, metodoPago: string, propietarioId: number, comprobante?: string, observaciones?: string, motivoAdelanto?: string, expectedVersion?: number }) => {
        return api.patch<Liquidacion>(`/liquidaciones/${id}/pagar-propietario`, data);
    },
    crearAjuste: async (id: number, data: {
        tipo: 'CREDITO' | 'DEBITO'; concepto: string; motivo: string; monto: number;
        impactoInquilino: number; impactoPropietario: number;
        destinoCredito?: 'DEVOLUCION' | 'SALDO_A_FAVOR' | 'COMPENSACION';
        liquidacionDestinoId?: number;
        fechaDevolucion?: string;
        metodoDevolucion?: string;
        observacionesDevolucion?: string;
    }) => api.post(`/liquidaciones/${id}/ajustes`, data),
    aplicarCreditoInquilino: async (creditId: number, data: { liquidacionDestinoId: number; monto: number }) =>
        api.post(`/liquidaciones/creditos-inquilino/${creditId}/aplicar`, data),
    anularPagoPropietario: async (id: number, pagoPropietarioId: number, motivo: string) => api.post<{
        liquidacion: Liquidacion;
    }>(`/liquidaciones/${id}/pagos-propietario/${pagoPropietarioId}/anular`, { motivo }),
    delete: async (id: number) => {
        return api.delete(`/liquidaciones/${id}`);
    },

    downloadPdf: (id: number, version?: number) => openAuthenticatedPdf(`/liquidaciones/${id}/pdf${version ? `?version=${version}` : ''}`),

    downloadPdfPropietario: (id: number, version?: number) => openAuthenticatedPdf(`/liquidaciones/${id}/pdf-propietario${version ? `?version=${version}` : ''}`)
};
