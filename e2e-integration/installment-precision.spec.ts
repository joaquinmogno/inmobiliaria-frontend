import { test, expect, type Page } from '@playwright/test';
import { installmentOutstanding } from '../src/utils/installments';

async function setup(page: Page, moneda: 'ARS' | 'USD') {
  await page.goto('/login');
  await page.getByPlaceholder('ejemplo@correo.com').fill('admin.integration@example.com');
  await page.getByPlaceholder('••••••••').fill('ProdTest!2026_Strong');
  const login = page.waitForResponse(r => r.url().endsWith('/api/auth/login'));
  await page.getByRole('button', { name: /Ingresar a mi cuenta/ }).click();
  const { csrfToken } = await (await login).json();
  await expect(page).toHaveURL(/\/home$/);
  const api = async (path: string, method = 'GET', data?: unknown) => {
    const result = await page.evaluate(async ({ path, method, data, csrfToken }) => {
      const r = await fetch(`/api${path}`, { method, credentials: 'include', headers: { 'content-type': 'application/json', 'x-csrf-token': csrfToken, 'Idempotency-Key': crypto.randomUUID() }, ...(data === undefined ? {} : { body: JSON.stringify(data) }) });
      return { status: r.status, data: await r.json() };
    }, { path, method, data, csrfToken });
    expect(result.status, JSON.stringify(result.data)).toBeLessThan(300); return result.data;
  };
  const name = `Cuotas navegador ${moneda} ${Date.now()}`;
  const contract = await api('/contratos', 'POST', { propiedad: { direccion: name }, propietarios: [{ nombreCompleto: `Dueño ${name}` }], inquilinos: [{ nombreCompleto: `Inquilino ${name}` }], fechaInicio: '2026-01-01', fechaFin: '2028-12-31', montoAlquiler: '100000', moneda, porcentajeHonorarios: 12.5, requiereActualizacion: false });
  await page.goto(`/contratos?q=${encodeURIComponent(name)}`);
  await page.getByRole('button', { name: 'Acciones del contrato' }).click();
  await page.getByRole('menuitem', { name: /Ver detalles/ }).click();
  await page.getByRole('button', { name: 'Planes', exact: true }).click();
  return { contract, api, name };
}

for (const [moneda, width] of [['ARS', 1280], ['USD', 1366]] as const) {
  test(`${moneda}: vista previa real, centavos y reprogramación de sólo pendientes a ${width}`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: width === 1280 ? 720 : 768 });
    const { contract, api, name } = await setup(page, moneda);
    await page.getByRole('button', { name: '+ Nuevo Plan', exact: true }).click();
    const modal = page.getByRole('dialog', { name: 'Nuevo Plan de Cuotas' });
    await modal.locator('#installment-plan-concept').fill(name);
    await modal.locator('#installment-plan-first-period').fill('2026-12');
    await modal.locator('#installment-plan-count').fill('6');
    await modal.locator('#installment-plan-total').fill('10');
    await modal.locator('#installment-plan-total').press('Tab');
    let preview = modal.getByRole('region', { name: 'Vista previa de cuotas', exact: true });
    await expect(preview.getByRole('cell', { name: /1,66$/ })).toHaveCount(5);
    await expect(preview.getByRole('cell', { name: /1,70$/ })).toHaveCount(1);
    await expect(preview).toContainText('La diferencia de centavos se asigna a la última cuota.');
    await modal.locator('#installment-plan-count').fill('3');
    await modal.locator('#installment-plan-total').fill('0,02');
    await modal.locator('#installment-plan-total').press('Tab');
    await expect(preview.getByRole('alert')).toContainText('0,01');
    await expect(modal.getByRole('button', { name: 'Crear Plan', exact: true })).toBeDisabled();
    await modal.locator('#installment-plan-total').fill('0,03');
    await modal.locator('#installment-plan-total').press('Tab');
    await expect(preview.getByRole('cell', { name: /0,01$/ })).toHaveCount(3);
    await modal.locator('#installment-plan-total').fill('100');
    await modal.locator('#installment-plan-total').press('Tab');
    await expect(preview.getByRole('cell', { name: /33,34$/ })).toHaveCount(1);
    await expect(preview).toContainText('100,00');
    await page.screenshot({ path: info.outputPath(`vista-previa-${moneda}.png`) });
    await modal.getByRole('button', { name: 'INGRESO (Paga Inquilino)', exact: true }).click();
    await modal.getByRole('button', { name: 'Crear Plan', exact: true }).focus();
    await page.keyboard.press('Enter');
    await expect(modal).toHaveCount(0);
    const plan = (await api(`/planes-cuotas/contrato/${contract.id}`))[0];
    expect(plan.resumen.sumaCuotas).toBe('100.00'); expect(plan.moneda).toBe(moneda);
    const card = page.getByRole('group', { name: `Plan de cuotas ${name}`, exact: true });
    await expect(card).toContainText('100,00'); await expect(card).toContainText('33,34');
    const liq = await api('/liquidaciones', 'POST', { contratoId: contract.id, periodo: '2026-12-01', cuotasIds: [plan.cuotas[0].id] });
    await api(`/liquidaciones/${liq.id}/confirmar`, 'PATCH', { expectedVersion: liq.version });
    await api('/pagos', 'POST', { contratoId: contract.id, liquidacionId: liq.id, monto: '33.33', moneda, fechaPago: new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' }).format(new Date()), metodoPago: 'EFECTIVO', cuotasImputadas: [{ cuotaId: plan.cuotas[0].id, monto: '33.33' }] });
    // The original dialog still holds the old list: opening must fetch live balances.
    await card.getByRole('button', { name: 'Reprogramar', exact: true }).click();
    const reprogram = page.getByRole('dialog', { name: 'Reprogramar plan de cuotas' });
    await expect(reprogram.locator('#reprogram-total')).toHaveValue('66,67');
    await expect(reprogram.locator('#reprogram-count')).toHaveValue('2');
    await expect(reprogram.getByLabel('Importes del plan')).toContainText('33,33');
    await reprogram.locator('#reprogram-first-period').fill('2027-01');
    preview = reprogram.getByRole('region', { name: 'Vista previa de cuotas', exact: true });
    await expect(preview.getByRole('cell', { name: /33,34$/ })).toHaveCount(1);
    await reprogram.locator('#reprogram-total').fill('70');
    await reprogram.locator('#reprogram-total').press('Tab');
    await expect(reprogram.getByRole('status')).toContainText('El nuevo total cambia');
    await reprogram.locator('#reprogram-total').fill('66,67');
    await reprogram.locator('#reprogram-total').press('Tab');
    await reprogram.locator('#plan-lifecycle-reason').fill('Distribuir sólo las cuotas pendientes sin alterar la cuota pagada');
    await expect(preview).toContainText('66,67');
    const submit = reprogram.getByRole('button', { name: 'Crear plan reprogramado', exact: true });
    await expect(submit).toBeEnabled();
    await submit.focus(); await expect(submit).toBeFocused();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    const box = await submit.boundingBox(); expect(box!.y + box!.height).toBeLessThanOrEqual(width === 1280 ? 720 : 768);
    await page.screenshot({ path: info.outputPath(`reprogramacion-${moneda}.png`) });
    await page.keyboard.press('Enter');
    await expect(reprogram).toHaveCount(0);
    const plans = await api(`/planes-cuotas/contrato/${contract.id}`);
    const original = plans.find((p: { id: number }) => p.id === plan.id);
    const successor = plans.find((p: { planOrigenId?: number }) => p.planOrigenId === plan.id);
    expect(original.cuotas[0].estado).toBe('PAGADA'); expect(Number(original.cuotas[0].monto)).toBe(33.33);
    expect(successor.resumen.sumaCuotas).toBe('66.67');
  });
}

test('el saldo visible de cuotas conserva centavos y respeta la cancelación total', () => {
  expect(installmentOutstanding({ monto: '33.33', estado: 'PENDIENTE', imputacionesPago: [{ monto: '10.10' }] })).toBe(23.23);
  expect(installmentOutstanding({ monto: '33.33', estado: 'PAGADA', imputacionesPago: [] })).toBe(0);
});
