import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const admin = {
  email: 'admin.integration@example.com',
  password: 'ProdTest!2026_Strong'
};

test('stack real: las diez pantallas autenticadas cumplen contraste WCAG AA con datos', async ({ page }) => {
  await page.goto('/login');
  await page.getByPlaceholder('ejemplo@correo.com').fill(admin.email);
  await page.getByPlaceholder('••••••••').fill(admin.password);
  await page.getByRole('button', { name: /Ingresar a mi cuenta/i }).click();
  await expect(page).toHaveURL(/\/home$/);

  const expectRouteContrast = async (route: string) => {
    await page.goto(route);
    await expect(page.locator('main')).toBeVisible();
    await page.waitForLoadState('networkidle');
    const result = await new AxeBuilder({ page }).withRules(['color-contrast']).analyze();
    const details = result.violations.flatMap(violation => violation.nodes.map(node =>
      `${route} — ${node.html}: ${node.failureSummary || violation.help}`
    ));
    expect(details, details.join('\n')).toEqual([]);
  };

  await expectRouteContrast('/liquidaciones');
  await page.getByRole('button', { name: 'Historial', exact: true }).click();
  const firstRowAction = page.locator('article').first().getByRole('button');
  await expect(firstRowAction).toBeVisible();
  await firstRowAction.click();
  await expect(page).toHaveURL(/\/liquidaciones\/\d+$/);
  await expectRouteContrast(new URL(page.url()).pathname);

  for (const route of [
    '/contratos',
    '/propiedades',
    '/personas',
    '/pagos',
    '/cajachica',
    '/sueldos',
    '/usuarios',
    '/mi-acceso'
  ]) await expectRouteContrast(route);
});
