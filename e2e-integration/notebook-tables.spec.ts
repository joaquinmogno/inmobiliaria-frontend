import { expect, test } from '@playwright/test';

const admin = {
  email: 'admin.integration@example.com',
  password: 'ProdTest!2026_Strong'
};

test('liquidaciones usa tabla compacta y las demás vistas conservan su formato seguro en notebooks', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/login');
  await page.getByPlaceholder('ejemplo@correo.com').fill(admin.email);
  await page.getByPlaceholder('••••••••').fill(admin.password);
  await page.getByRole('button', { name: /Ingresar a mi cuenta/i }).click();
  await expect(page).toHaveURL(/\/home$/);

  for (const route of [
    '/contratos',
    '/propiedades',
    '/personas',
    '/liquidaciones',
    '/pagos',
    '/cajachica',
    '/sueldos',
    '/usuarios'
  ]) {
    await page.goto(route);
    await expect(page.locator('main')).toBeVisible();
    await expect(page.locator('table:visible')).toHaveCount(route === '/liquidaciones' ? 1 : 0);

    const dimensions = await page.locator('main').evaluate(element => ({
      clientWidth: element.clientWidth,
      scrollWidth: element.scrollWidth
    }));
    expect(dimensions.scrollWidth, `${route} desborda el área de trabajo`).toBeLessThanOrEqual(dimensions.clientWidth);
  }

  await page.goto('/usuarios');
  const userCards = page.getByTestId('mobile-user-list');
  await expect(userCards).toBeVisible();
  await expect(userCards.getByText(admin.email)).toBeVisible();
  await expect(userCards.getByRole('button', { name: 'Acciones' }).first()).toBeVisible();

  await page.goto('/configuracion');
  await page.getByRole('button', { name: 'Auditoría', exact: true }).click();
  await expect(page.locator('table:visible')).toHaveCount(0);
  await page.getByRole('button', { name: 'Backups', exact: true }).click();
  await expect(page.locator('table:visible')).toHaveCount(0);

  await page.setViewportSize({ width: 1536, height: 900 });
  await page.goto('/usuarios');
  const desktopTable = page.locator('table:visible');
  await expect(desktopTable).toHaveCount(1);
  await expect(desktopTable.getByRole('columnheader', { name: 'Acciones' })).toHaveCSS('position', 'sticky');
  await expect(desktopTable.getByRole('button', { name: /Editar Administrador Integration/ })).toBeVisible();
});
