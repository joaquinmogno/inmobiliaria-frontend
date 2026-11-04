import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const clients = [
    { slug: 'teodoro', title: 'Teodoro' },
    { slug: 'daniel', title: 'Daniel' }
];

for (const { slug, title } of clients) {
    const peer = clients.find(client => client.slug !== slug)!;
    test.describe(title, () => {
        const permissions = [`${slug}.ver`, `${slug}.crear`, `${slug}.editar`, `${slug}.anular`, `${slug}.reportes`];

        async function setup(page: Page, allowed = permissions) {
            const user = { id: 5, email: `${slug}@test.local`, fullName: `Responsable de ${title}`, nombreCompleto: `Responsable de ${title}`, tipo: 'USUARIO', role: 'USUARIO', permissions: allowed, inmobiliaria: { id: 1, nombre: 'PropControl' } };
            const attachment = { id: 20, nombreArchivo: `recibo-${slug}.pdf`, tipoContenido: 'application/pdf', tamano: 20, fechaCreacion: '2026-11-04T17:00:00Z', creadoPor: user };
            const sample = {
                id: 1, version: 1, fecha: '2026-11-04', tipo: 'GASTO', detalle: `Luz de ${title}`, monto: '2500.50', moneda: 'ARS',
                categoria: `Servicios de ${title}`, metodoPago: null, cuentaPago: `Cuenta personal de ${title}`, observaciones: null,
                fechaCreacion: '2026-11-04T17:00:00Z', fechaActualizacion: '2026-11-04T17:00:00Z',
                anuladoEn: null as string | null, motivoAnulacion: null as string | null, creadoPor: user, actualizadoPor: null, anuladoPor: null, adjuntos: [attachment]
            };
            const records = [sample];
            const requests: Array<{ path: string; method: string; body: string | null; query: string }> = [];
            await page.route('**/api/**', async route => {
                const request = route.request();
                const url = new URL(request.url());
                const path = url.pathname;
                requests.push({ path, method: request.method(), body: request.postData(), query: url.search });
                let body: unknown = {};
                if (path.endsWith('/auth/me')) body = user;
                else if (path.endsWith('/opciones')) body = { categorias: path.startsWith(`/api/${slug}`) ? [`Servicios de ${title}`] : ['Oficina'], mediosPago: [], cuentasPago: path.startsWith(`/api/${slug}`) ? [`Cuenta personal de ${title}`] : ['Cuenta interna'], usuarios: [user] };
                else if (path.startsWith(`/api/${slug}/reportes/`) || path === `/api/${slug}/adjuntos/20/archivo`) {
                    const excel = path.endsWith('/excel');
                    const filename = path.includes('/adjuntos/') ? attachment.nombreArchivo : `${slug}-${url.searchParams.get('periodo')}.${excel ? 'xlsx' : 'pdf'}`;
                    await route.fulfill({ status: 200, headers: { 'Content-Type': excel ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 'application/pdf', 'Content-Disposition': `attachment; filename="${filename}"` }, body: excel ? Buffer.from('PK-test') : Buffer.from('%PDF-1.4\n%%EOF') });
                    return;
                } else if (path === `/api/${slug}` && request.method() === 'GET') {
                    const state = url.searchParams.get('estado') || 'VIGENTES';
                    const rows = records.filter(row => state === 'TODOS' || (state === 'ANULADOS' ? row.anuladoEn : !row.anuladoEn));
                    const gastos = rows.filter(row => !row.anuladoEn).reduce((sum, row) => sum + Number(row.monto), 0);
                    body = { data: rows, meta: { page: 1, limit: 25, total: rows.length, totalPages: rows.length ? 1 : 0 }, periodo: url.searchParams.get('periodo'), resumen: [{ moneda: 'ARS', ingresos: 0, gastos, diferencia: -gastos }] };
                } else if (path === `/api/${peer.slug}`) {
                    body = { data: [{ ...sample, id: 98, detalle: `Gasto privado de ${peer.title}`, cuentaPago: `Cuenta de ${peer.title}` }], meta: { page: 1, limit: 25, total: 1, totalPages: 1 }, periodo: url.searchParams.get('periodo'), resumen: [] };
                } else if (path === '/api/control-interno') {
                    body = { data: [{ ...sample, id: 99, detalle: 'Gasto privado de oficina', cuentaPago: 'Cuenta interna' }], meta: { page: 1, limit: 25, total: 1, totalPages: 1 }, periodo: url.searchParams.get('periodo'), resumen: [] };
                } else if (path === `/api/${slug}` && request.method() === 'POST') {
                    const field = (name: string) => request.postData()?.split(`name="${name}"\r\n\r\n`)[1]?.split('\r\n')[0] || '';
                    const record = { ...sample, id: 2, detalle: field('detalle'), monto: field('monto'), adjuntos: [] };
                    records.push(record);
                    body = record;
                } else if (path === `/api/${slug}/1` && request.method() === 'PUT') {
                    Object.assign(sample, request.postDataJSON());
                    sample.version++;
                    body = sample;
                } else if (path === `/api/${slug}/1/adjuntos`) {
                    sample.adjuntos.push({ ...attachment, id: 21, nombreArchivo: 'nuevo.pdf' });
                    sample.version++;
                    body = sample;
                } else if (path === `/api/${slug}/1/anular`) {
                    sample.anuladoEn = '2026-11-04T18:00:00Z';
                    sample.motivoAnulacion = request.postDataJSON().motivo;
                    sample.version++;
                    body = sample;
                } else if (path.includes('/contratos/alertas') || path.includes('/alertas-operativas')) body = [];
                await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
            });
            await page.addInitScript(data => {
                localStorage.setItem('user', JSON.stringify(data));
                localStorage.setItem('loginTimestamp', String(Date.now()));
            }, user);
            await page.goto(`/${slug}`);
            return requests;
        }

        test(`Control interno no concede acceso a ${title}`, async ({ page }) => {
            const requests = await setup(page, ['control_interno.ver', 'control_interno.crear']);
            await expect(page.getByRole('heading', { name: 'Acceso denegado' })).toBeVisible();
            await expect(page.getByRole('link', { name: title, exact: true })).toHaveCount(0);
            expect(requests.some(request => request.path.startsWith(`/api/${slug}`))).toBe(false);
        });

        test('el permiso del otro cliente no concede acceso a este apartado', async ({ page }) => {
            const requests = await setup(page, [`${peer.slug}.ver`, `${peer.slug}.crear`]);
            await expect(page.getByRole('heading', { name: 'Acceso denegado' })).toBeVisible();
            await expect(page.getByRole('link', { name: title, exact: true })).toHaveCount(0);
            expect(requests.some(request => request.path.startsWith(`/api/${slug}`))).toBe(false);
        });

        test('consulta permite ver comprobantes y oculta las acciones que necesitan otros permisos', async ({ page }) => {
            await page.setViewportSize({ width: 1440, height: 1000 });
            await setup(page, [`${slug}.ver`]);
            await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible();
            await expect(page.getByRole('link', { name: 'Control interno', exact: true })).toHaveCount(0);
            await expect(page.getByRole('link', { name: peer.title, exact: true })).toHaveCount(0);
            for (const name of ['Agregar movimiento', 'Editar', 'Anular', 'Excel', 'PDF']) await expect(page.getByRole('button', { name, exact: true })).toHaveCount(0);
            await page.getByRole('button', { name: 'Comprobantes (1)' }).filter({ visible: true }).click();
            const dialog = page.getByRole('dialog');
            await expect(dialog.getByText(`recibo-${slug}.pdf`)).toBeVisible();
            await expect(dialog.getByRole('button', { name: 'Adjuntar comprobantes' })).toHaveCount(0);
            const download = page.waitForEvent('download');
            await dialog.getByRole('button', { name: 'Descargar', exact: true }).click();
            expect((await download).suggestedFilename()).toBe(`recibo-${slug}.pdf`);
        });

        test(`alta, edición, adjuntos y anulación usan exclusivamente la API de ${title}`, async ({ page }) => {
            const requests = await setup(page);
            await page.getByRole('button', { name: 'Agregar movimiento', exact: true }).click();
            let dialog = page.getByRole('dialog', { name: `Agregar movimiento de ${title}` });
            await dialog.getByLabel('Detalle de lo pagado o recibido').fill(`Expensas de ${title}`);
            await dialog.getByLabel('Importe *', { exact: true }).fill('3500.50');
            await dialog.getByRole('button', { name: 'Guardar movimiento' }).click();
            await expect(dialog).not.toBeVisible();
            expect(requests.find(request => request.path === `/api/${slug}` && request.method === 'POST')?.body).toContain('3500.50');

            await page.getByRole('button', { name: 'Editar', exact: true }).filter({ visible: true }).first().click();
            dialog = page.getByRole('dialog', { name: `Editar movimiento de ${title}` });
            await dialog.getByLabel('Importe *', { exact: true }).fill('3000');
            await dialog.getByRole('button', { name: 'Guardar movimiento' }).click();
            await expect(dialog).not.toBeVisible();
            expect(JSON.parse(requests.find(request => request.method === 'PUT')?.body || '{}')).toMatchObject({ monto: '3000', version: 1 });

            await page.getByRole('button', { name: 'Comprobantes (1)' }).filter({ visible: true }).click();
            dialog = page.getByRole('dialog');
            await dialog.locator('#additional-internal-receipts').setInputFiles({ name: 'nuevo.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4\n%%EOF') });
            await dialog.getByRole('button', { name: 'Adjuntar comprobantes' }).click();
            await expect(dialog.getByText('nuevo.pdf')).toBeVisible();
            await dialog.getByRole('button', { name: 'Cerrar', exact: true }).click();

            await page.getByRole('button', { name: 'Anular', exact: true }).filter({ visible: true }).first().click();
            dialog = page.getByRole('dialog', { name: `Anular movimiento de ${title}` });
            await expect(dialog.getByText(new RegExp(`totales de ${title}`))).toBeVisible();
            await dialog.getByLabel('Motivo de la anulación').fill('Cargado por duplicado');
            await dialog.getByRole('button', { name: 'Confirmar anulación' }).click();
            await expect(dialog).not.toBeVisible();
            expect(JSON.parse(requests.find(request => request.path.endsWith('/1/anular'))?.body || '{}')).toMatchObject({ version: 3, motivo: 'Cargado por duplicado' });
            expect(requests.some(request => request.path.startsWith('/api/control-interno') || request.path.includes('/cajachica'))).toBe(false);
        });

        test(`los reportes conservan el nombre de ${title} y los filtros elegidos`, async ({ page }) => {
            const requests = await setup(page);
            await page.getByLabel('Mes', { exact: true }).fill('2026-11');
            await page.getByText('Más filtros', { exact: true }).click();
            await page.getByRole('button', { name: /^Categoría:/ }).click();
            await page.getByRole('option', { name: `Servicios de ${title}`, exact: true }).click();
            for (const format of ['Excel', 'PDF']) {
                const download = page.waitForEvent('download');
                await page.getByRole('button', { name: format, exact: true }).click();
                expect((await download).suggestedFilename()).toBe(`${slug}-2026-11.${format === 'Excel' ? 'xlsx' : 'pdf'}`);
                const request = requests.find(item => item.path === `/api/${slug}/reportes/${format.toLowerCase()}`);
                expect(request?.query).toContain('periodo=2026-11');
                expect(new URLSearchParams(request?.query).get('categoria')).toBe(`Servicios de ${title}`);
            }
            const reportRequests = () => requests.filter(item => item.path === `/api/${slug}/reportes/pdf`).length;
            const before = reportRequests();
            await page.getByRole('button', { name: 'Imprimir PDF', exact: true }).click();
            await expect.poll(reportRequests).toBe(before + 1);
        });

        test('navegar entre apartados descarta los resultados y filtros del anterior', async ({ page }) => {
            await page.setViewportSize({ width: 1440, height: 1000 });
            await setup(page, [...permissions, 'control_interno.ver', `${peer.slug}.ver`]);
            await expect(page.getByRole('cell', { name: new RegExp(`Luz de ${title}`) })).toBeVisible();
            await page.getByLabel('Buscar por detalle, cuenta u observaciones').fill('Luz');
            await page.getByRole('link', { name: 'Control interno', exact: true }).click();
            await expect(page.getByRole('heading', { name: 'Control interno', exact: true })).toBeVisible();
            await expect(page.getByRole('cell', { name: /Gasto privado de oficina/ })).toBeVisible();
            await expect(page.getByRole('cell', { name: new RegExp(`Luz de ${title}`) })).toHaveCount(0);
            await expect(page.getByLabel('Buscar por detalle, cuenta u observaciones')).toHaveValue('');
            await expect(page.getByRole('button', { name: 'Agregar movimiento', exact: true })).toHaveCount(0);
            await page.getByRole('link', { name: peer.title, exact: true }).click();
            await expect(page.getByRole('heading', { name: peer.title, exact: true })).toBeVisible();
            await expect(page.getByRole('cell', { name: new RegExp(`Gasto privado de ${peer.title}`) })).toBeVisible();
            await expect(page.getByRole('cell', { name: /Gasto privado de oficina/ })).toHaveCount(0);
            await expect(page.getByRole('button', { name: 'Agregar movimiento', exact: true })).toHaveCount(0);
            await page.getByRole('link', { name: title, exact: true }).click();
            await expect(page.getByRole('cell', { name: new RegExp(`Luz de ${title}`) })).toBeVisible();
            await expect(page.getByRole('cell', { name: /Gasto privado de oficina/ })).toHaveCount(0);
            await expect(page.getByRole('cell', { name: new RegExp(`Gasto privado de ${peer.title}`) })).toHaveCount(0);
            await expect(page.getByRole('button', { name: 'Agregar movimiento', exact: true })).toBeVisible();
        });

        test(`${title} se adapta a móvil y mantiene accesibles la planilla y los formularios`, async ({ page }, testInfo) => {
            await page.setViewportSize({ width: 390, height: 844 });
            await setup(page);
            await expect(page.getByRole('article', { name: `Luz de ${title}` })).toBeVisible();
            expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
            expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
            await page.screenshot({ path: testInfo.outputPath(`${slug}-movil.png`), fullPage: true });
            await page.getByRole('button', { name: 'Agregar movimiento', exact: true }).click();
            await expect(page.getByRole('dialog', { name: `Agregar movimiento de ${title}` }).getByRole('heading', { name: `Agregar movimiento de ${title}` })).toBeVisible();
            // Medir el contraste con el panel abierto, después de su transición de opacidad.
            await expect(page.getByRole('dialog').locator('.ui-modal-panel')).toHaveCSS('opacity', '1');
            expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
        });
    });
}
