import { expect, test, type Page, type Locator } from '@playwright/test';
import { admin, fixture } from './fixtures/liquidation-currency';

async function setup(page: Page, options: { empty?: boolean; readOnly?: boolean; pendingPayment?: boolean } = {}) {
    const data = fixture('USD', true);
    if (options.pendingPayment) {
        data.liquidation.estadoCobroInquilino = 'PENDIENTE';
        data.liquidation.pagos = [];
        data.liquidation.resumenMonedas = data.liquidation.resumenMonedas.map(summary => ({ ...summary, cobradoInquilino: 0, saldoInquilino: summary.netoACobrar }));
    }
    const user = options.readOnly ? { ...admin, tipo: 'USUARIO', role: 'USUARIO', permissions: ['pagos.ver', 'contratos.ver', 'caja_chica.ver', 'control_interno.ver', 'teodoro.ver', 'daniel.ver'] } : admin;
    const paged = (rows: unknown[]) => ({ data: rows, meta: { total: rows.length, page: 1, limit: 10, totalPages: rows.length ? 1 : 0 } });
    const contracts = Array.from({ length: 5 }, (_, i) => ({ ...data.contract, id: i + 1, propiedad: { ...data.contract.propiedad, direccion: `Avenida de los Constituyentes ${1000 + i} · Edificio de prueba`, piso: '10', departamento: 'A' } }));
    const payments = Array.from({ length: 5 }, (_, i) => ({ id: i + 1, monto: 1000, moneda: 'USD', fechaPago: '2026-10-10', metodoPago: 'EFECTIVO', cuenta: 'CAJA', liquidacion: data.liquidation, creadoPor: admin }));
    const movements = Array.from({ length: 5 }, (_, i) => ({ id: i + 1, version: 1, tipo: 'EGRESO', moneda: 'ARS', monto: 135760, concepto: `Servicio del período ${i + 1}`, fecha: '2026-10-10', metodoPago: 'EFECTIVO', cuenta: 'CAJA', creadoPor: admin, adjuntos: [] }));
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
        else if (path === '/api/contratos') body = paged(contracts);
        else if (/^\/api\/contratos\/\d+$/.test(path)) body = data.contract;
        else if (path === '/api/liquidaciones') body = paged([data.liquidation]);
        else if (path === '/api/liquidaciones/10') body = data.liquidation;
        else if (path.includes('/periodos')) body = data.timeline;
        else if (path.includes('/pagos/deuda/')) body = { totalDeuda: 0, moneda: 'USD', detalle: [] };
        else if (path === '/api/pagos') body = paged(payments);
        else if (path === '/api/cajachica') body = paged(movements);
        else if (path === '/api/cajachica/resumen') body = { balanceCaja: 500000, balanceBanco: 300000, balanceGeneral: 800000, totalCobrado: 500000, totalPagadoPropietarios: 200000, gananciaBruta: 30000, gastosGenerales: 10000, fondosEnCustodia: 200000, totalesPorMoneda: { ARS: { totalIngresos: 900000, totalEgresos: 100000, balance: 800000 }, USD: { totalIngresos: 5000, totalEgresos: 3000, balance: 2000 } } };
        else if (path === '/api/reportes/dashboard') body = { propiedades: { total: 5 }, contratos: { activos: 5 }, finanzas: { morosidad: 0 }, operacion: { alquileresVencidos: 1, cobrosPendientes: 3, pagosPropietarioPendientes: 2, contratosPorVencer: 1 }, porMoneda: { ARS: { recaudadoTotal: 900000, gananciaBruta: 90000, gastosAgencia: 10000, utilidadNeta: 80000, fondoCustodia: 200000 }, USD: { recaudadoTotal: 5000, gananciaBruta: 500, gastosAgencia: 100, utilidadNeta: 400, fondoCustodia: 2000 } } };
        else if (/\/recibos$/.test(path)) body = { movimiento: movements[0], datos: { pagador: 'Oficina', receptor: 'Proveedor', descripcion: 'Servicio', inmueble: '', documentoReceptor: '' }, versiones: [], ultimaVersion: 0, puedeEmitir: true, huellaMovimiento: 'a'.repeat(64), bloqueo: null };
        else if (['/api/control-interno', '/api/teodoro', '/api/daniel'].includes(path)) body = { ...paged(options.empty || url.searchParams.get('search') ? [] : movements.map(m => ({ ...m, tipo: 'GASTO', detalle: m.concepto, fechaCreacion: '2026-10-10T12:00:00Z' }))), resumen: [{ moneda: 'ARS', ingresos: 0, gastos: options.empty ? 0 : 678800, diferencia: options.empty ? 0 : -678800 }] };
        else if (path.endsWith('/opciones')) body = { categorias: [], mediosPago: [], cuentasPago: [], usuarios: [] };
        await route.fulfill({ json: body });
    });
    return { errors, requests };
}

async function noPageOverflow(page: Page) {
    for (const selector of ['html', '#main-content']) {
        const size = await page.locator(selector).evaluate(el => ({ client: el.clientWidth, scroll: el.scrollWidth }));
        expect(size.scroll).toBeLessThanOrEqual(size.client + 1);
    }
}
async function keyboardActivate(locator: Locator) {
    await locator.focus();
    await locator.press('Enter');
}
async function footerAccessible(page: Page, label: RegExp) {
    const dialog = page.getByRole('dialog');
    const button = dialog.getByRole('button', { name: label });
    await expect(button).toBeInViewport({ ratio: 1 });
    const formId = await button.getAttribute('form');
    expect(formId).toBeTruthy();
    expect(await button.evaluate((el: HTMLButtonElement) => el.form?.id)).toBe(formId);
    const form = dialog.locator('form');
    const lastField = form.locator('input:not([type=hidden]):visible, textarea:visible, select:visible, button:visible').last();
    await lastField.focus();
    // Tab out of the scrollable body into the persistent footer.
    await page.keyboard.press('Tab');
    const footer = dialog.locator('.ui-dialog-footer');
    await expect.poll(() => footer.evaluate(el => el.contains(document.activeElement))).toBe(true);
    await expect(button).toBeInViewport({ ratio: 1 });
    await expect(dialog.getByRole('button', { name: 'Cancelar', exact: true })).toBeInViewport({ ratio: 1 });
    await keyboardActivate(dialog.getByRole('button', { name: 'Cancelar', exact: true }));
    await expect(dialog).toHaveCount(0);
}

for (const [width, height] of [[1280, 720], [1366, 768]]) {
    test(`Inicio y listados compactos ${width}x${height}`, async ({ page }, info) => {
        await page.setViewportSize({ width, height });
        const { errors } = await setup(page);
        await page.goto('/home');
        const kpis = page.getByTestId('dashboard-operational-kpis');
        await expect(kpis).toBeVisible();
        expect((await kpis.boundingBox())!.height).toBeLessThan(100);
        await noPageOverflow(page);
        await page.screenshot({ path: info.outputPath('inicio.png') });
        for (const route of ['/contratos', '/pagos', '/cajachica']) {
            await page.goto(route);
            const table = page.locator('table:visible');
            await expect(table.locator('tbody tr')).toHaveCount(5);
            await noPageOverflow(page);
            const row = table.locator('tbody tr').first();
            const bounds = (await row.boundingBox())!;
            expect(bounds.y, `${route}: primer registro`).toBeLessThan(height - 60);
            expect(bounds.height, `${route}: altura de registro`).toBeLessThan(route === '/cajachica' ? 120 : 150);
            const action = row.getByRole('button', { name: route === '/contratos' ? 'Liquidaciones y comprobantes' : 'Recibo PDF', exact: true });
            const documentAction = route === '/pagos' ? row.getByRole('link', { name: 'Comprobantes', exact: true }) : action;
            await expect(documentAction).toBeInViewport();
            const box = (await documentAction.boundingBox())!;
            expect(box.x + box.width).toBeLessThanOrEqual(width);
            if (route === '/contratos') await expect(row).toContainText('2026');
            else await expect(row).toContainText('Vigente');
            await page.screenshot({ path: info.outputPath(route.slice(1) + '.png') });
            if (route !== '/contratos') {
                const toggle = page.getByRole('button', { name: /^Filtros/ });
                await keyboardActivate(toggle);
                await expect(toggle).toHaveAttribute('aria-expanded', 'true');
                await noPageOverflow(page);
                await keyboardActivate(toggle);
                await expect(toggle).toHaveAttribute('aria-expanded', 'false');
            }
            if (route === '/pagos') {
                await keyboardActivate(documentAction);
                await expect(page).toHaveURL(/#comprobantes$/);
                const summary = page.locator('#liquidation-vouchers > summary');
                await expect(summary).toBeFocused();
                await expect(summary).toBeInViewport();
            }
        }
        expect(errors).toEqual([]);
    });

    test(`formularios con acciones persistentes y teclado ${width}x${height}`, async ({ page }) => {
        await page.setViewportSize({ width, height });
        const { errors, requests } = await setup(page, { pendingPayment: true });
        await page.goto('/cajachica');
        await keyboardActivate(page.getByRole('button', { name: 'Nuevo Movimiento', exact: true }));
        await footerAccessible(page, /^Guardar$/);
        const newMovement = page.getByRole('button', { name: 'Nuevo Movimiento', exact: true });
        await keyboardActivate(newMovement);
        await page.keyboard.press('Escape');
        await expect(page.getByRole('dialog')).toHaveCount(0);
        await expect(newMovement).toBeFocused();
        await keyboardActivate(page.getByRole('button', { name: 'Transferir entre cuentas', exact: true }));
        await footerAccessible(page, /^Transferir$/);
        await page.goto('/liquidaciones/10');
        await keyboardActivate(page.getByRole('button', { name: 'Registrar pago del inquilino', exact: true }));
        await footerAccessible(page, /^Confirmar Ingreso de Pago$/);
        // The owner dialog is available through the payment section.
        const ownerAction = page.getByRole('button', { name: /Registrar pago al propietario|Pagar al propietario|Registrar entrega|Pagar a propietario/i }).first();
        await keyboardActivate(ownerAction);
        await footerAccessible(page, /^Confirmar Pago a Propietario$/);
        await page.goto('/contratos');
        await keyboardActivate(page.getByRole('button', { name: 'Nuevo contrato', exact: true }));
        const dialog = page.getByRole('dialog');
        await expect(dialog.getByRole('button', { name: 'Guardar contrato', exact: true })).toBeInViewport({ ratio: 1 });
        await dialog.getByRole('button', { name: 'Cancelar', exact: true }).focus();
        await page.keyboard.press('Tab');
        await expect(dialog.getByRole('button', { name: 'Guardar borrador', exact: true })).toBeFocused();
        await keyboardActivate(dialog.getByRole('button', { name: 'Cancelar', exact: true }));
        await expect(dialog).toHaveCount(0);
        expect(errors).toEqual([]);
        expect(requests.every(request => request.startsWith('GET '))).toBe(true);
    });

    test(`acciones de movimientos y actualización del alquiler ${width}x${height}`, async ({ page }) => {
        await page.setViewportSize({ width, height });
        await setup(page);
        for (const [modal, label] of [['movement', /^Guardar movimiento$/], ['update', /^Confirmar$/]] as const) {
            await page.goto(`/e2e/fixtures/modal-scroll.html?modal=${modal}`);
            await footerAccessible(page, label);
        }
    });

    for (const route of ['/control-interno', '/teodoro', '/daniel']) test(`mes vacío y búsqueda sin coincidencias ${route} ${width}x${height}`, async ({ page }) => {
        await page.setViewportSize({ width, height });
        await setup(page, { empty: true });
        await page.goto(route);
        await expect(page.getByText('Sin movimientos este mes', { exact: true })).toBeVisible();
        await expect(page.getByRole('status').getByRole('button', { name: 'Agregar movimiento', exact: true })).toBeVisible();
        const month = page.getByLabel('Mes', { exact: true });
        await month.fill('2026-09');
        const search = page.getByRole('searchbox', { name: 'Buscar por detalle, cuenta u observaciones' });
        await search.focus();
        await page.keyboard.type('sin coincidencias');
        await expect(page.getByText('No hay resultados con estos filtros', { exact: true })).toBeVisible();
        await expect(page.getByRole('status').getByRole('button', { name: 'Agregar movimiento', exact: true })).toHaveCount(0);
        await keyboardActivate(page.getByRole('button', { name: 'Limpiar filtros', exact: true }));
        await expect(search).toHaveValue('');
        await expect(month).toHaveValue('2026-09');
        await expect(page.getByText('Sin movimientos este mes', { exact: true })).toBeVisible();
        await noPageOverflow(page);
    });
}

test('los accesos nuevos a comprobantes respetan los permisos', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await setup(page, { readOnly: true });
    await page.goto('/pagos');
    await expect(page.locator('table:visible tbody tr')).toHaveCount(5);
    await expect(page.getByRole('link', { name: 'Comprobantes', exact: true })).toHaveCount(0);
    await page.goto('/contratos');
    await expect(page.getByRole('button', { name: 'Liquidaciones y comprobantes', exact: true })).toHaveCount(0);
});
