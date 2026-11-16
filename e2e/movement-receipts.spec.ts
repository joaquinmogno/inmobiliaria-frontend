import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import type { ReceiptContext, ReceiptInput, ReceiptModule } from '../src/services/movement-receipt.service';

// Minimal valid PDF for the viewer transport; PDF content and pagination are tested against the real backend.
const pdfObjects = ['<< /Type /Catalog /Pages 2 0 R >>', '<< /Type /Pages /Kids [3 0 R] /Count 1 >>', '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << >> /Contents 4 0 R >>', '<< /Length 0 >>\nstream\n\nendstream'];
let pdfText = '%PDF-1.4\n';
const offsets = [0];
pdfObjects.forEach((body, index) => { offsets.push(pdfText.length); pdfText += `${index + 1} 0 obj\n${body}\nendobj\n`; });
const xref = pdfText.length;
pdfText += `xref\n0 5\n0000000000 65535 f \n${offsets.slice(1).map(offset => `${String(offset).padStart(10, '0')} 00000 n \n`).join('')}trailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
const pdf = Buffer.from(pdfText);

async function setup(page: Page, module: ReceiptModule, options: { readOnly?: boolean; existing?: boolean; cancelled?: boolean; fail?: number } = {}) {
    const permission = module === 'cajachica' ? 'caja_chica' : module === 'control-interno' ? 'control_interno' : module;
    const user = { id: 1, email: 'admin@test.local', fullName: 'Administrador', nombreCompleto: 'Administrador', tipo: options.readOnly ? 'USUARIO' : 'ADMIN', role: options.readOnly ? 'USUARIO' : 'ADMIN', permissions: [`${permission}.ver`], inmobiliaria: { id: 1, nombre: 'PropControl' } };
    const record = { id: 14, version: 1, fecha: '2026-11-12', fechaCreacion: '2026-11-12T15:00:00Z', tipo: module === 'cajachica' ? 'EGRESO' : 'GASTO', detalle: 'Reparación de baño', concepto: 'Reparación de baño', monto: '135760.25', moneda: 'ARS', metodoPago: 'EFECTIVO', cuenta: 'CAJA', observaciones: 'Comentario privado', anuladoEn: options.cancelled ? '2026-11-13T15:00:00Z' : null, motivoAnulacion: options.cancelled ? 'Pago duplicado' : null, adjuntos: [], creadoPor: { id: 1, nombreCompleto: 'Administrador' } };
    let context: ReceiptContext = {
        movimiento: { id: 14, tipo: 'EGRESO', fecha: record.fecha, concepto: record.concepto, monto: record.monto, moneda: 'ARS', metodoPago: 'EFECTIVO' },
        huellaMovimiento: 'a'.repeat(64), ultimaVersion: options.existing ? 1 : 0, puedeEmitir: !options.cancelled,
        bloqueo: options.cancelled ? 'El movimiento fue anulado. Sus recibos se conservan para consulta.' : null,
        numero: options.existing ? 'REC-000001' : null,
        datos: { pagador: module === 'teodoro' ? 'Teodoro' : module === 'daniel' ? 'Daniel' : 'PropControl', receptor: options.existing ? 'José Albañil' : '', documentoReceptor: '', inmueble: '', descripcion: record.concepto },
        versiones: options.existing ? [{ version: 1, fechaEmision: '2026-11-12T15:00:00Z', creadoPor: 'Administrador', motivo: null, estado: options.cancelled ? 'ANULADO' : 'VIGENTE' }] : []
    };
    const sent: { path: string; method: string; data?: ReceiptInput }[] = [];
    await page.route('**/api/**', async route => {
        const req = route.request(); const pathname = new URL(req.url()).pathname;
        const data = req.method() === 'POST' ? req.postDataJSON() as ReceiptInput : undefined;
        sent.push({ path: pathname, method: req.method(), data });
        if (pathname.endsWith('/auth/me')) return route.fulfill({ json: user });
        if (pathname === `/api/${module}/14/recibos/vista-previa`) return route.fulfill({ json: { pdf: pdf.toString('base64') } });
        if (/\/recibos\/\d+\/pdf$/.test(pathname)) return route.fulfill({ contentType: 'application/pdf', body: pdf });
        if (pathname === `/api/${module}/14/recibos`) {
            if (req.method() === 'POST') {
                if (options.fail) return route.fulfill({ status: options.fail, json: { message: options.fail === 409 ? 'El movimiento cambió. Actualizá los datos.' : 'No se pudo guardar el recibo', code: 'MOVEMENT_RECEIPT_CHANGED' } });
                const version = context.ultimaVersion + 1;
                context = { ...context, ultimaVersion: version, numero: 'REC-000001', datos: data!, versiones: [{ version, fechaEmision: '2026-11-12T15:00:00Z', creadoPor: 'Administrador', motivo: data?.motivo || null, estado: 'VIGENTE' }, ...context.versiones.map(row => ({ ...row, estado: 'REEMPLAZADO' as const }))] };
                return route.fulfill({ status: 201, json: { numero: context.numero, version, creada: true } });
            }
            return route.fulfill({ json: context });
        }
        if (pathname === `/api/${module}`) return route.fulfill({ json: { data: [record], meta: { page: 1, limit: 50, total: 1, totalPages: 1 }, resumen: [{ moneda: 'ARS', ingresos: 0, gastos: 135760.25, diferencia: -135760.25 }] } });
        if (pathname.endsWith('/opciones')) return route.fulfill({ json: { categorias: [], mediosPago: [], cuentasPago: [], usuarios: [] } });
        if (pathname.endsWith('/resumen')) return route.fulfill({ json: null });
        return route.fulfill({ json: [] });
    });
    await page.addInitScript(value => { localStorage.setItem('user', JSON.stringify(value)); localStorage.setItem('loginTimestamp', String(Date.now())); }, user);
    await page.goto(`/${module}`);
    await page.getByRole('button', { name: 'Recibo PDF', exact: true }).filter({ visible: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Recibo del movimiento #14' });
    await expect(dialog.getByText('Cargando recibo…')).toHaveCount(0);
    await expect(dialog).toContainText('135.760,25');
    return { dialog, sent };
}

for (const module of ['cajachica', 'control-interno', 'teodoro', 'daniel'] as const) {
    for (const mobile of [false, true]) test(`emitir y reimprimir desde ${module} (${mobile ? 'móvil' : 'escritorio'})`, async ({ page }, info) => {
        await page.setViewportSize(mobile ? { width: 390, height: 700 } : { width: 1600, height: 1000 });
        const { dialog, sent } = await setup(page, module);
        await expect(dialog).not.toContainText('Comentario privado');
        await expect(dialog.getByRole('button', { name: 'Emitir recibo', exact: true })).toHaveCount(0);
        await dialog.getByLabel('Recibe el dinero *').fill('José Albañil');
        await dialog.getByLabel('DNI/CUIT de quien recibe').fill('20-12345678-3');
        await dialog.getByLabel('Inmueble (opcional)').fill('Cabildo 1532');
        await dialog.getByRole('button', { name: 'Vista previa', exact: true }).click();
        await expect(dialog.locator('iframe')).toHaveAttribute('src', /^blob:/);
        await expect(dialog.getByRole('button', { name: 'Emitir recibo', exact: true })).toBeEnabled();
        await expect(dialog.getByLabel('Recibe el dinero *')).toHaveCount(0);
        await expect(dialog.getByRole('region', { name: 'Vista previa del recibo', exact: true })).toBeFocused();
        await expect(dialog.getByRole('heading', { name: '2. Revisar y emitir' })).toBeInViewport();
        const back = dialog.getByRole('button', { name: 'Volver a editar', exact: true });
        await expect(back).toBeInViewport({ ratio: 1 });
        await back.focus();
        await page.keyboard.press('Enter');
        await expect(dialog.getByRole('heading', { name: '1. Datos del recibo' })).toBeFocused();
        await expect(dialog.getByLabel('Recibe el dinero *')).toHaveValue('José Albañil');
        await expect(dialog.getByLabel('DNI/CUIT de quien recibe')).toHaveValue('20-12345678-3');
        await expect(dialog.getByLabel('Inmueble (opcional)')).toHaveValue('Cabildo 1532');
        // Any public edit requires checking a fresh preview.
        await dialog.getByLabel('Concepto del recibo *').fill('Reparación de baño y cambio de grifería');
        await expect(dialog.getByRole('button', { name: 'Emitir recibo', exact: true })).toHaveCount(0);
        await dialog.getByRole('button', { name: 'Vista previa', exact: true }).click();
        await dialog.getByRole('button', { name: 'Emitir recibo', exact: true }).click();
        await expect(dialog.getByRole('region', { name: 'Historial de recibos' })).toContainText('Vigente');
        expect(sent.filter(row => row.method === 'POST' && row.path.endsWith('/recibos'))).toHaveLength(1);
        expect(sent.filter(row => row.method === 'POST').every(row => row.path.includes('/recibos'))).toBe(true);
        const issue = sent.find(row => row.method === 'POST' && row.path.endsWith('/recibos'))!;
        expect(issue.data).toMatchObject({ receptor: 'José Albañil', documentoReceptor: '20-12345678-3', ultimaVersion: 0 });
        expect(issue.data).not.toHaveProperty('monto');
        const popup = page.waitForEvent('popup');
        await dialog.getByRole('button', { name: 'Ver PDF versión 1' }).click();
        await (await popup).close();
        await expect.poll(() => sent.some(row => row.path.endsWith('/recibos/1/pdf'))).toBe(true);
        await expect(dialog.getByRole('button', { name: 'Ver PDF versión 1' })).toBeEnabled();
        await page.screenshot({ path: info.outputPath('recibo-historial.png') });
        expect(await page.locator('html').evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
        await dialog.getByRole('button', { name: 'Cerrar', exact: true }).click();
        await page.getByRole('button', { name: 'Recibo PDF', exact: true }).filter({ visible: true }).click();
        await expect(dialog).toContainText('REC-000001');
    });
}

test('corregir conserva versiones y pide motivo; formulario accesible', async ({ page }) => {
    const { dialog, sent } = await setup(page, 'teodoro', { existing: true });
    await dialog.getByRole('button', { name: 'Corregir recibo' }).click();
    await dialog.getByLabel('Recibe el dinero *').fill('José Pérez');
    await expect(dialog.getByLabel('Motivo de la nueva versión')).toHaveAttribute('required', '');
    await dialog.getByLabel('Motivo de la nueva versión').fill('Corrección del apellido');
    await expect(dialog.locator('.ui-modal-panel')).toHaveCSS('opacity', '1');
    expect((await new AxeBuilder({ page }).include('[role="dialog"]').analyze()).violations).toEqual([]);
    await dialog.getByRole('button', { name: 'Vista previa', exact: true }).click();
    await dialog.getByRole('button', { name: 'Volver a editar', exact: true }).click();
    await expect(dialog.getByLabel('Motivo de la nueva versión')).toHaveValue('Corrección del apellido');
    await dialog.getByRole('button', { name: 'Vista previa', exact: true }).click();
    await dialog.getByRole('button', { name: 'Emitir nueva versión' }).click();
    await expect(dialog.getByRole('region', { name: 'Historial de recibos' })).toContainText('Reemplazado');
    await expect(dialog.getByRole('button', { name: 'Ver PDF versión 2' })).toBeVisible();
    expect(sent.find(row => row.method === 'POST' && row.path.endsWith('/recibos'))?.data).toMatchObject({ ultimaVersion: 1, motivo: 'Corrección del apellido', receptor: 'José Pérez' });
});

for (const cancelled of [false, true]) test(`consulta y recibos anulados conservan PDFs sin permitir emisión (${cancelled})`, async ({ page }) => {
    const { dialog } = await setup(page, 'daniel', { existing: true, readOnly: !cancelled, cancelled });
    await expect(dialog.getByRole('button', { name: 'Corregir recibo' })).toHaveCount(0);
    await expect(dialog.getByRole('button', { name: 'Vista previa', exact: true })).toHaveCount(0);
    await expect(dialog.getByRole('button', { name: 'Ver PDF versión 1' })).toBeVisible();
    if (cancelled) await expect(dialog).toContainText('El movimiento fue anulado');
});

for (const status of [500, 409]) test(`error ${status} conserva datos sin mostrar recibo emitido`, async ({ page }) => {
    const { dialog } = await setup(page, 'control-interno', { fail: status });
    await dialog.getByLabel('Recibe el dinero *').fill('José Albañil');
    await dialog.getByRole('button', { name: 'Vista previa', exact: true }).click();
    await dialog.getByRole('button', { name: 'Emitir recibo', exact: true }).click();
    await expect(dialog.getByRole('alert')).toBeVisible();
    if (status === 500) await dialog.getByRole('button', { name: 'Volver a editar', exact: true }).click();
    await expect(dialog.getByLabel('Recibe el dinero *')).toHaveValue('José Albañil');
    await expect(dialog.getByRole('region', { name: 'Historial de recibos' })).toHaveCount(0);
    if (status === 409) {
        await expect(dialog.getByRole('button', { name: 'Emitir recibo', exact: true })).toHaveCount(0);
        await expect(dialog.getByRole('button', { name: 'Volver a cargar los datos' })).toBeEnabled();
    }
});
