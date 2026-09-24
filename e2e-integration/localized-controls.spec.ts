import { expect, test } from '@playwright/test';

const admin = {
  email: 'admin.integration@example.com',
  password: 'ProdTest!2026_Strong'
};

test('los archivos y estados usan controles y textos propios en español', async ({ page }) => {
  await page.goto('/login');
  await expect(page.getByText('Ingresá tus credenciales para continuar')).toBeVisible();
  await page.getByPlaceholder('ejemplo@correo.com').fill(admin.email);
  await page.getByPlaceholder('••••••••').fill(admin.password);
  await page.getByRole('button', { name: /Ingresar a mi cuenta/i }).click();
  await expect(page).toHaveURL(/\/home$/);

  await page.goto('/propiedades');
  await expect(page.getByRole('heading', { name: 'Propiedades', exact: true })).toBeVisible();
  await expect(page.getByText('DISPONIBLE', { exact: true })).toHaveCount(0);
  await expect(page.getByText('INACTIVO', { exact: true })).toHaveCount(0);

  await page.getByRole('button', { name: /^Ver ficha de / }).first().click();
  const propertyFile = page.locator('#property-attachment-file');
  await expect(propertyFile).toHaveAccessibleName('Archivo');
  await expect(page.getByText('Ningún archivo seleccionado', { exact: true })).toBeVisible();
  await expect(page.getByText(/Formatos permitidos: PDF, DOC, DOCX, JPG, PNG o WEBP/)).toBeVisible();

  await propertyFile.setInputFiles({
    name: 'escritura.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('archivo de prueba')
  });
  await expect(page.getByText(/escritura\.pdf · \d+ B/)).toBeVisible();

  await page.goto('/contratos');
  await page.getByRole('button', { name: 'Nuevo contrato' }).click();
  await expect(page.locator('#contract-main-file')).toHaveAccessibleName('Contrato principal');
  await expect(page.locator('#contract-additional-files')).toHaveAccessibleName('Archivos adicionales');
  await expect(page.getByText('Elegir archivo', { exact: true })).toBeVisible();
  await expect(page.getByText('Elegir archivos', { exact: true })).toBeVisible();
});
