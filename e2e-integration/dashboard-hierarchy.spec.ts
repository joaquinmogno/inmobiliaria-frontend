import { expect, test } from '@playwright/test';

const admin = {
  email: 'admin.integration@example.com',
  password: 'ProdTest!2026_Strong'
};

test('el dashboard evita métricas repetidas y reserva los acentos para estados', async ({ page }) => {
  await page.goto('/login');
  await page.getByPlaceholder('ejemplo@correo.com').fill(admin.email);
  await page.getByPlaceholder('••••••••').fill(admin.password);
  await page.getByRole('button', { name: /Ingresar a mi cuenta/i }).click();
  await expect(page).toHaveURL(/\/home$/);

  const operationalSummary = page.getByTestId('dashboard-operational-kpis');
  await expect(operationalSummary).toBeVisible();
  await expect(operationalSummary.locator(':scope > div')).toHaveCount(3);
  await expect(operationalSummary).toContainText('Propiedades administradas');
  await expect(operationalSummary).toContainText('Contratos Activos');
  await expect(operationalSummary).toContainText('Morosidad');
  await expect(operationalSummary).not.toContainText('Cobrado a inquilinos');
  await expect(operationalSummary).not.toContainText('Honorarios de la inmobiliaria');

  const financialSummary = page.getByTestId('dashboard-financial-summary');
  await expect(financialSummary).toBeVisible();
  const currencyCards = financialSummary.getByTestId('dashboard-currency-summary');
  const currencyCount = await currencyCards.count();
  expect(currencyCount).toBeGreaterThan(0);
  await expect(financialSummary.getByTestId('dashboard-net-result')).toHaveCount(currencyCount);
  await expect(page.locator('section.bg-indigo-700')).toHaveCount(0);

  for (let index = 0; index < currencyCount; index += 1) {
    const card = currencyCards.nth(index);
    await expect(card.getByText('Cobrado a inquilinos', { exact: true })).toHaveCount(1);
    await expect(card.getByText('Honorarios', { exact: true })).toHaveCount(1);
    await expect(card.getByText('Gastos de la inmobiliaria', { exact: true })).toHaveCount(1);
    await expect(card.getByText('Fondos pendientes de entregar', { exact: true })).toHaveCount(1);
    await expect(card.getByText('Resultado neto de la inmobiliaria', { exact: true })).toHaveCount(1);
  }
});
