import { expect, request as playwrightRequest, test } from '@playwright/test';

const admin = {
  email: 'admin.integration@example.com',
  password: 'ProdTest!2026_Strong'
};

test('nginx de producción sirve un login móvil sin desborde', async ({ page }) => {
  await page.goto('/login');
  await expect(page.getByRole('button', { name: /Ingresar a mi cuenta/i })).toBeVisible();
  const dimensions = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth
  }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);
});

test('el sidebar usa un drawer sin reducir el contenido hasta escritorio amplio', async ({ page }) => {
  await page.goto('/login');
  await page.getByPlaceholder('ejemplo@correo.com').fill(admin.email);
  await page.getByPlaceholder('••••••••').fill(admin.password);
  await page.getByRole('button', { name: /Ingresar a mi cuenta/i }).click();
  await expect(page).toHaveURL(/\/home$/);

  for (const width of [720, 1024, 1279]) {
    await page.setViewportSize({ width, height: 768 });

    const main = page.locator('main');
    const sidebar = page.locator('aside');
    const menuButton = page.locator('header button.xl\\:hidden');

    await expect(menuButton).toBeVisible();
    await expect(sidebar).toHaveCSS('position', 'absolute');
    await expect.poll(async () => (await main.boundingBox())?.width).toBe(width);
    await expect.poll(async () => {
      const box = await sidebar.boundingBox();
      return box ? Math.round(box.x + box.width) : null;
    }).toBeLessThanOrEqual(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  }

  await page.setViewportSize({ width: 1024, height: 768 });
  const mainWidth = (await page.locator('main').boundingBox())?.width;
  await page.locator('header button.xl\\:hidden').click();
  await expect.poll(async () => Math.round((await page.locator('aside').boundingBox())?.x ?? -1)).toBe(0);
  expect((await page.locator('main').boundingBox())?.width).toBe(mainWidth);
  await expect(page.locator('button.fixed.inset-0.bg-black\\/50.xl\\:hidden')).toBeVisible();

  await page.setViewportSize({ width: 1280, height: 768 });
  await expect(page.locator('header button.xl\\:hidden')).toBeHidden();
  await expect(page.locator('aside')).toHaveCSS('position', 'relative');
  await expect.poll(async () => (await page.locator('main').boundingBox())?.width).toBe(1024);
});

test('la gestión de usuarios usa tarjetas y acciones accesibles en mobile', async ({ page }) => {
  const api = await playwrightRequest.newContext({ baseURL: 'http://127.0.0.1:4180' });
  const unique = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;

  try {
    const login = await api.post('/api/auth/login', { data: admin });
    expect(login.status()).toBe(200);
    const loginPayload = await login.json();
    const cookie = login.headersArray()
      .filter(header => header.name.toLowerCase() === 'set-cookie')
      .map(header => header.value.split(';')[0])
      .join('; ');
    const headers = { cookie, 'x-csrf-token': loginPayload.csrfToken as string };

    const roleResponse = await api.post('/api/roles', {
      headers,
      data: { nombre: `Rol Mobile ${unique}`, descripcion: 'Prueba UX-002', permisos: [] }
    });
    expect(roleResponse.status()).toBe(201);
    const role = await roleResponse.json();
    const roleId = role.id as number;

    const userResponse = await api.post('/api/usuarios', {
      headers,
      data: {
        email: `ux002-${unique}@example.test`,
        password: 'Temporal!2026_Segura',
        nombreCompleto: `Usuario Mobile ${unique}`,
        tipo: 'USUARIO',
        rolId: roleId
      }
    });
    expect(userResponse.status()).toBe(201);

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/login');
    await page.getByPlaceholder('ejemplo@correo.com').fill(admin.email);
    await page.getByPlaceholder('••••••••').fill(admin.password);
    await page.getByRole('button', { name: /Ingresar a mi cuenta/i }).click();
    await expect(page).toHaveURL(/\/home$/);
    await page.goto('/usuarios');

    const mobileList = page.getByTestId('mobile-user-list');
    const card = page.getByRole('article').filter({ hasText: `Usuario Mobile ${unique}` });
    await expect(mobileList).toBeVisible();
    await expect(page.locator('table')).toBeHidden();
    await expect(card).toContainText(`ux002-${unique}@example.test`);
    await expect(card).toContainText(`Rol Mobile ${unique}`);
    await expect(card).toContainText('Activo');
    await expect(card).toContainText('Nunca');

    await card.getByRole('button', { name: 'Acciones' }).click();
    await expect(page.getByRole('menuitem', { name: 'Editar usuario' })).toBeVisible();
    await expect(page.getByRole('menuitem', { name: 'Cambiar contraseña' })).toBeVisible();
    await expect(page.getByRole('menuitem', { name: 'Deshabilitar usuario' })).toBeVisible();

    await page.getByRole('menuitem', { name: 'Editar usuario' }).click();
    const editDialog = page.getByRole('dialog').filter({ has: page.getByRole('heading', { name: 'Editar usuario' }) });
    const editHeading = editDialog.getByRole('heading', { name: 'Editar usuario' });
    await expect(editHeading).toBeVisible();
    await expect(editDialog.getByRole('button', { name: 'Guardar' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(editHeading).toBeHidden();

    await card.getByRole('button', { name: 'Acciones' }).click();
    await page.getByRole('menuitem', { name: 'Cambiar contraseña' }).click();
    const resetDialog = page.getByRole('dialog').filter({ has: page.getByRole('heading', { name: 'Restablecer contraseña' }) });
    const resetHeading = resetDialog.getByRole('heading', { name: 'Restablecer contraseña' });
    await expect(resetHeading).toBeVisible();
    await expect(resetDialog.getByRole('button', { name: 'Restablecer', exact: true })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(resetHeading).toBeHidden();

    await card.getByRole('button', { name: 'Acciones' }).click();
    await page.getByRole('menuitem', { name: 'Deshabilitar usuario' }).click();
    const confirmationDialog = page.getByRole('dialog').filter({ has: page.getByRole('heading', { name: 'Deshabilitar usuario' }) });
    await expect(confirmationDialog.getByRole('heading', { name: 'Deshabilitar usuario' })).toBeVisible();
    await confirmationDialog.getByRole('button', { name: 'Cancelar' }).click();

    const dimensions = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth
    }));
    expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth);
  } finally {
    await api.dispose();
  }
});
