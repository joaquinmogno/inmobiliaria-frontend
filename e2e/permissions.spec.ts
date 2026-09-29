import { expect, type Page, test } from "@playwright/test";

const basePermissions = [
  "contratos.ver",
  "personas.ver",
  "propiedades.ver",
  "reportes.dashboard.ver",
  "reportes.contratos.ver",
  "reportes.morosidad.ver",
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
  let contractDraft: any = null;
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

  await page.route("**/api/contratos/borradores", async route => {
    if (route.request().method() === "GET") {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(contractDraft ? [contractDraft] : []) });
      return;
    }
    const body = route.request().postDataJSON() as { datos: any };
    const datos = body.datos;
    contractDraft = {
      id: 501,
      version: 1,
      datos,
      fechaCreacion: "2026-09-29T12:00:00.000Z",
      fechaActualizacion: "2026-09-29T12:00:00.000Z",
      creadoPor: { id: user.id, nombreCompleto: "Usuario Test" },
      adjuntos: [],
      resumen: {
        direccion: datos.selectedProperty?.direccion || datos.form.address || "Contrato sin dirección",
        propietario: datos.owners.find((owner: { nombreCompleto: string }) => owner.nombreCompleto.trim())?.nombreCompleto || null,
        inquilino: datos.tenants.find((tenant: { nombreCompleto: string }) => tenant.nombreCompleto.trim())?.nombreCompleto || null,
      },
    };
    await route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify(contractDraft) });
  });

  await page.route("**/api/contratos/borradores/501", async route => {
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(contractDraft) });
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

test("botones internos desaparecen según permisos del usuario", async ({ page }) => {
  await mockApi(page, buildUser());
  await login(page);

  await page.goto("/contratos");
  const contractActions = page.locator('button[aria-label="Acciones del contrato"]:visible').first();
  await expect(contractActions).toBeVisible();
  await contractActions.click();

  await expect(page.getByRole("menuitem", { name: /Ver detalles/i })).toBeVisible();
  await expect(page.getByRole("menuitem", { name: /Ver contrato/i })).toHaveCount(0);
  await expect(page.getByRole("menuitem", { name: /Editar/i })).toHaveCount(0);
  await expect(page.getByRole("menuitem", { name: /Eliminar/i })).toHaveCount(0);
});

test("el rol asignado se muestra sin permisos individuales", async ({ page }) => {
  const user = buildUser({
    permissions: basePermissions,
  });

  await mockApi(page, user);
  await login(page);

  await page.goto("/mi-acceso");
  await expect(page.getByLabel("Contenido principal").getByText("Comercial", { exact: true })).toBeVisible();
  await expect(page.getByText(/Directo|denegado|heredado/i)).toHaveCount(0);
});

test("nuevo contrato permite elegir la moneda del alquiler y del honorario de alta", async ({ page }) => {
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

  const initialFeeCurrency = page.getByRole("button", { name: "Moneda del honorario de alta" });
  await expect(initialFeeCurrency).toContainText("ARS");
  await initialFeeCurrency.click();
  await page.getByRole("option", { name: /USD.*Dólares estadounidenses/i }).click();
  await expect(initialFeeCurrency).toContainText("USD");
  await expect(page.locator("select")).toHaveCount(0);
});

test("nuevo contrato permite definir responsables de servicios y gastos", async ({ page }) => {
  await mockApi(page, buildUser({ permissions: [...basePermissions, "contratos.crear"] }));
  await login(page);

  await page.goto("/contratos");
  await page.getByRole("button", { name: "Nuevo contrato" }).click();
  const dialog = page.getByRole("dialog");

  await dialog.getByRole("button", { name: "Agregar concepto" }).click();
  const concept = dialog.getByRole("button", { name: /Servicio o gasto 1/ });
  await concept.click();
  await page.getByRole("option", { name: "LUZ", exact: true }).click();

  const responsible = dialog.getByRole("button", { name: /Responsable de LUZ/ });
  await expect(responsible).toContainText("Inquilino");
  await responsible.click();
  await page.getByRole("option", { name: "Propietario", exact: true }).click();
  await expect(responsible).toContainText("Propietario");
});

test("un contrato incompleto se puede guardar y retomar como borrador", async ({ page }) => {
  await mockApi(page, buildUser({ permissions: [...basePermissions, "contratos.crear"] }));
  await login(page);

  await page.goto("/contratos");
  await page.getByRole("button", { name: "Nuevo contrato" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.locator("#contract-property-address").fill("Av. Borrador 123");
  await dialog.getByRole("button", { name: "Guardar borrador" }).click();
  await expect(dialog.getByRole("button", { name: "Guardar borrador" })).toHaveText("Guardar borrador");

  await dialog.getByRole("button", { name: "Cancelar" }).click();
  await page.getByRole("button", { name: /Borradores \(1\)/ }).click();
  const drafts = page.getByLabel("Borradores de contratos");
  await expect(drafts.getByText("Av. Borrador 123")).toBeVisible();
  await expect(drafts.getByRole("button", { name: "Continuar" })).toBeVisible();
});

test("un movimiento permite adjuntar comprobantes antes de guardarlo", async ({ page }) => {
  await mockApi(page, buildUser({ permissions: [...basePermissions, "caja_chica.ver", "caja_chica.crear"] }));
  await page.route("**/api/cajachica?**", route => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ data: [], meta: { total: 0, page: 1, limit: 20, totalPages: 1 } })
  }));
  await page.route("**/api/cajachica/resumen?**", route => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({
      balanceGeneral: 0, totalIngresos: 0, totalEgresos: 0, balanceCaja: 0, balanceBanco: 0,
      totalCobrado: 0, totalPagadoPropietarios: 0, gastosGenerales: 0, gananciaBruta: 0,
      resultadoNeto: 0, fondosEnCustodia: 0, totalIngresosARS: 0, totalEgresosARS: 0,
      balanceARS: 0, totalIngresosUSD: 0, totalEgresosUSD: 0, balanceUSD: 0,
      totalesPorMoneda: {
        ARS: { totalIngresos: 0, totalEgresos: 0, balance: 0, balanceCaja: 0, balanceBanco: 0, totalCobrado: 0, totalPagadoPropietarios: 0, gastosGenerales: 0, gananciaBruta: 0, resultadoNeto: 0, fondosEnCustodia: 0 },
        USD: { totalIngresos: 0, totalEgresos: 0, balance: 0, balanceCaja: 0, balanceBanco: 0, totalCobrado: 0, totalPagadoPropietarios: 0, gastosGenerales: 0, gananciaBruta: 0, resultadoNeto: 0, fondosEnCustodia: 0 }
      }
    })
  }));
  await login(page);

  await page.goto("/cajachica");
  await page.getByRole("button", { name: "Nuevo Movimiento" }).click();
  await expect(page.getByText("Comprobantes (opcional)", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: /Método de pago/ }).click();
  await expect(page.getByRole("option", { name: "Cheque", exact: true })).toHaveCount(0);
  await page.getByRole("option", { name: "Efectivo", exact: true }).click();

  const picker = page.locator("#cash-movement-attachments");
  await picker.setInputFiles({
    name: "factura-pintureria.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.7 factura")
  });
  await expect(page.getByLabel("Comprobantes seleccionados")).toContainText("factura-pintureria.pdf");
  await expect(page.getByLabel("Quitar factura-pintureria.pdf")).toBeVisible();
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
