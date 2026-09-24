import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

const admin = {
  email: 'admin.integration@example.com',
  password: 'ProdTest!2026_Strong'
};

async function expectAccessibleContrast(page: Page, context: string) {
  // No medir colores intermedios mientras Headless UI está animando la opacidad.
  await page.waitForTimeout(400);
  const result = await new AxeBuilder({ page }).withRules(['color-contrast']).analyze();
  const details = result.violations.flatMap(violation => violation.nodes.map(node =>
    `${context} — ${node.html}: ${node.failureSummary || violation.help}`
  ));
  expect(details, details.join('\n')).toEqual([]);
}

test('formularios y menús abiertos conservan contraste WCAG AA', async ({ page }) => {
  await page.goto('/login');
  await expectAccessibleContrast(page, '/login');
  await page.getByPlaceholder('ejemplo@correo.com').fill(admin.email);
  await page.getByPlaceholder('••••••••').fill(admin.password);
  await page.getByRole('button', { name: /Ingresar a mi cuenta/i }).click();
  await expect(page).toHaveURL(/\/home$/);

  await page.getByRole('button', { name: 'Menú de usuario' }).click();
  await expect(page.getByRole('menu')).toBeVisible();
  await expectAccessibleContrast(page, 'menú de usuario');

  const forms = [
    { route: '/personas', button: 'Nueva persona' },
    { route: '/propiedades', button: 'Nueva propiedad' },
    { route: '/contratos', button: 'Nuevo contrato' },
    { route: '/liquidaciones', button: 'Crear individual' },
    { route: '/cajachica', button: 'Nuevo Movimiento' },
    { route: '/sueldos', button: 'Registrar pago de sueldo' },
    { route: '/usuarios', button: 'Nuevo usuario' }
  ];

  for (const form of forms) {
    await page.goto(form.route);
    await page.getByRole('button', { name: form.button, exact: true }).click();
    await expect(page.locator('form').last()).toBeVisible();
    await expectAccessibleContrast(page, `${form.route} — formulario abierto`);

    if (form.route === '/contratos') {
      await page.locator('#contract-currency').click();
      await expect(page.getByRole('option', { name: /ARS — Pesos argentinos/ })).toBeVisible();
      await expectAccessibleContrast(page, `${form.route} — selector abierto`);
      await page.keyboard.press('Escape');
    }
  }

  await page.goto('/usuarios');
  await page.getByRole('tab', { name: 'roles', exact: true }).click();
  await page.getByRole('button', { name: 'Nuevo rol', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Crear rol' })).toBeVisible();
  await expectAccessibleContrast(page, '/usuarios — formulario de rol');

  await page.goto('/configuracion');
  await page.getByRole('button', { name: 'Auditoría', exact: true }).click();
  await expect(page.getByLabel('Acción (ej. CREAR_CONTRATO)')).toBeVisible();
  await expectAccessibleContrast(page, '/configuracion — auditoría');
});
