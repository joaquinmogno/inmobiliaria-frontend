import { expect, test } from '@playwright/test';

test('el login es utilizable sin desborde horizontal en viewport móvil', async ({ page }) => {
  await page.goto('/login');

  await expect(page.getByRole('button', { name: /Ingresar a mi cuenta/i })).toBeVisible();
  const viewport = page.viewportSize();
  const dimensions = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth
  }));

  expect(viewport?.width).toBe(393);
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);
});
