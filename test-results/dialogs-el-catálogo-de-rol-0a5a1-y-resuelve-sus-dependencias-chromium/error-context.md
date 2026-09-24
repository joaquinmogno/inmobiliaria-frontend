# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: dialogs.spec.ts >> el catálogo de roles muestra solo capacidades reales y resuelve sus dependencias
- Location: e2e/dialogs.spec.ts:124:1

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.check: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('label').filter({ hasText: 'Registrar pagos' }).locator('input')

```

# Page snapshot

```yaml
- generic [ref=e1]:
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
      - main "Contenido principal" [ref=e84]:
        - generic [ref=e85]:
          - generic [ref=e86]:
            - generic [ref=e87]:
              - heading "Usuarios y roles" [level=1] [ref=e88]
              - paragraph [ref=e89]: Administrá quién ingresa y qué puede hacer cada rol.
            - button "Nuevo rol" [ref=e90]:
              - img [ref=e91]
              - text: Nuevo rol
          - tablist [ref=e93]:
            - tab "usuarios" [ref=e94]
            - tab "roles" [selected] [ref=e95]
  - generic:
    - generic:
      - button [ref=e96]
      - generic:
        - dialog "Crear rol":
          - generic [ref=e99]:
            - banner [ref=e100]:
              - heading "Crear rol" [level=2] [ref=e101]
              - paragraph [ref=e102]: Definí los datos del rol y abrí solamente los módulos que necesites configurar.
            - generic [ref=e103]:
              - generic [ref=e104]:
                - generic [ref=e105]:
                  - generic [ref=e106]:
                    - text: Nombre
                    - textbox "Nombre" [ref=e107]
                  - generic [ref=e108]:
                    - text: Descripción
                    - textbox "Descripción" [ref=e109]
                - region "Permisos por módulo" [ref=e110]:
                  - generic [ref=e111]:
                    - generic [ref=e112]:
                      - heading "Permisos por módulo" [level=2] [ref=e113]
                      - paragraph [ref=e114]: Las dependencias necesarias se agregan automáticamente.
                    - paragraph [ref=e115]: 0 de 5 seleccionados
                  - generic [ref=e116]:
                    - generic [ref=e117]:
                      - button "Contratos 0/2" [expanded] [ref=e118]:
                        - generic [ref=e119]: Contratos
                        - generic [ref=e120]: 0/2
                        - img [ref=e121]
                      - generic [ref=e123]:
                        - button "Seleccionar módulo" [ref=e125]
                        - group "Permisos de Contratos" [ref=e126]:
                          - generic [ref=e127]: Permisos de Contratos
                          - generic [ref=e128]:
                            - checkbox "Ver contratos" [active] [ref=e129]
                            - generic [ref=e131]: Ver contratos
                          - generic [ref=e132]:
                            - checkbox "Restaurar contratos Incluye los accesos necesarios" [ref=e133]
                            - generic [ref=e134]:
                              - generic [ref=e135]: Restaurar contratos
                              - generic [ref=e136]: Incluye los accesos necesarios
                    - button "Pagos 0/2" [ref=e138]:
                      - generic [ref=e139]: Pagos
                      - generic [ref=e140]: 0/2
                      - img [ref=e141]
                    - button "Liquidaciones 0/1" [ref=e144]:
                      - generic [ref=e145]: Liquidaciones
                      - generic [ref=e146]: 0/1
                      - img [ref=e147]
              - contentinfo [ref=e149]:
                - button "Cancelar" [ref=e150]
                - button "Guardar rol" [ref=e151]
      - button [ref=e152]
```

# Test source

```ts
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
  126 |     id: 1,
  127 |     email: 'admin@test.local',
  128 |     fullName: 'Administrador',
  129 |     nombreCompleto: 'Administrador',
  130 |     tipo: 'ADMIN',
  131 |     role: 'ADMIN',
  132 |     rol: null,
  133 |     permissions: [],
  134 |     inmobiliaria: { id: 1, nombre: 'Test' }
  135 |   };
  136 |   const catalog = [
  137 |     { id: 1, clave: 'contratos.ver', descripcion: 'Ver contratos', etiqueta: 'Ver contratos', grupo: 'Contratos', modulo: 'Contratos', accion: 'ver', requiere: [], ruta: '/contratos', control: 'Listado de contratos' },
  138 |     { id: 2, clave: 'contratos.restaurar', descripcion: 'Restaurar contratos', etiqueta: 'Restaurar contratos', grupo: 'Contratos', modulo: 'Contratos', accion: 'restaurar', requiere: ['contratos.ver'], ruta: '/contratos/papelera', control: 'Botón Restaurar' },
  139 |     { id: 3, clave: 'pagos.ver', descripcion: 'Ver pagos', etiqueta: 'Ver pagos', grupo: 'Pagos', modulo: 'Pagos', accion: 'ver', requiere: [], ruta: '/pagos', control: 'Listado de pagos' },
  140 |     { id: 4, clave: 'liquidaciones.ver', descripcion: 'Ver liquidaciones', etiqueta: 'Ver liquidaciones', grupo: 'Liquidaciones', modulo: 'Liquidaciones', accion: 'ver', requiere: [], ruta: '/liquidaciones', control: 'Listado de liquidaciones' },
  141 |     { id: 5, clave: 'pagos.crear', descripcion: 'Registrar pagos', etiqueta: 'Registrar pagos', grupo: 'Pagos', modulo: 'Pagos', accion: 'crear', requiere: ['pagos.ver', 'liquidaciones.ver'], ruta: '/pagos', control: 'Botón Registrar pago' }
  142 |   ];
  143 | 
  144 |   await page.route('**/api/auth/login', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ csrfToken: 'csrf', user: admin }) }));
  145 |   await page.route('**/api/auth/me', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(admin) }));
  146 |   await page.route('**/api/usuarios?**', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [admin], meta: { total: 1, page: 1, limit: 25, totalPages: 1 } }) }));
  147 |   await page.route('**/api/roles', route => route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
  148 |   await page.route('**/api/roles/catalogo-permisos', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(catalog) }));
  149 | 
  150 |   await page.goto('/login');
  151 |   await page.getByLabel('Correo electrónico').fill(admin.email);
  152 |   await page.locator('#login-password').fill('Password!2026');
  153 |   await page.getByRole('button', { name: /Ingresar a mi cuenta/i }).click();
  154 |   await page.goto('/usuarios');
  155 |   await page.getByRole('tab', { name: 'roles' }).click();
  156 |   await page.getByRole('button', { name: 'Nuevo rol' }).click();
  157 | 
  158 |   const roleDialog = page.getByRole('dialog');
  159 |   await expect(roleDialog.getByText('Editar pagos', { exact: true })).toHaveCount(0);
  160 |   await expect(roleDialog.getByText('Editar movimientos de caja', { exact: true })).toHaveCount(0);
  161 |   await expect(roleDialog.getByText('Configuración', { exact: true })).toHaveCount(0);
  162 | 
  163 |   const viewContracts = page.locator('label', { hasText: 'Ver contratos' }).locator('input');
  164 |   const restoreContracts = page.locator('label', { hasText: 'Restaurar contratos' }).locator('input');
  165 |   await restoreContracts.check();
  166 |   await expect(viewContracts).toBeChecked();
  167 |   await viewContracts.uncheck();
  168 |   await expect(restoreContracts).not.toBeChecked();
  169 | 
> 170 |   await page.locator('label', { hasText: 'Registrar pagos' }).locator('input').check();
      |                                                                                ^ Error: locator.check: Test timeout of 30000ms exceeded.
  171 |   await expect(page.locator('label', { hasText: 'Ver pagos' }).locator('input')).toBeChecked();
  172 |   await expect(page.locator('label', { hasText: 'Ver liquidaciones' }).locator('input')).toBeChecked();
  173 | });
  174 | 
```