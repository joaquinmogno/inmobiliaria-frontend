import { test, expect, type Page } from '@playwright/test';

const permissions = ['control_interno.ver', 'control_interno.crear', 'control_interno.editar', 'control_interno.anular', 'control_interno.reportes'];
function record() {
    return { id: 1, version: 1, fecha: '2026-10-28', tipo: 'GASTO', detalle: 'Artículos de oficina', monto: '25000.50', moneda: 'ARS', categoria: 'Oficina', metodoPago: null, observaciones: 'Compra del mes', fechaCreacion: '2026-10-28T17:00:00.000Z', fechaActualizacion: '2026-10-28T17:00:00.000Z', anuladoEn: null as string | null, motivoAnulacion: null as string | null, creadoPor: { id: 1, nombreCompleto: 'Jefe de la inmobiliaria' }, actualizadoPor: null, anuladoPor: null, adjuntos: [] as Array<{ id: number; nombreArchivo: string; tipoContenido: string; tamano: number; fechaCreacion: string; creadoPor: { id: number; nombreCompleto: string } }> };
}

async function mock(page: Page, allowed = permissions) {
    const user = { id: 5, email: 'control@test.local', fullName: 'Usuario interno', nombreCompleto: 'Usuario interno', tipo: 'USUARIO', role: 'USUARIO', permissions: allowed, inmobiliaria: { id: 1, nombre: 'PropControl' } };
    const records = [record()];
    const sent: Array<{ path: string; method: string; body: string | null; query: string }> = [];
    await page.route('**/api/**', async route => {
        const request = route.request();
        const url = new URL(request.url());
        const path = url.pathname;
        sent.push({ path, method: request.method(), body: request.postData(), query: url.search });
        let body: unknown = {};
        if (path.endsWith('/auth/me')) body = user;
        else if (path === '/api/control-interno/opciones') body = { categorias: ['Oficina', 'Servicios'], mediosPago: ['Efectivo'], usuarios: [{ id: 1, nombreCompleto: 'Jefe de la inmobiliaria' }] };
        else if (path.startsWith('/api/control-interno/reportes/')) {
            await route.fulfill({ status: 200, headers: { 'Content-Type': path.endsWith('/excel') ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 'application/pdf', 'Content-Disposition': `attachment; filename="control-interno-2026-10.${path.endsWith('/excel') ? 'xlsx' : 'pdf'}"` }, body: path.endsWith('/excel') ? Buffer.from('PK-test-workbook') : Buffer.from('%PDF-1.4\n%%EOF') });
            return;
        } else if (path === '/api/control-interno' && request.method() === 'GET') {
            const state = url.searchParams.get('estado') || 'VIGENTES';
            const rows = records.filter(row => state === 'TODOS' || (state === 'ANULADOS' ? row.anuladoEn : !row.anuladoEn));
            const gastos = rows.filter(row => !row.anuladoEn && row.tipo === 'GASTO').reduce((sum, row) => sum + Number(row.monto), 0);
            body = { data: rows, meta: { page: 1, limit: 25, total: rows.length, totalPages: rows.length ? 1 : 0 }, periodo: url.searchParams.get('periodo'), resumen: [{ moneda: 'ARS', ingresos: 0, gastos, diferencia: -gastos }, { moneda: 'USD', ingresos: 0, gastos: 0, diferencia: 0 }] };
        } else if (path === '/api/control-interno' && request.method() === 'POST') {
            const added = { ...record(), id: 2, detalle: 'Gasto con comprobante', adjuntos: [{ id: 5, nombreArchivo: 'recibo.pdf', tipoContenido: 'application/pdf', tamano: 20, fechaCreacion: '2026-10-28T17:00:00.000Z', creadoPor: user }] };
            records.push(added);
            body = added;
        } else if (path === '/api/control-interno/1/anular') {
            records[0].anuladoEn = '2026-10-29T10:00:00.000Z';
            records[0].motivoAnulacion = request.postDataJSON().motivo;
            records[0].version++;
            body = records[0];
        } else if (path === '/api/control-interno/1' && request.method() === 'PUT') {
            Object.assign(records[0], request.postDataJSON());
            records[0].version++;
            body = records[0];
        } else if (path.includes('/contratos/alertas') || path.includes('/alertas-operativas')) body = [];
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
    });
    await page.addInitScript(data => {
        localStorage.setItem('user', JSON.stringify(data));
        localStorage.setItem('loginTimestamp', String(Date.now()));
    }, user);
    await page.goto('/control-interno');
    return { sent, records };
}

test('el módulo queda oculto y rechaza la navegación directa sin permiso', async ({ page }) => {
    const { sent } = await mock(page, []);
    await expect(page.getByRole('heading', { name: 'Acceso denegado' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Control interno' })).toHaveCount(0);
    expect(sent.some(request => request.path === '/api/control-interno')).toBe(false);
});

test('consulta permite ver registros y comprobantes, pero oculta edición, anulación y reportes', async ({ page }) => {
    await mock(page, ['control_interno.ver']);
    await expect(page.getByRole('heading', { name: 'Control interno' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Agregar movimiento', exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Excel', exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Editar', exact: true })).toHaveCount(0);
    await page.getByRole('button', { name: 'Comprobantes (0)' }).filter({ visible: true }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText('Todavía no hay comprobantes adjuntos.')).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Adjuntar comprobantes' })).toHaveCount(0);
});

test('permite cargar un gasto con foto/PDF y sin medio de pago obligatorio', async ({ page }) => {
    const { sent } = await mock(page);
    await page.getByRole('button', { name: 'Agregar movimiento', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Agregar movimiento interno' });
    await dialog.getByLabel('Fecha *', { exact: true }).fill('2026-10-28');
    await dialog.getByLabel('Detalle de lo pagado o recibido').fill('Gasto con comprobante');
    await dialog.getByLabel('Importe *', { exact: true }).fill('25000.50');
    await expect(dialog.getByLabel('Medio de pago (opcional)')).not.toHaveAttribute('required');
    await dialog.locator('#internal-receipts').setInputFiles({ name: 'recibo.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4\n%%EOF') });
    await dialog.getByRole('button', { name: 'Guardar movimiento' }).click();
    await expect(dialog).not.toBeVisible();
    const create = sent.find(request => request.path === '/api/control-interno' && request.method === 'POST');
    expect(create?.body).toContain('filename="recibo.pdf"');
    expect(create?.body).toContain('25000.50');
    await expect(page.getByRole('cell', { name: 'Gasto con comprobante' })).toBeVisible();
});

test('editar y anular conservan versión y motivo sin mostrar un asiento de caja', async ({ page }) => {
    const { sent } = await mock(page);
    await page.getByRole('button', { name: 'Editar', exact: true }).filter({ visible: true }).click();
    const edit = page.getByRole('dialog', { name: 'Editar movimiento interno' });
    await edit.getByLabel('Importe *', { exact: true }).fill('27000');
    await edit.getByRole('button', { name: 'Guardar movimiento' }).click();
    await expect(edit).not.toBeVisible();
    expect(JSON.parse(sent.find(request => request.method === 'PUT')?.body || '{}')).toMatchObject({ version: 1, monto: '27000' });
    await page.getByRole('button', { name: 'Anular', exact: true }).filter({ visible: true }).click();
    const cancel = page.getByRole('dialog', { name: 'Anular movimiento interno' });
    await expect(cancel.getByText(/asiento inverso/)).toHaveCount(0);
    await cancel.getByLabel('Motivo de la anulación').fill('Registrado por duplicado');
    await cancel.getByRole('button', { name: 'Confirmar anulación' }).click();
    await expect(cancel).not.toBeVisible();
    await page.getByRole('combobox', { name: 'Estado', exact: true }).selectOption('ANULADOS');
    await expect(page.getByRole('cell').filter({ hasText: 'Registrado por duplicado' })).toBeVisible();
    expect(sent.some(request => request.path.includes('/cajachica'))).toBe(false);
});

test('Excel y PDF descargan la selección mensual con los filtros activos', async ({ page }) => {
    const { sent } = await mock(page);
    await page.getByLabel('Mes', { exact: true }).fill('2026-10');
    await page.getByText('Más filtros', { exact: true }).click();
    await page.getByRole('combobox', { name: 'Categoría', exact: true }).selectOption('Oficina');
    for (const format of ['Excel', 'PDF']) {
        const downloadPromise = page.waitForEvent('download');
        await page.getByRole('button', { name: format, exact: true }).click();
        const download = await downloadPromise;
        expect(download.suggestedFilename()).toBe(`control-interno-2026-10.${format === 'Excel' ? 'xlsx' : 'pdf'}`);
        const request = sent.find(request => request.path.endsWith(`/reportes/${format.toLowerCase()}`));
        expect(request?.query).toContain('periodo=2026-10');
        expect(request?.query).toContain('categoria=Oficina');
    }
});

test('la planilla y el formulario son utilizables en móvil y escritorio', async ({ page }, testInfo) => {
    await mock(page);
    await expect(page.getByRole('heading', { name: 'Control interno' })).toBeVisible();
    await expect(page.getByText('Artículos de oficina', { exact: true }).filter({ visible: true })).toBeVisible();
    await page.setViewportSize({ width: 1366, height: 900 });
    await page.screenshot({ path: testInfo.outputPath('control-interno-escritorio.png') });
    await page.setViewportSize({ width: 390, height: 600 });
    expect(await page.locator('html').evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath('control-interno-movil.png') });
    await page.getByRole('button', { name: 'Agregar movimiento', exact: true }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('button', { name: 'Guardar movimiento' })).toBeInViewport();
    await dialog.locator('#internal-movement-form').evaluate(element => element.scrollIntoView());
    expect(await dialog.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
});
