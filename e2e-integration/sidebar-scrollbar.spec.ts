import { expect, test } from '@playwright/test';

const admin = {
  email: 'admin.integration@example.com',
  password: 'ProdTest!2026_Strong'
};

test('el sidebar usa un scroll discreto sin perder desplazamiento ni acceso por teclado', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 480 });
  await page.goto('/login');
  await page.getByPlaceholder('ejemplo@correo.com').fill(admin.email);
  await page.getByPlaceholder('••••••••').fill(admin.password);
  await page.getByRole('button', { name: /Ingresar a mi cuenta/i }).click();
  await expect(page).toHaveURL(/\/home$/);

  const navigation = page.getByRole('navigation', { name: 'Navegación principal' });
  await expect(navigation).toBeVisible();

  const restingStyle = await navigation.evaluate(element => {
    const style = getComputedStyle(element);
    return {
      scrollbarColor: style.scrollbarColor,
      scrollbarWidth: style.scrollbarWidth,
      canScroll: element.scrollHeight > element.clientHeight
    };
  });
  expect(restingStyle.scrollbarWidth).toBe('thin');
  expect(restingStyle.scrollbarColor).toBe('rgba(0, 0, 0, 0) rgba(0, 0, 0, 0)');
  expect(restingStyle.canScroll).toBe(true);

  await navigation.hover();
  await expect.poll(() => navigation.evaluate(element => getComputedStyle(element).scrollbarColor))
    .toContain('rgba(199, 210, 254, 0.72)');

  await navigation.evaluate(element => { element.scrollTop = element.scrollHeight; });
  expect(await navigation.evaluate(element => element.scrollTop)).toBeGreaterThan(0);

  const configurationLink = page.getByRole('link', { name: 'Configuración', exact: true });
  await configurationLink.focus();
  await expect(configurationLink).toBeFocused();
  await expect(configurationLink).toBeInViewport();
  await expect.poll(() => navigation.evaluate(element => getComputedStyle(element).scrollbarColor))
    .toContain('rgba(199, 210, 254, 0.72)');
});
