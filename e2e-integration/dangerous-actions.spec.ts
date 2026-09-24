import { expect, test } from '@playwright/test';

const admin = {
  email: 'admin.integration@example.com',
  password: 'ProdTest!2026_Strong'
};

test('la anulación de pagos queda en un menú contextual y exige un motivo', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/login');
  await page.getByPlaceholder('ejemplo@correo.com').fill(admin.email);
  await page.getByPlaceholder('••••••••').fill(admin.password);
  await page.getByRole('button', { name: /Ingresar a mi cuenta/i }).click();
  await expect(page).toHaveURL(/\/home$/);

  // La suite de backend verifica primero la reversión del pago sembrado. Para
  // este caso puramente visual lo presentamos como vigente sin mutar datos.
  await page.route('**/api/pagos?*', async route => {
    const response = await route.fetch();
    const body = await response.json();
    const payment = body.data?.[0] ?? {
      id: 999_001,
      liquidacionId: 999_001,
      monto: 150_000,
      moneda: 'ARS',
      fechaPago: '2026-09-02',
      fechaCreacion: '2026-09-02T15:00:00.000Z',
      metodoPago: 'TRANSFERENCIA',
      creadoPor: { nombreCompleto: 'Administrador Integration' },
      auditLogs: [],
      liquidacion: {
        id: 999_001,
        periodo: '2026-09-01',
        moneda: 'ARS',
        contrato: {
          propiedad: { direccion: 'Propiedad de prueba' },
          inquilinos: []
        }
      }
    };
    payment.anuladoEn = null;
    payment.motivoAnulacion = null;
    payment.anuladoPor = null;
    body.data = [payment];
    body.meta = { ...body.meta, total: 1, totalPages: 1 };
    await route.fulfill({ response, json: body });
  });

  await page.goto('/pagos');
  await expect(page.getByRole('heading', { name: 'Historial de pagos' })).toBeVisible();

  const actionMenu = page.getByRole('button', { name: /^Acciones del pago del / }).first();
  await expect(actionMenu).toBeVisible();

  const card = actionMenu.locator('xpath=ancestor::article');
  const [menuBox, cardBox] = await Promise.all([actionMenu.boundingBox(), card.boundingBox()]);
  expect(menuBox).not.toBeNull();
  expect(cardBox).not.toBeNull();
  expect(menuBox!.width).toBeLessThan(cardBox!.width / 3);

  await expect(page.getByRole('menuitem', { name: 'Anular pago', exact: true })).toHaveCount(0);
  await actionMenu.click();

  const voidAction = page.getByRole('menuitem', { name: 'Anular pago', exact: true });
  await expect(voidAction).toBeVisible();
  await expect(voidAction).toHaveCSS('color', 'rgb(146, 64, 14)');
  await voidAction.click();

  const dialog = page.getByRole('dialog', { name: 'Anular pago' });
  const reason = dialog.getByRole('textbox', { name: /Motivo de la anulación/ });
  const confirm = dialog.getByRole('button', { name: 'Anular y revertir' });
  await expect(reason).toBeVisible();
  await expect(confirm).toBeDisabled();
  await reason.fill('Registro duplicado durante la prueba');
  await expect(confirm).toBeEnabled();
  await expect(confirm).toHaveCSS('background-color', 'rgb(146, 64, 14)');
});
