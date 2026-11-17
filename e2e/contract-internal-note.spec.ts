import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import type { ContractInternalNote, Liquidacion } from '../src/services/liquidaciones.service';

const admin = { id: 1, email: 'admin@test.local', fullName: 'Administrador', nombreCompleto: 'Administrador', tipo: 'ADMIN', role: 'ADMIN', permissions: [], inmobiliaria: { id: 1, nombre: 'PropControl' } };
type Body = { texto: string | null; expectedVersion: number };

async function setup(page: Page, options: { text?: string; readOnly?: boolean; failSave?: boolean } = {}) {
    const liquidation = {
        id: 12, version: 4, contratoId: 1, periodo: '2026-10-01', moneda: 'USD',
        estado: 'CONFIRMADA',
        estadoCobroInquilino: 'PENDIENTE', estadoPagoPropietario: 'PENDIENTE',
        montoAlquilerBase: 2300, montoHonorarios: 115, porcentajeHonorarios: 5, montoPropietario: 2185,
        netoACobrar: 2300, totalIngresos: 2300, totalDescuentos: 0, pagaHonorarios: 'PROPIETARIO',
        fechaCreacion: '2026-10-01', fechaLiquidacion: null, fechaVencimiento: '2026-10-10',
        propiedadDireccion: 'Dragones 2280', inquilinoNombre: 'Inquilino', propietarioNombre: 'Propietario',
        movimientos: [{ id: 1, tipo: 'INGRESO', concepto: 'Alquiler Mensual', monto: 2300, moneda: 'USD', esParaInmobiliaria: false }],
        pagos: [], ajustes: [], aplicacionesCredito: [], historialPagosPropietario: [], auditLogs: [],
        notaLiquidacion: 'Aclaración para el comprobante', destinatarioNotaLiquidacion: 'AMBOS',
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
    let note: ContractInternalNote = {
        texto: options.text || null, version: 1,
        actualizadaEn: options.text ? '2026-11-13T12:00:00Z' : null,
        actualizadaPor: options.text ? { id: 1, nombreCompleto: 'Administrador' } : null,
    };
    const user = options.readOnly ? { ...admin, tipo: 'USUARIO', role: 'USUARIO', permissions: ['liquidaciones.ver'] } : admin;
    const saves: Body[] = [];
    await page.route('**/api/**', async route => {
        const request = route.request();
        const url = new URL(request.url());
        let data: unknown = {};
        if (url.pathname.endsWith('/auth/me')) data = user;
        else if (/\/liquidaciones\/\d+\/nota-interna$/.test(url.pathname) && request.method() === 'PATCH') {
            const body = request.postDataJSON() as Body;
            saves.push(body);
            if (options.failSave) return route.fulfill({ status: 409, json: { code: 'STALE_WRITE', message: 'Otro usuario modificó la nota interna. Actualizá la pantalla.' } });
            note = { texto: body.texto, version: note.version + 1, actualizadaEn: '2026-11-13T12:00:00Z', actualizadaPor: { id: 1, nombreCompleto: 'Administrador' } };
            data = note;
        } else if (/\/liquidaciones\/\d+$/.test(url.pathname)) {
            const id = Number(url.pathname.split('/').pop());
            data = { ...liquidation, id, periodo: id === 12 ? '2026-10-01' : '2026-11-01', notaInternaContrato: note };
        } else if (url.pathname.includes('/pagos/deuda/contrato/1')) data = { totalDeuda: 0, moneda: 'USD', detalle: [] };
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
    return { saves };
}

const panel = (page: Page) => page.getByRole('region', { name: 'NOTA INTERNA (IMPORTANTE)', exact: true });

for (const mobile of [false, true]) test(`guardar, editar y eliminar entre meses (${mobile ? 'móvil' : 'escritorio'})`, async ({ page }, testInfo) => {
    if (mobile) await page.setViewportSize({ width: 390, height: 700 });
    const { saves } = await setup(page);
    const summary = await page.getByTestId('liquidation-document').textContent();
    await panel(page).getByRole('button', { name: 'Agregar nota interna' }).click();
    let dialog = page.getByRole('dialog', { name: 'Nota interna del contrato', exact: true });
    await expect(dialog.getByRole('button', { name: 'Guardar nota interna', exact: true })).toBeDisabled();
    const text = 'Pedir las expensas antes de confirmar.\nConsultar uso del SUM.';
    await dialog.getByLabel('Texto de la nota interna').fill(text);
    await dialog.getByRole('button', { name: 'Guardar nota interna', exact: true }).click();
    await expect(dialog).not.toBeVisible();
    await expect(panel(page)).toContainText(text);
    await expect(panel(page)).toContainText('Actualizada por Administrador');
    expect(saves).toEqual([{ texto: text, expectedVersion: 1 }]);
    expect(await page.getByTestId('liquidation-document').textContent()).toBe(summary);
    await expect(page.getByRole('region', { name: 'Aclaraciones', exact: true })).toContainText('Aclaración para el comprobante');
    await page.reload();
    await expect(panel(page)).toContainText(text);
    await page.goto('/liquidaciones/13');
    await expect(panel(page)).toContainText(text);
    await panel(page).getByRole('button', { name: 'Editar nota interna' }).click();
    dialog = page.getByRole('dialog', { name: 'Nota interna del contrato', exact: true });
    await expect(dialog.getByLabel('Texto de la nota interna')).toHaveValue(text);
    await dialog.getByLabel('Texto de la nota interna').fill('Recordatorio actualizado para el equipo');
    await dialog.getByRole('button', { name: 'Guardar nota interna', exact: true }).click();
    await expect(dialog).not.toBeVisible();
    await page.goto('/liquidaciones/12');
    await expect(panel(page)).toContainText('Recordatorio actualizado para el equipo');
    await panel(page).scrollIntoViewIfNeeded();
    expect(await page.locator('html').evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath('nota-interna.png') });
    await panel(page).getByRole('button', { name: 'Eliminar nota interna' }).click();
    const deletion = page.getByRole('dialog', { name: 'Eliminar nota interna', exact: true });
    await expect(deletion).toContainText('incluidas las próximas');
    await deletion.getByRole('button', { name: 'Cancelar', exact: true }).click();
    await expect(deletion).not.toBeVisible();
    expect(saves).toHaveLength(2);
    await panel(page).getByRole('button', { name: 'Eliminar nota interna' }).click();
    await deletion.getByRole('button', { name: 'Confirmar eliminación', exact: true }).click();
    await expect(deletion).not.toBeVisible();
    await expect(panel(page).getByRole('button', { name: 'Agregar nota interna' })).toBeVisible();
    expect(saves[2]).toEqual({ texto: null, expectedVersion: 3 });
    await page.goto('/liquidaciones/13');
    await expect(panel(page)).not.toContainText('Recordatorio actualizado');
    await expect(page.getByRole('region', { name: 'Aclaraciones', exact: true })).toContainText('Aclaración para el comprobante');
});

test('un conflicto conserva el texto para reintentar y no cierra la ventana', async ({ page }) => {
    await setup(page, { text: 'Recordatorio original', failSave: true });
    await panel(page).getByRole('button', { name: 'Editar nota interna' }).click();
    const dialog = page.getByRole('dialog', { name: 'Nota interna del contrato', exact: true });
    await dialog.getByLabel('Texto de la nota interna').fill('Texto que no debe perderse');
    await dialog.getByRole('button', { name: 'Guardar nota interna', exact: true }).click();
    await expect(dialog.getByRole('alert')).toContainText('Otro usuario modificó la nota');
    await expect(dialog.getByLabel('Texto de la nota interna')).toHaveValue('Texto que no debe perderse');
    await expect(dialog.getByRole('button', { name: 'Guardar nota interna', exact: true })).toBeEnabled();
    await expect(dialog.getByLabel('Texto de la nota interna')).toHaveAttribute('maxlength', '3000');
    await dialog.getByRole('button', { name: 'Cancelar', exact: true }).click();
    await expect(panel(page)).toContainText('Recordatorio original');
    await panel(page).getByRole('button', { name: 'Eliminar nota interna' }).click();
    const deletion = page.getByRole('dialog', { name: 'Eliminar nota interna', exact: true });
    await deletion.getByRole('button', { name: 'Confirmar eliminación', exact: true }).click();
    await expect(deletion.getByRole('alert')).toContainText('Otro usuario modificó');
    await expect(deletion).toBeVisible();
});

test('solo lectura permite consultar sin editar y la impresión oculta la nota interna', async ({ page }) => {
    await setup(page, { text: 'Recordatorio privado del equipo', readOnly: true });
    await expect(panel(page)).toContainText('Recordatorio privado del equipo');
    await expect(panel(page).getByRole('button', { name: /Agregar nota interna|Editar nota interna|Eliminar nota interna/ })).toHaveCount(0);
    await panel(page).getByRole('button', { name: 'Ayuda de la nota interna', exact: true }).click();
    const help = page.getByRole('region', { name: 'Ayuda de la nota interna', exact: true });
    await expect(help).toBeVisible();
    await expect(help).toContainText('Se mantiene en los próximos meses hasta eliminarlo.');
    await page.emulateMedia({ media: 'print' });
    await expect(help).not.toBeVisible();
    await expect(page.locator('section[aria-labelledby="contract-internal-note-title"]')).not.toBeVisible();
    await expect(page.getByRole('region', { name: 'Aclaraciones', exact: true })).toBeVisible();
});

test('el recuadro y el editor son accesibles y funcionan con pantalla pequeña', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 500 });
    await setup(page, { text: 'Nota interna de prueba' });
    expect((await new AxeBuilder({ page }).include('section[aria-labelledby="contract-internal-note-title"]').analyze()).violations).toEqual([]);
    await panel(page).getByRole('button', { name: 'Editar nota interna' }).click();
    const dialog = page.getByRole('dialog', { name: 'Nota interna del contrato', exact: true });
    await expect(dialog.locator('.ui-modal-panel')).toHaveCSS('opacity', '1');
    expect((await new AxeBuilder({ page }).include('[role="dialog"]').analyze()).violations).toEqual([]);
    await dialog.getByLabel('Texto de la nota interna').fill('Recordatorio de varias líneas\n'.repeat(40));
    await dialog.locator('.modal-scroll').evaluate(element => { element.scrollTop = element.scrollHeight; });
    await expect(dialog.getByRole('button', { name: 'Guardar nota interna', exact: true })).toBeInViewport();
    await dialog.getByRole('button', { name: 'Guardar nota interna', exact: true }).click();
    await expect(dialog).not.toBeVisible();
    expect(await page.locator('html').evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
});
