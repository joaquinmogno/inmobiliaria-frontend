import { expect, test } from '@playwright/test';
import { formatCurrency, formatSignedCurrency } from '../src/utils/currency';

const admin = {
  email: 'admin.integration@example.com',
  password: 'ProdTest!2026_Strong'
};

test('los importes financieros mantienen símbolo, signo y separadores consistentes', () => {
  expect(formatCurrency(-17345, 'ARS')).toBe('-$17.345');
  expect(formatCurrency(-1299.99, 'USD')).toBe('-US$1.299,99');
  expect(formatCurrency(17345, 'ARS')).toBe('$17.345');
  expect(formatSignedCurrency(17345, 'ARS', true)).toBe('+$17.345');
  expect(formatSignedCurrency(-17345, 'ARS', true)).toBe('-$17.345');
});

test('sueldos identifica el destino del CTA y del formulario', async ({ page }) => {
  await page.goto('/login');
  await page.getByPlaceholder('ejemplo@correo.com').fill(admin.email);
  await page.getByPlaceholder('••••••••').fill(admin.password);
  await page.getByRole('button', { name: /Ingresar a mi cuenta/i }).click();
  await expect(page).toHaveURL(/\/home$/);

  await page.goto('/sueldos');
  await page.getByRole('button', { name: 'Registrar pago de sueldo', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Registrar pago de sueldo', exact: true })).toBeVisible();
});
