import type { Page } from '@playwright/test';
import { admin, fixture } from './liquidation-currency';

export async function setupProductUI(page: Page, options: { empty?: boolean; readOnly?: boolean; pendingPayment?: boolean } = {}) {
    const data = fixture('USD', true);
    if (options.pendingPayment) {
        data.liquidation.estadoCobroInquilino = 'PENDIENTE';
        data.liquidation.pagos = [];
        data.liquidation.resumenMonedas = data.liquidation.resumenMonedas.map(summary => ({ ...summary, cobradoInquilino: 0, saldoInquilino: summary.netoACobrar }));
    }
    data.contract.propiedad.direccion = 'Avenida de los Constituyentes 12345 · Edificio Administración y Consorcios';
    data.contract.inquilinos[0].persona.nombreCompleto = 'María de los Ángeles Fernández de la Administración';
    data.contract.propietarios[0].persona.nombreCompleto = 'Propietario con nombre completo extenso para verificar el espacio disponible';
    const user = options.readOnly ? { ...admin, tipo: 'USUARIO', role: 'USUARIO', permissions: ['pagos.ver', 'contratos.ver', 'caja_chica.ver', 'control_interno.ver', 'teodoro.ver', 'daniel.ver'] } : admin;
    const paged = (rows: unknown[]) => ({ data: rows, meta: { total: rows.length, page: 1, limit: 10, totalPages: rows.length ? 1 : 0 } });
    const contracts = Array.from({ length: 12 }, (_, i) => ({ ...data.contract, id: i + 1, propiedad: { ...data.contract.propiedad, direccion: `Avenida de los Constituyentes ${1000 + i} · Edificio de prueba`, piso: '10', departamento: 'A' } }));
    const payments = Array.from({ length: 12 }, (_, i) => ({ id: i + 1, monto: 1000, moneda: 'USD', fechaPago: '2026-10-10', metodoPago: 'EFECTIVO', cuenta: 'CAJA', liquidacion: data.liquidation, creadoPor: admin }));
    const movements = Array.from({ length: 12 }, (_, i) => ({ id: i + 1, version: 1, tipo: 'EGRESO', moneda: 'ARS', monto: 135760, concepto: `Servicio del período ${i + 1}`, fecha: '2026-10-10', metodoPago: 'EFECTIVO', cuenta: 'CAJA', creadoPor: admin, adjuntos: [] }));
    const errors: string[] = [];
    const requests: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(value => {
        localStorage.setItem('user', JSON.stringify(value));
        localStorage.setItem('loginTimestamp', String(Date.now()));
    }, user);
    await page.route('**/api/**', async route => {
        const url = new URL(route.request().url());
        const path = url.pathname;
        requests.push(`${route.request().method()} ${path}`);
        let body: unknown = [];
        if (path.endsWith('/auth/me')) body = user;
        else if (path === '/api/contratos') body = paged(options.empty || url.searchParams.get('search') ? [] : contracts);
        else if (/^\/api\/contratos\/\d+$/.test(path)) body = data.contract;
        else if (path === '/api/liquidaciones') body = paged(options.empty ? [] : Array.from({ length: 12 }, (_, i) => ({ ...data.liquidation, id: 10 + i, fechaLiquidacion: null, cerradoPorId: null })));
        else if (path === '/api/liquidaciones/filtros') body = { periodos: ['2026-10-01'], monedas: ['ARS', 'USD'] };
        else if (path === '/api/liquidaciones/preparacion') body = { periodo: '2026-11-01', resumen: { total: options.empty ? 0 : 12, moraHoy: 0, pendientesGenerar: 0, borradores: 0, pendientesCobro: 12, pendientesPagoPropietario: 12 }, data: options.empty ? [] : contracts.map(contract => ({ contratoId: contract.id, propiedad: contract.propiedad, inquilino: contract.inquilinos[0].persona, propietario: contract.propietarios[0].persona, status: 'GENERADA', motivos: [], estadoLiquidacion: 'CONFIRMADA', estadoCobroInquilino: 'PARCIAL', estadoPagoPropietario: 'PENDIENTE', fechaLiquidacion: null, cerradoPorId: null, liquidacionId: 10, moneda: 'USD', resumenMonedas: data.liquidation.resumenMonedas })) };
        else if (path === '/api/liquidaciones/10') body = data.liquidation;
        else if (path.includes('/periodos')) body = data.timeline;
        else if (path.includes('/pagos/deuda/')) body = { totalDeuda: 0, moneda: 'USD', detalle: [] };
        else if (path === '/api/pagos') body = paged(options.empty || url.searchParams.get('search') ? [] : payments);
        else if (path === '/api/cajachica') body = paged(options.empty || url.searchParams.get('search') ? [] : movements);
        else if (path === '/api/cajachica/resumen') body = { balanceCaja: 500000, balanceBanco: 300000, balanceGeneral: 800000, totalCobrado: 500000, totalPagadoPropietarios: 200000, gananciaBruta: 30000, gastosGenerales: 10000, fondosEnCustodia: 200000, totalesPorMoneda: { ARS: { totalIngresos: 900000, totalEgresos: 100000, balance: 800000 }, USD: { totalIngresos: 5000, totalEgresos: 3000, balance: 2000 } } };
        else if (path === '/api/reportes/dashboard') body = { propiedades: { total: 5 }, contratos: { activos: 5 }, finanzas: { morosidad: 0 }, operacion: { alquileresVencidos: 1, cobrosPendientes: 3, pagosPropietarioPendientes: 2, contratosPorVencer: 1 }, porMoneda: { ARS: { recaudadoTotal: 900000, gananciaBruta: 90000, gastosAgencia: 10000, utilidadNeta: 80000, fondoCustodia: 200000 }, USD: { recaudadoTotal: 5000, gananciaBruta: 500, gastosAgencia: 100, utilidadNeta: 400, fondoCustodia: 2000 } } };
        else if (/\/recibos$/.test(path)) body = { movimiento: movements[0], datos: { pagador: 'Oficina', receptor: 'Proveedor', descripcion: 'Servicio', inmueble: '', documentoReceptor: '' }, versiones: [], ultimaVersion: 0, puedeEmitir: true, huellaMovimiento: 'a'.repeat(64), bloqueo: null };
        else if (['/api/control-interno', '/api/teodoro', '/api/daniel'].includes(path)) body = { ...paged(options.empty || url.searchParams.get('search') ? [] : movements.map(m => ({ ...m, tipo: 'GASTO', detalle: m.concepto, fechaCreacion: '2026-10-10T12:00:00Z' }))), resumen: [{ moneda: 'ARS', ingresos: 0, gastos: options.empty ? 0 : 678800, diferencia: options.empty ? 0 : -678800 }] };
        else if (path.endsWith('/opciones')) body = { categorias: [], mediosPago: [], cuentasPago: [], usuarios: [] };
        await route.fulfill({ json: body });
    });
    return { errors, requests };
}
