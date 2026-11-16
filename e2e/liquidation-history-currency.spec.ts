import { expect, test, type Locator, type Page } from '@playwright/test';

import { admin, fixture } from './fixtures/liquidation-currency';

async function setup(page: Page, data: ReturnType<typeof fixture>) {
    await page.addInitScript(user => {
        localStorage.setItem('user', JSON.stringify(user));
        localStorage.setItem('loginTimestamp', String(Date.now()));
    }, admin);
    const paged = (rows: unknown[]) => ({ data: rows, meta: { page: 1, limit: 50, total: rows.length, totalPages: 1 } });
    await page.route('**/api/**', async route => {
        const path = new URL(route.request().url()).pathname;
        let body: unknown = [];
        if (path.endsWith('/auth/me')) body = admin;
        else if (path === '/api/contratos') body = paged([data.contract]);
        else if (path === '/api/contratos/1') body = data.contract;
        else if (path === '/api/liquidaciones') body = paged([data.liquidation]);
        else if (path === '/api/liquidaciones/10') body = data.liquidation;
        else if (path === '/api/liquidaciones/contrato/1/periodos') body = data.timeline;
        else if (path === '/api/liquidaciones/filtros') body = { periodos: ['2026-10-01'], monedas: ['ARS', 'USD'] };
        else if (path.includes('/pagos/deuda/')) body = { totalDeuda: 0, moneda: data.contract.moneda, detalle: [] };
        await route.fulfill({ json: body });
    });
}

async function expectAmounts(scope: Locator, amounts: Array<{ moneda: string; monto: number }>) {
    for (const amount of amounts) {
        const text = `${amount.moneda === 'USD' ? 'US$' : '$'}${amount.monto.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${amount.moneda}`;
        await expect(scope).toContainText(text);
    }
    await expect(scope).not.toContainText('136.760');
}

for (const width of [1366, 390]) {
    for (const variant of ['mixto', 'USD', 'ARS'] as const) {
        test(`historial financiero, historial general y comprobantes ${variant} a ${width}px`, async ({ page }) => {
            const data = fixture(variant === 'ARS' ? 'ARS' : 'USD', variant === 'mixto');
            const errors: string[] = [];
            page.on('pageerror', error => errors.push(error.message));
            await page.setViewportSize({ width, height: 768 });
            await setup(page, data);
            await page.goto('/contratos');
            await page.locator('button[aria-label="Acciones del contrato"]:visible').first().click();
            await page.getByRole('menuitem', { name: /Ver detalles/i }).click();
            const dialog = page.getByRole('dialog');
            await dialog.getByRole('button', { name: 'Historial Financiero' }).click();
            const collected = dialog.locator('div.text-right').filter({ has: page.getByText('Cobrado', { exact: true }) });
            await expectAmounts(collected, data.amounts);
            await expect(collected.locator('p.text-status-success > span')).toHaveCount(data.amounts.length);

            await page.goto('/liquidaciones?view=HISTORIAL');
            const history = page.locator('[data-testid=liquidation-history-row]:visible, article:visible').filter({ hasText: 'Contrato monedas' });
            await expectAmounts(history, data.amounts);
            await history.getByRole('button', { name: 'Ver saldos de liquidación #10', exact: true }).click();
            const balancePanel = page.locator(`#history-${width >= 1280 ? 'table' : 'card'}-balances-10`);
            const historyCollected = balancePanel.locator('div').filter({ has: page.locator('p', { hasText: /^Cobrado inquilino$/ }) }).last();
            await expectAmounts(historyCollected, data.amounts);

            await page.goto('/liquidaciones/contrato/1');
            const periodCollected = page.locator('div').filter({ has: page.locator('p', { hasText: /^Cobrado al inquilino$/ }) }).last();
            await expectAmounts(periodCollected, data.amounts);

            await page.goto('/liquidaciones/10');
            await page.locator('summary', { hasText: 'Comprobantes emitidos' }).click();
            const voucher = page.locator('article').filter({ has: page.getByRole('heading', { name: 'Versión 1', exact: true }) });
            for (const recipient of ['Inquilino:', 'Propietario:']) {
                await expectAmounts(voucher.locator('p').filter({ hasText: recipient }), data.amounts);
            }
            await page.locator('summary', { hasText: 'Meses anteriores de esta propiedad' }).click();
            const previous = page.locator('details[aria-label="Historial de este contrato"]');
            for (const amount of data.amounts) await expect(previous).toContainText(amount.moneda);
            expect(errors).toEqual([]);
        });
    }
}
