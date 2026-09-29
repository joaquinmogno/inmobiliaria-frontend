import { expect, test } from '@playwright/test';

const admin = {
  email: 'admin.integration@example.com',
  password: 'ProdTest!2026_Strong'
};

test('los archivos de contratos usan controles y textos propios en español', async ({ page }) => {
  await page.goto('/login');
  await expect(page.getByText('Ingresá tus credenciales para continuar')).toBeVisible();
  await page.getByPlaceholder('ejemplo@correo.com').fill(admin.email);
  await page.getByPlaceholder('••••••••').fill(admin.password);
  await page.getByRole('button', { name: /Ingresar a mi cuenta/i }).click();
  await expect(page).toHaveURL(/\/home$/);

  await page.goto('/contratos');
  await page.getByRole('button', { name: 'Nuevo contrato' }).click();
  await expect(page.locator('#contract-main-file')).toHaveAccessibleName('Contrato principal');
  await expect(page.locator('#contract-additional-files')).toHaveAccessibleName('Archivos adicionales');
  await expect(page.getByText('Elegir archivo', { exact: true })).toBeVisible();
  await expect(page.getByText('Elegir archivos', { exact: true })).toBeVisible();
});
