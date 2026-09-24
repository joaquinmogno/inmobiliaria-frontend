# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: dialogs.spec.ts >> el Administrador restablece una contraseña temporal sin exponer enlaces
- Location: e2e/dialogs.spec.ts:10:1

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for getByLabel('Cambiar contraseña de Usuario')
    - locator resolved to <button aria-label="Cambiar contraseña de Usuario" class="rounded-lg p-2 text-status-warning hover:bg-amber-50">…</button>
  - attempting click action
    2 × waiting for element to be visible, enabled and stable
      - element is not visible
    - retrying click action
    - waiting 20ms
    2 × waiting for element to be visible, enabled and stable
      - element is not visible
    - retrying click action
      - waiting 100ms
    55 × waiting for element to be visible, enabled and stable
       - element is not visible
     - retrying click action
       - waiting 500ms

```

# Page snapshot

```yaml
- generic [ref=e3]:
  - link "Saltar al contenido principal" [ref=e4] [cursor=pointer]:
    - /url: "#main-content"
  - banner [ref=e5]:
    - 'link "Ir al inicio: Test" [ref=e7] [cursor=pointer]':
      - /url: /home
      - generic [ref=e8]: "Ir al inicio:"
      - img [ref=e10]
      - heading "Test" [level=1] [ref=e12]
    - generic [ref=e13]:
      - button "0 alertas operativas activas" [ref=e15]:
        - img [ref=e16]
      - button "Menú de usuario Administrador" [ref=e19]:
        - generic [ref=e20]: Menú de usuario
        - paragraph [ref=e22]: Administrador
        - generic [ref=e23]: A
        - img [ref=e24]
  - generic [ref=e26]:
    - complementary [ref=e27]:
      - img "PropControl" [ref=e30]
      - separator [ref=e31]
      - navigation "Navegación principal" [ref=e32]:
        - link "Inicio" [ref=e33] [cursor=pointer]:
          - /url: /home
          - img [ref=e34]
          - generic [ref=e36]: Inicio
        - link "Propiedades" [ref=e37] [cursor=pointer]:
          - /url: /propiedades
          - img [ref=e38]
          - generic [ref=e40]: Propiedades
        - link "Personas" [ref=e41] [cursor=pointer]:
          - /url: /personas
          - img [ref=e42]
          - generic [ref=e44]: Personas
        - generic [ref=e46]:
          - link "Contratos" [ref=e47] [cursor=pointer]:
            - /url: /contratos
            - img [ref=e48]
            - generic [ref=e50]: Contratos
          - button "Mostrar opciones de contratos" [ref=e51]:
            - img [ref=e52]
        - link "Liquidaciones" [ref=e54] [cursor=pointer]:
          - /url: /liquidaciones
          - img [ref=e55]
          - generic [ref=e57]: Liquidaciones
        - link "Gestión financiera" [ref=e58] [cursor=pointer]:
          - /url: /cajachica
          - img [ref=e59]
          - generic [ref=e61]: Gestión financiera
        - link "Historial de pagos" [ref=e62] [cursor=pointer]:
          - /url: /pagos
          - img [ref=e63]
          - generic [ref=e65]: Historial de pagos
        - link "Sueldos" [ref=e66] [cursor=pointer]:
          - /url: /sueldos
          - img [ref=e67]
          - generic [ref=e69]: Sueldos
        - separator [ref=e70]
        - link "Configuración" [ref=e71] [cursor=pointer]:
          - /url: /configuracion
          - img [ref=e72]
          - generic [ref=e75]: Configuración
      - button "Contraer menú" [ref=e76]:
        - img [ref=e77]
        - generic [ref=e79]: Contraer menú
      - generic [ref=e81]:
        - generic [ref=e82]: PropControl
        - generic [ref=e83]: © 2026 Todos los derechos reservados
    - main "Contenido principal" [active] [ref=e84]:
      - generic [ref=e85]:
        - generic [ref=e86]:
          - generic [ref=e87]:
            - heading "Usuarios y roles" [level=1] [ref=e88]
            - paragraph [ref=e89]: Administrá quién ingresa y qué puede hacer cada rol.
          - button "Nuevo usuario" [ref=e90]:
            - img [ref=e91]
            - text: Nuevo usuario
        - tablist [ref=e93]:
          - tab "usuarios" [selected] [ref=e94]
          - tab "roles" [ref=e95]
        - generic [ref=e96]:
          - generic [ref=e97]: Buscar usuarios
          - searchbox "Buscar usuarios" [ref=e98]
          - button "Buscar" [ref=e99]
        - generic [ref=e100]:
          - article "Administrador" [ref=e101]:
            - generic [ref=e102]:
              - generic [ref=e103]:
                - img [ref=e105]
                - generic [ref=e107]:
                  - heading "Administrador" [level=2] [ref=e108]
                  - paragraph [ref=e109]: admin@test.local
              - generic [ref=e110]: Deshabilitado
            - generic [ref=e111]:
              - generic [ref=e112]:
                - term [ref=e113]: Acceso
                - definition [ref=e114]: Administrador
              - generic [ref=e115]:
                - term [ref=e116]: Último acceso
                - definition [ref=e117]: Nunca
            - button "Acciones" [ref=e119]:
              - img [ref=e120]
              - text: Acciones
          - article "Usuario" [ref=e122]:
            - generic [ref=e123]:
              - generic [ref=e124]:
                - img [ref=e126]
                - generic [ref=e128]:
                  - heading "Usuario" [level=2] [ref=e129]
                  - paragraph [ref=e130]: usuario@test.local
              - generic [ref=e131]: Activo
            - generic [ref=e132]:
              - generic [ref=e133]:
                - term [ref=e134]: Acceso
                - definition [ref=e135]: Comercial
              - generic [ref=e136]:
                - term [ref=e137]: Último acceso
                - definition [ref=e138]: Nunca
            - button "Acciones" [ref=e140]:
              - img [ref=e141]
              - text: Acciones
```

# Test source

```ts
  1   | import { expect, test } from '@playwright/test';
  2   | 
  3   | test('login ofrece únicamente email y contraseña', async ({ page }) => {
  4   |   await page.goto('/login');
  5   |   await expect(page.getByLabel('Correo electrónico')).toBeVisible();
  6   |   await expect(page.locator('#login-password')).toBeVisible();
  7   |   await expect(page.getByText(/Google/i)).toHaveCount(0);
  8   | });
  9   | 
  10  | test('el Administrador restablece una contraseña temporal sin exponer enlaces', async ({ page }) => {
  11  |   const admin = { id: 1, email: 'admin@test.local', fullName: 'Administrador', nombreCompleto: 'Administrador', tipo: 'ADMIN', role: 'ADMIN', rol: null, permissions: [], inmobiliaria: { id: 1, nombre: 'Test' } };
  12  |   const target = { id: 2, email: 'usuario@test.local', fullName: 'Usuario', nombreCompleto: 'Usuario', tipo: 'USUARIO', role: 'USUARIO', rol: { id: 4, nombre: 'Comercial', activo: true }, activo: true, permissions: [], inmobiliaria: { id: 1, nombre: 'Test' } };
  13  |   await page.route('**/api/auth/login', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ csrfToken: 'csrf', user: admin }) }));
  14  |   await page.route('**/api/auth/me', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(admin) }));
  15  |   await page.route('**/api/usuarios?**', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [admin, target], meta: { total: 2, page: 1, limit: 25, totalPages: 1 } }) }));
  16  |   await page.route('**/api/roles', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([{ id: 4, nombre: 'Comercial', activo: true, cantidadUsuarios: 1, permisos: [], fechaCreacion: '', fechaActualizacion: '' }]) }));
  17  |   await page.route('**/api/roles/catalogo-permisos', route => route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
  18  |   let sentPassword = '';
  19  |   await page.route('**/api/auth/reset-password/2', async route => { sentPassword = route.request().postDataJSON().newPassword; await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ message: 'ok' }) }); });
  20  |   await page.goto('/login');
  21  |   await page.getByLabel('Correo electrónico').fill(admin.email);
  22  |   await page.locator('#login-password').fill('Password!2026');
  23  |   await page.getByRole('button', { name: /Ingresar a mi cuenta/i }).click();
  24  |   await page.goto('/usuarios');
> 25  |   await page.getByLabel('Cambiar contraseña de Usuario').click();
      |                                                          ^ Error: locator.click: Test timeout of 30000ms exceeded.
  26  |   await page.getByLabel('Nueva contraseña temporal').fill('NuevaTemporal!2026');
  27  |   await page.getByRole('button', { name: 'Restablecer' }).click();
  28  |   expect(sentPassword).toBe('NuevaTemporal!2026');
  29  |   await expect(page.getByText(/Contraseña temporal actualizada/i)).toBeVisible();
  30  | });
  31  | 
  32  | test('un usuario con contraseña temporal queda bloqueado hasta crear una personal', async ({ page }) => {
  33  |   const temporaryPassword = 'Temporal!2026_Segura';
  34  |   const personalPassword = 'Personal!2026_Segura';
  35  |   const user = {
  36  |     id: 8,
  37  |     email: 'usuario.temporal@test.local',
  38  |     fullName: 'Usuario Temporal',
  39  |     nombreCompleto: 'Usuario Temporal',
  40  |     tipo: 'USUARIO',
  41  |     role: 'USUARIO',
  42  |     rol: { id: 4, nombre: 'Comercial', activo: true },
  43  |     permissions: ['contratos.ver'],
  44  |     mustChangePassword: true,
  45  |     inmobiliaria: { id: 1, nombre: 'Test' }
  46  |   };
  47  |   let submittedBody: { currentPassword?: string; newPassword?: string } | null = null;
  48  | 
  49  |   await page.route('**/api/auth/login', route => route.fulfill({
  50  |     status: 200,
  51  |     contentType: 'application/json',
  52  |     body: JSON.stringify({ csrfToken: 'csrf', user })
  53  |   }));
  54  |   await page.route('**/api/auth/me', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(user) }));
  55  |   await page.route('**/api/auth/change-password', async route => {
  56  |     submittedBody = route.request().postDataJSON();
  57  |     await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ message: 'ok' }) });
  58  |   });
  59  |   await page.route('**/api/auth/logout', route => route.fulfill({ status: 200, contentType: 'application/json', body: '{}' }));
  60  | 
  61  |   await page.goto('/login');
  62  |   await page.getByLabel('Correo electrónico').fill(user.email);
  63  |   await page.locator('#login-password').fill(temporaryPassword);
  64  |   await page.getByRole('button', { name: /Ingresar a mi cuenta/i }).click();
  65  | 
  66  |   await expect(page).toHaveURL(/\/cambiar-contrasena$/);
  67  |   await expect(page.getByRole('heading', { name: 'Creá tu contraseña personal' })).toBeVisible();
  68  |   await expect(page.getByText(/No podrás abrir contratos, pagos ni otros módulos/i)).toBeVisible();
  69  | 
  70  |   await page.goto('/contratos');
  71  |   await expect(page).toHaveURL(/\/cambiar-contrasena$/);
  72  |   await expect(page.getByText('Gestión de Contratos')).toHaveCount(0);
  73  | 
  74  |   await page.getByLabel('Contraseña temporal').fill(temporaryPassword);
  75  |   await page.getByLabel('Nueva contraseña', { exact: true }).fill(temporaryPassword);
  76  |   await page.getByLabel('Repetir nueva contraseña').fill(temporaryPassword);
  77  |   await page.getByRole('button', { name: 'Guardar y continuar' }).click();
  78  |   await expect(page.getByRole('alert')).toContainText('debe ser diferente');
  79  |   expect(submittedBody).toBeNull();
  80  | 
  81  |   await page.getByLabel('Nueva contraseña', { exact: true }).fill(personalPassword);
  82  |   await page.getByLabel('Repetir nueva contraseña').fill(personalPassword);
  83  |   await page.getByRole('button', { name: 'Guardar y continuar' }).click();
  84  | 
  85  |   expect(submittedBody).toEqual({ currentPassword: temporaryPassword, newPassword: personalPassword });
  86  |   await expect(page).toHaveURL(/\/login$/);
  87  |   await expect(page.getByText(/Contraseña actualizada.*Ingresá nuevamente/i)).toBeVisible();
  88  | });
  89  | 
  90  | test('una respuesta PASSWORD_CHANGE_REQUIRED redirige globalmente y no aparenta falta de datos', async ({ page }) => {
  91  |   const user = {
  92  |     id: 9,
  93  |     email: 'usuario.desactualizado@test.local',
  94  |     fullName: 'Usuario Desactualizado',
  95  |     tipo: 'USUARIO',
  96  |     role: 'USUARIO',
  97  |     rol: { id: 4, nombre: 'Comercial', activo: true },
  98  |     permissions: ['contratos.ver'],
  99  |     mustChangePassword: false,
  100 |     inmobiliaria: { id: 1, nombre: 'Test' }
  101 |   };
  102 | 
  103 |   await page.route('**/api/auth/login', route => route.fulfill({
  104 |     status: 200,
  105 |     contentType: 'application/json',
  106 |     body: JSON.stringify({ csrfToken: 'csrf', user })
  107 |   }));
  108 |   await page.route('**/api/contratos/alertas', route => route.fulfill({
  109 |     status: 403,
  110 |     contentType: 'application/json',
  111 |     body: JSON.stringify({ message: 'Debe cambiar la contraseña para continuar', code: 'PASSWORD_CHANGE_REQUIRED' })
  112 |   }));
  113 | 
  114 |   await page.goto('/login');
  115 |   await page.getByLabel('Correo electrónico').fill(user.email);
  116 |   await page.locator('#login-password').fill('Temporal!2026_Segura');
  117 |   await page.getByRole('button', { name: /Ingresar a mi cuenta/i }).click();
  118 | 
  119 |   await expect(page).toHaveURL(/\/cambiar-contrasena$/);
  120 |   await expect(page.getByRole('heading', { name: 'Creá tu contraseña personal' })).toBeVisible();
  121 |   await expect(page.getByText(/reemplazar tu contraseña temporal/i)).toBeVisible();
  122 | });
  123 | 
  124 | test('el catálogo de roles muestra solo capacidades reales y resuelve sus dependencias', async ({ page }) => {
  125 |   const admin = {
```