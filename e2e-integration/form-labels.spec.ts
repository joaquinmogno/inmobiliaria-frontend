import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

const admin = {
  email: 'admin.integration@example.com',
  password: 'ProdTest!2026_Strong'
};

const labelRules = [
  'aria-input-field-name',
  'form-field-multiple-labels',
  'input-button-name',
  'label-content-name-mismatch',
  'label-title-only',
  'label',
  'select-name'
];

async function expectLabelledFields(page: Page, context: string) {
  const result = await new AxeBuilder({ page }).withRules(labelRules).analyze();
  const details = result.violations.flatMap(violation => violation.nodes.map(node =>
    `${context} — ${violation.id}: ${node.html} — ${node.failureSummary || violation.help}`
  ));
  expect(details, details.join('\n')).toEqual([]);
}

test('los formularios autenticados asocian sus etiquetas con cada campo', async ({ page }) => {
  await page.goto('/login');
  await page.getByPlaceholder('ejemplo@correo.com').fill(admin.email);
  await page.getByPlaceholder('••••••••').fill(admin.password);
  await page.getByRole('button', { name: /Ingresar a mi cuenta/i }).click();
  await expect(page).toHaveURL(/\/home$/);

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
    await expectLabelledFields(page, form.route);
  }

  await page.goto('/configuracion');
  await page.getByRole('button', { name: 'Auditoría', exact: true }).click();
  await expect(page.getByLabel('Acción (ej. CREAR_CONTRATO)')).toBeVisible();
  await expectLabelledFields(page, '/configuracion/auditoria');
});
