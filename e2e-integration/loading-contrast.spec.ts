import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('el estado de carga conserva contraste mientras se descarga una sección', async ({ page }) => {
  await page.goto('/login');
  await page.getByPlaceholder('ejemplo@correo.com').fill('admin.integration@example.com');
  await page.getByPlaceholder('••••••••').fill('ProdTest!2026_Strong');
  await page.getByRole('button', { name: /Ingresar a mi cuenta/i }).click();
  await expect(page).toHaveURL(/\/home$/);
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/assets/Configuracion-*.js', async route => {
    await gate;
    await route.continue();
  });
  try {
    await page.goto('/configuracion', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Cargando página…', { exact: true })).toBeVisible();
    // Finalizar la transición visual antes de medir el contraste estable.
    await page.locator('main').evaluate(async element => {
      await Promise.all(element.getAnimations({ subtree: true })
        .filter(animation => animation.effect?.getComputedTiming().iterations !== Infinity)
        .map(animation => animation.finished.catch(() => undefined)));
    });
    const results = await new AxeBuilder({ page }).withRules(['color-contrast']).analyze();
    expect(results.violations).toEqual([]);
  } finally {
    release();
    await page.unrouteAll({ behavior: 'wait' });
  }
});
