import { test, expect, type Page } from '@playwright/test';

async function setup(page: Page, confirm = true) {
  await page.goto('/login');
  await page.getByPlaceholder('ejemplo@correo.com').fill('admin.integration@example.com');
  await page.getByPlaceholder('••••••••').fill('ProdTest!2026_Strong');
  const login = page.waitForResponse(r => r.url().endsWith('/api/auth/login'));
  await page.getByRole('button', { name: /Ingresar a mi cuenta/ }).click();
  const { csrfToken } = await (await login).json();
  await expect(page).toHaveURL(/\/home$/);
  const api = async (path: string, method = 'GET', data?: unknown) => {
    const result = await page.evaluate(async ({ path, method, data, csrfToken }) => {
      const response = await fetch(`/api${path}`, { method, credentials: 'include', headers: { 'content-type': 'application/json', 'x-csrf-token': csrfToken, 'Idempotency-Key': crypto.randomUUID() }, ...(data === undefined ? {} : { body: JSON.stringify(data) }) });
      return { status: response.status, data: await response.json() };
    }, { path, method, data, csrfToken });
    expect(result.status, JSON.stringify(result.data)).toBeLessThan(300); return result.data;
  };
  const name = `Reintento ${Date.now()}`;
  const contract = await api('/contratos', 'POST', { propiedad: { direccion: name }, propietarios: [{ nombreCompleto: `Dueño ${name}` }], inquilinos: [{ nombreCompleto: `Inquilino ${name}` }], fechaInicio: '2026-01-01', fechaFin: '2028-12-31', montoAlquiler: 100000, moneda: 'ARS', porcentajeHonorarios: 0, requiereActualizacion: false });
  const liq = await api('/liquidaciones', 'POST', { contratoId: contract.id, periodo: '2026-11-01' });
  if (confirm) await api(`/liquidaciones/${liq.id}/confirmar`, 'PATCH', { expectedVersion: liq.version });
  return { api, contract, liq };
}

test('un conflicto de confirmación informa el problema y recupera el estado vigente', async ({ page }) => {
  const { liq } = await setup(page, false);
  await page.goto(`/liquidaciones/${liq.id}`);
  let requests = 0;
  await page.route(`**/api/liquidaciones/${liq.id}/confirmar`, async route => {
    requests++;
    // Another operator has confirmed by the time this request returns its conflict.
    const winner = await route.fetch(); expect(winner.status()).toBe(200);
    await route.fulfill({ status: 409, contentType: 'application/json', body: JSON.stringify({ message: 'Otra operación actualizó los datos mientras guardabas. Actualizá el estado y revisalo antes de volver a confirmar.', code: 'TRANSACTION_CONFLICT' }) });
  });
  await page.getByRole('button', { name: 'Confirmar liquidación', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Registrar pago del inquilino', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Confirmar liquidación', exact: true })).toHaveCount(0);
  await expect(page.getByText('Otra operación actualizó los datos mientras guardabas.', { exact: false })).toBeVisible();
  expect(requests).toBe(1);
});

for (const kind of ['inquilino', 'propietario'] as const) {
  test(`${kind}: respuesta perdida, recarga y recuperación conservan una sola operación`, async ({ page }, info) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    const { api, contract, liq } = await setup(page);
    if (kind === 'propietario') await api('/pagos', 'POST', { contratoId: contract.id, liquidacionId: liq.id, monto: 100000, moneda: 'ARS', fechaPago: '2026-11-16', metodoPago: 'EFECTIVO' });
    await page.goto(`/liquidaciones/${liq.id}`);
    const opener = kind === 'inquilino' ? page.getByRole('button', { name: 'Registrar pago del inquilino', exact: true }) : page.getByRole('button', { name: /^Pagar a Dueño/ });
    await opener.click();
    const dialog = page.getByRole('dialog', { name: kind === 'inquilino' ? 'Registrar pago' : 'Pagar a Propietario', exact: true });
    const amount = dialog.locator(kind === 'inquilino' ? '#tenant-payment-amount' : '#owner-payment-amount');
    await amount.focus();
    await amount.fill(kind === 'inquilino' ? '10000,50' : '10000.50');
    await amount.press('Tab');
    const endpoint = kind === 'inquilino' ? '/api/pagos' : `/api/liquidaciones/${liq.id}/pagar-propietario`;
    const keys: string[] = [];
    const bodies: string[] = [];
    let release: (() => void) | undefined;
    const held = new Promise<void>(resolve => { release = resolve; });
    let reached: (() => void) | undefined;
    const arrived = new Promise<void>(resolve => { reached = resolve; });
    await page.route(`**${endpoint}`, async route => {
      keys.push(route.request().headers()['idempotency-key']); bodies.push(route.request().postData()!);
      if (keys.length === 1) {
        const response = await route.fetch();
        expect(response.status()).toBe(kind === 'inquilino' ? 201 : 200);
        reached!(); await held;
        await route.abort('failed'); // Server committed; only the response is lost.
      } else if (kind === 'inquilino' && keys.length === 2) {
        await route.fulfill({ status: 429, contentType: 'application/json', body: JSON.stringify({ message: 'Esperá antes de reintentar', code: 'RATE_LIMITED' }) });
      } else await route.continue();
    });
    const submit = dialog.getByRole('button', { name: kind === 'inquilino' ? 'Confirmar Ingreso de Pago' : 'Confirmar Pago a Propietario', exact: true });
    await submit.click();
    await expect.poll(() => keys.length).toBe(1);
    await arrived;
    await expect(dialog.getByRole('button', { name: 'Registrando…' })).toBeDisabled();
    await expect(amount).toBeDisabled();
    release!();
    await expect(dialog.getByRole('button', { name: 'Verificar envío pendiente' })).toBeVisible();
    expect(Number(kind === 'inquilino' ? (await amount.inputValue()).replaceAll('.', '').replace(',', '.') : await amount.inputValue())).toBe(10000.50);
    // Recovery also survives a full page reload and a newer liquidation version.
    await page.reload(); await opener.click();
    await expect(dialog.getByRole('button', { name: 'Verificar envío pendiente' })).toBeVisible();
    await expect(dialog.locator('[id^="headlessui-dialog-panel"]')).toHaveCSS('opacity', '1');
    await page.screenshot({ path: info.outputPath(`recuperacion-${kind}.png`), animations: 'disabled' });
    await dialog.getByRole('button', { name: 'Verificar envío pendiente' }).click();
    if (kind === 'inquilino') {
      await expect(dialog.getByRole('button', { name: 'Verificar envío pendiente' })).toBeVisible();
      await dialog.getByRole('button', { name: 'Verificar envío pendiente' }).click();
    }
    await expect(dialog).toHaveCount(0);
    const attempts = kind === 'inquilino' ? 3 : 2;
    expect(keys).toHaveLength(attempts); expect(keys[0]).toBeTruthy();
    expect(new Set(keys).size).toBe(1); expect(new Set(bodies).size).toBe(1);
    let detail = await api(`/liquidaciones/${liq.id}`);
    const payments = kind === 'inquilino' ? detail.pagos : detail.historialPagosPropietario.filter((p: { tipo: string; estado: string }) => p.tipo === 'PAGO' && p.estado === 'VIGENTE');
    expect(payments).toHaveLength(1); expect(Number(payments[0].monto)).toBe(10000.50);
    // Once acknowledged, an intentional second identical payment uses a new key.
    await opener.click(); await amount.focus(); await amount.fill(kind === 'inquilino' ? '10000,50' : '10000.50'); await amount.press('Tab'); await submit.click();
    await expect(dialog).toHaveCount(0); expect(keys).toHaveLength(attempts + 1); expect(keys[attempts]).not.toBe(keys[0]);
    detail = await api(`/liquidaciones/${liq.id}`);
    expect(kind === 'inquilino' ? detail.pagos.length : detail.historialPagosPropietario.filter((p: { tipo: string; estado: string }) => p.tipo === 'PAGO' && p.estado === 'VIGENTE').length).toBe(2);
  });
}
