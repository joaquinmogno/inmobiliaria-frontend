import { expect, test } from '@playwright/test';

const admin = {
  email: 'admin.integration@example.com',
  password: 'ProdTest!2026_Strong'
};

test('los nombres de navegación describen el contenido real de cada módulo', async ({ page }) => {
  await page.goto('/login');
  await page.getByPlaceholder('ejemplo@correo.com').fill(admin.email);
  await page.getByPlaceholder('••••••••').fill(admin.password);
  await page.getByRole('button', { name: /Ingresar a mi cuenta/i }).click();
  await expect(page).toHaveURL(/\/home$/);

  const navigation = page.getByRole('navigation', { name: 'Navegación principal' });
  const financesLink = navigation.getByRole('link', { name: 'Gestión financiera', exact: true });
  const paymentsLink = navigation.getByRole('link', { name: 'Historial de pagos', exact: true });

  await expect(financesLink).toBeVisible();
  await expect(paymentsLink).toBeVisible();
  await expect(navigation.getByText('Caja Chica', { exact: true })).toHaveCount(0);
  await expect(navigation.getByText('Pagos / Egresos', { exact: true })).toHaveCount(0);

  await financesLink.click();
  await expect(page).toHaveURL(/\/cajachica$/);
  await expect(page.getByRole('heading', { name: 'Gestión Financiera', exact: true })).toBeVisible();

  await paymentsLink.click();
  await expect(page).toHaveURL(/\/pagos$/);
  await expect(page.getByRole('heading', { name: 'Historial de pagos', exact: true })).toBeVisible();

  const userMenu = page.getByRole('button', { name: 'Menú de usuario' });
  await userMenu.click();
  await expect(page.getByRole('menuitem', { name: 'Usuarios y roles', exact: true })).toBeVisible();
});
