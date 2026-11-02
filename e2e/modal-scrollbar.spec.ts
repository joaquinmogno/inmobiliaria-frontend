import { devices, expect, test, type Page } from '@playwright/test';

// Headless Chromium normally hides native scrollbars; exercise the actual track and thumb.
test.use({ launchOptions: { ignoreDefaultArgs: ['--hide-scrollbars'] } });

const user = { id: 1, email: 'admin@test.local', fullName: 'Administrador', nombreCompleto: 'Administrador', tipo: 'ADMIN', role: 'ADMIN', permissions: [], inmobiliaria: { id: 1, nombre: 'PropControl' } };
const contract = { id: 1, version: 1, estado: 'ACTIVO', moneda: 'ARS', fechaInicio: '2026-01-01', fechaFin: '2027-12-31', montoAlquiler: 500000, montoHonorarios: 25000, diaVencimiento: 10, administrado: true, observaciones: 'Detalle de contrato. '.repeat(80), propiedad: { id: 1, direccion: 'Inmueble de prueba' }, propietarios: [], inquilinos: [], historialRenovaciones: [], actualizaciones: [], auditLogs: [] };

async function openFixture(page: Page, modal: string) {
    await page.addInitScript(user => { localStorage.setItem('user', JSON.stringify(user)); localStorage.setItem('loginTimestamp', String(Date.now())); }, user);
    await page.route('**/api/**', async route => {
        const path = new URL(route.request().url()).pathname;
        let data: any = [];
        if (path.endsWith('/auth/me')) data = user;
        else if (path === '/api/contratos/1') data = contract;
        else if (path === '/api/contratos') data = { data: [], meta: { total: 0, page: 1, limit: 10, totalPages: 0 } };
        else if (path === '/api/usuarios') data = { data: [{ ...user, id: 2, nombreCompleto: 'Usuario de prueba', fullName: 'Usuario de prueba', activo: true }], meta: { total: 1, page: 1, limit: 25, totalPages: 1 } };
        else if (path === '/api/personas') data = { data: [], meta: { total: 0, page: 1, limit: 25, totalPages: 0 } };
        else if (path === '/api/roles') data = [{ id: 1, nombre: 'Rol de prueba', activo: true, cantidadUsuarios: 0, permisos: [] }];
        else if (path === '/api/cuentas-bancarias') data = [{ id: 1, nombre: 'Cuenta de prueba', banco: 'Banco', moneda: 'ARS', activa: true }];
        else if (path === '/api/cajachica') data = { data: [{ id: 1, fecha: '2026-10-01', tipo: 'EGRESO', concepto: 'Movimiento de prueba', monto: 1000, moneda: 'ARS', cuenta: 'CAJA', adjuntos: [], usuario: { nombreCompleto: 'Administrador' } }], meta: { total: 1, page: 1, limit: 25, totalPages: 1 } };
        else if (path === '/api/cajachica/resumen') data = { monedas: [], cuentasBancarias: [], balance: 0, ingresos: 0, egresos: 0 };
        else if (path === '/api/alertas-operativas') data = [{ clave: 'alerta-1', titulo: 'Alerta de prueba', descripcion: 'Revisar contrato', prioridad: 'ALTA', tipo: 'ACTUALIZACION', contratoId: 1, propiedad: contract.propiedad, gestion: null, enlace: '/contratos', cantidad: 1 }];
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(data) });
    });
    await page.goto(`/e2e/fixtures/modal-scroll.html?modal=${modal}`);
    if (modal === 'reauthentication') await page.getByRole('button', { name: 'Abrir popup' }).click();
    if (modal === 'user-create') await page.getByRole('button', { name: 'Nuevo usuario' }).click();
    if (modal === 'user-reset') {
        await page.getByRole('article', { name: 'Usuario de prueba' }).getByRole('button', { name: 'Acciones' }).click();
        await page.getByRole('menuitem', { name: 'Cambiar contraseña' }).click();
    }
    if (modal === 'person-create') await page.getByRole('button', { name: /Nueva persona/i }).click();
    if (modal === 'cash-create') await page.getByRole('button', { name: /Nuevo movimiento/i }).click();
    if (modal === 'cash-transfer') await page.getByRole('button', { name: /Transferir entre cuentas/i }).click();
    if (modal === 'cash-receipts') await page.getByRole('button', { name: /comprobantes/i }).first().click();
    if (modal === 'operational-alert') await page.getByRole('button', { name: 'Asignar y registrar' }).click();
}

const modals = ['movement', 'liquidation-note', 'update', 'installments', 'fees', 'reversal', 'lifecycle', 'adjustment', 'liquidation-contract', 'exception', 'person-details', 'tenant-credit', 'confirmation', 'reauthentication', 'tenant-payment', 'owner-payment', 'new-contract', 'contract-details', 'new-liquidation', 'role', 'internal-movement', 'internal-receipts', 'internal-cancel', 'rent', 'terms-fees', 'profile', 'user-create', 'user-reset', 'person-create', 'cash-create', 'cash-transfer', 'cash-receipts', 'operational-alert'];

for (const width of [390, 1280]) {
    for (const modal of modals) {
        test(`${modal}: el popup conserva el scroll y no se cierra al usar la barra (${width}px)`, async ({ page }) => {
            await page.setViewportSize({ width, height: 480 });
            await openFixture(page, modal);
            const panel = page.locator('[id^="headlessui-dialog-panel-"], [data-modal-panel]').filter({ visible: true }).last();
            await expect(panel).toBeVisible();
            // Wait for opening transitions before measuring the native scrollbar.
            await expect.poll(() => panel.evaluate(element => element.getAnimations({ subtree: true }).filter(animation => animation.playState === 'running').length)).toBe(0);
            const note = panel.locator('textarea').first();
            if (await note.count()) await note.fill('Nota escrita antes de desplazar');
            const bounds = await panel.boundingBox();
            expect(bounds!.y).toBeGreaterThanOrEqual(-1);
            expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(481);
            const externalScrollers = await panel.evaluate(element => {
                const result: string[] = [];
                let parent = element.parentElement;
                while (parent && parent !== document.body) {
                    if (/auto|scroll/.test(getComputedStyle(parent).overflowY) && parent.scrollHeight > parent.clientHeight + 1) result.push(parent.className);
                    parent = parent.parentElement;
                }
                return result;
            });
            expect(externalScrollers).toEqual([]);

            const scrollIndex = await panel.evaluate(element => [element, ...element.querySelectorAll<HTMLElement>('*')].findIndex(candidate => /auto|scroll/.test(getComputedStyle(candidate).overflowY) && candidate.scrollHeight > candidate.clientHeight + 1));
            if (scrollIndex >= 0) {
                const handle = await panel.evaluateHandle((element, index) => [element, ...element.querySelectorAll<HTMLElement>('*')][index] as HTMLElement, scrollIndex);
                const box = (await handle.asElement()!.boundingBox())!;
                await handle.evaluate(element => { element.scrollTop = 0; });
                await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
                await page.mouse.wheel(0, 300);
                const wheelDestination = await handle.evaluate(element => Math.min(300, element.scrollHeight - element.clientHeight));
                // Wait for the compositor to finish this wheel event before starting a thumb drag.
                await expect.poll(() => handle.evaluate(element => element.scrollTop)).toBe(wheelDestination);
                await handle.evaluate(async element => {
                    element.scrollTop = 0;
                    // Native scrollbars paint after layout; wait until the thumb is back at the top.
                    await new Promise(requestAnimationFrame);
                    await new Promise(requestAnimationFrame);
                });
                const gutter = await handle.evaluate(element => element.offsetWidth - element.clientWidth - parseFloat(getComputedStyle(element).borderLeftWidth) - parseFloat(getComputedStyle(element).borderRightWidth));
                const x = box.x + box.width - Math.max(gutter / 2, 2);
                const thumbOffset = await handle.evaluate(element => 15 + Math.max(18, (element.clientHeight - 30) * element.clientHeight / element.scrollHeight) / 2);
                await page.mouse.move(x, box.y + thumbOffset);
                await page.mouse.down();
                await page.mouse.move(x, box.y + box.height - 20, { steps: 10 });
                await page.mouse.up();
                await expect(panel).toBeVisible();
                if (gutter > 0) await expect.poll(() => handle.evaluate(element => element.scrollTop)).toBeGreaterThan(0);
                await handle.evaluate(element => { element.scrollTop = element.scrollHeight; });
                await expect(panel).toBeVisible();
            }
            const lastAction = panel.getByRole('button').last();
            await lastAction.scrollIntoViewIfNeeded();
            await expect(lastAction).toBeInViewport();
            await expect(page.getByTestId('modal-closed')).toHaveCount(0);
            if (await note.count()) await expect(note).toHaveValue('Nota escrita antes de desplazar');
            expect(await page.locator('html').evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
        });
    }
}

test('el desplazamiento no impide cerrar intencionalmente con Cancelar, Escape o el fondo', async ({ page }) => {
    for (const method of ['cancel', 'escape', 'backdrop']) {
        await openFixture(page, 'movement');
        const panel = page.locator('[id^="headlessui-dialog-panel-"]');
        await expect(panel).toBeVisible();
        if (method === 'cancel') await panel.getByRole('button', { name: 'Cancelar', exact: true }).click();
        if (method === 'escape') await page.keyboard.press('Escape');
        if (method === 'backdrop') await page.mouse.click(2, 2);
        await expect(page.getByTestId('modal-closed')).toBeVisible();
    }
});

test.describe('desplazamiento táctil', () => {
    const { defaultBrowserType, ...mobileDevice } = devices['Pixel 5'];
    test.use(mobileDevice);
    for (const modal of ['movement', 'new-contract', 'internal-movement']) {
        test(`${modal}: el gesto permite bajar sin cerrar la ventana`, async ({ page }) => {
            await openFixture(page, modal);
            const panel = page.locator('[id^="headlessui-dialog-panel-"]');
            await expect(panel).toBeVisible();
            await expect.poll(() => panel.evaluate(element => element.getAnimations({ subtree: true }).filter(animation => animation.playState === 'running').length)).toBe(0);
            const scroller = await panel.evaluateHandle(element => [element, ...element.querySelectorAll<HTMLElement>('*')].find(candidate => /auto|scroll/.test(getComputedStyle(candidate).overflowY) && candidate.scrollHeight > candidate.clientHeight + 1) as HTMLElement);
            const bounds = (await scroller.asElement()!.boundingBox())!;
            const client = await page.context().newCDPSession(page);
            const x = bounds.x + bounds.width / 2;
            const startY = bounds.y + bounds.height * 0.8;
            await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y: startY }] });
            for (let step = 1; step <= 8; step++) await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: startY - bounds.height * 0.6 * step / 8 }] });
            await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
            await expect.poll(() => scroller.evaluate(element => element.scrollTop)).toBeGreaterThan(0);
            await expect(panel).toBeVisible();
            await expect(page.getByTestId('modal-closed')).toHaveCount(0);
        });
    }
});
