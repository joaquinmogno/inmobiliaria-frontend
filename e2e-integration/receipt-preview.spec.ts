import { test, expect, type Page } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';

// Full Chromium includes the PDF viewer; headless-shell can leave a valid PDF blank.
test.use({ channel: 'chromium' });

async function expectRenderedPdf(page: Page) {
  await expect.poll(() => page.frames().some(frame => frame.url().startsWith('chrome-extension://'))).toBe(true);
  const viewer = page.frames().find(frame => frame.url().startsWith('chrome-extension://'))!;
  await expect.poll(() => viewer.locator('pdf-viewer').evaluate(element => {
    const pdf = element as HTMLElement & { loadProgress_: number; documentDimensions?: { pageDimensions: unknown[] } };
    return { progress: pdf.loadProgress_, pages: pdf.documentDimensions?.pageDimensions.length || 0 };
  })).toEqual({ progress: 100, pages: 1 });
}

for (const [width, height] of [[1366, 768], [1440, 900]]) {
  for (const module of ['cajachica', 'control-interno', 'teodoro', 'daniel']) {
    test(`PDF real visible sin bloqueo CSP: ${module} ${width}x${height}`, async ({ page }, info) => {
      await page.setViewportSize({ width, height });
      const violations: string[] = [];
      page.on('console', message => {
        if (/violates.*Content Security Policy/i.test(message.text())) violations.push(message.text());
      });
      const document = await page.goto('/login');
      const csp = document!.headers()['content-security-policy'];
      expect(csp).toContain('frame-src blob:;');
      expect(csp).toContain("object-src 'none'");
      expect(csp).toContain("frame-ancestors 'none'");
      await page.getByPlaceholder('ejemplo@correo.com').fill('admin.integration@example.com');
      await page.getByPlaceholder('••••••••').fill('ProdTest!2026_Strong');
      const login = page.waitForResponse(response => response.url().endsWith('/api/auth/login'));
      await page.getByRole('button', { name: /Ingresar a mi cuenta/ }).click();
      const { csrfToken } = await (await login).json();
      await expect(page).toHaveURL(/\/home$/);
      const api = async (path: string, data?: unknown) => {
        const result = await page.evaluate(async ({ path, data, csrfToken }) => {
          const response = await fetch(`/api${path}`, {
            method: data === undefined ? 'GET' : 'POST',
            headers: { 'content-type': 'application/json', 'x-csrf-token': csrfToken },
            ...(data === undefined ? {} : { body: JSON.stringify(data) })
          });
          return { status: response.status, data: await response.json() };
        }, { path, data, csrfToken });
        expect(result.status, JSON.stringify(result.data)).toBeLessThan(300);
        return result.data;
      };
      const date = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' }).format(new Date());
      const name = `Vista previa ${module} ${width} ${Date.now()}`;
      const moneda = module === 'cajachica' || module === 'teodoro' ? 'ARS' : 'USD';
      const movement = await api(`/${module}`, {
        fecha: date, monto: '135760.25', moneda, metodoPago: 'EFECTIVO',
        ...(module === 'cajachica' ? { tipo: 'EGRESO', concepto: name } : { tipo: 'GASTO', detalle: name })
      });
      await page.goto(`/${module}?periodo=${date.slice(0, 7)}`);
      const row = page.getByRole('row').filter({ hasText: name });
      await row.getByRole('button', { name: 'Recibo PDF', exact: true }).click();
      const dialog = page.getByRole('dialog', { name: `Recibo del movimiento #${movement.id}` });
      await dialog.getByLabel('Recibe el dinero *').fill('José Albañil');
      const response = page.waitForResponse(response => response.url().endsWith('/recibos/vista-previa'));
      await dialog.getByRole('button', { name: 'Vista previa', exact: true }).click();
      const previewResponse = await response;
      expect(previewResponse.status()).toBe(200);
      const pdf = Buffer.from((await previewResponse.json()).pdf, 'base64');
      const text = execFileSync('pdftotext', ['-layout', '-', '-'], { input: pdf, encoding: 'utf8' });
      expect(text).toContain('VISTA PREVIA');
      expect(text).toContain('SIN EMITIR');
      expect(text).toContain('135.760,25');
      expect(text).toContain(`(${moneda})`);
      expect(text).toContain('José Albañil');
      const preview = dialog.getByRole('region', { name: 'Vista previa del recibo', exact: true });
      await expect(preview).toBeFocused();
      await expect(preview.getByRole('heading')).toBeInViewport();
      await expect(dialog.getByLabel('Recibe el dinero *')).toHaveCount(0);
      const heading = await preview.getByRole('heading').boundingBox();
      const dialogBox = await dialog.locator('[id^="headlessui-dialog-panel-"]').boundingBox();
      expect(heading!.y - dialogBox!.y).toBeLessThan(130);
      await expectRenderedPdf(page);
      expect(violations).toEqual([]);
      await expect(dialog.getByRole('button', { name: 'Emitir recibo', exact: true })).toBeInViewport({ ratio: 1 });
      await page.screenshot({ path: info.outputPath('vista-previa-real.png') });
      const download = page.waitForEvent('download');
      await preview.getByRole('link', { name: 'Descargar vista previa' }).click();
      expect(await readFile((await (await download).path())!)).toEqual(pdf);
      const popup = page.waitForEvent('popup');
      await preview.getByRole('link', { name: 'Abrir vista previa en otra pestaña' }).click();
      const tab = await popup;
      await expectRenderedPdf(tab);
      await tab.close();
      const context = await api(`/${module}/${movement.id}/recibos`);
      expect(context.ultimaVersion).toBe(0);
      expect(context.versiones).toEqual([]);
      expect(Number(context.movimiento.monto)).toBe(135760.25);
      expect(context.movimiento.moneda).toBe(moneda);
      await dialog.getByRole('button', { name: 'Volver a editar', exact: true }).click();
      await expect(dialog.getByRole('heading', { name: '1. Datos del recibo' })).toBeFocused();
      await expect(dialog.getByLabel('Recibe el dinero *')).toHaveValue('José Albañil');
      await dialog.getByLabel('Concepto del recibo *').fill(`${name} corregido`);
      await expect(preview).toHaveCount(0);
      await expect(dialog.getByRole('button', { name: 'Emitir recibo', exact: true })).toHaveCount(0);
    });
  }
}
