import { expect, type Page, test } from "@playwright/test";

const basePermissions = [
  "contratos.ver",
  "personas.ver",
  "propiedades.ver",
  "reportes.dashboard.ver",
  "reportes.contratos.ver",
  "reportes.morosidad.ver",
];

const salaryPermissions = [
  "sueldos.ver",
  "sueldos.crear",
  "sueldos.editar",
  "sueldos.eliminar",
];

const sampleContract = {
  id: 101,
  fechaInicio: "2026-01-01",
  fechaFin: "2027-01-01",
  fechaProximaActualizacion: "2026-08-01",
  estado: "ACTIVO",
  administrado: true,
  requiereActualizacion: true,
  rutaArchivoContrato: "inmobiliaria-1/contrato.pdf",
  observaciones: null,
  montoAlquiler: 500000,
  montoHonorarios: 50000,
  porcentajeHonorarios: null,
  pagaHonorarios: "INQUILINO",
  diaVencimiento: 10,
  porcentajeActualizacion: null,
  tipoAjuste: null,
  propiedad: { id: 1, direccion: "Av. Test 123", piso: null, departamento: null },
  propietarios: [
    { id: 1, esPrincipal: true, persona: { id: 1, nombreCompleto: "Propietario Test", telefono: "111" } },
  ],
  inquilinos: [
    { id: 1, esPrincipal: true, persona: { id: 2, nombreCompleto: "Inquilino Test", telefono: "222" } },
  ],
  adjuntos: [],
};

function buildUser(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 7,
    email: "usuario@test.local",
    fullName: "Usuario Test",
    nombreCompleto: "Usuario Test",
    tipo: "USUARIO",
    role: "USUARIO",
    rol: { id: 1, nombre: "Comercial", activo: true },
    permissions: basePermissions,
    inmobiliaria: { id: 1, nombre: "Inmobiliaria Test" },
    ...overrides,
  };
}

async function mockApi(page: Page, user: ReturnType<typeof buildUser>) {
  await page.route("**/api/auth/login", async route => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ csrfToken: "e2e-csrf", expiresAt: new Date(Date.now() + 60_000).toISOString(), user }),
    });
  });

  await page.route("**/api/auth/me", async route => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(user),
    });
  });

  await page.route("**/api/reportes/dashboard", async route => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        propiedades: { total: 0, disponibles: 0, alquiladas: 0 },
        contratos: { activos: 1, porVencer: 0 },
        finanzas: {
          recaudadoTotal: 0,
          gananciaBruta: 0,
          gastosAgencia: 0,
          utilidadNeta: 0,
          morosidad: 0,
          fondoCustodia: 0,
          honorarios: { cobrados: 0, totalInmo: 0 },
        },
      }),
    });
  });

  await page.route("**/api/contratos/alertas", async route => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([sampleContract]) });
  });

  await page.route("**/api/contratos?**", async route => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ data: [sampleContract], meta: { total: 1, page: 1, limit: 10, totalPages: 1 } })
    });
  });

  await page.route("**/api/contratos/101", async route => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ...sampleContract, auditLogs: [] }),
    });
  });
}

async function login(page: Page) {
  await page.goto("/login");
  await page.getByPlaceholder("ejemplo@correo.com").fill("usuario@test.local");
  await page.getByPlaceholder("••••••••").fill("password-test");
  await page.getByRole("button", { name: /Ingresar a mi cuenta/i }).click();
  await expect(page).toHaveURL(/\/home$/);
}

test("login sin sueldos.ver no muestra Sueldos en el menú", async ({ page }) => {
  await mockApi(page, buildUser());
  await login(page);

  await expect(page.getByText("Sueldos", { exact: true })).toHaveCount(0);
});

test("acceso manual a /sueldos muestra acceso denegado sin sueldos.ver", async ({ page }) => {
  await mockApi(page, buildUser());
  await login(page);

  await page.goto("/sueldos");
  await expect(page.getByRole("heading", { name: "Acceso denegado" })).toBeVisible();
});

test("botones internos desaparecen según permisos del usuario", async ({ page }) => {
  await mockApi(page, buildUser());
  await login(page);

  await page.goto("/contratos");
  await expect(page.getByText("Av. Test 123").first()).toBeVisible();
  await page.locator("tbody td:last-child button").first().click();

  await expect(page.getByRole("menuitem", { name: /Ver detalles/i })).toBeVisible();
  await expect(page.getByRole("menuitem", { name: /Ver contrato/i })).toHaveCount(0);
  await expect(page.getByRole("menuitem", { name: /Editar/i })).toHaveCount(0);
  await expect(page.getByRole("menuitem", { name: /Eliminar/i })).toHaveCount(0);
});

test("el rol asignado se muestra sin permisos individuales", async ({ page }) => {
  const user = buildUser({
    permissions: [...basePermissions, ...salaryPermissions],
  });

  await mockApi(page, user);
  await login(page);

  await page.goto("/mi-acceso");
  await expect(page.getByLabel("Contenido principal").getByText("Comercial", { exact: true })).toBeVisible();
  await expect(page.getByText(/Directo|denegado|heredado/i)).toHaveCount(0);
});

test("nuevo contrato usa el selector visual de PropControl para la moneda", async ({ page }) => {
  await mockApi(page, buildUser({ permissions: [...basePermissions, "contratos.crear"] }));
  await login(page);

  await page.goto("/contratos");
  await page.getByRole("button", { name: "Nuevo contrato" }).click();

  const currency = page.getByRole("button", { name: "Moneda del contrato" });
  await expect(currency).toContainText("ARS");
  await currency.click();
  await expect(page.getByRole("listbox")).toBeVisible();
  await page.getByRole("option", { name: /USD.*Dólares estadounidenses/i }).click();
  await expect(currency).toContainText("USD");
  await expect(page.locator("select")).toHaveCount(0);
});

test("elegir personas existentes reemplaza las fichas vacías de propietario e inquilino", async ({ page }) => {
  const existingPerson = {
    id: 55,
    version: 1,
    nombreCompleto: "Persona Existente",
    dni: "30111222",
    telefono: "+541112345678",
    email: null,
    direccion: null,
    estado: "ACTIVO"
  };
  await mockApi(page, buildUser({ permissions: [...basePermissions, "contratos.crear"] }));
  await page.route("**/api/personas?**", route => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ data: [existingPerson], meta: { total: 1, page: 1, limit: 100, totalPages: 1 } })
  }));
  await login(page);

  await page.goto("/contratos");
  await page.getByRole("button", { name: "Nuevo contrato" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByPlaceholder("Nombre Completo *")).toHaveCount(2);

  await dialog.getByRole("button", { name: "¿Buscar propietario existente?" }).click();
  await dialog.getByPlaceholder("Nombre o DNI...").fill("Persona");
  await dialog.getByRole("option", { name: /Persona Existente/ }).click();

  await expect(dialog.getByPlaceholder("Nombre Completo *")).toHaveCount(2);
  await expect(dialog.getByPlaceholder("Nombre Completo *").nth(0)).toHaveValue("Persona Existente");
  await expect(dialog.getByLabel(/Quitar propietario/)).toHaveCount(0);

  await dialog.getByRole("button", { name: "¿Buscar inquilino existente?" }).click();
  await dialog.getByPlaceholder("Nombre o DNI...").fill("Persona");
  await dialog.getByRole("option", { name: /Persona Existente/ }).click();

  await expect(dialog.getByPlaceholder("Nombre Completo *")).toHaveCount(2);
  await expect(dialog.getByPlaceholder("Nombre Completo *").nth(1)).toHaveValue("Persona Existente");
  await expect(dialog.getByText("(existente)")).toHaveCount(2);
  await expect(dialog.getByLabel(/Quitar inquilino/)).toHaveCount(0);
});
