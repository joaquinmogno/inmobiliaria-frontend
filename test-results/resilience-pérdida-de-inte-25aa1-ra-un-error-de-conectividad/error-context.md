# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: resilience.spec.ts >> pérdida de internet durante login muestra un error de conectividad
- Location: e2e-chaos/resilience.spec.ts:43:1

# Error details

```
Error: expect(locator).toContainText(expected) failed

Locator: getByRole('alert')
Expected pattern: /internet|conexión|conectividad|\bred\b/i
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toContainText" with timeout 5000ms
  - waiting for getByRole('alert')

```

```yaml
- img "PropControl Logo"
- paragraph: Sistema integral de gestión de propiedades, contratos y liquidaciones para administradores inmobiliarios.
- text: Gestión de contratos automatizada Liquidaciones de inquilinos y propietarios Control de pagos e historial financiero Registro de auditoría y reportes
- paragraph: © 2026 PropControl. Todos los derechos reservados.
- heading "Bienvenido" [level=1]
- paragraph: Ingresa tus credenciales para continuar
- img
- text: Credenciales inválidas. Por favor, intenta de nuevo. Correo Electrónico
- textbox "ejemplo@correo.com": chaos@example.com
- text: Contraseña
- textbox "••••••••": Password!2026
- button "Mostrar contraseña"
- checkbox "Recordarme en este equipo"
- img
- text: Recordarme en este equipo
- button "Ingresar a mi cuenta":
  - text: Ingresar a mi cuenta
  - img
- text: o
- button "Continuar con Google. Se abre en una pestaña nueva":
  - img
  - text: Continuar con Google
- iframe
```

# Test source

```ts
  1  | import { expect, test, type Page } from '@playwright/test';
  2  | 
  3  | const user = {
  4  |   id: 1, email: 'chaos@example.com', fullName: 'QA Chaos', nombreCompleto: 'QA Chaos',
  5  |   role: 'OWNER', rol: 'OWNER', permissions: ['reportes.dashboard.ver'], inheritedPermissions: [],
  6  |   directPermissions: ['reportes.dashboard.ver'], deniedPermissions: [], inmobiliaria: { id: 1, nombre: 'Chaos' }
  7  | };
  8  | 
  9  | async function fillLogin(page: Page) {
  10 |   await page.goto('/login');
  11 |   await page.getByPlaceholder('ejemplo@correo.com').fill(user.email);
  12 |   await page.getByPlaceholder('••••••••').fill('Password!2026');
  13 | }
  14 | 
  15 | test('doble clic en login envía una sola solicitud', async ({ page }) => {
  16 |   let requests = 0;
  17 |   await page.route('**/api/auth/login', async route => {
  18 |     requests += 1;
  19 |     await new Promise(resolve => setTimeout(resolve, 300));
  20 |     await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ csrfToken: 'csrf', user }) });
  21 |   });
  22 |   await page.route('**/api/reportes/dashboard', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ propiedades: {}, contratos: {}, finanzas: {} }) }));
  23 |   await fillLogin(page);
  24 |   const button = page.locator('form button[type="submit"]');
  25 |   await button.dblclick();
  26 |   await expect(page).toHaveURL(/\/home$/);
  27 |   expect(requests).toBe(1);
  28 | });
  29 | 
  30 | test('login lento deshabilita el botón y muestra progreso', async ({ page }) => {
  31 |   await page.route('**/api/auth/login', async route => {
  32 |     await new Promise(resolve => setTimeout(resolve, 1_000));
  33 |     await route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ message: 'Credenciales inválidas' }) });
  34 |   });
  35 |   await fillLogin(page);
  36 |   const button = page.locator('form button[type="submit"]');
  37 |   const click = button.click();
  38 |   await expect(button).toBeDisabled();
  39 |   await expect(page.getByText(/Iniciando sesión/i)).toBeVisible();
  40 |   await click;
  41 | });
  42 | 
  43 | test('pérdida de internet durante login muestra un error de conectividad', async ({ page }) => {
  44 |   await page.route('**/api/auth/login', route => route.abort('internetdisconnected'));
  45 |   await fillLogin(page);
  46 |   await page.getByRole('button', { name: /Ingresar a mi cuenta/i }).click();
> 47 |   await expect(page.getByRole('alert')).toContainText(/internet|conexión|conectividad|\bred\b/i);
     |                                         ^ Error: expect(locator).toContainText(expected) failed
  48 | });
  49 | 
  50 | test('error 500 de login no se presenta como credenciales inválidas', async ({ page }) => {
  51 |   await page.route('**/api/auth/login', route => route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ message: 'Error interno' }) }));
  52 |   await fillLogin(page);
  53 |   await page.getByRole('button', { name: /Ingresar a mi cuenta/i }).click();
  54 |   await expect(page.getByText(/servidor|intentar más tarde|interno/i)).toBeVisible();
  55 | });
  56 | 
  57 | test('refresh durante login no genera una segunda mutación', async ({ page }) => {
  58 |   let requests = 0;
  59 |   await page.route('**/api/auth/login', async route => {
  60 |     requests += 1;
  61 |     await new Promise(resolve => setTimeout(resolve, 2_000));
  62 |     await route.fulfill({ status: 401, contentType: 'application/json', body: '{}' });
  63 |   });
  64 |   await fillLogin(page);
  65 |   await page.getByRole('button', { name: /Ingresar a mi cuenta/i }).click();
  66 |   await page.reload();
  67 |   await page.waitForTimeout(300);
  68 |   expect(requests).toBe(1);
  69 | });
  70 | 
  71 | test('sesión expirada al recuperar foco redirige a login', async ({ page, context }) => {
  72 |   let authenticated = true;
  73 |   await page.route('**/api/auth/login', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ csrfToken: 'csrf', user }) }));
  74 |   await page.route('**/api/auth/me', route => authenticated
  75 |     ? route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(user) })
  76 |     : route.fulfill({ status: 401, contentType: 'application/json', body: '{}' }));
  77 |   await page.route('**/api/reportes/dashboard', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ propiedades: {}, contratos: {}, finanzas: {} }) }));
  78 |   await fillLogin(page);
  79 |   await page.getByRole('button', { name: /Ingresar a mi cuenta/i }).click();
  80 |   await expect(page).toHaveURL(/\/home$/);
  81 |   authenticated = false;
  82 |   const second = await context.newPage();
  83 |   await second.bringToFront();
  84 |   await page.bringToFront();
  85 |   await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  86 |   await expect(page).toHaveURL(/\/login$/);
  87 | });
  88 | 
```