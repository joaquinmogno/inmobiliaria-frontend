# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: permissions.spec.ts >> botones internos desaparecen según permisos del usuario
- Location: e2e/permissions.spec.ts:142:1

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator:  getByText('Av. Test 123').first()
Expected: visible
Received: hidden
Timeout:  5000ms

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByText('Av. Test 123').first()
    9 × locator resolved to <div title="Av. Test 123" class="max-w-64 truncate text-sm font-medium text-gray-900">Av. Test 123</div>
      - unexpected value "hidden"

```

```yaml
- link "Saltar al contenido principal":
  - /url: "#main-content"
- banner:
  - 'link "Ir al inicio: Inmobiliaria Test"':
    - /url: /home
    - text: "Ir al inicio:"
    - heading "Inmobiliaria Test" [level=1]
  - button "0 alertas operativas activas"
  - button "Menú de usuario Usuario Test":
    - text: Menú de usuario
    - paragraph: Usuario Test
- complementary:
  - img "PropControl"
  - separator
  - navigation "Navegación principal":
    - link "Inicio":
      - /url: /home
    - link "Propiedades":
      - /url: /propiedades
    - link "Personas":
      - /url: /personas
    - link "Contratos":
      - /url: /contratos
    - separator
  - button "Contraer menú"
  - text: PropControl © 2026 Todos los derechos reservados
- main "Contenido principal":
  - heading "Contratos activos" [level=1]
  - paragraph: Contratos actualmente vigentes
  - 'button "Filtrar contratos por estado: Contratos activos"': Contratos activos
  - region "Filtros del listado":
    - text: Buscar
    - searchbox "Buscar"
    - paragraph: 1 resultado
  - paragraph: Av. Test 123
  - text: ACTIVO
  - paragraph: ADMINISTRADO
  - button "Acciones del contrato"
  - text: Inquilino Inquilino Test 222 Propietario Propietario Test 111 Alquiler $500.000
```

# Test source

```ts
  47  |   return {
  48  |     id: 7,
  49  |     email: "usuario@test.local",
  50  |     fullName: "Usuario Test",
  51  |     nombreCompleto: "Usuario Test",
  52  |     tipo: "USUARIO",
  53  |     role: "USUARIO",
  54  |     rol: { id: 1, nombre: "Comercial", activo: true },
  55  |     permissions: basePermissions,
  56  |     inmobiliaria: { id: 1, nombre: "Inmobiliaria Test" },
  57  |     ...overrides,
  58  |   };
  59  | }
  60  | 
  61  | async function mockApi(page: Page, user: ReturnType<typeof buildUser>) {
  62  |   await page.route("**/api/auth/login", async route => {
  63  |     await route.fulfill({
  64  |       status: 200,
  65  |       contentType: "application/json",
  66  |       body: JSON.stringify({ csrfToken: "e2e-csrf", expiresAt: new Date(Date.now() + 60_000).toISOString(), user }),
  67  |     });
  68  |   });
  69  | 
  70  |   await page.route("**/api/auth/me", async route => {
  71  |     await route.fulfill({
  72  |       status: 200,
  73  |       contentType: "application/json",
  74  |       body: JSON.stringify(user),
  75  |     });
  76  |   });
  77  | 
  78  |   await page.route("**/api/reportes/dashboard", async route => {
  79  |     await route.fulfill({
  80  |       status: 200,
  81  |       contentType: "application/json",
  82  |       body: JSON.stringify({
  83  |         propiedades: { total: 0, disponibles: 0, alquiladas: 0 },
  84  |         contratos: { activos: 1, porVencer: 0 },
  85  |         finanzas: {
  86  |           recaudadoTotal: 0,
  87  |           gananciaBruta: 0,
  88  |           gastosAgencia: 0,
  89  |           utilidadNeta: 0,
  90  |           morosidad: 0,
  91  |           fondoCustodia: 0,
  92  |           honorarios: { cobrados: 0, totalInmo: 0 },
  93  |         },
  94  |       }),
  95  |     });
  96  |   });
  97  | 
  98  |   await page.route("**/api/contratos/alertas", async route => {
  99  |     await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([sampleContract]) });
  100 |   });
  101 | 
  102 |   await page.route("**/api/contratos?**", async route => {
  103 |     await route.fulfill({
  104 |       status: 200,
  105 |       contentType: "application/json",
  106 |       body: JSON.stringify({ data: [sampleContract], meta: { total: 1, page: 1, limit: 10, totalPages: 1 } })
  107 |     });
  108 |   });
  109 | 
  110 |   await page.route("**/api/contratos/101", async route => {
  111 |     await route.fulfill({
  112 |       status: 200,
  113 |       contentType: "application/json",
  114 |       body: JSON.stringify({ ...sampleContract, auditLogs: [] }),
  115 |     });
  116 |   });
  117 | }
  118 | 
  119 | async function login(page: Page) {
  120 |   await page.goto("/login");
  121 |   await page.getByPlaceholder("ejemplo@correo.com").fill("usuario@test.local");
  122 |   await page.getByPlaceholder("••••••••").fill("password-test");
  123 |   await page.getByRole("button", { name: /Ingresar a mi cuenta/i }).click();
  124 |   await expect(page).toHaveURL(/\/home$/);
  125 | }
  126 | 
  127 | test("login sin sueldos.ver no muestra Sueldos en el menú", async ({ page }) => {
  128 |   await mockApi(page, buildUser());
  129 |   await login(page);
  130 | 
  131 |   await expect(page.getByText("Sueldos", { exact: true })).toHaveCount(0);
  132 | });
  133 | 
  134 | test("acceso manual a /sueldos muestra acceso denegado sin sueldos.ver", async ({ page }) => {
  135 |   await mockApi(page, buildUser());
  136 |   await login(page);
  137 | 
  138 |   await page.goto("/sueldos");
  139 |   await expect(page.getByRole("heading", { name: "Acceso denegado" })).toBeVisible();
  140 | });
  141 | 
  142 | test("botones internos desaparecen según permisos del usuario", async ({ page }) => {
  143 |   await mockApi(page, buildUser());
  144 |   await login(page);
  145 | 
  146 |   await page.goto("/contratos");
> 147 |   await expect(page.getByText("Av. Test 123").first()).toBeVisible();
      |                                                        ^ Error: expect(locator).toBeVisible() failed
  148 |   await page.locator("tbody td:last-child button").first().click();
  149 | 
  150 |   await expect(page.getByRole("menuitem", { name: /Ver detalles/i })).toBeVisible();
  151 |   await expect(page.getByRole("menuitem", { name: /Ver contrato/i })).toHaveCount(0);
  152 |   await expect(page.getByRole("menuitem", { name: /Editar/i })).toHaveCount(0);
  153 |   await expect(page.getByRole("menuitem", { name: /Eliminar/i })).toHaveCount(0);
  154 | });
  155 | 
  156 | test("el rol asignado se muestra sin permisos individuales", async ({ page }) => {
  157 |   const user = buildUser({
  158 |     permissions: [...basePermissions, ...salaryPermissions],
  159 |   });
  160 | 
  161 |   await mockApi(page, user);
  162 |   await login(page);
  163 | 
  164 |   await page.goto("/mi-acceso");
  165 |   await expect(page.getByLabel("Contenido principal").getByText("Comercial", { exact: true })).toBeVisible();
  166 |   await expect(page.getByText(/Directo|denegado|heredado/i)).toHaveCount(0);
  167 | });
  168 | 
  169 | test("nuevo contrato usa el selector visual de PropControl para la moneda", async ({ page }) => {
  170 |   await mockApi(page, buildUser({ permissions: [...basePermissions, "contratos.crear"] }));
  171 |   await login(page);
  172 | 
  173 |   await page.goto("/contratos");
  174 |   await page.getByRole("button", { name: "Nuevo contrato" }).click();
  175 | 
  176 |   const currency = page.getByRole("button", { name: "Moneda del contrato" });
  177 |   await expect(currency).toContainText("ARS");
  178 |   await currency.click();
  179 |   await expect(page.getByRole("listbox")).toBeVisible();
  180 |   await page.getByRole("option", { name: /USD.*Dólares estadounidenses/i }).click();
  181 |   await expect(currency).toContainText("USD");
  182 |   await expect(page.locator("select")).toHaveCount(0);
  183 | });
  184 | 
  185 | test("elegir personas existentes reemplaza las fichas vacías de propietario e inquilino", async ({ page }) => {
  186 |   const existingPerson = {
  187 |     id: 55,
  188 |     version: 1,
  189 |     nombreCompleto: "Persona Existente",
  190 |     dni: "30111222",
  191 |     telefono: "+541112345678",
  192 |     email: null,
  193 |     direccion: null,
  194 |     estado: "ACTIVO"
  195 |   };
  196 |   await mockApi(page, buildUser({ permissions: [...basePermissions, "contratos.crear"] }));
  197 |   await page.route("**/api/personas?**", route => route.fulfill({
  198 |     status: 200,
  199 |     contentType: "application/json",
  200 |     body: JSON.stringify({ data: [existingPerson], meta: { total: 1, page: 1, limit: 100, totalPages: 1 } })
  201 |   }));
  202 |   await login(page);
  203 | 
  204 |   await page.goto("/contratos");
  205 |   await page.getByRole("button", { name: "Nuevo contrato" }).click();
  206 |   const dialog = page.getByRole("dialog");
  207 |   await expect(dialog.getByPlaceholder("Nombre Completo *")).toHaveCount(2);
  208 | 
  209 |   await dialog.getByRole("button", { name: "¿Buscar propietario existente?" }).click();
  210 |   await dialog.getByPlaceholder("Nombre o DNI...").fill("Persona");
  211 |   await dialog.getByRole("option", { name: /Persona Existente/ }).click();
  212 | 
  213 |   await expect(dialog.getByPlaceholder("Nombre Completo *")).toHaveCount(2);
  214 |   await expect(dialog.getByPlaceholder("Nombre Completo *").nth(0)).toHaveValue("Persona Existente");
  215 |   await expect(dialog.getByLabel(/Quitar propietario/)).toHaveCount(0);
  216 | 
  217 |   await dialog.getByRole("button", { name: "¿Buscar inquilino existente?" }).click();
  218 |   await dialog.getByPlaceholder("Nombre o DNI...").fill("Persona");
  219 |   await dialog.getByRole("option", { name: /Persona Existente/ }).click();
  220 | 
  221 |   await expect(dialog.getByPlaceholder("Nombre Completo *")).toHaveCount(2);
  222 |   await expect(dialog.getByPlaceholder("Nombre Completo *").nth(1)).toHaveValue("Persona Existente");
  223 |   await expect(dialog.getByText("(existente)")).toHaveCount(2);
  224 |   await expect(dialog.getByLabel(/Quitar inquilino/)).toHaveCount(0);
  225 | });
  226 | 
```