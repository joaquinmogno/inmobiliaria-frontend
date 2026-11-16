import { expect, test, type Page } from '@playwright/test';
import { admin, fixture } from './fixtures/liquidation-currency';

async function setup(page: Page) {
    const data = fixture('USD', true);
    const rows = Array.from({ length: 12 }, (_, index) => ({
        ...data.liquidation, id: 10 + index, fechaLiquidacion: null, cerradoPorId: null,
        propiedadDireccion: index === 1 ? 'Avenida de los Constituyentes 12345, edificio de administración, piso 12, departamento B' : `Inmueble de prueba ${index + 1}`,
        inquilinoNombre: index === 1 ? 'María de los Ángeles Fernández de la Administración' : 'Inquilino de prueba',
        propietarioNombre: 'Propietario con nombre completo extenso que debe seguir accesible',
    }));
    const requests: string[] = [];
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(user => { localStorage.setItem('user', JSON.stringify(user)); localStorage.setItem('loginTimestamp', String(Date.now())); }, admin);
    await page.route('**/api/**', async route => {
        const url = new URL(route.request().url());
        requests.push(`${route.request().method()} ${url.pathname}${url.search}`);
        let body: unknown = [];
        if (url.pathname.endsWith('/auth/me')) body = admin;
        else if (url.pathname === '/api/liquidaciones') body = { data: rows, meta: { total: 24, totalPages: 2, page: Number(url.searchParams.get('page') || 1), limit: 12 } };
        else if (url.pathname === '/api/liquidaciones/10') body = data.liquidation;
        else if (url.pathname === '/api/liquidaciones/filtros') body = { periodos: ['2026-10-01'], monedas: ['ARS', 'USD'] };
        else if (url.pathname.includes('/filtros/propiedades')) body = { data: [{ id: 1, direccion: 'Propiedad ' + 'Extensa'.repeat(35), piso: null, departamento: null }], meta: { page: 1, totalPages: 1, total: 1 } };
        else if (url.pathname.includes('/filtros/personas')) body = { data: [], meta: { page: 1, totalPages: 0, total: 0 } };
        else if (url.pathname.includes('/periodos')) body = data.timeline;
        await route.fulfill({ json: body });
    });
    return { requests, errors };
}

async function noOverflow(page: Page) {
    for (const selector of ['html', '#main-content', '[aria-labelledby=liquidation-history-title]', '[data-testid=liquidation-history-table]:visible']) {
        const element = page.locator(selector);
        if (await element.count()) {
            const bounds = await element.evaluate(el => ({ width: el.clientWidth, scroll: el.scrollWidth }));
            expect(bounds.scroll, selector).toBeLessThanOrEqual(bounds.width + 1);
        }
    }
}

for (const [width, height] of [[1280, 720], [1366, 768], [1440, 900]]) {
    test(`historial compacto, teclado y menú expandido/contraído ${width}x${height}`, async ({ page }, info) => {
        await page.setViewportSize({ width, height });
        const { errors, requests } = await setup(page);
        await page.goto('/liquidaciones?view=HISTORIAL');
        const table = page.getByTestId('liquidation-history-table');
        const first = table.getByTestId('liquidation-history-row').first();
        await expect(first).toBeVisible();
        await expect(page.getByRole('button', { name: 'Contraer menú', exact: true })).toBeVisible();
        expect((await page.getByRole('searchbox').boundingBox())!.width).toBeGreaterThan(280);
        await expect(first.getByTestId('liquidation-states')).toContainText('Cierre administrativo: Sin registro');
        await expect(first).toContainText('octubre de 2026');
        await expect(first).toContainText('US$1.000,00 USD');
        await expect(first).toContainText('$135.760,00 ARS');
        expect((await first.boundingBox())!.height).toBeLessThan(175);
        await expect(first.getByRole('link', { name: 'Comprobantes', exact: true })).toBeInViewport({ ratio: 1 });
        await noOverflow(page);
        await page.screenshot({ path: info.outputPath('history-expanded-sidebar.png') });
        const balances = first.getByRole('button', { name: /saldos de liquidación #10$/ });
        await balances.focus();
        await balances.press('Enter');
        await expect(balances).toHaveAttribute('aria-expanded', 'true');
        const details = page.locator('#history-table-balances-10');
        await expect(details).toContainText('Cobrado inquilino');
        await expect(details).toContainText('Adelanto a recuperar');
        await expect(details).toContainText('US$1.000,00 USD');
        await expect(details).toContainText('$135.760,00 ARS');
        await noOverflow(page);
        await balances.press('Enter');
        await expect(details).not.toBeVisible();
        const toggle = page.getByRole('button', { name: /^Filtros/ });
        await page.getByRole('searchbox').focus();
        await page.keyboard.press('Tab');
        await expect(toggle).toBeFocused();
        await toggle.press('Enter');
        await expect(page.getByLabel('Período', { exact: true })).toBeVisible();
        expect((await page.getByLabel('Período', { exact: true }).boundingBox())!.width).toBeGreaterThan(190);
        await page.getByLabel('Período', { exact: true }).fill('2026-10');
        await expect(page).toHaveURL(/periodo=2026-10-01/);
        await expect(toggle).toContainText('1 activo');
        const currency = page.getByRole('button', { name: /^Moneda:/ });
        await currency.focus();
        await currency.press('ArrowDown');
        const currencyOptions = page.getByRole('listbox');
        await expect(currencyOptions).toBeFocused();
        await currencyOptions.press('End');
        await currencyOptions.press('Enter');
        await expect(page).toHaveURL(/moneda=USD/);
        await expect(currency).toBeFocused();
        await expect(currency).toHaveText('USD');
        await expect(toggle).toContainText('2 activos');
        const advanced = page.locator('summary', { hasText: 'Más filtros' });
        await advanced.focus();
        await advanced.press('Enter');
        await expect(page.getByRole('checkbox', { name: 'Con cuotas o acuerdos' })).toBeVisible();
        await page.getByRole('checkbox', { name: 'Con deuda', exact: true }).focus();
        await page.keyboard.press('Space');
        await expect(page).toHaveURL(/soloDeuda=true/);
        await expect(page.getByRole('checkbox', { name: 'Con deuda', exact: true })).toBeChecked();
        await expect(toggle).toContainText('3 activos');
        await noOverflow(page);
        await page.screenshot({ path: info.outputPath('history-filters.png') });
        await toggle.focus();
        await toggle.press('Enter');
        await expect(page.getByText('Período: octubre de 2026', { exact: true }).first()).toBeVisible();
        await page.reload();
        await expect(page.getByRole('button', { name: /^Filtros/ })).toContainText('3 activos');
        await page.getByRole('button', { name: 'Contraer menú', exact: true }).click();
        await noOverflow(page);
        await page.screenshot({ path: info.outputPath('history-collapsed-sidebar.png') });
        const documents = table.getByTestId('liquidation-history-row').first().getByRole('link', { name: 'Comprobantes', exact: true });
        await documents.focus();
        await documents.press('Enter');
        await expect(page).toHaveURL(/\/liquidaciones\/10#comprobantes$/);
        await expect(page.locator('#liquidation-vouchers')).toHaveAttribute('open', '');
        expect(requests.filter(request => !request.startsWith('GET '))).toEqual([]);
        expect(errors).toEqual([]);
    });
}

for (const [width, height] of [[1024, 576], [768, 1024], [390, 844]]) {
    test(`historial con espacio reducido ${width}x${height}: tarjetas, filtros largos y paginación`, async ({ page }, info) => {
        await page.setViewportSize({ width, height });
        const { requests, errors } = await setup(page);
        await page.goto('/liquidaciones?view=HISTORIAL');
        const card = page.locator('article:visible').first();
        await expect(card).toContainText('US$1.000,00 USD');
        await expect(card).toContainText('$135.760,00 ARS');
        const balances = card.getByRole('button', { name: 'Ver saldos de liquidación #10', exact: true });
        await balances.focus();
        await balances.press('Enter');
        await expect(card).toContainText('Cobrado inquilino');
        await noOverflow(page);
        await page.getByRole('searchbox').fill('ReferenciaSinEspacios'.repeat(12));
        await expect(page.getByRole('button', { name: /^Quitar filtro Búsqueda/ })).toBeVisible();
        await noOverflow(page);
        await page.getByRole('button', { name: /^Filtros/ }).click();
        await page.locator('summary', { hasText: 'Más filtros' }).click();
        await page.getByRole('combobox', { name: 'Propiedad', exact: true }).fill('Propiedad');
        await page.getByRole('option', { name: /^Propiedad Extensa/ }).click();
        await expect(page.getByRole('button', { name: /^Quitar filtro Propiedad:/ })).toBeVisible();
        await noOverflow(page);
        await page.screenshot({ path: info.outputPath('history-small-filters.png') });
        const next = page.getByRole('button', { name: 'Página siguiente', exact: true });
        await next.focus();
        await next.press('Enter');
        await expect.poll(() => requests.filter(request => request.startsWith('GET /api/liquidaciones?')).at(-1)).toContain('page=2');
        await noOverflow(page);
        expect(errors).toEqual([]);
    });
}
