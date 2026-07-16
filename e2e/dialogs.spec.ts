import { expect, test } from "@playwright/test";

test("recuperación muestra requisitos y confirmación final", async ({ page }) => {
  await page.route("**/api/auth/complete-password-reset", route => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ message: "ok" }) }));
  await page.goto("/recuperar-contrasena?token=valid-test-token");
  await page.getByLabel("Nueva contraseña").fill("NuevaClave!2026_segura");
  await page.getByLabel("Repetir contraseña").fill("NuevaClave!2026_segura");
  await page.getByRole("button", { name: "Actualizar contraseña" }).click();
  await expect(page.getByRole("heading", { name: "Contraseña actualizada" })).toBeVisible();
});

test("Google solicita contraseña local en la primera vinculación", async ({ page }) => {
  await page.addInitScript(() => {
    let callback: (value: { credential: string }) => void;
    (window as any).google = { accounts: { id: {
      initialize: (options: any) => { callback = options.callback; },
      renderButton: (container: HTMLElement) => { const button = document.createElement("button"); button.textContent = "Continuar con Google"; button.onclick = () => callback({ credential: "google-test-token" }); container.appendChild(button); }
    } } };
  });
  let attempts = 0;
  await page.route("**/api/auth/google", async route => {
    attempts += 1;
    const body = route.request().postDataJSON();
    if (!body.currentPassword) return route.fulfill({ status: 403, contentType: "application/json", body: JSON.stringify({ code: "GOOGLE_LINK_REQUIRES_PASSWORD", message: "Confirmá tu contraseña" }) });
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ csrfToken: "csrf", expiresAt: new Date(Date.now() + 60_000).toISOString(), user: { id: 1, email: "google@test.local", fullName: "Google Test", role: "AGENTE", permissions: [], inmobiliaria: { id: 1, nombre: "Test" } } }) });
  });
  await page.goto("/login");
  await page.getByRole("button", { name: "Continuar con Google" }).click();
  await expect(page.getByRole("heading", { name: "Vincular cuenta de Google" })).toBeVisible();
  await page.getByLabel("Contraseña actual").fill("ClaveLocal!2026");
  await page.getByRole("button", { name: "Vincular cuenta" }).click();
  await expect(page).toHaveURL(/\/home$/);
  expect(attempts).toBe(2);
});

test("administrador recibe enlace en diálogo y puede copiarlo", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  const permissions = ["usuarios.ver", "usuarios.editar"];
  const currentUser = { id: 1, email: "owner@test.local", fullName: "Owner", nombreCompleto: "Owner", role: "OWNER", rol: "OWNER", permissions, inheritedPermissions: permissions, directPermissions: [], deniedPermissions: [], inmobiliaria: { id: 1, nombre: "Test" } };
  const target = { ...currentUser, id: 2, email: "agente@test.local", fullName: "Agente", nombreCompleto: "Agente", role: "AGENTE", rol: "AGENTE", permissions: [] };
  await page.route("**/api/auth/login", route => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ csrfToken: "csrf", expiresAt: new Date(Date.now() + 60_000).toISOString(), user: currentUser }) }));
  await page.route("**/api/auth/me", route => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(currentUser) }));
  await page.route("**/api/usuarios?**", route => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: [currentUser, target], meta: { total: 2, page: 1, limit: 25, totalPages: 1 } }) }));
  await page.route("**/api/auth/reset-password/2", route => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ message: "ok", resetToken: "reset-dialog-token" }) }));
  await page.goto("/login");
  await page.getByPlaceholder("ejemplo@correo.com").fill(currentUser.email);
  await page.getByPlaceholder("••••••••").fill("Password!2026");
  await page.getByRole("button", { name: /Ingresar a mi cuenta/i }).click();
  await page.goto("/usuarios");
  await page.getByTitle("Resetear contraseña").click();
  await expect(page.getByRole("heading", { name: "Enlace de recuperación" })).toBeVisible();
  const dialog = page.getByRole("dialog", { name: "Enlace de recuperación" });
  await expect(dialog.getByText("agente@test.local")).toBeVisible();
  await page.getByRole("button", { name: "Copiar enlace" }).click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain("reset-dialog-token");
});
