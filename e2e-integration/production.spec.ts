import { expect, request as playwrightRequest, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const superAdmin = {
  email: 'superadmin.integration@example.com',
  password: 'ProdTest!2026_Strong',
  nombreCompleto: 'Administrador Integration'
};

test('stack real: readiness, CSP, sesión, CSRF y dos inmobiliarias', async ({ page, request }) => {
  const backend = await playwrightRequest.newContext({ baseURL: 'http://127.0.0.1:3100' });
  const readiness = await backend.get('/health/ready');
  expect(readiness.status()).toBe(200);
  expect(await readiness.json()).toMatchObject({ status: 'ready', database: 'ok' });
  await backend.dispose();

  const documentResponse = await page.goto('/login');
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  const csp = documentResponse?.headers()['content-security-policy'] || '';
  expect(csp).toContain('https://accounts.google.com/gsi/client');
  expect(csp).toContain('frame-src https://accounts.google.com/gsi/');
  expect(csp).toContain('connect-src');

  const setup = await request.post('/api/auth/setup-superadmin', {
    headers: { 'x-setup-token': 'integration-setup-token' },
    data: superAdmin
  });
  expect(setup.status()).toBe(201);

  const login = await request.post('/api/auth/login', {
    data: { email: superAdmin.email, password: superAdmin.password }
  });
  expect(login.status()).toBe(200);
  const loginPayload = await login.json();
  expect(loginPayload.csrfToken).toBeTruthy();
  expect(login.headers()['set-cookie']).toContain('HttpOnly');

  const withoutCsrf = await request.post('/api/superadmin/inmobiliarias', {
    data: {
      nombre: 'Inmobiliaria rechazada',
      emailAdmin: 'rejected.integration@example.com',
      passwordAdmin: 'AgencyTest!2026_Strong',
      nombreCompletoAdmin: 'Admin Rechazado'
    }
  });
  expect(withoutCsrf.status()).toBe(403);

  for (const suffix of ['uno', 'dos']) {
    const creation = await request.post('/api/superadmin/inmobiliarias', {
      headers: { 'x-csrf-token': loginPayload.csrfToken },
      data: {
        nombre: `Inmobiliaria ${suffix}`,
        emailAdmin: `admin.${suffix}.integration@example.com`,
        passwordAdmin: 'AgencyTest!2026_Strong',
        nombreCompletoAdmin: `Administrador ${suffix}`
      }
    });
    expect(creation.status()).toBe(201);
  }

  const agencies = await request.get('/api/superadmin/inmobiliarias');
  expect(agencies.status()).toBe(200);
  expect(await agencies.json()).toHaveLength(2);

  await page.getByPlaceholder('ejemplo@correo.com').fill(superAdmin.email);
  await page.getByPlaceholder('••••••••').fill(superAdmin.password);
  await page.getByRole('button', { name: /Ingresar a mi cuenta/i }).click();
  await expect(page).toHaveURL(/\/home$/);
  for (const route of ['/home', '/superadmin', '/configuracion']) {
    await page.goto(route);
    await expect(page.locator('main')).toBeVisible();
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    expect(results.violations, `${route}: ${results.violations.map(item => item.id).join(', ')}`).toEqual([]);
  }
});
