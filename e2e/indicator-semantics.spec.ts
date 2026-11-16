import { expect, test, type Page } from '@playwright/test';
import { admin, fixture } from './fixtures/liquidation-currency';

async function setup(page: Page) {
  await page.clock.setFixedTime(new Date('2026-11-16T15:00:00Z'));
  await page.addInitScript(user => {
    localStorage.setItem('user', JSON.stringify(user));
    localStorage.setItem('loginTimestamp', String(Date.now()));
  }, admin);
  const base = fixture('USD', true);
  const liquidation = { ...base.liquidation, fechaLiquidacion: null, cerradoPorId: null, estadoPagoPropietario: 'PAGADO', resumenMonedas: base.liquidation.resumenMonedas.map(s => ({ ...s, pagadoPropietario: s.montoPropietario, saldoPropietario: 0 })) };
  const variants = [
    liquidation,
    { ...liquidation, id: 11, fechaLiquidacion: '2026-10-31T15:00:00Z', cerradoPorId: 1 },
    { ...liquidation, id: 12, estado: 'BORRADOR' },
    { ...liquidation, id: 13, estado: 'ANULADA', estadoCobroInquilino: 'PARCIAL', estadoPagoPropietario: 'PENDIENTE' },
  ];
  const requests: string[] = [];
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/api/**', async route => {
    const url = new URL(route.request().url());
    const path = url.pathname;
    requests.push(`${route.request().method()} ${path}${url.search}`);
    const paged = (data: unknown[]) => ({ data, meta: { total: data.length, page: 1, limit: 25, totalPages: 1 } });
    let body: unknown = [];
    if (path === '/api/auth/me') body = admin;
    else if (path === '/api/reportes/dashboard') body = { propiedades: { total: 4 }, contratos: { activos: 3 }, finanzas: { morosidad: 25, devengado: { periodo: '2026-11' } }, operacion: { alquileresVencidos: 2, cobrosPendientes: 2, pagosPropietarioPendientes: 1, contratosPorVencer: 1 } };
    else if (path === '/api/liquidaciones/preparacion') {
      const period = url.searchParams.get('periodo');
      body = { periodo: period, resumen: { total: 3, moraHoy: 1, pendientesGenerar: 0, borradores: 1, pendientesCobro: 0, pendientesPagoPropietario: 0 }, data: variants.slice(0, 3).map((item, i) => ({ contratoId: i + 1, status: 'GENERADA', motivos: [], propiedad: { ...base.contract.propiedad, direccion: `Dirección ${i + 1}` }, inquilino: { nombreCompleto: 'Inquilino' }, propietario: { nombreCompleto: 'Propietario' }, estadoLiquidacion: item.estado, estadoCobroInquilino: item.estadoCobroInquilino, estadoPagoPropietario: item.estadoPagoPropietario, fechaLiquidacion: item.fechaLiquidacion, cerradoPorId: item.cerradoPorId, liquidacionId: item.id, moneda: 'USD', totalLiquidacion: 1000, pendiente: 0, moraHoy: i === 0, vencida: false })) };
    } else if (path === '/api/liquidaciones/filtros') body = { periodos: ['2026-10-01'], monedas: ['ARS', 'USD'] };
    else if (path === '/api/liquidaciones') body = paged(variants);
    else if (/^\/api\/liquidaciones\/\d+$/.test(path)) body = variants.find(item => item.id === Number(path.split('/').at(-1)));
    else if (path.includes('/pagos/deuda/')) body = { totalDeuda: 0, moneda: 'USD', detalle: [] };
    else if (path.includes('/periodos')) body = { ...base.timeline, periodos: base.timeline.periodos.map(row => ({ ...row, estado: 'FINALIZADA', estadoLiquidacion: 'CONFIRMADA', estadoCobroInquilino: 'COBRADO', estadoPagoPropietario: 'PAGADO', fechaLiquidacion: null, cerradoPorId: null })) };
    else if (path === '/api/cajachica') body = paged([]);
    else if (path === '/api/cajachica/resumen') {
      const historical = url.searchParams.get('mes') === '10';
      body = { balanceCaja: 999999, balanceBanco: 999999, totalesPorMoneda: { ARS: { balance: historical ? 250000 : 200000, balanceCaja: 135760, balanceBanco: historical ? 114240 : 64240, totalIngresos: 50000, totalEgresos: 10000, fondosEnCustodia: 40000 }, USD: { balance: historical ? 1000 : 1200, balanceCaja: 1000, balanceBanco: historical ? 0 : 200, totalIngresos: 300, totalEgresos: 100, fondosEnCustodia: 200 } } };
    }
    await route.fulfill({ json: body });
  });
  return { requests, errors };
}

async function noOverflow(page: Page) {
  for (const selector of ['html', '#main-content']) {
    const dimensions = await page.locator(selector).evaluate(el => ({ width: el.clientWidth, scroll: el.scrollWidth }));
    expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.width + 1);
  }
}

for (const [width, height] of [[1280, 720], [1366, 768], [390, 844]]) {
  test(`criterios del inventario y del trabajo mensual ${width}`, async ({ page }, info) => {
    await page.setViewportSize({ width, height });
    const { errors, requests } = await setup(page);
    await page.goto('/home');
    const cards = page.getByTestId('dashboard-operational-kpis');
    await expect(cards.locator(':scope > div').filter({ hasText: 'Propiedades registradas' })).toContainText('4');
    await expect(cards).toContainText('Todas, con o sin contrato');
    await expect(cards).toContainText('25,0%');
    await expect(page.getByText(/Inventario al 16\/11\/2026/)).toContainText('noviembre de 2026');
    await noOverflow(page);
    await page.screenshot({ path: info.outputPath('inicio-criterios.png') });
    await page.goto('/liquidaciones');
    const total = page.getByRole('button', { name: '3 Contratos administrados del mes', exact: true });
    await expect(total).toBeVisible();
    const criteria = page.locator('summary', { hasText: 'Criterios del conteo' });
    await criteria.focus(); await page.keyboard.press('Enter');
    await expect(page.getByText(/Se cuentan contratos administrados/)).toBeVisible();
    await expect(page.getByText(/Se cuentan contratos administrados/)).toContainText('no cuenta propiedades únicas');
    await criteria.focus(); await page.keyboard.press('Enter');
    await page.getByLabel('Mes de trabajo').fill('2026-10');
    await expect(page.getByRole('heading', { name: 'Liquidaciones de octubre de 2026' })).toBeVisible();
    await expect.poll(() => requests.at(-1)).toContain('periodo=2026-10-01');
    await page.getByRole('textbox', { name: 'Buscar por dirección' }).fill('Dirección 1');
    await expect(total).toBeVisible();
    await expect(page.getByRole('button', { name: /Dirección 2.*Abrir propiedad/ })).toHaveCount(0);
    const row = page.getByRole('button', { name: /Dirección 1.*Abrir propiedad/ });
    await expect(row).toContainText('Cobro y pago resueltos');
    await expect(row).toContainText('Documento: Confirmada');
    await expect(row).toContainText('Cobro inquilino: Cobrado');
    await expect(row).toContainText('Pago propietario: Pagado');
    await expect(row).toContainText('Cierre administrativo: Sin registro');
    await noOverflow(page);
    await page.screenshot({ path: info.outputPath('mes-criterios.png') });
    expect(errors).toEqual([]);
    expect(requests.every(request => request.startsWith('GET '))).toBe(true);
  });

  test(`Caja identifica ARS y USD y respeta el período ${width}`, async ({ page }, info) => {
    await page.setViewportSize({ width, height });
    const { errors } = await setup(page);
    await page.goto('/cajachica');
    const header = page.getByTestId('cash-header');
    const ars = header.getByRole('region', { name: 'Caja ARS', exact: true });
    const usd = header.getByRole('region', { name: 'Caja USD', exact: true });
    await expect(ars).toContainText('$135.760');
    await expect(usd).toContainText('US$1.000,00');
    await expect(usd).toContainText('US$1.200,00');
    await expect(header).not.toContainText('999.999');
    await expect(header).toContainText('11/2026');
    await noOverflow(page);
    const filters = page.getByRole('button', { name: /^Filtros/ });
    await filters.focus(); await page.keyboard.press('Enter');
    await page.getByRole('button', { name: /^Mes:/ }).click();
    await page.getByRole('option', { name: 'Oct', exact: true }).click();
    await expect(header).toContainText('10/2026');
    await expect(ars).toContainText('$250.000');
    await expect(usd).not.toContainText('US$1.200,00');
    await filters.focus(); await page.keyboard.press('Enter');
    await noOverflow(page);
    await page.screenshot({ path: info.outputPath('caja-monedas.png') });
    expect(errors).toEqual([]);
  });
}

test('documento, cobro, pago y cierre conservan estados independientes en detalle e historial', async ({ page }) => {
  const { errors } = await setup(page);
  await page.setViewportSize({ width: 1366, height: 768 });
  for (const [id, documentLabel, closure] of [[10, 'Confirmada', 'Sin registro'], [11, 'Confirmada', 'Registrado · 31/10/2026'], [12, 'Borrador', 'Sin registro'], [13, 'Anulada', 'Sin registro']] as const) {
    await page.goto(`/liquidaciones/${id}`);
    const states = page.getByTestId('liquidation-document').getByTestId('liquidation-states');
    await expect(states).toContainText(`Documento: ${documentLabel}`);
    await expect(states).toContainText(`Cierre administrativo: ${closure}`);
    await expect(states).toContainText(`Cobro inquilino: ${id === 12 ? 'No iniciado' : id === 13 ? 'Parcial' : 'Cobrado'}`);
    await expect(states).toContainText(`Pago propietario: ${id === 12 ? 'No iniciado' : id === 13 ? 'Pendiente' : 'Pagado'}`);
    await noOverflow(page);
  }
  await page.goto('/liquidaciones?view=HISTORIAL');
  const states = page.locator('table:visible').getByTestId('liquidation-states');
  await expect(states).toHaveCount(4);
  await expect(states.nth(0)).toContainText('Cierre administrativo: Sin registro');
  await expect(states.nth(1)).toContainText('Cierre administrativo: Registrado');
  await page.setViewportSize({ width: 390, height: 844 });
  const mobileStates = page.locator('article:visible').getByTestId('liquidation-states');
  await expect(mobileStates).toHaveCount(4);
  await noOverflow(page);
  await page.goto('/liquidaciones/contrato/1');
  await expect(page.getByTestId('liquidation-states')).toContainText('Documento: Confirmada');
  await expect(page.getByTestId('liquidation-states')).toContainText('Cierre administrativo: Sin registro');
  expect(errors).toEqual([]);
});
