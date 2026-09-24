import { expect, test } from '@playwright/test';

const admin = {
  email: 'admin.integration@example.com',
  password: 'ProdTest!2026_Strong'
};

test('el detalle separa el ciclo de la deuda y contiene textos largos sin colisiones', async ({ page }) => {
  await page.goto('/login');
  await page.getByPlaceholder('ejemplo@correo.com').fill(admin.email);
  await page.getByPlaceholder('••••••••').fill(admin.password);
  await page.getByRole('button', { name: /Ingresar a mi cuenta/i }).click();
  await expect(page).toHaveURL(/\/home$/);

  await page.goto('/liquidaciones');
  await page.getByRole('button', { name: 'Historial', exact: true }).click();
  const firstHistoryAction = page.locator('article').first().getByRole('button');
  await expect(firstHistoryAction).toBeVisible();
  await firstHistoryAction.click();
  await expect(page).toHaveURL(/\/liquidaciones\/\d+$/);

  const liquidationId = page.url().split('/').at(-1);
  const longToken = 'AdministracionInmobiliariaSinEspaciosQueNoDebeSuperponerse';
  await page.route(`**/api/liquidaciones/${liquidationId}*`, async route => {
    const response = await route.fetch();
    const body = await response.json();
    body.estado = 'PENDIENTE_PAGO';
    body.netoACobrar = '999999999999999.99';
    body.montoHonorarios = '123456789012345.67';
    body.totalIngresos = '999999999999999.99';
    body.propiedadDireccion = `${longToken}${longToken}`;
    body.inquilinoNombre = `${longToken}${longToken}`;
    body.contrato.propiedad.direccion = `${longToken}${longToken}`;
    const tenant = body.contrato.inquilinos.find((item: { esPrincipal: boolean }) => item.esPrincipal);
    if (tenant) tenant.persona.nombreCompleto = `${longToken}${longToken}`;
    body.movimientos = [{
      id: 987654321,
      tipo: 'INGRESO',
      concepto: `${longToken}${longToken}`,
      monto: '999999999999999.99',
      moneda: body.moneda,
      observaciones: `${longToken}${longToken}`,
      fechaCreacion: '2026-09-03T12:00:00.000Z',
      esParaInmobiliaria: false
    }];
    body.pagos = [{
      id: 987654321,
      monto: '1',
      moneda: body.moneda,
      fechaPago: '2026-09-03',
      metodoPago: 'EFECTIVO',
      observaciones: `${longToken}${longToken}`,
      creadoPor: { nombreCompleto: `${longToken}${longToken}` }
    }];
    await route.fulfill({ response, json: body });
  });
  await page.reload();

  const lifecycle = page.getByTestId('liquidation-lifecycle');
  const document = page.getByTestId('liquidation-document');
  await expect(lifecycle.getByRole('heading', { name: 'Estado de la liquidación' })).toBeVisible();
  await expect(document.getByText('Pendiente de cobro', { exact: true })).toHaveCount(0);
  await expect(page.getByText('Edición parcial', { exact: true })).toHaveCount(0);

  for (const width of [390, 640, 768, 1024]) {
    await page.setViewportSize({ width, height: 800 });

    await expect(page.getByTestId('liquidation-primary-actions')).toBeVisible();
    const protectedElements = page.locator([
      '[data-testid="liquidation-primary-actions"]',
      '[data-testid="liquidation-document"]',
      '[data-testid="liquidation-summary-amount"]',
      '[data-testid="liquidation-fact-value"]'
    ].join(','));
    const overflows = await protectedElements.evaluateAll(elements => elements.map(element => ({
      width: element.clientWidth,
      contentWidth: element.scrollWidth
    })).filter(size => size.contentWidth > size.width + 1));
    expect(overflows, `Se detectó texto desbordado a ${width}px`).toEqual([]);

    if (width < 768) {
      await expect(lifecycle.getByText('Pendiente de cobro', { exact: true }).first()).toBeVisible();
    } else {
      await expect(lifecycle.locator('[aria-current="step"]')).toContainText('Pendiente de cobro');
    }
  }

  await page.setViewportSize({ width: 390, height: 800 });
  await expect(page.locator('table:visible')).toHaveCount(0);
  expect(await page.locator('html').evaluate(element => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
});
