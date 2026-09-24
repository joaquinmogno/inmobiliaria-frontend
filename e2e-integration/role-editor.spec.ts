import { expect, test } from '@playwright/test';

const admin = {
  email: 'admin.integration@example.com',
  password: 'ProdTest!2026_Strong'
};

test('el editor de roles agrupa permisos y mantiene visibles sus acciones', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 700 });
  await page.goto('/login');
  await page.getByPlaceholder('ejemplo@correo.com').fill(admin.email);
  await page.getByPlaceholder('••••••••').fill(admin.password);
  await page.getByRole('button', { name: /Ingresar a mi cuenta/i }).click();
  await expect(page).toHaveURL(/\/home$/);

  await page.goto('/usuarios');
  await page.getByRole('tab', { name: 'roles', exact: true }).click();
  await page.getByRole('button', { name: 'Nuevo rol', exact: true }).click();

  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('heading', { name: 'Crear rol' })).toBeVisible();
  await expect(dialog.getByText(/0 de \d+ seleccionados/)).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Guardar rol' })).toBeVisible();

  const dialogBox = await dialog.boundingBox();
  expect(dialogBox?.height).toBeLessThanOrEqual(700);

  const groupButtons = dialog.locator('button[aria-expanded]');
  expect(await groupButtons.count()).toBeGreaterThan(1);
  await expect(groupButtons.first()).toHaveAttribute('aria-expanded', 'true');
  await expect(groupButtons.nth(1)).toHaveAttribute('aria-expanded', 'false');

  await groupButtons.nth(1).focus();
  await page.keyboard.press('Enter');
  await expect(groupButtons.nth(1)).toHaveAttribute('aria-expanded', 'true');

  const secondGroup = groupButtons.nth(1).locator('..');
  await secondGroup.getByRole('button', { name: 'Seleccionar módulo' }).click();
  const checkboxes = secondGroup.getByRole('checkbox');
  expect(await checkboxes.count()).toBeGreaterThan(0);
  for (const checkbox of await checkboxes.all()) await expect(checkbox).toBeChecked();
  await expect(dialog.getByText(/0 de \d+ seleccionados/)).toHaveCount(0);

  await dialog.locator('.overflow-y-auto').evaluate(element => { element.scrollTop = element.scrollHeight; });
  await expect(dialog.getByRole('button', { name: 'Guardar rol' })).toBeVisible();
  await dialog.getByRole('button', { name: 'Cancelar' }).click();
  await expect(dialog).toBeHidden();
});
