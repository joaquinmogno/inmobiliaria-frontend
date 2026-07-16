import { expect, test, type Page } from '@playwright/test';

const user = {
  id: 1, email: 'chaos@example.com', fullName: 'QA Chaos', nombreCompleto: 'QA Chaos',
  role: 'OWNER', rol: 'OWNER', permissions: ['reportes.dashboard.ver'], inheritedPermissions: [],
  directPermissions: ['reportes.dashboard.ver'], deniedPermissions: [], inmobiliaria: { id: 1, nombre: 'Chaos' }
};

async function fillLogin(page: Page) {
  await page.goto('/login');
  await page.getByPlaceholder('ejemplo@correo.com').fill(user.email);
  await page.getByPlaceholder('••••••••').fill('Password!2026');
}

test('doble clic en login envía una sola solicitud', async ({ page }) => {
  let requests = 0;
  await page.route('**/api/auth/login', async route => {
    requests += 1;
    await new Promise(resolve => setTimeout(resolve, 300));
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ csrfToken: 'csrf', user }) });
  });
  await page.route('**/api/reportes/dashboard', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ propiedades: {}, contratos: {}, finanzas: {} }) }));
  await fillLogin(page);
  const button = page.locator('form button[type="submit"]');
  await button.dblclick();
  await expect(page).toHaveURL(/\/home$/);
  expect(requests).toBe(1);
});

test('login lento deshabilita el botón y muestra progreso', async ({ page }) => {
  await page.route('**/api/auth/login', async route => {
    await new Promise(resolve => setTimeout(resolve, 1_000));
    await route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ message: 'Credenciales inválidas' }) });
  });
  await fillLogin(page);
  const button = page.locator('form button[type="submit"]');
  const click = button.click();
  await expect(button).toBeDisabled();
  await expect(page.getByText(/Iniciando sesión/i)).toBeVisible();
  await click;
});

test('pérdida de internet durante login muestra un error de conectividad', async ({ page }) => {
  await page.route('**/api/auth/login', route => route.abort('internetdisconnected'));
  await fillLogin(page);
  await page.getByRole('button', { name: /Ingresar a mi cuenta/i }).click();
  await expect(page.getByRole('alert')).toContainText(/internet|conexión|conectividad|\bred\b/i);
});

test('error 500 de login no se presenta como credenciales inválidas', async ({ page }) => {
  await page.route('**/api/auth/login', route => route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ message: 'Error interno' }) }));
  await fillLogin(page);
  await page.getByRole('button', { name: /Ingresar a mi cuenta/i }).click();
  await expect(page.getByText(/servidor|intentar más tarde|interno/i)).toBeVisible();
});

test('refresh durante login no genera una segunda mutación', async ({ page }) => {
  let requests = 0;
  await page.route('**/api/auth/login', async route => {
    requests += 1;
    await new Promise(resolve => setTimeout(resolve, 2_000));
    await route.fulfill({ status: 401, contentType: 'application/json', body: '{}' });
  });
  await fillLogin(page);
  await page.getByRole('button', { name: /Ingresar a mi cuenta/i }).click();
  await page.reload();
  await page.waitForTimeout(300);
  expect(requests).toBe(1);
});

test('sesión expirada al recuperar foco redirige a login', async ({ page, context }) => {
  let authenticated = true;
  await page.route('**/api/auth/login', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ csrfToken: 'csrf', user }) }));
  await page.route('**/api/auth/me', route => authenticated
    ? route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(user) })
    : route.fulfill({ status: 401, contentType: 'application/json', body: '{}' }));
  await page.route('**/api/reportes/dashboard', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ propiedades: {}, contratos: {}, finanzas: {} }) }));
  await fillLogin(page);
  await page.getByRole('button', { name: /Ingresar a mi cuenta/i }).click();
  await expect(page).toHaveURL(/\/home$/);
  authenticated = false;
  const second = await context.newPage();
  await second.bringToFront();
  await page.bringToFront();
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect(page).toHaveURL(/\/login$/);
});
