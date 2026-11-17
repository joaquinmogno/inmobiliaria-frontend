import { expect, test, type Page } from '@playwright/test';
import { admin, fixture } from './fixtures/liquidation-currency';
import { parseNumber, formatNumber } from '../src/utils/number';
import { formatCurrency } from '../src/utils/currency';

test('separa formato de edición, valor canónico y presentación de centavos', () => {
    for (const [input, expected] of [['1.000', 1000], ['150.000', 150000], ['5.000.000', 5000000], ['1000,50', 1000.5], ['1.000,50', 1000.5], ['1000.50', 1000.5], ['0,01', 0.01], ['0', 0], ['12,5', 12.5], ['99.999.999,99', 99999999.99], [' 1000,50\t', 1000.5]] as const) {
        expect(parseNumber(input)).toEqual({ value: expected });
    }
    for (const input of ['1,000', '1,000.50', '1000,', '1.00,50', '1.0000', '1e3', '$100', '100000000', '0,001']) expect(parseNumber(input).error, input).toBeTruthy();
    expect(parseNumber('2,5', 0).error).toBeTruthy();
    expect(parseNumber('12', 0)).toEqual({ value: 12 });
    expect(formatNumber('1000.50')).toBe('1.000,50');
    expect(formatCurrency(1000.5, 'ARS')).toBe('$1.000,50');
    expect(formatCurrency(1000, 'ARS')).toBe('$1.000');
    expect(formatCurrency(0.01, 'USD')).toBe('US$0,01');
});

async function setup(page: Page) {
    const data = fixture('ARS', false);
    data.liquidation.estadoCobroInquilino = 'PENDIENTE';
    data.liquidation.pagos = [];
    data.liquidation.resumenMonedas[0] = { ...data.liquidation.resumenMonedas[0], cobradoInquilino: 0, saldoInquilino: 1000.5, netoACobrar: 1000.5 };
    const movements: Record<string, unknown>[] = [];
    const writes: string[] = [];
    await page.addInitScript(user => { localStorage.setItem('user', JSON.stringify(user)); localStorage.setItem('loginTimestamp', String(Date.now())); }, admin);
    await page.route('**/api/**', async route => {
        const req = route.request();
        const path = new URL(req.url()).pathname;
        let body: unknown = [];
        if (req.method() === 'POST' && path === '/api/cajachica') {
            const payload = req.postData() || '';
            writes.push(payload);
            const field = (name: string) => payload.match(new RegExp(`name="${name}"\\r\\n\\r\\n([^\\r]*)`))?.[1];
            const item = { id: movements.length + 1, tipo: 'INGRESO', concepto: 'Prueba centavos', monto: Number(field('monto')), moneda: field('moneda'), fecha: '2026-11-16', metodoPago: 'EFECTIVO', cuenta: 'CAJA', creadoPor: admin, adjuntos: [] };
            movements.push(item);
            body = item;
        } else if (req.method() === 'POST') { writes.push(req.postData() || ''); body = {}; }
        else if (path.endsWith('/auth/me')) body = admin;
        else if (path === '/api/contratos') body = { data: [], meta: { total: 0, page: 1, totalPages: 0 } };
        else if (path === '/api/cajachica') body = { data: movements, meta: { total: movements.length, page: 1, totalPages: 1 } };
        else if (path === '/api/cajachica/resumen') body = { totalesPorMoneda: {} };
        else if (path === '/api/liquidaciones/10') body = data.liquidation;
        else if (path.includes('/periodos')) body = data.timeline;
        await route.fulfill({ json: body });
    });
    return { movements, writes };
}

for (const [input, expected, moneda] of [['150000', 150000, 'ARS'], ['5000000', 5000000, 'ARS'], ['5000000,25', 5000000.25, 'USD'], ['1000,50', 1000.5, 'ARS'], ['1000.50', 1000.5, 'USD'], ['0,01', 0.01, 'ARS']] as const) {
    test(`Caja conserva ${input} ${moneda} al confirmar, enviar y recargar`, async ({ page }) => {
        const state = await setup(page);
        await page.goto('/cajachica');
        await page.getByRole('button', { name: 'Nuevo Movimiento', exact: true }).click();
        await page.locator('#cash-movement-concept').fill('Prueba centavos');
        if (moneda === 'USD') {
            await page.locator('#cash-movement-currency').click();
            await page.getByRole('option', { name: 'USD — Dólares' }).click();
        }
        const amount = page.locator('#cash-movement-amount');
        await amount.fill('');
        await amount.pressSequentially(input);
        await expect(amount).toHaveValue(formatNumber(expected));
        await amount.press('Tab');
        await expect(amount).toHaveValue(formatNumber(expected));
        await page.getByRole('button', { name: 'Guardar', exact: true }).click();
        await expect(page.getByText(/¿Querés registrar/)).toContainText(formatCurrency(expected, moneda));
        await page.getByRole('button', { name: 'Registrar', exact: true }).click();
        await expect.poll(() => state.movements.length).toBe(1);
        expect(state.movements[0].monto).toBe(expected);
        expect(state.movements[0].moneda).toBe(moneda);
        await page.reload();
        await expect(page.getByRole('cell', { name: `+${formatCurrency(expected, moneda)}`, exact: true })).toBeVisible();
    });
}

test('Caja bloquea formatos inválidos, negativos, cero y exceso de precisión sin enviar el valor anterior', async ({ page }) => {
    const { writes } = await setup(page);
    await page.goto('/cajachica');
    await page.getByRole('button', { name: 'Nuevo Movimiento', exact: true }).click();
    await page.locator('#cash-movement-concept').fill('Prueba centavos');
    const amount = page.locator('#cash-movement-amount');
    await amount.fill('1000,50');
    for (const input of ['1.00,50', '1,000.50', '0,001', '-10,50', '0', '100000000', 'abc', '   ']) {
        await amount.fill(input);
        await page.getByRole('button', { name: 'Guardar', exact: true }).click();
        expect(await amount.evaluate((el: HTMLInputElement) => el.validity.valid), input).toBe(false);
        await expect(page.getByRole('button', { name: 'Registrar', exact: true })).toHaveCount(0);
    }
    expect(writes).toHaveLength(0);
    await amount.fill('1000.50');
    await amount.press('Tab');
    await amount.focus();
    await expect(amount).toHaveValue('1.000,50');
    await amount.press('End');
    await amount.press('Backspace');
    await expect(amount).toHaveValue('1.000,5');
    await amount.press('0');
    await expect(amount).toHaveValue('1.000,50');
    await page.getByRole('button', { name: 'Guardar', exact: true }).click();
    await expect(page.getByText(/¿Querés registrar/)).toContainText('$1.000,50');
});

test('Cobro precargado conserva centavos y aplica el límite de saldo', async ({ page }) => {
    const { writes } = await setup(page);
    await page.goto('/liquidaciones/10');
    await page.getByRole('button', { name: 'Registrar pago del inquilino', exact: true }).click();
    const amount = page.locator('#tenant-payment-amount');
    await expect(amount).toHaveValue('1.000,50');
    await amount.fill('1000,51');
    await expect(amount).toHaveAttribute('aria-invalid', 'true');
    await page.locator('button[form=tenant-payment-form]').click();
    expect(writes).toHaveLength(0);
    await amount.fill('1000,50');
    await page.locator('button[form=tenant-payment-form]').click();
    await expect.poll(() => writes.length).toBe(1);
    expect(JSON.parse(writes[0]).monto).toBe(1000.5);
});

for (const width of [1366, 390]) {
    test(`Los miles se actualizan al escribir, borrar y reemplazar dígitos (${width}px)`, async ({ page }, testInfo) => {
        await page.setViewportSize({ width, height: 900 });
        await setup(page);
        await page.goto('/cajachica');
        await page.getByRole('button', { name: 'Nuevo Movimiento', exact: true }).click();
        const amount = page.locator('#cash-movement-amount');
        await expect(amount).toHaveAttribute('inputmode', 'decimal');
        await amount.fill('');
        for (const [keys, expected] of [['150', '150'], ['0', '1.500'], ['00', '150.000']] as const) {
            await amount.pressSequentially(keys);
            await expect(amount).toHaveValue(expected);
        }
        await amount.press('Backspace');
        await expect(amount).toHaveValue('15.000');

        await amount.fill('1234567');
        await amount.evaluate((input: HTMLInputElement) => input.setSelectionRange(3, 3));
        await amount.press('9');
        await expect(amount).toHaveValue('12.934.567');
        await amount.press('Backspace');
        await expect(amount).toHaveValue('1.234.567');
        await amount.press('Delete');
        await expect(amount).toHaveValue('124.567');

        await amount.fill('1234567');
        await amount.evaluate((input: HTMLInputElement) => input.setSelectionRange(6, 6));
        await amount.press('Backspace');
        await expect(amount).toHaveValue('123.567');
        await amount.fill('1234567');
        await amount.evaluate((input: HTMLInputElement) => input.setSelectionRange(5, 5));
        await amount.press('Delete');
        await expect(amount).toHaveValue('123.467');

        await amount.fill('1234567');
        await amount.evaluate((input: HTMLInputElement) => input.setSelectionRange(2, 5));
        await amount.press('9');
        await expect(amount).toHaveValue('19.567');
        await amount.press('8');
        await expect(amount).toHaveValue('198.567');

        await amount.fill('');
        await amount.pressSequentially('5000000,');
        await expect(amount).toHaveValue('5.000.000,');
        await amount.pressSequentially('00');
        await expect(amount).toHaveValue('5.000.000,00');
        expect(await amount.evaluate((input: HTMLInputElement) => input.validity.valid)).toBe(true);
        await page.screenshot({ path: testInfo.outputPath(`miles-automaticos-${width}.png`) });
        await amount.fill('');
        await expect(amount).toHaveValue('');
        expect(await amount.evaluate((input: HTMLInputElement) => input.validity.valueMissing)).toBe(true);
    });
}

test('Pegar importes con puntos, coma o decimal de planilla conserva el valor enviado', async ({ page, context }) => {
    const { movements } = await setup(page);
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.goto('/cajachica');
    await page.getByRole('button', { name: 'Nuevo Movimiento', exact: true }).click();
    await page.locator('#cash-movement-concept').fill('Importe pegado');
    const amount = page.locator('#cash-movement-amount');
    for (const [pasted, displayed] of [['1.000', '1.000'], ['150.000', '150.000'], [' 5.000.000,50 ', '5.000.000,50'], ['5000000.50', '5.000.000,50']] as const) {
        await amount.fill('');
        await page.evaluate(value => navigator.clipboard.writeText(value), pasted);
        await amount.press('ControlOrMeta+V');
        await expect(amount).toHaveValue(displayed);
        expect(await amount.evaluate((input: HTMLInputElement) => input.validity.valid)).toBe(true);
    }
    await page.getByRole('button', { name: 'Guardar', exact: true }).click();
    await expect(page.getByText(/¿Querés registrar/)).toContainText('$5.000.000,50');
    await page.getByRole('button', { name: 'Registrar', exact: true }).click();
    await expect.poll(() => movements.length).toBe(1);
    expect(movements[0].monto).toBe(5000000.5);
});


test('los porcentajes aceptan decimales y los días/frecuencias siguen siendo enteros', async ({ page }) => {
    await setup(page);
    await page.goto('/e2e/fixtures/modal-scroll.html?modal=fees');
    const percentage = page.locator('#fee-percentage');
    await percentage.fill('12,5');
    await percentage.press('Tab');
    await expect(percentage).toHaveValue('12,50');
    expect(await percentage.evaluate((el: HTMLInputElement) => el.validity.valid)).toBe(true);
    await percentage.fill('100,01');
    await expect(percentage).toHaveAttribute('aria-invalid', 'true');
    await page.goto('/contratos');
    await page.getByRole('button', { name: 'Nuevo contrato', exact: true }).click();
    const frequency = page.locator('#contract-update-frequency');
    await frequency.fill('3,5');
    await expect(frequency).toHaveAttribute('aria-invalid', 'true');
    await expect(page.getByText('Ingresá un número entero.', { exact: true })).toBeVisible();
    await frequency.fill('3');
    expect(await frequency.evaluate((el: HTMLInputElement) => el.validity.valid)).toBe(true);
});
