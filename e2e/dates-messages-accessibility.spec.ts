import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { admin, fixture } from './fixtures/liquidation-currency';
import { formatDate, formatDateTime, formatMonthYear, toDateInputValue } from '../src/utils/date';

async function setup(page: Page) {
  const data = fixture('ARS', true);
  const state = { historyError: false, historyEmpty: false, auditError: false, auditEmpty: false, searchError: false, passwordStatus: 400, writes: [] as string[] };
  await page.addInitScript(user => { localStorage.setItem('user', JSON.stringify(user)); localStorage.setItem('loginTimestamp', String(Date.now())); }, admin);
  await page.route('**/api/**', async route => {
    const request = route.request();
    const url = new URL(request.url());
    let body: unknown = []; let status = 200;
    if (request.method() !== 'GET') state.writes.push(url.pathname);
    if (url.pathname.endsWith('/auth/me')) body = admin;
    else if (url.pathname.endsWith('/auth/change-password')) { status = state.passwordStatus; body = { message: 'La contraseña actual no es correcta.' }; }
    else if (url.pathname === '/api/inmobiliaria/me') body = { id: 1, nombre: 'PropControl' };
    else if (url.pathname === '/api/liquidaciones/filtros') body = { periodos: ['2026-10-01'], monedas: ['ARS', 'USD'] };
    else if (url.pathname === '/api/liquidaciones') {
      status = state.historyError ? 500 : 200;
      body = { data: state.historyEmpty ? [] : [data.liquidation], meta: { page: 1, totalPages: 1, total: state.historyEmpty ? 0 : 1 } };
    } else if (url.pathname.includes('/filtros/propiedades')) {
      status = state.searchError ? 500 : 200;
      body = { data: [{ id: 1, direccion: 'Propiedad de prueba' }], meta: { page: 1, totalPages: 1 } };
    } else if (url.pathname === '/api/contratos') body = { data: [data.contract], meta: { page: 1, totalPages: 1, total: 1 } };
    else if (url.pathname === '/api/inmobiliaria/logs') {
      status = state.auditError ? 500 : 200;
      body = { data: state.auditEmpty ? [] : [{ id: 1, accion: 'EDITAR_MOVIMIENTO', entidad: 'Movimiento', entidadId: 1, resultado: 'EXITO', fechaCreacion: '2026-11-10T23:55:24.000Z', usuario: { nombreCompleto: 'Operador' }, detalle: JSON.stringify({ fechaPago: { anterior: '2026-11-10T00:00:00.000Z', nuevo: '2026-11-11T00:00:00.000Z' }, detalle: { anterior: 'Alquiler', nuevo: 'Alquiler noviembre' }, monto: { anterior: '1000.50', nuevo: '1200.75' } }) }], meta: { page: 1, total: state.auditEmpty ? 0 : 1, totalPages: 1 } };
    }
    await route.fulfill({ status, json: body });
  });
  return state;
}
async function audit(page: Page) {
  const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  expect(result.violations, JSON.stringify(result.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.html) })))).toEqual([]);
}
async function openProfile(page: Page) {
  await page.getByRole('button', { name: /^Menú de usuario/ }).click();
  await page.getByRole('menuitem', { name: 'Mi Perfil', exact: true }).click();
  return page.getByRole('dialog', { name: 'Mi perfil', exact: true });
}

test('fechas civiles, instantes y períodos tienen formatos definidos', () => {
  expect(formatDate('2026-11-10T00:00:00.000Z')).toBe('10/11/2026');
  expect(formatDateTime('2026-11-10T23:55:24.000Z')).toBe('10/11/2026 20:55');
  expect(formatDateTime('2026-11-10T11:55:24.000Z')).toBe('10/11/2026 08:55');
  expect(formatDateTime('2026-11-11T02:59:59.000Z')).toBe('10/11/2026 23:59');
  expect(formatDateTime('2026-11-11T03:00:00.000Z')).toBe('11/11/2026 00:00');
  expect(formatMonthYear('2026-11-01')).toBe('noviembre de 2026');
  for (const invalid of [null, '', 'no-fecha', '2026-02-30', '2026-13-01', '2026-01-00']) {
    expect(formatDate(invalid)).toBe('-'); expect(toDateInputValue(invalid)).toBe('');
  }
  expect(formatDate('2024-02-29')).toBe('29/02/2024');
});

for (const [width, height] of [[1280, 720], [1366, 768], [390, 844]]) {
  test(`Mi perfil: diálogo, teclado, validación y foco ${width}`, async ({ page }, info) => {
    await page.setViewportSize({ width, height });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const state = await setup(page);
    await page.goto('/liquidaciones?view=HISTORIAL');
    const dialog = await openProfile(page);
    await expect(dialog).toBeVisible();
    await expect(page.getByLabel('Contraseña actual', { exact: true })).toBeFocused();
    await expect(dialog.getByRole('button', { name: 'Actualizar contraseña', exact: true })).toBeInViewport({ ratio: 1 });
    await audit(page);
    await page.screenshot({ path: info.outputPath('profile.png') });
    for (let i = 0; i < 12; i++) {
      await page.keyboard.press('Tab');
      expect(await dialog.evaluate(el => el.contains(document.activeElement))).toBe(true);
    }
    await page.getByLabel('Contraseña actual', { exact: true }).fill('ActualValida!123');
    await page.getByLabel('Nueva contraseña', { exact: true }).fill('NuevaValida!123');
    await page.getByLabel('Confirmar nueva contraseña', { exact: true }).fill('DistintaValida!123');
    await dialog.getByRole('button', { name: 'Actualizar contraseña', exact: true }).click();
    await expect(page.getByLabel('Confirmar nueva contraseña', { exact: true })).toBeFocused();
    await expect(page.getByLabel('Confirmar nueva contraseña', { exact: true })).toHaveAttribute('aria-invalid', 'true');
    await expect(dialog.getByRole('alert')).toContainText('no coincide');
    expect(state.writes).toEqual([]);
    await page.getByLabel('Confirmar nueva contraseña', { exact: true }).fill('NuevaValida!123');
    await dialog.getByRole('button', { name: 'Actualizar contraseña', exact: true }).click();
    await expect(dialog.getByRole('alert')).toContainText('La contraseña actual no es correcta.');
    await expect(dialog.getByRole('alert')).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();
    await expect(page.getByRole('button', { name: /^Menú de usuario/ })).toBeFocused();
    await openProfile(page);
    await expect(page.getByLabel('Contraseña actual', { exact: true })).toHaveValue('');
    await expect(dialog.getByRole('alert')).toHaveCount(0);
  });
}

test('historial distingue vacío, búsqueda sin coincidencias y error recuperable conservando período', async ({ page }) => {
  const state = await setup(page); state.historyEmpty = true;
  await page.goto('/liquidaciones?view=HISTORIAL&periodo=2026-10-01');
  await expect(page.getByRole('status').filter({ hasText: 'Sin liquidaciones en este período' })).toBeVisible();
  await page.getByRole('searchbox').fill('inexistente');
  await expect(page.getByText('No hay resultados con estos filtros')).toBeVisible();
  await page.getByRole('button', { name: 'Limpiar filtros', exact: true }).click();
  await expect(page).toHaveURL(/periodo=2026-10-01/);
  await expect(page.getByText('Sin liquidaciones en este período')).toBeVisible();
  state.historyError = true; await page.reload();
  await expect(page.getByRole('alert')).toContainText('No se pudo cargar el historial');
  await expect(page.getByText('Sin liquidaciones en este período')).toHaveCount(0);
  state.historyError = false; state.historyEmpty = false;
  await page.getByRole('button', { name: 'Reintentar', exact: true }).click();
  await expect(page.getByTestId('liquidation-history-row').first()).toBeVisible();
  await expect(page).toHaveURL(/periodo=2026-10-01/);
  await audit(page);
});

test('buscador accesible diferencia error de cero resultados y devuelve foco al elegir/quitar', async ({ page }) => {
  const state = await setup(page); state.searchError = true;
  await page.goto('/liquidaciones?view=HISTORIAL');
  await page.getByRole('button', { name: /^Filtros/ }).click();
  await page.locator('summary', { hasText: 'Más filtros' }).click();
  const input = page.getByRole('combobox', { name: 'Propiedad', exact: true });
  await input.fill('Propiedad');
  await expect(page.getByRole('alert')).toContainText('No se pudo completar la búsqueda');
  await expect(page.getByText('No se encontraron resultados. Continuar con carga manual.')).toHaveCount(0);
  state.searchError = false;
  await page.getByRole('button', { name: 'Reintentar búsqueda' }).click();
  await expect(page.getByRole('option', { name: 'Propiedad de prueba' })).toBeVisible();
  await input.focus(); await input.press('Enter');
  await expect(page.getByRole('button', { name: 'Quitar Propiedad', exact: true })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(input).toBeFocused();
});

for (const width of [1366, 1920]) {
  test(`auditoría muestra fecha, antes/después y mensajes consistentes ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const state = await setup(page);
    await page.goto('/configuracion');
    await page.getByRole('button', { name: 'Auditoría', exact: true }).click();
    await expect(page.getByText('10/11/2026 20:55').filter({ visible: true })).toBeVisible();
    await expect(page.getByText('Antes: Alquiler', { exact: true }).filter({ visible: true })).toBeVisible();
    await expect(page.getByText('Después: Alquiler noviembre', { exact: true }).filter({ visible: true })).toBeVisible();
    await expect(page.getByText('Antes: 10/11/2026', { exact: true }).filter({ visible: true })).toBeVisible();
    await expect(page.getByText('Después: 11/11/2026', { exact: true }).filter({ visible: true })).toBeVisible();
    await audit(page);
    state.auditEmpty = true;
    await page.getByLabel('Usuario', { exact: true }).fill('Nadie');
    await page.getByRole('button', { name: 'Filtrar', exact: true }).click();
    await expect(page.getByText('No hay resultados con estos filtros').filter({ visible: true })).toBeVisible();
    await page.getByRole('button', { name: 'Limpiar filtros', exact: true }).filter({ visible: true }).click();
    await expect(page.getByText('Sin eventos de auditoría').filter({ visible: true })).toBeVisible();
    state.auditError = true;
    await page.getByRole('button', { name: 'Filtrar', exact: true }).click();
    await expect(page.getByRole('alert').filter({ visible: true })).toContainText('No se pudo cargar la auditoría');
    state.auditError = false; state.auditEmpty = false;
    await page.getByRole('button', { name: 'Reintentar', exact: true }).filter({ visible: true }).click();
    await expect(page.getByText('10/11/2026 20:55').filter({ visible: true })).toBeVisible();
  });
}

test('un teléfono ausente tiene un mensaje distinto del inválido', async ({ page }) => {
  await setup(page);
  await page.goto('/contratos');
  await expect(page.getByText('Teléfono no informado').filter({ visible: true }).first()).toBeVisible();
  await expect(page.getByText('Número de teléfono inválido')).toHaveCount(0);
});

for (const failure of ['network', 'server']) {
  test(`errores de ${failure} tienen mensaje operativo y no reenvían el formulario`, async ({ page }) => {
    const state = await setup(page);
    await page.route('**/api/auth/change-password', async route => {
      state.writes.push('/api/auth/change-password');
      if (failure === 'network') await route.abort('failed');
      else await route.fulfill({ status: 500, contentType: 'text/html', body: 'Internal Server Error' });
    });
    await page.goto('/liquidaciones?view=HISTORIAL');
    const dialog = await openProfile(page);
    await page.getByLabel('Contraseña actual', { exact: true }).fill('ActualValida!123');
    await page.getByLabel('Nueva contraseña', { exact: true }).fill('NuevaValida!123');
    await page.getByLabel('Confirmar nueva contraseña', { exact: true }).fill('NuevaValida!123');
    await dialog.getByRole('button', { name: 'Actualizar contraseña', exact: true }).click();
    await expect(dialog.getByRole('alert')).toContainText(failure === 'network' ? 'No se pudo conectar con el servidor' : 'No se pudo completar la operación');
    await expect(dialog.getByRole('alert')).toContainText('antes de repetirla');
    await expect(page.getByLabel('Nueva contraseña', { exact: true })).toHaveValue('NuevaValida!123');
    expect(state.writes).toEqual(['/api/auth/change-password']);
  });
}

test('un cambio de contraseña exitoso se anuncia y conserva el cierre de sesión existente', async ({ page }) => {
  const state = await setup(page); state.passwordStatus = 200;
  await page.goto('/liquidaciones?view=HISTORIAL');
  const dialog = await openProfile(page);
  await page.getByLabel('Contraseña actual', { exact: true }).fill('ActualValida!123');
  await page.getByLabel('Nueva contraseña', { exact: true }).fill('NuevaValida!123');
  await page.getByLabel('Confirmar nueva contraseña', { exact: true }).fill('NuevaValida!123');
  await dialog.getByRole('button', { name: 'Actualizar contraseña', exact: true }).click();
  await expect(dialog.getByRole('status')).toContainText('Contraseña actualizada. Volvé a iniciar sesión.');
  await expect(dialog.getByRole('button', { name: 'Actualizar contraseña', exact: true })).toBeDisabled();
  await expect(page).toHaveURL(/\/login$/);
  expect(state.writes.filter(path => path === '/api/auth/change-password')).toHaveLength(1);
});
