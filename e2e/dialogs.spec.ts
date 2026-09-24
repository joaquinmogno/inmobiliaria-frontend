import { expect, test } from '@playwright/test';

test('login ofrece únicamente email y contraseña', async ({ page }) => {
  await page.goto('/login');
  await expect(page.getByLabel('Correo electrónico')).toBeVisible();
  await expect(page.locator('#login-password')).toBeVisible();
  await expect(page.getByText(/Google/i)).toHaveCount(0);
});

test('el Administrador restablece una contraseña temporal sin exponer enlaces', async ({ page }) => {
  const admin = { id: 1, email: 'admin@test.local', fullName: 'Administrador', nombreCompleto: 'Administrador', tipo: 'ADMIN', role: 'ADMIN', rol: null, permissions: [], inmobiliaria: { id: 1, nombre: 'Test' } };
  const target = { id: 2, email: 'usuario@test.local', fullName: 'Usuario', nombreCompleto: 'Usuario', tipo: 'USUARIO', role: 'USUARIO', rol: { id: 4, nombre: 'Comercial', activo: true }, activo: true, permissions: [], inmobiliaria: { id: 1, nombre: 'Test' } };
  await page.route('**/api/auth/login', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ csrfToken: 'csrf', user: admin }) }));
  await page.route('**/api/auth/me', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(admin) }));
  await page.route('**/api/usuarios?**', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [admin, target], meta: { total: 2, page: 1, limit: 25, totalPages: 1 } }) }));
  await page.route('**/api/roles', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([{ id: 4, nombre: 'Comercial', activo: true, cantidadUsuarios: 1, permisos: [], fechaCreacion: '', fechaActualizacion: '' }]) }));
  await page.route('**/api/roles/catalogo-permisos', route => route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
  let sentPassword = '';
  await page.route('**/api/auth/reset-password/2', async route => { sentPassword = route.request().postDataJSON().newPassword; await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ message: 'ok' }) }); });
  await page.goto('/login');
  await page.getByLabel('Correo electrónico').fill(admin.email);
  await page.locator('#login-password').fill('Password!2026');
  await page.getByRole('button', { name: /Ingresar a mi cuenta/i }).click();
  await page.goto('/usuarios');
  await page.getByLabel('Cambiar contraseña de Usuario').click();
  await page.getByLabel('Nueva contraseña temporal').fill('NuevaTemporal!2026');
  await page.getByRole('button', { name: 'Restablecer' }).click();
  expect(sentPassword).toBe('NuevaTemporal!2026');
  await expect(page.getByText(/Contraseña temporal actualizada/i)).toBeVisible();
});

test('un usuario con contraseña temporal queda bloqueado hasta crear una personal', async ({ page }) => {
  const temporaryPassword = 'Temporal!2026_Segura';
  const personalPassword = 'Personal!2026_Segura';
  const user = {
    id: 8,
    email: 'usuario.temporal@test.local',
    fullName: 'Usuario Temporal',
    nombreCompleto: 'Usuario Temporal',
    tipo: 'USUARIO',
    role: 'USUARIO',
    rol: { id: 4, nombre: 'Comercial', activo: true },
    permissions: ['contratos.ver'],
    mustChangePassword: true,
    inmobiliaria: { id: 1, nombre: 'Test' }
  };
  let submittedBody: { currentPassword?: string; newPassword?: string } | null = null;

  await page.route('**/api/auth/login', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ csrfToken: 'csrf', user })
  }));
  await page.route('**/api/auth/me', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(user) }));
  await page.route('**/api/auth/change-password', async route => {
    submittedBody = route.request().postDataJSON();
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ message: 'ok' }) });
  });
  await page.route('**/api/auth/logout', route => route.fulfill({ status: 200, contentType: 'application/json', body: '{}' }));

  await page.goto('/login');
  await page.getByLabel('Correo electrónico').fill(user.email);
  await page.locator('#login-password').fill(temporaryPassword);
  await page.getByRole('button', { name: /Ingresar a mi cuenta/i }).click();

  await expect(page).toHaveURL(/\/cambiar-contrasena$/);
  await expect(page.getByRole('heading', { name: 'Creá tu contraseña personal' })).toBeVisible();
  await expect(page.getByText(/No podrás abrir contratos, pagos ni otros módulos/i)).toBeVisible();

  await page.goto('/contratos');
  await expect(page).toHaveURL(/\/cambiar-contrasena$/);
  await expect(page.getByText('Gestión de Contratos')).toHaveCount(0);

  await page.getByLabel('Contraseña temporal').fill(temporaryPassword);
  await page.getByLabel('Nueva contraseña', { exact: true }).fill(temporaryPassword);
  await page.getByLabel('Repetir nueva contraseña').fill(temporaryPassword);
  await page.getByRole('button', { name: 'Guardar y continuar' }).click();
  await expect(page.getByRole('alert')).toContainText('debe ser diferente');
  expect(submittedBody).toBeNull();

  await page.getByLabel('Nueva contraseña', { exact: true }).fill(personalPassword);
  await page.getByLabel('Repetir nueva contraseña').fill(personalPassword);
  await page.getByRole('button', { name: 'Guardar y continuar' }).click();

  expect(submittedBody).toEqual({ currentPassword: temporaryPassword, newPassword: personalPassword });
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByText(/Contraseña actualizada.*Ingresá nuevamente/i)).toBeVisible();
});

test('una respuesta PASSWORD_CHANGE_REQUIRED redirige globalmente y no aparenta falta de datos', async ({ page }) => {
  const user = {
    id: 9,
    email: 'usuario.desactualizado@test.local',
    fullName: 'Usuario Desactualizado',
    tipo: 'USUARIO',
    role: 'USUARIO',
    rol: { id: 4, nombre: 'Comercial', activo: true },
    permissions: ['contratos.ver'],
    mustChangePassword: false,
    inmobiliaria: { id: 1, nombre: 'Test' }
  };

  await page.route('**/api/auth/login', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ csrfToken: 'csrf', user })
  }));
  await page.route('**/api/contratos/alertas', route => route.fulfill({
    status: 403,
    contentType: 'application/json',
    body: JSON.stringify({ message: 'Debe cambiar la contraseña para continuar', code: 'PASSWORD_CHANGE_REQUIRED' })
  }));

  await page.goto('/login');
  await page.getByLabel('Correo electrónico').fill(user.email);
  await page.locator('#login-password').fill('Temporal!2026_Segura');
  await page.getByRole('button', { name: /Ingresar a mi cuenta/i }).click();

  await expect(page).toHaveURL(/\/cambiar-contrasena$/);
  await expect(page.getByRole('heading', { name: 'Creá tu contraseña personal' })).toBeVisible();
  await expect(page.getByText(/reemplazar tu contraseña temporal/i)).toBeVisible();
});

test('el catálogo de roles muestra solo capacidades reales y resuelve sus dependencias', async ({ page }) => {
  const admin = {
    id: 1,
    email: 'admin@test.local',
    fullName: 'Administrador',
    nombreCompleto: 'Administrador',
    tipo: 'ADMIN',
    role: 'ADMIN',
    rol: null,
    permissions: [],
    inmobiliaria: { id: 1, nombre: 'Test' }
  };
  const catalog = [
    { id: 1, clave: 'contratos.ver', descripcion: 'Ver contratos', etiqueta: 'Ver contratos', grupo: 'Contratos', modulo: 'Contratos', accion: 'ver', requiere: [], ruta: '/contratos', control: 'Listado de contratos' },
    { id: 2, clave: 'contratos.restaurar', descripcion: 'Restaurar contratos', etiqueta: 'Restaurar contratos', grupo: 'Contratos', modulo: 'Contratos', accion: 'restaurar', requiere: ['contratos.ver'], ruta: '/contratos/papelera', control: 'Botón Restaurar' },
    { id: 3, clave: 'pagos.ver', descripcion: 'Ver pagos', etiqueta: 'Ver pagos', grupo: 'Pagos', modulo: 'Pagos', accion: 'ver', requiere: [], ruta: '/pagos', control: 'Listado de pagos' },
    { id: 4, clave: 'liquidaciones.ver', descripcion: 'Ver liquidaciones', etiqueta: 'Ver liquidaciones', grupo: 'Liquidaciones', modulo: 'Liquidaciones', accion: 'ver', requiere: [], ruta: '/liquidaciones', control: 'Listado de liquidaciones' },
    { id: 5, clave: 'pagos.crear', descripcion: 'Registrar pagos', etiqueta: 'Registrar pagos', grupo: 'Pagos', modulo: 'Pagos', accion: 'crear', requiere: ['pagos.ver', 'liquidaciones.ver'], ruta: '/pagos', control: 'Botón Registrar pago' }
  ];

  await page.route('**/api/auth/login', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ csrfToken: 'csrf', user: admin }) }));
  await page.route('**/api/auth/me', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(admin) }));
  await page.route('**/api/usuarios?**', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [admin], meta: { total: 1, page: 1, limit: 25, totalPages: 1 } }) }));
  await page.route('**/api/roles', route => route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
  await page.route('**/api/roles/catalogo-permisos', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(catalog) }));

  await page.goto('/login');
  await page.getByLabel('Correo electrónico').fill(admin.email);
  await page.locator('#login-password').fill('Password!2026');
  await page.getByRole('button', { name: /Ingresar a mi cuenta/i }).click();
  await page.goto('/usuarios');
  await page.getByRole('tab', { name: 'roles' }).click();
  await page.getByRole('button', { name: 'Nuevo rol' }).click();

  const roleDialog = page.getByRole('dialog');
  await expect(roleDialog.getByText('Editar pagos', { exact: true })).toHaveCount(0);
  await expect(roleDialog.getByText('Editar movimientos de caja', { exact: true })).toHaveCount(0);
  await expect(roleDialog.getByText('Configuración', { exact: true })).toHaveCount(0);

  const viewContracts = page.locator('label', { hasText: 'Ver contratos' }).locator('input');
  const restoreContracts = page.locator('label', { hasText: 'Restaurar contratos' }).locator('input');
  await restoreContracts.check();
  await expect(viewContracts).toBeChecked();
  await viewContracts.uncheck();
  await expect(restoreContracts).not.toBeChecked();

  await page.locator('label', { hasText: 'Registrar pagos' }).locator('input').check();
  await expect(page.locator('label', { hasText: 'Ver pagos' }).locator('input')).toBeChecked();
  await expect(page.locator('label', { hasText: 'Ver liquidaciones' }).locator('input')).toBeChecked();
});
