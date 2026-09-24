import { expect, test } from '@playwright/test';

const admin = {
  email: 'admin.integration@example.com',
  password: 'ProdTest!2026_Strong'
};

test('la navegación global se puede completar usando solamente el teclado', async ({ page }) => {
  await page.goto('/login');
  await page.getByPlaceholder('ejemplo@correo.com').fill(admin.email);
  await page.getByPlaceholder('••••••••').fill(admin.password);
  await page.getByRole('button', { name: /Ingresar a mi cuenta/i }).click();
  await expect(page).toHaveURL(/\/home$/);

  const main = page.locator('main#main-content');
  await expect(main).toBeFocused();

  await page.evaluate(() => {
    document.body.tabIndex = -1;
    document.body.focus();
  });
  await page.keyboard.press('Tab');
  const skipLink = page.getByRole('link', { name: 'Saltar al contenido principal' });
  await expect(skipLink).toBeFocused();
  await expect(skipLink).toBeVisible();
  await page.keyboard.press('Enter');
  await expect(main).toBeFocused();

  const userMenuButton = page.getByRole('button', { name: /Menú de usuario/ });
  await userMenuButton.focus();
  await userMenuButton.press('Enter');
  await expect(page.getByRole('menu')).toBeVisible();
  await page.keyboard.press('Home');
  await expect(page.getByRole('menuitem', { name: 'Mi Perfil' })).toHaveAttribute('data-focus', '');
  await page.keyboard.press('End');
  await expect(page.getByRole('menuitem', { name: 'Cerrar Sesión' })).toHaveAttribute('data-focus', '');
  await page.keyboard.press('Escape');
  await expect(userMenuButton).toBeFocused();

  const contractsMenuButton = page.getByRole('button', { name: 'Mostrar opciones de contratos' });
  await contractsMenuButton.focus();
  await page.keyboard.press('Enter');
  await expect(contractsMenuButton).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByRole('button', { name: 'Crear Contrato' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(contractsMenuButton).toHaveAttribute('aria-expanded', 'false');
  await expect(contractsMenuButton).toBeFocused();

  const propertiesLink = page.getByRole('link', { name: 'Propiedades', exact: true });
  await propertiesLink.focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/propiedades$/);
  await expect(main).toBeFocused();

  await page.setViewportSize({ width: 390, height: 844 });
  const mobileMenuButton = page.locator('header button[aria-controls="main-sidebar"]');
  await expect(mobileMenuButton).toHaveAccessibleName('Abrir menú principal');
  await mobileMenuButton.focus();
  await page.keyboard.press('Enter');

  const sidebar = page.locator('#main-sidebar');
  await expect(mobileMenuButton).toHaveAttribute('aria-expanded', 'true');
  await expect(sidebar).toBeVisible();
  await expect(page.getByRole('dialog', { name: 'Menú principal' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Inicio', exact: true })).toBeFocused();
  expect(await main.evaluate(element => (element as HTMLElement).inert)).toBe(true);
  expect(await page.locator('header').evaluate(element => (element as HTMLElement).inert)).toBe(true);

  for (let index = 0; index < 8; index += 1) {
    await page.keyboard.press('Tab');
    expect(await sidebar.evaluate(element => element.contains(document.activeElement))).toBe(true);
  }

  await page.keyboard.press('Escape');
  await expect(mobileMenuButton).toHaveAccessibleName('Abrir menú principal');
  await expect(mobileMenuButton).toBeFocused();
  await expect(sidebar).toHaveAttribute('aria-hidden', 'true');
  expect(await sidebar.evaluate(element => (element as HTMLElement).inert)).toBe(true);

  await page.keyboard.press('Enter');
  await expect(mobileMenuButton).toHaveAttribute('aria-expanded', 'true');
  await expect(sidebar).toBeVisible();
  await expect(page.getByRole('link', { name: 'Inicio', exact: true })).toBeFocused();
  const peopleLink = page.getByRole('link', { name: 'Personas', exact: true });
  await peopleLink.focus();
  await expect(peopleLink).toBeFocused();
  await peopleLink.press('Enter');
  await expect(page).toHaveURL(/\/personas$/);
  await expect(main).toBeFocused();
  await expect(mobileMenuButton).toHaveAttribute('aria-expanded', 'false');
});
