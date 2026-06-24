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
  rutaPdf: "inmobiliaria-1/contrato.pdf",
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
    role: "AGENTE",
    rol: "AGENTE",
    permissions: basePermissions,
    inheritedPermissions: [],
    directPermissions: basePermissions,
    deniedPermissions: [],
    inmobiliaria: { id: 1, nombre: "Inmobiliaria Test" },
    ...overrides,
  };
}

async function mockApi(page: Page, user: ReturnType<typeof buildUser>) {
  await page.route("**/api/auth/login", async route => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ token: "e2e-token", user }),
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

  await page.route("**/api/contratos", async route => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([sampleContract]) });
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

test("una denegación explícita pisa el permiso heredado por rol", async ({ page }) => {
  const user = buildUser({
    role: "JEFE",
    rol: "JEFE",
    inheritedPermissions: [...basePermissions, ...salaryPermissions],
    permissions: basePermissions,
    deniedPermissions: ["sueldos.ver"],
  });

  await mockApi(page, user);
  await login(page);

  await expect(page.getByText("Sueldos", { exact: true })).toHaveCount(0);

  await page.goto("/sueldos");
  await expect(page.getByRole("heading", { name: "Acceso denegado" })).toBeVisible();
});
