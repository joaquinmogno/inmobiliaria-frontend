import { expect, test, type Page } from '@playwright/test';

const user = { id: 1, email: 'ui@test.local', fullName: 'Administrador', tipo: 'ADMIN', role: 'ADMIN', permissions: [], inmobiliaria: { id: 1, nombre: 'PropControl' } };

async function setup(page: Page) {
  await page.addInitScript(user => {
    localStorage.setItem('user', JSON.stringify(user));
    localStorage.setItem('loginTimestamp', String(Date.now()));
  }, user);
  await page.route('**/api/**', route => {
    const path = new URL(route.request().url()).pathname;
    const data = path.endsWith('/auth/me') ? user : path.endsWith('/personas')
      ? { data: [{ id: 1, nombreCompleto: 'Ana', estado: 'ACTIVO', roles: [] }], meta: { total: 1, page: 1, limit: 25, totalPages: 1 } }
      : [];
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(data) });
  });
}

test('una página lenta conserva la navegación y muestra la carga dentro del contenido', async ({ page }) => {
  await setup(page);
  await page.goto('/mi-acceso');
  await expect(page.getByRole('heading', { name: 'Mi acceso' })).toBeVisible();
  const sidebar = await page.locator('#main-sidebar').elementHandle();
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/src/pages/Personas.tsx*', async route => { await gate; await route.continue(); });
  try {
    await page.locator('#main-sidebar a[href="/personas"]').click();
    await expect(page.getByRole('status').filter({ hasText: 'Cargando página…' })).toBeVisible();
    await expect(page.locator('#main-sidebar')).toBeVisible();
    await expect(page.getByRole('button', { name: /Menú de usuario/ })).toBeVisible();
    expect(await sidebar!.evaluate(element => element.isConnected)).toBe(true);
  } finally { release(); }
  await expect(page.getByRole('button', { name: 'Nueva persona' })).toBeVisible();
});

test('los cambios de filtros conservan el campo y el foco durante la transición de URL', async ({ page }) => {
  await setup(page);
  await page.goto('/personas');
  const search = page.getByRole('searchbox', { name: 'Buscar', exact: true });
  await search.pressSequentially('Ana', { delay: 40 });
  await expect(page).toHaveURL(/q=Ana/);
  await expect(search).toHaveValue('Ana');
  await expect(search).toBeFocused();
  expect(await page.locator('[data-page-content]').evaluate(element => getComputedStyle(element).transform)).toBe('none');
});

for (const reducedMotion of ['no-preference', 'reduce'] as const) {
  test(`el modal permite escribir, cerrar y recuperar el foco con movimiento ${reducedMotion}`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion });
    await setup(page);
    await page.goto('/e2e/fixtures/modal-scroll.html?modal=reauthentication');
    const opener = page.getByRole('button', { name: 'Abrir popup' });
    await opener.click();
    const dialog = page.getByRole('dialog');
    const panel = dialog.locator('[id^="headlessui-dialog-panel-"]');
    await expect(panel).toBeVisible();
    await dialog.getByLabel('Contraseña actual', { exact: true }).fill('PruebaVisual!2026');
    await expect(dialog.getByLabel('Contraseña actual', { exact: true })).toHaveValue('PruebaVisual!2026');
    if (reducedMotion === 'reduce') {
      const duration = await panel.evaluate(element => parseFloat(getComputedStyle(element).transitionDuration));
      expect(duration).toBeLessThan(0.001);
    }
    await page.keyboard.press('Escape');
    await expect(panel).toBeHidden();
    await expect(opener).toBeFocused();
  });
}
