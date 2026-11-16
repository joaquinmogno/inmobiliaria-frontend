import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { admin, fixture } from './fixtures/liquidation-currency';

for (const width of [1280, 1366, 390]) {
  test(`Inicio y Trabajo del mes muestran monedas y saldos independientes a ${width}`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: width === 1280 ? 720 : 768 });
    await page.addInitScript(user => {
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('loginTimestamp', String(Date.now()));
    }, admin);
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    const data = fixture('ARS', true);
    const summaries = [
      { moneda: 'ARS', netoACobrar: 115000, cobradoInquilino: 115000, creditoAplicadoInquilino: 0, saldoInquilino: 0, montoPropietario: 105000, pagadoPropietario: 50000, saldoPropietario: 55000 },
      { moneda: 'USD', netoACobrar: 100, cobradoInquilino: 100, creditoAplicadoInquilino: 0, saldoInquilino: 0, montoPropietario: 100, pagadoPropietario: 0, saldoPropietario: 100 },
    ];
    await page.route('**/api/**', async route => {
      const path = new URL(route.request().url()).pathname;
      let body: unknown = [];
      if (path === '/api/auth/me') body = admin;
      if (path === '/api/reportes/dashboard') body = { propiedades: { total: 4 }, contratos: { activos: 4 }, finanzas: {
        morosidad: 0,
        porMoneda: { ARS: { recaudadoTotal: 115000, gananciaBruta: 10000, gastosAgencia: 0, utilidadNeta: 10000, fondoCustodia: 65000 }, USD: { recaudadoTotal: 100, gananciaBruta: 0, gastosAgencia: 0, utilidadNeta: 0, fondoCustodia: 100 } }, devengado: { periodo: '2026-11', porMoneda: {
          ARS: { facturado: 250760, saldoPendienteInquilinos: 135760, importePropietariosDevengado: 240760, saldoPendientePropietarios: 190760 },
          USD: { facturado: 3500, saldoPendienteInquilinos: 3400, importePropietariosDevengado: 3500, saldoPendientePropietarios: 3500 },
        } } } };
      if (path === '/api/liquidaciones/preparacion') body = { periodo: '2026-11-01', resumen: { total: 1, moraHoy: 0, pendientesGenerar: 0, borradores: 0, pendientesCobro: 0, pendientesPagoPropietario: 1 }, data: [{
        contratoId: 1, status: 'GENERADA', motivos: [], propiedad: { direccion: 'Caso QA del informe' }, inquilino: { nombreCompleto: 'Inquilino QA' }, propietario: { nombreCompleto: 'Propietario QA' },
        liquidacionId: 10, estadoLiquidacion: 'CONFIRMADA', estadoCobroInquilino: 'COBRADO', estadoPagoPropietario: 'PARCIAL', moneda: 'ARS', totalLiquidacion: '115000', pagado: '115000', pendiente: '0', resumenMonedas: summaries,
      }] };
      if (path === '/api/liquidaciones/10') body = { ...data.liquidation, moneda: 'ARS', resumenMonedas: summaries };
      if (path === '/api/liquidaciones/contrato/1/periodos') body = data.timeline;
      if (path.includes('/pagos/deuda/')) body = { totalDeuda: 0, moneda: 'ARS', porMoneda: [{ moneda: 'ARS', monto: 0 }, { moneda: 'USD', monto: 20.25 }], detalle: [{ id: 9, periodo: '2026-10-01', moneda: 'USD', deuda: 20.25 }] };
      await route.fulfill({ json: body });
    });
    await page.goto('/home');
    const ars = page.getByTestId('dashboard-currency-summary').filter({ hasText: 'Finanzas en ARS' });
    const usd = page.getByTestId('dashboard-currency-summary').filter({ hasText: 'Finanzas en USD' });
    await expect(ars).toContainText('$250.760');
    await expect(usd).toContainText('US$3.500');
    await expect(ars).toContainText('Pendiente de propietarios');
    await page.goto('/liquidaciones');
    const row = page.getByRole('button', { name: /Caso QA del informe.*Abrir propiedad/ });
    for (const amount of ['$115.000,00 ARS', 'US$100,00 USD', '$55.000,00 ARS']) await expect(row).toContainText(amount);
    await expect(row).toContainText('Saldo propietario');
    await expect(row).toContainText('Saldo inquilino');
    for (const selector of ['html', '#main-content']) {
      expect(await page.locator(selector).evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
    }
    const accessibility = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    expect(accessibility.violations).toEqual([]);
    await row.scrollIntoViewIfNeeded();
    await page.screenshot({ path: info.outputPath('trabajo-del-mes-monedas.png') });
    await row.focus();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/liquidaciones\/contrato\/1/);
    await page.goto('/liquidaciones/10');
    await expect(page.getByTestId('historical-debt')).toContainText('US$20,25 USD');
    expect(errors).toEqual([]);
  });
}
