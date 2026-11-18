import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { setupProductUI } from './fixtures/product-ui';

async function mockCards(page: Page, scope: string) {
    const cards = [{ id: 20, nombre: 'Visa oficina', banco: 'Galicia', ultimosCuatro: '4821', activa: true, version: 1 }, { id: 21, nombre: 'Tarjeta anterior', banco: 'Nación', ultimosCuatro: '4821', activa: false, version: 2 }];
    const writes: Array<{ path: string; body: Record<string, unknown> }> = [];
    await page.route('**/api/tarjetas/**', async route => {
        const request = route.request();
        const path = new URL(request.url()).pathname;
        expect(path).toMatch(new RegExp(`/tarjetas/${scope}(/\\d+)?$`));
        if (request.method() === 'GET') return route.fulfill({ json: cards });
        const body = request.postDataJSON(); writes.push({ path, body });
        if (request.method() === 'POST') {
            const card = { ...body, id: 22, activa: true, version: 1 }; cards.push(card);
            return route.fulfill({ status: 201, json: card });
        }
        const card = cards.find(card => path.endsWith(`/${card.id}`))!;
        Object.assign(card, { activa: body.activa, version: card.version + 1 });
        return route.fulfill({ json: card });
    });
    return { cards, writes };
}

for (const [slug, scope] of [['control-interno', 'INTERNO'], ['teodoro', 'TEODORO'], ['daniel', 'DANIEL']] as const) {
    test(`${slug}: create/select card, filter reports, deactivate and retain historical editing`, async ({ page }) => {
        if (scope === 'DANIEL') await page.setViewportSize({ width: 390, height: 844 });
        const { errors } = await setupProductUI(page);
        const { cards } = await mockCards(page, scope);
        let saved: Record<string, unknown> | null = null;
        let filtered = false;
        const exports: string[] = [];
        await page.route(`**/api/${slug}**`, async route => {
            const request = route.request(), url = new URL(request.url());
            if (url.pathname.endsWith('/opciones')) return route.fulfill({ json: { categorias: [], mediosPago: ['Tarjeta de crédito'], usuarios: [], cuentasPago: [] } });
            if (url.pathname.includes('/reportes/')) {
                exports.push(url.search);
                return route.fulfill({ contentType: 'application/pdf', body: '%PDF-1.4\n%%EOF', headers: { 'content-disposition': 'attachment; filename="tarjetas.pdf"' } });
            }
            if (request.method() === 'POST') {
                const text = request.postData() || '';
                const field = (name: string) => text.split(`name="${name}"\r\n\r\n`)[1]?.split('\r\n')[0];
                saved = { id: 1, version: 1, fecha: '2026-11-18', tipo: 'GASTO', detalle: field('detalle'), monto: field('monto'), moneda: 'ARS', metodoPago: field('metodoPago'), tarjetaId: Number(field('tarjetaId')), tarjetaDescripcion: 'Visa personal · Santander · •••• 0012', fechaCreacion: '2026-11-18T12:00:00Z', creadoPor: { nombreCompleto: 'Administrador' }, adjuntos: [] };
                return route.fulfill({ status: 201, json: saved });
            }
            filtered = url.searchParams.get('tarjetaId') === '22';
            return route.fulfill({ json: { data: saved ? [saved] : [], meta: { page: 1, limit: 25, total: saved ? 1 : 0, totalPages: saved ? 1 : 0 }, resumen: [], periodo: '2026-11' } });
        });
        await page.goto(`/${slug}`);
        await page.getByRole('button', { name: 'Agregar movimiento', exact: true }).click();
        await page.locator('#internal-detail').fill('Reparación baño');
        await page.locator('#internal-amount').fill('150000,25');
        await page.locator('#internal-payment-method').click();
        await page.getByRole('option', { name: 'Tarjeta de crédito', exact: true }).click();
        await page.getByRole('button', { name: 'Guardar movimiento', exact: true }).click();
        await expect(page.getByText('Seleccioná la tarjeta de crédito utilizada.')).toBeVisible();
        expect(saved).toBeNull();
        await page.getByRole('button', { name: 'Agregar tarjeta', exact: true }).click();
        await page.getByRole('textbox', { name: 'Nombre de la tarjeta' }).fill('Visa personal');
        await page.getByRole('textbox', { name: 'Banco o emisor' }).fill('Santander');
        await page.getByRole('textbox', { name: 'Últimos 4 dígitos' }).fill('0012');
        await page.getByRole('button', { name: 'Guardar tarjeta', exact: true }).click();
        await expect(page.getByRole('button', { name: /^Tarjeta de crédito:/ })).toContainText('0012');
        const violations = (await new AxeBuilder({ page }).include('[role="dialog"]').analyze()).violations;
        expect(violations).toEqual([]);
        await page.getByRole('button', { name: 'Guardar movimiento', exact: true }).click();
        await expect.poll(() => saved?.tarjetaId).toBe(22);
        expect(saved?.monto).toBe('150000.25');
        await expect(page.getByText('Visa personal · Santander · •••• 0012').filter({ visible: true }).first()).toBeVisible();
        if (scope === 'DANIEL') await page.getByRole('button', { name: /^Filtros/ }).click();
        await page.getByText('Más filtros', { exact: true }).click();
        await page.getByRole('button', { name: /^Filtrar por tarjeta:/ }).click();
        await expect(page.getByRole('option', { name: /Tarjeta anterior.*inactiva/ })).toBeVisible();
        await page.getByRole('option', { name: /0012.*Visa personal/ }).click();
        await expect.poll(() => filtered).toBe(true);
        await page.getByRole('button', { name: 'PDF', exact: true }).click();
        await expect.poll(() => exports.some(query => query.includes('tarjetaId=22'))).toBe(true);
        await page.getByRole('button', { name: 'Tarjetas', exact: true }).click();
        const row = page.getByRole('listitem').filter({ hasText: 'Visa personal' });
        await row.getByRole('button', { name: 'Desactivar' }).click();
        await expect.poll(() => cards.find(card => card.id === 22)?.activa).toBe(false);
        await page.getByRole('button', { name: 'Cerrar', exact: true }).click();
        await page.getByRole('button', { name: 'Editar', exact: true }).filter({ visible: true }).first().click();
        await expect(page.getByRole('button', { name: /^Tarjeta de crédito:/ })).toContainText('inactiva');
        await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
        await page.getByRole('button', { name: 'Agregar movimiento', exact: true }).click();
        await page.locator('#internal-payment-method').click();
        await page.getByRole('option', { name: 'Tarjeta de crédito', exact: true }).click();
        await page.getByRole('button', { name: /^Tarjeta de crédito:/ }).click();
        await expect(page.getByRole('option', { name: /Visa personal/ })).toHaveCount(0);
        expect(errors).toEqual([]);
    });
}

test('Gestión financiera: outgoing card only, canonical amount, no bank and card filter in URL', async ({ page }) => {
    const { errors } = await setupProductUI(page);
    await mockCards(page, 'CAJA');
    let body = '';
    await page.route('**/api/cajachica{,?*}', async route => {
        if (route.request().method() !== 'POST') {
            if (!body) return route.fallback();
            return route.fulfill({ json: { data: [{ id: 30, tipo: 'EGRESO', concepto: 'Materiales baño', monto: '5000000.25', moneda: 'ARS', fecha: '2026-11-18', cuenta: 'TARJETA', metodoPago: 'TARJETA_CREDITO', tarjetaId: 20, tarjetaDescripcion: 'Visa oficina · Galicia · •••• 4821', adjuntos: [] }], meta: { total: 1, page: 1, limit: 20, totalPages: 1 }, gastosTarjetaFiltrados: { ARS: 5000000.25, USD: 0 } } });
        }
        body = route.request().postData() || '';
        return route.fulfill({ status: 201, json: { id: 30 } });
    });
    await page.goto('/cajachica');
    await page.getByRole('button', { name: 'Nuevo Movimiento', exact: true }).click();
    await page.locator('#cash-movement-payment-method').click();
    await expect(page.getByRole('option', { name: 'Tarjeta de crédito' })).toHaveCount(0);
    await page.keyboard.press('Escape');
    await page.locator('#cash-movement-type').click();
    await page.getByRole('option', { name: 'Egreso', exact: true }).click();
    await page.locator('#cash-movement-concept').fill('Materiales baño');
    await page.locator('#cash-movement-amount').fill('5000000,25');
    await page.locator('#cash-movement-payment-method').click();
    await page.getByRole('option', { name: 'Tarjeta de crédito' }).click();
    await expect(page.locator('#cash-movement-bank-account')).toHaveCount(0);
    await page.getByRole('button', { name: 'Guardar', exact: true }).click();
    await expect(page.getByText('Seleccioná la tarjeta de crédito utilizada.')).toBeVisible();
    await page.getByRole('button', { name: /^Tarjeta de crédito:/ }).click();
    await page.getByRole('option', { name: /Visa oficina/ }).click();
    await page.getByRole('button', { name: 'Guardar', exact: true }).click();
    await page.getByRole('button', { name: 'Registrar', exact: true }).click();
    await expect.poll(() => body).toContain('name="tarjetaId"\r\n\r\n20');
    expect(body).toContain('name="monto"\r\n\r\n5000000.25');
    expect(body).not.toContain('name="cuentaBancariaId"');
    await expect(page.getByRole('cell', { name: /Visa oficina.*4821/ })).toBeVisible();
    await page.getByRole('button', { name: /^Filtros/ }).click();
    await page.getByRole('button', { name: /^Cuenta o tarjeta:/ }).click();
    await page.getByRole('option', { name: /Visa oficina/ }).click();
    await expect(page).toHaveURL(/cuenta=TARJETA%3A20/);
    expect(errors).toEqual([]);
});

test('Owner payout uses the selected own card and sends it in the financial operation', async ({ page }) => {
    const { errors } = await setupProductUI(page);
    await mockCards(page, 'CAJA');
    let payment: Record<string, unknown> | null = null;
    await page.route('**/api/liquidaciones/10/pagar-propietario', async route => {
        payment = route.request().postDataJSON();
        return route.fulfill({ json: { id: 10 } });
    });
    await page.goto('/liquidaciones/10');
    await page.getByRole('button', { name: /Registrar.*propietario|Pagar.*propietario|Registrar entrega/i }).first().click();
    await page.locator('#owner-payment-method').click();
    await page.getByRole('option', { name: 'Tarjeta de crédito' }).click();
    await page.getByRole('button', { name: /^Tarjeta de crédito:/ }).click();
    await page.getByRole('option', { name: /Visa oficina/ }).click();
    await page.getByRole('button', { name: 'Confirmar Pago a Propietario', exact: true }).click();
    await expect.poll(() => payment?.tarjetaId).toBe(20);
    expect(payment?.metodoPago).toBe('TARJETA_CREDITO');
    expect(payment?.cuentaBancariaId).toBeUndefined();
    expect(errors).toEqual([]);
});
