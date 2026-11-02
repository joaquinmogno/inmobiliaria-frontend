import { expect, test, type Page } from '@playwright/test';

const admin = { id: 1, email: 'admin@test.local', fullName: 'Administrador', nombreCompleto: 'Administrador', tipo: 'ADMIN', role: 'ADMIN', permissions: [], inmobiliaria: { id: 1, nombre: 'PropControl' } };
const contract = () => ({
    id: 7, version: 1, estado: 'FINALIZADO', contratoAnteriorId: null, historialRenovaciones: [],
    fechaInicio: '2024-11-11', fechaFin: '2026-10-28', fechaRescision: null, fechaEntregaLlaves: null,
    fechaProximaActualizacion: '2026-08-11', frecuenciaActualizacionMeses: 3,
    montoAlquiler: 1000, montoHonorarios: 50, porcentajeHonorarios: 5, diaVencimiento: 10,
    moneda: 'USD', administrado: true, requiereActualizacion: true, pagaHonorarios: 'PROPIETARIO',
    modalidadCobroInquilino: 'EFECTIVO', modalidadPagoPropietario: 'EFECTIVO', tipoAjuste: 'IPC',
    serviciosGastos: [{ concepto: 'Expensas', responsable: 'INQUILINO' }], observaciones: 'Contrato original',
    propiedad: { id: 3, direccion: 'Cabildo 1532', piso: '14', departamento: 'C' },
    propietarios: [{ id: 1, esPrincipal: true, persona: { id: 11, nombreCompleto: 'Propietario de prueba', telefono: '+5491123456789' } }],
    inquilinos: [{ id: 2, esPrincipal: true, persona: { id: 12, nombreCompleto: 'Inquilino de prueba', telefono: '+5491123456790' } }],
    adjuntos: [], actualizaciones: []
});

async function setup(page: Page, options: { source?: 'timeline' | 'detail'; held?: boolean; persistedSearch?: string; error?: string; alreadyRenewed?: boolean; canCreate?: boolean } = {}) {
    const user = options.canCreate === false ? { ...admin, tipo: 'USUARIO', role: 'USUARIO', permissions: ['contratos.ver', 'liquidaciones.ver'] } : admin;
    const previous = contract();
    if (options.alreadyRenewed) previous.historialRenovaciones = [{ id: 8, contratoAnteriorId: 7 }] as any;
    const requests: Array<{ method: string; path: string; query: string; body: string | null }> = [];
    let release = () => {};
    const gate = new Promise<void>(resolve => { release = resolve; });
    if (!options.held) release();
    const liquidation = {
        id: 10, version: 1, contratoId: 7, contrato: previous, periodo: '2026-10-01', estado: 'BORRADOR', moneda: 'USD',
        estadoCobroInquilino: 'PENDIENTE', estadoPagoPropietario: 'PENDIENTE', montoAlquilerBase: 1000,
        porcentajeHonorarios: 5, montoHonorarios: 50, montoPropietario: 950, netoACobrar: 1000,
        totalIngresos: 1000, totalDescuentos: 0, pagaHonorarios: 'PROPIETARIO',
        propiedadDireccion: 'Cabildo 1532', inquilinoNombre: 'Inquilino de prueba', propietarioNombre: 'Propietario de prueba',
        fechaCreacion: '2026-10-01T12:00:00Z', fechaVencimiento: '2026-10-10',
        movimientos: [], pagos: [], ajustes: [], aplicacionesCredito: [], historialPagosPropietario: [], comprobantes: [], auditLogs: []
    };
    await page.route('**/api/**', async route => {
        const request = route.request();
        const url = new URL(request.url());
        const path = url.pathname;
        requests.push({ method: request.method(), path, query: url.search, body: request.postData() });
        let data: unknown = [];
        if (path === '/api/auth/me') data = user;
        else if (path === '/api/liquidaciones/contrato/7/periodos') data = { contrato: { ...previous, inquilino: previous.inquilinos[0].persona, propietario: previous.propietarios[0].persona }, periodos: [], defaultPeriod: '2026-10-01' };
        else if (path === '/api/liquidaciones/10') data = liquidation;
        else if (path === '/api/contratos/7') {
            await gate;
            if (options.error) { await route.fulfill({ status: 500, json: { message: options.error } }); return; }
            data = previous;
        } else if (path === '/api/contratos' && request.method() === 'POST') data = { ...previous, id: 8, estado: 'ACTIVO', contratoAnteriorId: 7 };
        else if (path === '/api/contratos') data = { data: [], meta: { page: 1, limit: 10, total: 0, totalPages: 0 } };
        else if (path.includes('/pagos/deuda/contrato/7')) data = { totalDeuda: 0, moneda: 'USD', detalle: [] };
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(data) });
    });
    await page.addInitScript(({ user, search }) => {
        localStorage.setItem('user', JSON.stringify(user));
        localStorage.setItem('loginTimestamp', String(Date.now()));
        if (search) sessionStorage.setItem('filters:contratos', search);
    }, { user, search: options.persistedSearch });
    await page.goto(options.source === 'detail' ? '/liquidaciones/10' : '/liquidaciones/contrato/7');
    return { requests, release };
}

async function renew(page: Page, source: 'timeline' | 'detail' = 'timeline') {
    if (source === 'detail') await page.getByRole('button', { name: 'Más opciones', exact: true }).click();
    await page.getByRole(source === 'detail' ? 'menuitem' : 'button', { name: 'RENOVAR CONTRATO', exact: true }).click();
}

async function expectPreloaded(page: Page) {
    const dialog = page.getByRole('dialog', { name: 'Renovar contrato #7', exact: true });
    await expect(dialog.getByRole('heading', { name: 'Renovar contrato #7', exact: true })).toBeVisible();
    await expect(dialog.locator('#contract-property-address')).toHaveValue('Cabildo 1532');
    await expect(dialog.locator('#contract-property-floor')).toHaveValue('14');
    await expect(dialog.locator('#contract-property-unit')).toHaveValue('C');
    await expect(dialog.locator('#owner-0-name')).toHaveValue('Propietario de prueba');
    await expect(dialog.locator('#tenant-0-name')).toHaveValue('Inquilino de prueba');
    await expect(dialog.locator('#contract-rent-amount')).toHaveValue('1.000');
    await expect(dialog.locator('#contract-currency')).toContainText('USD');
    await expect(dialog.locator('#contract-management-fee-rate')).toHaveValue('5');
    await expect(dialog.locator('#contract-start-date')).toHaveValue('2026-10-29');
    await expect(dialog.locator('#contract-observations')).toHaveValue('Renovación del contrato #7.');
    return dialog;
}

for (const source of ['timeline', 'detail'] as const) {
    test(`renovar desde ${source} abre el formulario precargado aunque el contrato tarde en cargar`, async ({ page }) => {
        const { requests, release } = await setup(page, { source, held: true });
        await renew(page, source);
        await expect.poll(() => requests.filter(request => request.path === '/api/contratos/7').length).toBeGreaterThan(0);
        release();
        await expectPreloaded(page);
        expect(requests.filter(request => request.method !== 'GET')).toEqual([]);
    });
}

test('la búsqueda recordada y sus cambios no descartan la renovación pendiente', async ({ page }) => {
    const { release } = await setup(page, { held: true, persistedSearch: 'Cabildo' });
    await renew(page);
    await expect(page).toHaveURL(/\/contratos\?q=Cabildo$/);
    await expect(page.getByRole('status')).toHaveText('Cargando datos para la renovación…');
    await page.getByRole('searchbox', { name: 'Buscar', exact: true }).fill('Cabildo 1532');
    await expect(page).toHaveURL(/q=Cabildo\+1532/);
    release();
    await expectPreloaded(page);
    await expect(page).toHaveURL(/q=Cabildo\+1532/);
    await expect.poll(() => page.evaluate(() => history.state?.usr?.renewContractId ?? null)).toBeNull();
});

test('cancelar consume la solicitud y no vuelve a abrirla al recargar o volver con el navegador', async ({ page }) => {
    const { requests } = await setup(page);
    await renew(page);
    const dialog = await expectPreloaded(page);
    await dialog.getByRole('button', { name: 'Cancelar', exact: true }).click();
    await expect(dialog.getByRole('heading')).toHaveCount(0);
    await page.goBack();
    await expect(page).toHaveURL(/\/liquidaciones\/contrato\/7$/);
    await page.goForward();
    await expect(page).toHaveURL(/\/contratos$/);
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Contratos activos', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Renovar contrato #7', exact: true })).toHaveCount(0);
    expect(requests.filter(request => request.method !== 'GET')).toEqual([]);
});

test('cambiar el estado del listado durante la carga conserva la renovación y el filtro elegido', async ({ page }) => {
    const { release } = await setup(page, { held: true });
    await renew(page);
    await expect(page.getByRole('status')).toHaveText('Cargando datos para la renovación…');
    await page.getByRole('button', { name: /^Filtrar contratos por estado:/ }).click();
    await page.getByRole('option', { name: /^Contratos finalizados\b/ }).click();
    await expect(page).toHaveURL(/estado=FINALIZADO/);
    release();
    await expectPreloaded(page);
    await expect(page).toHaveURL(/estado=FINALIZADO/);
});

test('salir mientras se carga no abre el formulario tardíamente en otra pantalla', async ({ page }) => {
    const { requests, release } = await setup(page, { held: true });
    await renew(page);
    await expect(page.getByRole('status')).toHaveText('Cargando datos para la renovación…');
    await page.goBack();
    await expect(page).toHaveURL(/\/liquidaciones\/contrato\/7$/);
    const response = page.waitForResponse(response => new URL(response.url()).pathname === '/api/contratos/7');
    release();
    await (await response).finished();
    await expect(page.getByRole('heading', { name: 'Cabildo 1532 · Piso 14 · Depto. C', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Renovar contrato #7', exact: true })).toHaveCount(0);
    expect(requests.filter(request => request.method !== 'GET')).toEqual([]);
});

test('guardar crea una renovación vinculada al contrato anterior y no edita el original', async ({ page }) => {
    const { requests } = await setup(page);
    await renew(page);
    const dialog = await expectPreloaded(page);
    await dialog.locator('#contract-rent-amount').fill('1200');
    await dialog.getByRole('button', { name: 'Guardar contrato', exact: true }).click();
    await expect(page.getByText('Contrato creado correctamente', { exact: true })).toBeVisible();
    const writes = requests.filter(request => request.method !== 'GET');
    expect(writes).toHaveLength(1);
    expect(writes[0]).toMatchObject({ method: 'POST', path: '/api/contratos' });
    expect(writes[0].body).toContain('name="contratoAnteriorId"\r\n\r\n7');
    expect(writes[0].body).toContain('name="propiedadId"\r\n\r\n3');
    expect(writes[0].body).toContain('name="montoAlquiler"\r\n\r\n1200');
    expect(writes[0].body).toContain('"id":11');
    expect(writes[0].body).toContain('"id":12');
});

test('un error de carga informa el problema y no abre un contrato vacío', async ({ page }) => {
    const { requests } = await setup(page, { error: 'No se pudo cargar el contrato para renovarlo' });
    await renew(page);
    await expect(page.getByText('No se pudo cargar el contrato para renovarlo', { exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Renovar contrato #7', exact: true })).toHaveCount(0);
    await expect.poll(() => page.evaluate(() => history.state?.usr?.renewContractId ?? null)).toBeNull();
    expect(requests.filter(request => request.method !== 'GET')).toEqual([]);
});

test('un contrato ya renovado conserva la validación y no abre otra renovación', async ({ page }) => {
    await setup(page, { alreadyRenewed: true });
    await renew(page);
    await expect(page.getByText('Este contrato ya tiene una renovación. Abrí el contrato nuevo para consultarla.', { exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Renovar contrato #7', exact: true })).toHaveCount(0);
});

test('nuevo contrato con otro inquilino sigue abriendo un formulario nuevo, no una renovación', async ({ page }) => {
    await setup(page, { persistedSearch: 'Cabildo' });
    await page.getByRole('button', { name: 'Nuevo contrato · otro inquilino', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Nuevo contrato', exact: true });
    await expect(dialog.getByRole('heading', { name: 'Nuevo contrato', exact: true })).toBeVisible();
    await expect(dialog.locator('#owner-0-name')).toHaveValue('');
    await expect(dialog.locator('#tenant-0-name')).toHaveValue('');
    await expect.poll(() => page.evaluate(() => history.state?.usr?.openNewContractModal ?? null)).toBeNull();
});

test('el acceso a renovar sigue requiriendo permiso para crear contratos', async ({ page }) => {
    await setup(page, { canCreate: false });
    await expect(page.getByRole('heading', { name: 'Cabildo 1532 · Piso 14 · Depto. C', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'RENOVAR CONTRATO', exact: true })).toHaveCount(0);
});
