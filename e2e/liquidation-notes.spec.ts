import { expect, test, type Page } from '@playwright/test';
import type { DestinatarioNotaLiquidacion, Liquidacion } from '../src/services/liquidaciones.service';

const admin = { id: 1, email: 'admin@test.local', fullName: 'Administrador', nombreCompleto: 'Administrador', tipo: 'ADMIN', role: 'ADMIN', permissions: [], inmobiliaria: { id: 1, nombre: 'PropControl' } };
type NoteBody = { notaLiquidacion: string | null; destinatarioNotaLiquidacion: DestinatarioNotaLiquidacion; expectedVersion: number };

async function setup(page: Page, options: { confirmed?: boolean; readOnly?: boolean; cancelled?: boolean; failSave?: boolean; note?: string; recipient?: DestinatarioNotaLiquidacion } = {}) {
    const liquidation = {
        id: 12, version: 4, contratoId: 1, periodo: '2026-10-01', moneda: 'USD',
        estado: options.cancelled ? 'ANULADA' : options.confirmed ? 'CONFIRMADA' : 'BORRADOR',
        estadoCobroInquilino: 'PENDIENTE', estadoPagoPropietario: 'PENDIENTE',
        montoAlquilerBase: 2300, montoHonorarios: 115, porcentajeHonorarios: 5, montoPropietario: 2185,
        netoACobrar: 2300, totalIngresos: 2300, totalDescuentos: 0, pagaHonorarios: 'PROPIETARIO',
        fechaCreacion: '2026-10-01', fechaLiquidacion: null, fechaVencimiento: '2026-10-10',
        propiedadDireccion: 'Dragones 2280', inquilinoNombre: 'Inquilino', propietarioNombre: 'Propietario',
        movimientos: [{ id: 1, tipo: 'INGRESO', concepto: 'Alquiler Mensual', monto: 2300, moneda: 'USD', esParaInmobiliaria: false }],
        pagos: [], ajustes: [], aplicacionesCredito: [], historialPagosPropietario: [], auditLogs: [],
        notaLiquidacion: options.note || null as string | null, destinatarioNotaLiquidacion: options.recipient || 'AMBOS',
        comprobantes: [] as NonNullable<Liquidacion['comprobantes']>,
        contrato: {
            id: 1, estado: 'ACTIVO', version: 1, moneda: 'USD', montoAlquiler: 2300,
            fechaInicio: '2026-01-01', fechaFin: '2027-12-31', requiereActualizacion: false,
            propiedad: { id: 1, direccion: 'Dragones 2280', piso: '1', departamento: 'B' },
            inquilinos: [{ esPrincipal: true, persona: { id: 2, nombreCompleto: 'Inquilino' } }],
            propietarios: [{ esPrincipal: true, persona: { id: 3, nombreCompleto: 'Propietario' } }],
            actualizaciones: [], serviciosGastos: [],
        },
    };
    const voucher = (version: number, event: 'CONFIRMACION' | 'NOTA_LIQUIDACION'): NonNullable<Liquidacion['comprobantes']>[number] => ({
        id: version, version, evento: event, fechaEmision: '2026-10-29T12:00:00Z', creadoPor: admin,
        moneda: 'USD', importeOriginal: 2300, importeCorregido: 2300, importePropietarioOriginal: 2185, importePropietarioCorregido: 2185, ajustes: [],
    });
    if (options.confirmed) liquidation.comprobantes = [voucher(1, 'CONFIRMACION')];
    const user = options.readOnly ? { ...admin, tipo: 'USUARIO', role: 'USUARIO', permissions: ['liquidaciones.ver'] } : admin;
    const saves: NoteBody[] = [];
    const pdfRequests: string[] = [];
    await page.route('**/api/**', async route => {
        const request = route.request();
        const url = new URL(request.url());
        let data: unknown = {};
        if (url.pathname.endsWith('/auth/me')) data = user;
        else if (url.pathname.endsWith('/liquidaciones/12/nota') && request.method() === 'PATCH') {
            const body = request.postDataJSON() as NoteBody;
            saves.push(body);
            if (options.failSave) return route.fulfill({ status: 409, json: { message: 'La liquidación cambió. Actualizá la pantalla' } });
            liquidation.notaLiquidacion = body.notaLiquidacion;
            liquidation.destinatarioNotaLiquidacion = body.destinatarioNotaLiquidacion;
            liquidation.version++;
            if (options.confirmed) liquidation.comprobantes.unshift(voucher(liquidation.comprobantes.length + 1, 'NOTA_LIQUIDACION'));
            data = { liquidacion: liquidation, comprobanteVersion: options.confirmed ? liquidation.comprobantes.length : null };
        } else if (/\/liquidaciones\/12\/pdf(?:-propietario)?$/.test(url.pathname)) {
            pdfRequests.push(url.pathname + url.search);
            return route.fulfill({ contentType: 'application/pdf', body: '%PDF-1.4\n%%EOF' });
        } else if (url.pathname.endsWith('/liquidaciones/12')) data = liquidation;
        else if (url.pathname.includes('/pagos/deuda/contrato/1')) data = { totalDeuda: 0, moneda: 'USD', detalle: [] };
        else if (url.pathname.includes('/liquidaciones/contrato/1/periodos')) data = { periodos: [] };
        else if (url.pathname.endsWith('/cuentas-bancarias') || url.pathname.includes('/alertas')) data = [];
        await route.fulfill({ json: data });
    });
    await page.addInitScript(value => {
        localStorage.setItem('user', JSON.stringify(value));
        localStorage.setItem('loginTimestamp', String(Date.now()));
    }, user);
    await page.goto('/liquidaciones/12');
    await expect(page.getByRole('heading', { name: /Resumen de liquidación/ })).toBeVisible();
    return { saves, pdfRequests };
}

for (const [recipient, label] of [['AMBOS', 'Propietario e inquilino'], ['PROPIETARIO', 'Propietario'], ['INQUILINO', 'Inquilino']] as const) {
    test(`guarda y recarga una aclaración para ${recipient} sin cambiar el resumen`, async ({ page }) => {
        const { saves } = await setup(page);
        const summary = page.getByTestId('liquidation-document');
        const before = await summary.textContent();
        await page.getByRole('button', { name: 'Nota para liquidación', exact: true }).click();
        const dialog = page.getByRole('dialog', { name: 'Nota para liquidación' });
        await expect(dialog.getByLabel('Texto de la nota')).toBeEmpty();
        const text = 'Cotización utilizada: $1.250 por dólar.\nUSD 2.300 equivale a $2.875.000.';
        await dialog.getByLabel('Texto de la nota').fill(text);
        await dialog.getByRole('button', { name: /Mostrar en el PDF de:/ }).click();
        await page.getByRole('option', { name: label, exact: true }).click();
        await dialog.getByRole('button', { name: 'Guardar nota', exact: true }).click();
        await expect(dialog).not.toBeVisible();
        expect(saves).toEqual([{ notaLiquidacion: text, destinatarioNotaLiquidacion: recipient, expectedVersion: 4 }]);
        const notes = page.getByRole('region', { name: 'Aclaraciones' });
        await expect(notes).toContainText(text);
        await expect(notes).toContainText(`PDF: ${label}`);
        expect(await summary.textContent()).toBe(before);
        await page.reload();
        await expect(page.getByRole('region', { name: 'Aclaraciones' })).toContainText(text);
    });
}

test('editar o quitar una nota confirmada conserva el historial y los botones descargan la versión nueva', async ({ page }) => {
    const { saves, pdfRequests } = await setup(page, { confirmed: true, note: 'Cotización anterior', recipient: 'PROPIETARIO' });
    await page.getByRole('button', { name: 'Editar nota', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Nota para liquidación' });
    await expect(dialog.getByLabel('Texto de la nota')).toHaveValue('Cotización anterior');
    await expect(dialog.getByText(/Las versiones anteriores se conservan/)).toBeVisible();
    await dialog.getByLabel('Texto de la nota').fill('Cotización actualizada');
    await dialog.getByRole('button', { name: 'Guardar nota', exact: true }).click();
    await expect(dialog).not.toBeVisible();
    await page.getByRole('button', { name: 'Más opciones' }).click();
    await page.getByRole('menuitem', { name: 'Liquidación del propietario', exact: true }).click();
    await expect.poll(() => pdfRequests).toContain('/api/liquidaciones/12/pdf-propietario?version=2');
    const history = page.getByTestId('liquidation-vouchers');
    await history.locator('summary').click();
    await expect(history.getByText('Aclaración actualizada', { exact: true })).toBeVisible();
    await expect(history.getByText('Versión 1', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Editar nota', exact: true }).click();
    await dialog.getByRole('button', { name: 'Quitar nota', exact: true }).click();
    await expect(dialog).not.toBeVisible();
    await expect(page.getByRole('region', { name: 'Aclaraciones' })).toHaveCount(0);
    expect(saves[1]).toMatchObject({ notaLiquidacion: null, expectedVersion: 5 });
});

test('un error conserva el texto y el destinatario para reintentar; no guarda notas vacías', async ({ page }) => {
    await setup(page, { failSave: true });
    await page.getByRole('button', { name: 'Nota para liquidación', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Nota para liquidación' });
    await expect(dialog.getByRole('button', { name: 'Guardar nota', exact: true })).toBeDisabled();
    await dialog.getByLabel('Texto de la nota').fill('  ');
    await expect(dialog.getByRole('button', { name: 'Guardar nota', exact: true })).toBeDisabled();
    await dialog.getByLabel('Texto de la nota').fill('Texto que no debe perderse');
    await dialog.getByRole('button', { name: 'Guardar nota', exact: true }).click();
    await expect(page.getByText('La liquidación cambió. Actualizá la pantalla')).toBeVisible();
    await expect(dialog.getByLabel('Texto de la nota')).toHaveValue('Texto que no debe perderse');
    await expect(dialog.getByRole('button', { name: 'Guardar nota', exact: true })).toBeEnabled();
    await expect(dialog.getByLabel('Texto de la nota')).toHaveAttribute('maxlength', '3000');
});

test('en móvil el popup permite desplazarse sin cerrarse y la nota no genera desborde horizontal', async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 390, height: 500 });
    const { saves } = await setup(page);
    await page.getByRole('button', { name: 'Nota para liquidación', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Nota para liquidación' });
    await dialog.getByLabel('Texto de la nota').fill('Texto largo de conversión\n'.repeat(30));
    const panel = dialog.locator('.modal-scroll');
    await panel.evaluate(element => { element.scrollTop = element.scrollHeight; });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Guardar nota', exact: true })).toBeInViewport();
    await dialog.getByRole('button', { name: 'Guardar nota', exact: true }).click();
    await expect(dialog).not.toBeVisible();
    expect(saves).toHaveLength(1);
    await page.getByRole('region', { name: 'Aclaraciones' }).scrollIntoViewIfNeeded();
    expect(await page.locator('html').evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath('nota-liquidacion-movil.png') });
});

test('los usuarios de solo lectura ven la nota pero no pueden editarla', async ({ page }) => {
    await setup(page, { readOnly: true, note: 'Nota visible' });
    await expect(page.getByRole('region', { name: 'Aclaraciones' })).toContainText('Nota visible');
    await expect(page.getByRole('button', { name: 'Nota para liquidación', exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Editar nota', exact: true })).toHaveCount(0);
});

test('una liquidación anulada muestra su aclaración sin permitir editarla', async ({ page }) => {
    await setup(page, { cancelled: true, note: 'Nota anterior a la anulación' });
    await expect(page.getByRole('region', { name: 'Aclaraciones' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Nota para liquidación', exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Editar nota', exact: true })).toHaveCount(0);
});
