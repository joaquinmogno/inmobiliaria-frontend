import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const admin = { email: 'admin.integration@example.com', password: 'ProdTest!2026_Strong' };

test('el espacio mensual guía la preparación y funciona con teclado y mobile', async ({ page }) => {
  await page.goto('/login');
  await page.getByPlaceholder('ejemplo@correo.com').fill(admin.email);
  await page.getByPlaceholder('••••••••').fill(admin.password);
  await page.getByRole('button', { name: /Ingresar a mi cuenta/i }).click();
  await expect(page).toHaveURL(/\/home$/);
  await page.goto('/liquidaciones');

  await expect(page.getByRole('heading', { name: /Liquidaciones de/i })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Trabajo del mes', exact: true })).toHaveAttribute('aria-current', 'page');
  await expect(page.getByRole('button', { name: /Por generar/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /Requieren revisión/i })).toBeVisible();
  await expect(page.getByRole('table', { name: 'Contratos y liquidaciones del período seleccionado' })).toBeVisible();

  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  expect(results.violations).toEqual([]);

  await page.setViewportSize({ width: 390, height: 800 });
  expect(await page.locator('html').evaluate(element => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
  await expect(page.locator('table:visible')).toHaveCount(0);

  await page.getByRole('button', { name: 'Historial', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Historial de liquidaciones' })).toBeVisible();
});
