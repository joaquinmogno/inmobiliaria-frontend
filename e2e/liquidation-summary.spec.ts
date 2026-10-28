import { expect, test, type Page } from '@playwright/test';

const admin = { id: 1, email: 'admin@test.local', fullName: 'Micaela Lavalle', nombreCompleto: 'Micaela Lavalle', tipo: 'ADMIN', role: 'ADMIN', permissions: [], inmobiliaria: { id: 1, nombre: 'PropControl' } };

function sampleLiquidation() {
    return {
        id: 10, version: 1, contratoId: 1, periodo: '2026-10-01', estado: 'BORRADOR', moneda: 'ARS',
        estadoCobroInquilino: 'PENDIENTE', estadoPagoPropietario: 'PENDIENTE',
        montoAlquilerBase: 1500000, porcentajeHonorarios: 5, montoHonorarios: 75000, montoPropietario: 1425000,
        netoACobrar: 1500000, totalIngresos: 1500000, totalDescuentos: 0, pagaHonorarios: 'PROPIETARIO',
        propiedadDireccion: 'Charcas 4168', inquilinoNombre: 'Alena Murashko', propietarioNombre: 'Franco Sorrentini',
        fechaCreacion: '2026-10-01T12:00:00.000Z', fechaLiquidacion: null, fechaVencimiento: '2026-10-10',
        movimientos: [{ id: 1, tipo: 'INGRESO', concepto: 'Alquiler Mensual', monto: 1500000, moneda: 'ARS', esParaInmobiliaria: false }],
        pagos: [], ajustes: [], aplicacionesCredito: [], historialPagosPropietario: [], comprobantes: [], auditLogs: [],
        contrato: {
            id: 1, version: 3, estado: 'ACTIVO', montoAlquiler: 1500000, moneda: 'ARS',
            fechaInicio: '2026-01-01', fechaFin: '2027-12-31', fechaProximaActualizacion: '2027-01-01',
            requiereActualizacion: true, frecuenciaActualizacionMeses: 3, actualizaciones: [], serviciosGastos: [],
            modalidadCobroInquilino: 'EFECTIVO', modalidadPagoPropietario: 'EFECTIVO',
            propiedad: { id: 1, direccion: 'Charcas 4168', piso: '3', departamento: 'B' },
            inquilinos: [{ esPrincipal: true, persona: { id: 2, nombreCompleto: 'Alena Murashko' } }],
            propietarios: [{ esPrincipal: true, persona: { id: 3, nombreCompleto: 'Franco Sorrentini' } }]
        }
    };
}

async function openLiquidation(page: Page, liquidation = sampleLiquidation(), rejectSave = false) {
    const submitted: Array<Record<string, unknown>> = [];
    await page.route('**/api/**', async route => {
        const path = new URL(route.request().url()).pathname;
        let data: unknown = {};
        if (path.endsWith('/auth/me')) data = admin;
        else if (path.endsWith('/liquidaciones/10')) data = liquidation;
        else if (path.endsWith('/liquidaciones/10/alquiler') && route.request().method() === 'PATCH') {
            const body = route.request().postDataJSON();
            submitted.push(body);
            if (rejectSave) {
                await route.fulfill({ status: 409, contentType: 'application/json', body: JSON.stringify({ message: 'La liquidación cambió mientras estabas trabajando' }) });
                return;
            }
            liquidation.montoAlquilerBase = body.montoNuevo;
            liquidation.montoHonorarios = body.montoNuevo * 0.05;
            liquidation.netoACobrar = body.montoNuevo;
            liquidation.totalIngresos = body.montoNuevo;
            liquidation.montoPropietario = body.montoNuevo * 0.95;
            liquidation.movimientos[0].monto = body.montoNuevo;
            liquidation.version++;
            if (body.alcance === 'DESDE_PERIODO') liquidation.contrato.fechaProximaActualizacion = '2027-01-01';
            data = { liquidacion: liquidation, borradoresActualizados: 1, contratoVersion: 4 };
        } else if (path.includes('/pagos/deuda/contrato/1')) data = { totalDeuda: 0, moneda: liquidation.moneda, detalle: [] };
        else if (path.includes('/liquidaciones/contrato/1/periodos')) data = { periodos: [] };
        else if (path.endsWith('/cuentas-bancarias') || path.endsWith('/contratos/alertas') || path.includes('/alertas-operativas')) data = [];
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(data) });
    });
    await page.addInitScript(user => {
        localStorage.setItem('user', JSON.stringify(user));
        localStorage.setItem('loginTimestamp', String(Date.now()));
    }, admin);
    await page.goto('/liquidaciones/10');
    await expect(page.getByRole('heading', { name: /Resumen de liquidación/ })).toBeVisible();
    return submitted;
}

test('el panorama y los movimientos caben en escritorio y los historiales quedan desplegables', async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 1366, height: 768 });
    await openLiquidation(page);
    await expect(page.getByText('Charcas 4168 · Piso 3 · Depto. B', { exact: true })).toBeVisible();
    await expect(page.getByTestId('liquidation-summary-card')).toHaveCount(5);
    await expect(page.getByRole('button', { name: 'Agregar movimiento', exact: true })).toHaveCount(1);
    await expect(page.getByRole('heading', { name: 'Agregar concepto' })).toHaveCount(0);
    const concepts = page.getByRole('region', { name: 'Conceptos y cálculo detallado' });
    await page.screenshot({ path: testInfo.outputPath('liquidacion-resumen-escritorio.png') });
    const bounds = await concepts.boundingBox();
    expect(bounds?.y).toBeLessThan(600);
    expect((bounds?.y || 0) + (bounds?.height || 0)).toBeLessThanOrEqual(768);
    for (const title of ['Cobros de inquilinos', 'Pagos al propietario', 'Auditoría']) {
        const section = page.locator('details').filter({ has: page.locator('summary', { hasText: title }) }).first();
        await expect(section).not.toHaveAttribute('open');
        await section.locator('summary').click();
        await expect(section).toHaveAttribute('open');
        await section.locator('summary').click();
    }
    await page.getByLabel('Contenido principal').evaluate(element => { element.scrollTop = 0; });
    await page.screenshot({ path: testInfo.outputPath('liquidacion-resumen-escritorio.png') });
});

test('editar el alquiler precargado envía el importe completo y muestra honorarios y neto antes de guardar', async ({ page }) => {
    const submitted = await openLiquidation(page);
    await page.getByRole('button', { name: 'Editar alquiler', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Editar alquiler' });
    await expect(dialog.getByLabel('Alquiler mensual completo (ARS)')).toHaveValue('1500000');
    await dialog.getByLabel('Alquiler mensual completo (ARS)').fill('1550000');
    await expect(dialog.getByText('$77.500', { exact: true })).toBeVisible();
    await expect(dialog.getByText('$1.472.500', { exact: true })).toBeVisible();
    await dialog.getByLabel('Motivo del cambio').fill('Acuerdo manual para octubre');
    await dialog.getByRole('button', { name: 'Guardar y recalcular' }).click();
    await expect(dialog).not.toBeVisible();
    expect(submitted[0]).toMatchObject({ montoNuevo: 1550000, alcance: 'SOLO_PERIODO', expectedVersion: 1 });
    const ownerCard = page.getByTestId('liquidation-summary-card').filter({ has: page.getByRole('heading', { name: 'Neto propietario', exact: true }) });
    await expect(ownerCard).toContainText('$1.472.500');
});

test('una actualización IPC permite aplicar el alquiler completo a este mes y los siguientes', async ({ page }) => {
    const liquidation = sampleLiquidation();
    liquidation.contrato.fechaProximaActualizacion = '2026-10-01';
    const submitted = await openLiquidation(page, liquidation);
    await page.getByRole('button', { name: 'Editar alquiler', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Editar alquiler' });
    await expect(dialog.getByLabel('Aplicar cambio a')).toHaveValue('DESDE_PERIODO');
    await dialog.getByLabel('Alquiler mensual completo (ARS)').fill('1550000');
    await dialog.getByLabel('Motivo del cambio').fill('Actualización según IPC');
    await dialog.getByRole('button', { name: 'Guardar y recalcular' }).click();
    await expect(dialog).not.toBeVisible();
    expect(submitted[0]).toMatchObject({ montoNuevo: 1550000, alcance: 'DESDE_PERIODO', expectedContractVersion: 3, fechaProximaNueva: '2027-01-01' });
});

test('un error al guardar conserva la edición y permite reintentar', async ({ page }) => {
    await openLiquidation(page, sampleLiquidation(), true);
    await page.getByRole('button', { name: 'Editar alquiler', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Editar alquiler' });
    await dialog.getByLabel('Alquiler mensual completo (ARS)').fill('1550000.50');
    await dialog.getByLabel('Motivo del cambio').fill('Acuerdo con centavos');
    await dialog.getByRole('button', { name: 'Guardar y recalcular' }).click();
    await expect(page.getByText('La liquidación cambió mientras estabas trabajando')).toBeVisible();
    await expect(dialog.getByLabel('Alquiler mensual completo (ARS)')).toHaveValue('1550000.50');
    await expect(dialog.getByRole('button', { name: 'Guardar y recalcular' })).toBeEnabled();
});

test('el resumen conserva los dólares y las expensas en pesos separados', async ({ page }) => {
    const liquidation = {
        ...sampleLiquidation(), moneda: 'USD', montoAlquilerBase: 1400, montoHonorarios: 70, montoPropietario: 1330, netoACobrar: 1400,
        resumenMonedas: [
            { moneda: 'USD', totalIngresos: 1400, netoACobrar: 1400, montoPropietario: 1330, saldoInquilino: 1400, saldoPropietario: 1330, cobradoInquilino: 0, pagadoPropietario: 0 },
            { moneda: 'ARS', totalIngresos: 479335, netoACobrar: 479335, montoPropietario: 479335, saldoInquilino: 479335, saldoPropietario: 479335, cobradoInquilino: 0, pagadoPropietario: 0 }
        ]
    };
    await openLiquidation(page, liquidation);
    const totalCard = page.getByTestId('liquidation-summary-card').filter({ has: page.getByRole('heading', { name: 'Total a cobrar al inquilino' }) });
    await expect(totalCard).toContainText('US$1.400');
    await expect(totalCard).toContainText('$479.335');
    await expect(totalCard).not.toContainText('480.735');
});

test('el resumen y la edición son utilizables en móvil con botones accesibles al desplazar', async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 390, height: 600 });
    await openLiquidation(page);
    expect(await page.locator('html').evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath('liquidacion-resumen-movil.png') });
    await page.getByRole('button', { name: 'Editar alquiler', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Editar alquiler' });
    await dialog.getByLabel('Alquiler mensual completo (ARS)').fill('1550000');
    await dialog.getByLabel('Motivo del cambio').fill('Acuerdo manual para octubre');
    await dialog.locator('form').evaluate(element => { element.scrollTop = element.scrollHeight; });
    await expect(dialog.getByText('$1.472.500', { exact: true })).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Guardar y recalcular' })).toBeInViewport();
    await page.screenshot({ path: testInfo.outputPath('liquidacion-editar-alquiler-movil.png') });
});
