import { expect, test } from '@playwright/test';

test('nginx de producción sirve un login móvil sin desborde', async ({ page }) => {
  await page.goto('/login');
  await expect(page.getByRole('button', { name: /Ingresar a mi cuenta/i })).toBeVisible();
  const dimensions = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth
  }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);
});
