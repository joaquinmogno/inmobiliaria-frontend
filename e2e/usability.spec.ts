import { test, expect, type Page } from '@playwright/test';

const allPermissions = ['pagos.ver', 'pagos.crear', 'liquidaciones.ver', 'personas.ver', 'personas.crear', 'control_interno.ver', 'control_interno.crear', 'contratos.ver', 'contratos.crear'];
async function setup(page: Page, permissions = allPermissions) {
  const user = { id: 5, email: 'ui@test.local', fullName: 'Usuario', nombreCompleto: 'Usuario', tipo: 'USUARIO', role: 'USUARIO', permissions, inmobiliaria: { id: 1, nombre: 'PropControl' } };
  const requests: Array<{ path: string; method: string; query: string; body: string | null }> = [];
  await page.addInitScript(value => { localStorage.setItem('user', JSON.stringify(value)); localStorage.setItem('loginTimestamp', String(Date.now())); }, user);
  await page.route('**/api/**', async route => {
    const req = route.request();
    const url = new URL(req.url());
    requests.push({ path: url.pathname, method: req.method(), query: url.search, body: req.postData() });
    let body: unknown = [];
    if (url.pathname === '/api/auth/me') body = user;
    else if (url.pathname === '/api/control-interno/opciones') body = { categorias: ['Oficina'], mediosPago: [], cuentasPago: [], usuarios: [] };
    else if (req.method() === 'POST') body = { id: 1 };
    else if (['/api/pagos', '/api/control-interno', '/api/personas', '/api/contratos'].includes(url.pathname)) body = { data: [], meta: { total: 0, page: 1, limit: 25, totalPages: 0 }, resumen: [] };
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  });
  return requests;
}

test('los filtros móviles de cobros conservan su selección al plegar y recargar, y se limpian desde el vacío', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const requests = await setup(page);
  await page.goto('/pagos');
  const toggle = page.getByRole('button', { name: /^Filtros/ });
  await expect(toggle).toHaveText(/1 activo/);
  await expect(page.getByRole('button', { name: /^Filtrar moneda:/ })).not.toBeVisible();
  await toggle.click();
  await page.getByRole('button', { name: /^Filtrar moneda:/ }).click();
  await page.getByRole('option', { name: 'USD', exact: true }).click();
  await expect(toggle).toHaveText(/2 activos/);
  await toggle.click();
  await expect(page.getByRole('searchbox')).toBeVisible();
  await expect(page.getByRole('button', { name: /^Filtrar moneda:/ })).not.toBeVisible();
  await page.reload();
  await expect(toggle).toHaveText(/2 activos/);
  await page.getByRole('button', { name: 'Limpiar filtros', exact: true }).filter({ visible: true }).click();
  await expect(page.getByText('Todavía no hay cobros registrados').filter({ visible: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Ir a liquidaciones' }).filter({ visible: true })).toBeVisible();
  await expect.poll(() => requests.filter(r => r.path === '/api/pagos').at(-1)?.query).not.toMatch(/moneda=|estado=/);
  await page.setViewportSize({ width: 1366, height: 900 });
  await expect(page.getByRole('button', { name: /^Filtrar moneda:/ })).toBeVisible();
  await expect(toggle).not.toBeVisible();
});

test('limpiar filtros internos conserva el mes y la consulta no ofrece acciones de creación', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const requests = await setup(page, ['control_interno.ver']);
  await page.goto('/control-interno');
  await page.getByRole('button', { name: /^Filtros/ }).click();
  await page.getByLabel('Mes', { exact: true }).fill('2026-07');
  await page.getByText('Más filtros', { exact: true }).click();
  await page.getByRole('button', { name: /^Categoría:/ }).click();
  await page.getByRole('option', { name: 'Oficina', exact: true }).click();
  await expect(page.getByRole('button', { name: /^Filtros/ })).toHaveText(/2 activos/);
  await page.getByRole('button', { name: /^Filtros/ }).click();
  await page.getByRole('button', { name: 'Limpiar filtros', exact: true }).click();
  await expect(page.getByText('Todavía no hay movimientos en este mes')).toBeVisible();
  await expect(page.getByRole('button', { name: /Crear el primer|Agregar movimiento/ })).toHaveCount(0);
  await expect.poll(() => requests.filter(r => r.path === '/api/control-interno').at(-1)?.query).toMatch(/periodo=2026-07&estado=TODOS/);
  await expect(page.getByText('Período: julio de 2026')).toBeVisible();
});

test('personas distingue búsqueda vacía y registro inicial sin ofrecer creación al rol de consulta', async ({ page }) => {
  await setup(page, ['personas.ver']);
  await page.goto('/personas?q=Inexistente');
  await expect(page.getByText('No hay resultados con estos filtros').filter({ visible: true })).toBeVisible();
  await page.getByRole('button', { name: 'Limpiar filtros', exact: true }).filter({ visible: true }).click();
  await expect(page.getByText('Todavía no hay personas registradas').filter({ visible: true })).toBeVisible();
  await expect(page.getByRole('button', { name: /Crear la primera|Nueva persona/ })).toHaveCount(0);
});

test('persona muestra errores vinculados al campo y permite guardar desde el pie fijo en celular', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  const requests = await setup(page);
  await page.goto('/personas');
  await page.getByRole('button', { name: 'Crear la primera persona' }).filter({ visible: true }).click();
  const save = page.getByRole('button', { name: 'Guardar persona', exact: true });
  await save.click();
  await expect(page.locator('#person-name')).toHaveAttribute('aria-invalid', 'true');
  await expect(page.locator('#person-name-error')).toBeVisible();
  await expect(page.locator('#person-name')).toBeFocused();
  await page.locator('#person-name').fill('Persona de prueba');
  await page.locator('#person-cuit').fill('123');
  await save.click();
  await expect(page.locator('#person-cuit')).toBeFocused();
  await expect(page.locator('#person-cuit-error')).toHaveText('El CUIT debe tener 11 dígitos.');
  await page.locator('#person-cuit').fill('');
  await page.locator('#person-form').evaluate(el => { el.scrollTop = el.scrollHeight; });
  const bounds = await save.boundingBox();
  expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(740);
  await save.click();
  await expect(save).not.toBeVisible();
  const create = requests.find(r => r.path === '/api/personas' && r.method === 'POST');
  expect(JSON.parse(create!.body!)).toMatchObject({ nombreCompleto: 'Persona de prueba', cuit: '', estado: 'ACTIVO' });
});

test('contrato muestra errores junto a los campos obligatorios y mantiene las acciones al desplazar', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const requests = await setup(page);
  await page.goto('/contratos');
  await page.getByRole('button', { name: 'Nuevo contrato', exact: true }).click();
  const dialog = page.getByRole('dialog');
  const save = dialog.getByRole('button', { name: 'Guardar contrato', exact: true });
  await save.click();
  await expect(page.locator('#contract-property-address')).toBeFocused();
  await expect(page.locator('#contract-property-address-error')).toBeVisible();
  await expect(page.locator('#owner-0-name')).toHaveAttribute('aria-describedby', 'owner-0-name-error');
  expect(requests.some(r => r.path === '/api/contratos' && r.method === 'POST')).toBe(false);
  await dialog.locator('form').evaluate(el => { el.scrollTop = el.scrollHeight; });
  const bounds = await save.boundingBox();
  expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(844);
  await dialog.getByRole('button', { name: 'Cancelar', exact: true }).click();
  await expect(dialog).not.toBeVisible();
});

test('control interno vincula un importe inválido con su campo y conserva los datos al corregirlo', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const requests = await setup(page);
  await page.goto('/control-interno');
  await page.getByRole('button', { name: 'Agregar movimiento', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.locator('#internal-detail').fill('Servicios de oficina');
  await dialog.locator('#internal-amount').fill('0');
  await dialog.getByRole('button', { name: 'Guardar movimiento' }).click();
  await expect(dialog.locator('#internal-amount')).toBeFocused();
  await expect(dialog.locator('#internal-amount-error')).toContainText('mayor a cero');
  await dialog.locator('#internal-amount').fill('1200,50');
  await expect(dialog.locator('#internal-amount-error')).toHaveCount(0);
  await dialog.getByRole('button', { name: 'Guardar movimiento' }).click();
  await expect(dialog).not.toBeVisible();
  const create = requests.find(r => r.path === '/api/control-interno' && r.method === 'POST');
  expect(create!.body).toContain('Servicios de oficina');
  expect(create!.body).toContain('1200.50');
});
