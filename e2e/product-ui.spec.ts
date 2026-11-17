import { test, expect, type Page, type Locator } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { setupProductUI } from './fixtures/product-ui';

async function bounds(page: Page) {
  for (const selector of ['html', '#main-content', '[data-page-content]']) {
    const el = page.locator(selector);
    const size = await el.evaluate(node => ({ width: node.clientWidth, scroll: node.scrollWidth }));
    expect(size.scroll, selector).toBeLessThanOrEqual(size.width + 1);
  }
  // Hidden page overflow must not conceal an overflowing toolbar or form.
  for (const el of await page.locator('.ui-page-header:visible, [aria-label="Filtros del listado"]:visible, .ui-dialog-footer:visible').all()) {
    const box = (await el.boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(page.viewportSize()!.width + 1);
    expect(await el.evaluate(node => node.scrollWidth <= node.clientWidth + 1)).toBe(true);
  }
}
async function keyboardClick(button: Locator) {
  await button.focus();
  await expect(button).toBeFocused();
  expect(await button.evaluate(el => getComputedStyle(el).outlineStyle)).not.toBe('none');
  await button.press('Enter');
}

for (const [width, height] of [[390, 844], [768, 1024], [1024, 768], [1280, 720]]) {
  test(`producto: filtros sin altura artificial y navegación adaptable · ${width}x${height}`, async ({ page }, info) => {
    await page.setViewportSize({ width, height });
    const { errors } = await setupProductUI(page);
    for (const route of ['/contratos', '/pagos', '/cajachica', '/control-interno', '/liquidaciones?view=HISTORIAL']) {
      await page.goto(route);
      const search = page.getByRole('searchbox');
      await expect(search).toBeVisible();
      await expect(page.getByText('Cargando movimientos del control interno…', { exact: true })).toHaveCount(0);
      const labelHeight = await search.evaluate(el => el.parentElement!.getBoundingClientRect().height);
      expect(labelHeight, route).toBeLessThan(64);
      await bounds(page);
      await search.focus();
      await expect(search).toBeFocused();
      await page.screenshot({ path: info.outputPath(route.replaceAll(/[^a-z]/gi, '-') + '.png'), animations: 'disabled' });
    }
    expect(errors).toEqual([]);
  });
}

for (const [width, height] of [[1366, 768], [1440, 900]]) {
  for (const expanded of [true, false]) {
    const scenario = `${width}x${height} menú ${expanded ? 'expandido' : 'contraído'}`;
    test(`producto: listados extensos, monedas, filtros y teclado · ${scenario}`, async ({ page }, info) => {
      await page.setViewportSize({ width, height });
      const { errors } = await setupProductUI(page);
      await page.addInitScript(value => localStorage.setItem('sidebar-expanded', String(value)), expanded);
      for (const route of ['/home', '/contratos', '/liquidaciones', '/liquidaciones?view=HISTORIAL', '/pagos', '/cajachica']) {
        await page.goto(route);
        await expect(page.locator('#main-content h1')).toBeVisible();
        await expect(page.getByText('Cargando página…', { exact: true })).toHaveCount(0);
        await bounds(page);
        const search = page.getByRole('searchbox');
        if (await search.count()) {
          expect((await search.boundingBox())!.width).toBeGreaterThan(280);
          await search.focus();
          expect(await search.evaluate(el => getComputedStyle(el).outlineStyle)).not.toBe('none');
        }
        const filters = page.getByRole('button', { name: /^Filtros/ });
        if (await filters.count()) {
          await keyboardClick(filters);
          await expect(filters).toHaveAttribute('aria-expanded', 'true');
          await bounds(page);
          await keyboardClick(filters);
        }
        const table = page.locator('table:visible').first();
        if (await table.count()) {
          await expect(table.locator('tbody tr').first()).toBeInViewport();
          expect((await table.locator('tbody tr').first().boundingBox())!.y).toBeLessThan(height - 90);
        }
        const issues = await new AxeBuilder({ page }).include('#main-content').withTags(['wcag2a', 'wcag2aa']).analyze();
        expect(issues.violations, route).toEqual([]);
        await page.screenshot({ path: info.outputPath(`${route.replaceAll(/[^a-z]/gi, '-')}.png`), animations: 'disabled' });
      }
      await page.goto('/liquidaciones/10');
      await expect(page.getByTestId('liquidation-document')).toContainText('US$1.000,00');
      await expect(page.getByTestId('liquidation-document')).toContainText('$135.760');
      await keyboardClick(page.getByRole('button', { name: 'Comprobantes', exact: true }));
      await expect(page.locator('#liquidation-vouchers > summary')).toBeFocused();
      await expect(page.locator('#liquidation-vouchers')).toContainText('ARS');
      await expect(page.locator('#liquidation-vouchers')).toContainText('USD');
      await bounds(page);
      await page.screenshot({ path: info.outputPath('comprobantes.png'), animations: 'disabled' });
      expect(errors).toEqual([]);
    });

    test(`producto: formularios largos y recibos · ${scenario}`, async ({ page }, info) => {
      await page.setViewportSize({ width, height });
      const { errors, requests } = await setupProductUI(page, { pendingPayment: true });
      await page.addInitScript(value => localStorage.setItem('sidebar-expanded', String(value)), expanded);
      for (const [route, open, save] of [
        ['/contratos', /^Nuevo contrato$/, /^Guardar contrato$/],
        ['/cajachica', /^Nuevo Movimiento$/, /^Guardar$/],
        ['/cajachica', /^Transferir entre cuentas$/, /^Transferir$/],
        ['/cajachica', /^Recibo PDF$/, /^Vista previa$/],
        ['/liquidaciones/10', /^Registrar pago del inquilino$/, /^Confirmar Ingreso de Pago$/],
        ['/liquidaciones/10', /^Pagar a /, /^Confirmar Pago a Propietario$/]
      ] as const) {
        await page.goto(route);
        await keyboardClick(page.getByRole('button', { name: open }).first());
        const dialog = page.getByRole('dialog');
        const action = dialog.getByRole('button', { name: save });
        await expect(action).toBeInViewport({ ratio: 1 });
        const scroll = dialog.locator('.modal-scroll');
        await scroll.evaluate(el => { el.scrollTop = el.scrollHeight; });
        await expect(action).toBeInViewport({ ratio: 1 });
        const focusTarget = await action.isDisabled() ? dialog.getByRole('button', { name: 'Cancelar', exact: true }) : action;
        await focusTarget.focus();
        await expect(focusTarget).toBeFocused();
        await bounds(page);
        await page.screenshot({ path: info.outputPath(`${String(open).replaceAll(/[^a-z]/gi, '-')}.png`), animations: 'disabled' });
        if (route === '/contratos') await keyboardClick(dialog.getByRole('button', { name: 'Cancelar', exact: true }));
        else await page.keyboard.press('Escape');
        await expect(action).toHaveCount(0);
        await expect(page.getByRole('button', { name: open }).first()).toBeFocused();
      }
      expect(requests.every(request => request.startsWith('GET '))).toBe(true);
      expect(errors).toEqual([]);
    });
  }

  test(`producto: vacío, búsqueda sin coincidencias y error recuperable · ${width}x${height}`, async ({ page }, info) => {
    await page.setViewportSize({ width, height });
    await setupProductUI(page, { empty: true });
    for (const route of ['/contratos', '/liquidaciones', '/liquidaciones?view=HISTORIAL', '/pagos', '/cajachica', '/control-interno', '/teodoro', '/daniel']) {
      await page.goto(route);
      await expect(page.getByRole('status').filter({ hasText: /No hay|Sin / }).first()).toBeVisible();
      await bounds(page);
      const search = page.getByRole('searchbox');
      if (await search.count()) {
        await search.fill('Sin coincidencias');
        await expect(page.getByText('No hay resultados con estos filtros').filter({ visible: true }).first()).toBeVisible();
        await bounds(page);
      }
    }
    await page.route('**/api/pagos?**', route => route.fulfill({ status: 503, json: { message: 'Servicio de prueba temporalmente no disponible' } }));
    await page.goto('/pagos');
    await expect(page.getByRole('alert').first()).toContainText('No se pudieron cargar');
    await expect(page.getByRole('button', { name: 'Reintentar', exact: true })).toBeInViewport();
    await page.screenshot({ path: info.outputPath('error-recuperable.png'), animations: 'disabled' });
  });
}
