# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: liquidation-history-notebook.spec.ts >> historial compacto, teclado y menú expandido/contraído 1440x900
- Location: e2e/liquidation-history-notebook.spec.ts:43:5

# Error details

```
Error: expect(locator).toBeFocused() failed

Locator: getByRole('listbox')
Expected: focused
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeFocused" with timeout 5000ms
  - waiting for getByRole('listbox')

```

```yaml
- link "Saltar al contenido principal":
  - /url: "#main-content"
- complementary:
  - link "Logo de PropControl":
    - /url: /home
    - img "Logo de PropControl"
  - separator
  - navigation "Navegación principal":
    - link "Inicio":
      - /url: /home
    - link "Contratos":
      - /url: /contratos
    - button "Mostrar opciones de contratos"
    - link "Liquidaciones":
      - /url: /liquidaciones
    - link "Gestión financiera":
      - /url: /cajachica
    - link "Cobros de inquilinos":
      - /url: /pagos
    - link "Control interno":
      - /url: /control-interno
    - link "Teodoro":
      - /url: /teodoro
    - link "Daniel":
      - /url: /daniel
    - link "Personas":
      - /url: /personas
    - separator
    - link "Configuración":
      - /url: /configuracion
  - button "Contraer menú"
  - text: © 2026 PropControl
- banner:
  - paragraph: Liquidaciones
  - button "0 alertas operativas activas"
  - button "Menú de usuario Administración":
    - text: Menú de usuario
    - paragraph: Administración
- main "Contenido principal":
  - heading "Liquidaciones" [level=1]
  - paragraph: Prepará el mes, registrá cobros y completá los pagos a propietarios desde un flujo guiado.
  - navigation "Vistas de liquidaciones":
    - button "Trabajo del mes"
    - button "Historial"
  - paragraph: "Estados independientes: documento, cobro, pago al propietario y cierre administrativo. “Cobro y pago resueltos” no acredita cierre administrativo ni cierre de Caja."
  - region "Historial de liquidaciones":
    - heading "Historial de liquidaciones" [level=2]
    - paragraph: Consultá períodos anteriores y encontrá operaciones por persona, propiedad, moneda o estado.
    - region "Filtros del listado":
      - text: Buscar
      - searchbox "Buscar"
      - button "Filtros · 1 activo" [expanded]
      - button "Limpiar todo"
      - text: Período (cualquier mes)
      - textbox "Período": 2026-10
      - text: Estado
      - 'button "Estado: Todos los documentos"': Todos los documentos
      - text: Moneda
      - 'button "Moneda: Todas las monedas"': Todas las monedas
      - group: Más filtros
      - paragraph: "Período: octubre de 2026"
      - paragraph: 24 resultados
    - text: "Vista actual:"
    - 'button "Quitar filtro Período: octubre de 2026"': "Período: octubre de 2026"
    - table "Historial de liquidaciones":
      - caption: Historial de liquidaciones
      - rowgroup:
        - row "Período Propiedad / Inquilino Estados Total / Pendiente Acciones":
          - columnheader "Período"
          - columnheader "Propiedad / Inquilino"
          - columnheader "Estados"
          - columnheader "Total / Pendiente"
          - columnheader "Acciones"
      - rowgroup:
        - 'row "octubre de 2026 Inmueble de prueba 1 Inquilino de prueba Vence 10/10/2026 Documento: Confirmada Cobro inquilino: Cobrado Pago propietario: Pendiente Cierre administrativo: Sin registro US$1.000,00 USD $135.760,00 ARS Pagar al propietario: Propietario con nombre completo extenso que debe seguir accesible Comprobantes Ver saldos de liquidación #10"':
          - cell "octubre de 2026"
          - cell "Inmueble de prueba 1 Inquilino de prueba Vence 10/10/2026":
            - paragraph: Inmueble de prueba 1
            - paragraph: Inquilino de prueba
            - paragraph: Vence 10/10/2026
          - 'cell "Documento: Confirmada Cobro inquilino: Cobrado Pago propietario: Pendiente Cierre administrativo: Sin registro"'
          - cell "US$1.000,00 USD $135.760,00 ARS":
            - paragraph: US$1.000,00 USD $135.760,00 ARS
          - 'cell "Pagar al propietario: Propietario con nombre completo extenso que debe seguir accesible Comprobantes Ver saldos de liquidación #10"':
            - 'link "Pagar al propietario: Propietario con nombre completo extenso que debe seguir accesible"':
              - /url: /liquidaciones/10
              - text: Pagar al propietario
            - link "Comprobantes":
              - /url: /liquidaciones/10#comprobantes
            - 'button "Ver saldos de liquidación #10"': Saldos
        - 'row "octubre de 2026 Avenida de los Constituyentes 12345, edificio de administración, piso 12, departamento B María de los Ángeles Fernández de la Administración Vence 10/10/2026 Documento: Confirmada Cobro inquilino: Cobrado Pago propietario: Pendiente Cierre administrativo: Sin registro US$1.000,00 USD $135.760,00 ARS Pagar al propietario: Propietario con nombre completo extenso que debe seguir accesible Comprobantes Ver saldos de liquidación #11"':
          - cell "octubre de 2026"
          - cell "Avenida de los Constituyentes 12345, edificio de administración, piso 12, departamento B María de los Ángeles Fernández de la Administración Vence 10/10/2026":
            - paragraph: Avenida de los Constituyentes 12345, edificio de administración, piso 12, departamento B
            - paragraph: María de los Ángeles Fernández de la Administración
            - paragraph: Vence 10/10/2026
          - 'cell "Documento: Confirmada Cobro inquilino: Cobrado Pago propietario: Pendiente Cierre administrativo: Sin registro"'
          - cell "US$1.000,00 USD $135.760,00 ARS":
            - paragraph: US$1.000,00 USD $135.760,00 ARS
          - 'cell "Pagar al propietario: Propietario con nombre completo extenso que debe seguir accesible Comprobantes Ver saldos de liquidación #11"':
            - 'link "Pagar al propietario: Propietario con nombre completo extenso que debe seguir accesible"':
              - /url: /liquidaciones/11
              - text: Pagar al propietario
            - link "Comprobantes":
              - /url: /liquidaciones/11#comprobantes
            - 'button "Ver saldos de liquidación #11"': Saldos
        - 'row "octubre de 2026 Inmueble de prueba 3 Inquilino de prueba Vence 10/10/2026 Documento: Confirmada Cobro inquilino: Cobrado Pago propietario: Pendiente Cierre administrativo: Sin registro US$1.000,00 USD $135.760,00 ARS Pagar al propietario: Propietario con nombre completo extenso que debe seguir accesible Comprobantes Ver saldos de liquidación #12"':
          - cell "octubre de 2026"
          - cell "Inmueble de prueba 3 Inquilino de prueba Vence 10/10/2026":
            - paragraph: Inmueble de prueba 3
            - paragraph: Inquilino de prueba
            - paragraph: Vence 10/10/2026
          - 'cell "Documento: Confirmada Cobro inquilino: Cobrado Pago propietario: Pendiente Cierre administrativo: Sin registro"'
          - cell "US$1.000,00 USD $135.760,00 ARS":
            - paragraph: US$1.000,00 USD $135.760,00 ARS
          - 'cell "Pagar al propietario: Propietario con nombre completo extenso que debe seguir accesible Comprobantes Ver saldos de liquidación #12"':
            - 'link "Pagar al propietario: Propietario con nombre completo extenso que debe seguir accesible"':
              - /url: /liquidaciones/12
              - text: Pagar al propietario
            - link "Comprobantes":
              - /url: /liquidaciones/12#comprobantes
            - 'button "Ver saldos de liquidación #12"': Saldos
        - 'row "octubre de 2026 Inmueble de prueba 4 Inquilino de prueba Vence 10/10/2026 Documento: Confirmada Cobro inquilino: Cobrado Pago propietario: Pendiente Cierre administrativo: Sin registro US$1.000,00 USD $135.760,00 ARS Pagar al propietario: Propietario con nombre completo extenso que debe seguir accesible Comprobantes Ver saldos de liquidación #13"':
          - cell "octubre de 2026"
          - cell "Inmueble de prueba 4 Inquilino de prueba Vence 10/10/2026":
            - paragraph: Inmueble de prueba 4
            - paragraph: Inquilino de prueba
            - paragraph: Vence 10/10/2026
          - 'cell "Documento: Confirmada Cobro inquilino: Cobrado Pago propietario: Pendiente Cierre administrativo: Sin registro"'
          - cell "US$1.000,00 USD $135.760,00 ARS":
            - paragraph: US$1.000,00 USD $135.760,00 ARS
          - 'cell "Pagar al propietario: Propietario con nombre completo extenso que debe seguir accesible Comprobantes Ver saldos de liquidación #13"':
            - 'link "Pagar al propietario: Propietario con nombre completo extenso que debe seguir accesible"':
              - /url: /liquidaciones/13
              - text: Pagar al propietario
            - link "Comprobantes":
              - /url: /liquidaciones/13#comprobantes
            - 'button "Ver saldos de liquidación #13"': Saldos
        - 'row "octubre de 2026 Inmueble de prueba 5 Inquilino de prueba Vence 10/10/2026 Documento: Confirmada Cobro inquilino: Cobrado Pago propietario: Pendiente Cierre administrativo: Sin registro US$1.000,00 USD $135.760,00 ARS Pagar al propietario: Propietario con nombre completo extenso que debe seguir accesible Comprobantes Ver saldos de liquidación #14"':
          - cell "octubre de 2026"
          - cell "Inmueble de prueba 5 Inquilino de prueba Vence 10/10/2026":
            - paragraph: Inmueble de prueba 5
            - paragraph: Inquilino de prueba
            - paragraph: Vence 10/10/2026
          - 'cell "Documento: Confirmada Cobro inquilino: Cobrado Pago propietario: Pendiente Cierre administrativo: Sin registro"'
          - cell "US$1.000,00 USD $135.760,00 ARS":
            - paragraph: US$1.000,00 USD $135.760,00 ARS
          - 'cell "Pagar al propietario: Propietario con nombre completo extenso que debe seguir accesible Comprobantes Ver saldos de liquidación #14"':
            - 'link "Pagar al propietario: Propietario con nombre completo extenso que debe seguir accesible"':
              - /url: /liquidaciones/14
              - text: Pagar al propietario
            - link "Comprobantes":
              - /url: /liquidaciones/14#comprobantes
            - 'button "Ver saldos de liquidación #14"': Saldos
        - 'row "octubre de 2026 Inmueble de prueba 6 Inquilino de prueba Vence 10/10/2026 Documento: Confirmada Cobro inquilino: Cobrado Pago propietario: Pendiente Cierre administrativo: Sin registro US$1.000,00 USD $135.760,00 ARS Pagar al propietario: Propietario con nombre completo extenso que debe seguir accesible Comprobantes Ver saldos de liquidación #15"':
          - cell "octubre de 2026"
          - cell "Inmueble de prueba 6 Inquilino de prueba Vence 10/10/2026":
            - paragraph: Inmueble de prueba 6
            - paragraph: Inquilino de prueba
            - paragraph: Vence 10/10/2026
          - 'cell "Documento: Confirmada Cobro inquilino: Cobrado Pago propietario: Pendiente Cierre administrativo: Sin registro"'
          - cell "US$1.000,00 USD $135.760,00 ARS":
            - paragraph: US$1.000,00 USD $135.760,00 ARS
          - 'cell "Pagar al propietario: Propietario con nombre completo extenso que debe seguir accesible Comprobantes Ver saldos de liquidación #15"':
            - 'link "Pagar al propietario: Propietario con nombre completo extenso que debe seguir accesible"':
              - /url: /liquidaciones/15
              - text: Pagar al propietario
            - link "Comprobantes":
              - /url: /liquidaciones/15#comprobantes
            - 'button "Ver saldos de liquidación #15"': Saldos
        - 'row "octubre de 2026 Inmueble de prueba 7 Inquilino de prueba Vence 10/10/2026 Documento: Confirmada Cobro inquilino: Cobrado Pago propietario: Pendiente Cierre administrativo: Sin registro US$1.000,00 USD $135.760,00 ARS Pagar al propietario: Propietario con nombre completo extenso que debe seguir accesible Comprobantes Ver saldos de liquidación #16"':
          - cell "octubre de 2026"
          - cell "Inmueble de prueba 7 Inquilino de prueba Vence 10/10/2026":
            - paragraph: Inmueble de prueba 7
            - paragraph: Inquilino de prueba
            - paragraph: Vence 10/10/2026
          - 'cell "Documento: Confirmada Cobro inquilino: Cobrado Pago propietario: Pendiente Cierre administrativo: Sin registro"'
          - cell "US$1.000,00 USD $135.760,00 ARS":
            - paragraph: US$1.000,00 USD $135.760,00 ARS
          - 'cell "Pagar al propietario: Propietario con nombre completo extenso que debe seguir accesible Comprobantes Ver saldos de liquidación #16"':
            - 'link "Pagar al propietario: Propietario con nombre completo extenso que debe seguir accesible"':
              - /url: /liquidaciones/16
              - text: Pagar al propietario
            - link "Comprobantes":
              - /url: /liquidaciones/16#comprobantes
            - 'button "Ver saldos de liquidación #16"': Saldos
        - 'row "octubre de 2026 Inmueble de prueba 8 Inquilino de prueba Vence 10/10/2026 Documento: Confirmada Cobro inquilino: Cobrado Pago propietario: Pendiente Cierre administrativo: Sin registro US$1.000,00 USD $135.760,00 ARS Pagar al propietario: Propietario con nombre completo extenso que debe seguir accesible Comprobantes Ver saldos de liquidación #17"':
          - cell "octubre de 2026"
          - cell "Inmueble de prueba 8 Inquilino de prueba Vence 10/10/2026":
            - paragraph: Inmueble de prueba 8
            - paragraph: Inquilino de prueba
            - paragraph: Vence 10/10/2026
          - 'cell "Documento: Confirmada Cobro inquilino: Cobrado Pago propietario: Pendiente Cierre administrativo: Sin registro"'
          - cell "US$1.000,00 USD $135.760,00 ARS":
            - paragraph: US$1.000,00 USD $135.760,00 ARS
          - 'cell "Pagar al propietario: Propietario con nombre completo extenso que debe seguir accesible Comprobantes Ver saldos de liquidación #17"':
            - 'link "Pagar al propietario: Propietario con nombre completo extenso que debe seguir accesible"':
              - /url: /liquidaciones/17
              - text: Pagar al propietario
            - link "Comprobantes":
              - /url: /liquidaciones/17#comprobantes
            - 'button "Ver saldos de liquidación #17"': Saldos
        - 'row "octubre de 2026 Inmueble de prueba 9 Inquilino de prueba Vence 10/10/2026 Documento: Confirmada Cobro inquilino: Cobrado Pago propietario: Pendiente Cierre administrativo: Sin registro US$1.000,00 USD $135.760,00 ARS Pagar al propietario: Propietario con nombre completo extenso que debe seguir accesible Comprobantes Ver saldos de liquidación #18"':
          - cell "octubre de 2026"
          - cell "Inmueble de prueba 9 Inquilino de prueba Vence 10/10/2026":
            - paragraph: Inmueble de prueba 9
            - paragraph: Inquilino de prueba
            - paragraph: Vence 10/10/2026
          - 'cell "Documento: Confirmada Cobro inquilino: Cobrado Pago propietario: Pendiente Cierre administrativo: Sin registro"'
          - cell "US$1.000,00 USD $135.760,00 ARS":
            - paragraph: US$1.000,00 USD $135.760,00 ARS
          - 'cell "Pagar al propietario: Propietario con nombre completo extenso que debe seguir accesible Comprobantes Ver saldos de liquidación #18"':
            - 'link "Pagar al propietario: Propietario con nombre completo extenso que debe seguir accesible"':
              - /url: /liquidaciones/18
              - text: Pagar al propietario
            - link "Comprobantes":
              - /url: /liquidaciones/18#comprobantes
            - 'button "Ver saldos de liquidación #18"': Saldos
        - 'row "octubre de 2026 Inmueble de prueba 10 Inquilino de prueba Vence 10/10/2026 Documento: Confirmada Cobro inquilino: Cobrado Pago propietario: Pendiente Cierre administrativo: Sin registro US$1.000,00 USD $135.760,00 ARS Pagar al propietario: Propietario con nombre completo extenso que debe seguir accesible Comprobantes Ver saldos de liquidación #19"':
          - cell "octubre de 2026"
          - cell "Inmueble de prueba 10 Inquilino de prueba Vence 10/10/2026":
            - paragraph: Inmueble de prueba 10
            - paragraph: Inquilino de prueba
            - paragraph: Vence 10/10/2026
          - 'cell "Documento: Confirmada Cobro inquilino: Cobrado Pago propietario: Pendiente Cierre administrativo: Sin registro"'
          - cell "US$1.000,00 USD $135.760,00 ARS":
            - paragraph: US$1.000,00 USD $135.760,00 ARS
          - 'cell "Pagar al propietario: Propietario con nombre completo extenso que debe seguir accesible Comprobantes Ver saldos de liquidación #19"':
            - 'link "Pagar al propietario: Propietario con nombre completo extenso que debe seguir accesible"':
              - /url: /liquidaciones/19
              - text: Pagar al propietario
            - link "Comprobantes":
              - /url: /liquidaciones/19#comprobantes
            - 'button "Ver saldos de liquidación #19"': Saldos
        - 'row "octubre de 2026 Inmueble de prueba 11 Inquilino de prueba Vence 10/10/2026 Documento: Confirmada Cobro inquilino: Cobrado Pago propietario: Pendiente Cierre administrativo: Sin registro US$1.000,00 USD $135.760,00 ARS Pagar al propietario: Propietario con nombre completo extenso que debe seguir accesible Comprobantes Ver saldos de liquidación #20"':
          - cell "octubre de 2026"
          - cell "Inmueble de prueba 11 Inquilino de prueba Vence 10/10/2026":
            - paragraph: Inmueble de prueba 11
            - paragraph: Inquilino de prueba
            - paragraph: Vence 10/10/2026
          - 'cell "Documento: Confirmada Cobro inquilino: Cobrado Pago propietario: Pendiente Cierre administrativo: Sin registro"'
          - cell "US$1.000,00 USD $135.760,00 ARS":
            - paragraph: US$1.000,00 USD $135.760,00 ARS
          - 'cell "Pagar al propietario: Propietario con nombre completo extenso que debe seguir accesible Comprobantes Ver saldos de liquidación #20"':
            - 'link "Pagar al propietario: Propietario con nombre completo extenso que debe seguir accesible"':
              - /url: /liquidaciones/20
              - text: Pagar al propietario
            - link "Comprobantes":
              - /url: /liquidaciones/20#comprobantes
            - 'button "Ver saldos de liquidación #20"': Saldos
        - 'row "octubre de 2026 Inmueble de prueba 12 Inquilino de prueba Vence 10/10/2026 Documento: Confirmada Cobro inquilino: Cobrado Pago propietario: Pendiente Cierre administrativo: Sin registro US$1.000,00 USD $135.760,00 ARS Pagar al propietario: Propietario con nombre completo extenso que debe seguir accesible Comprobantes Ver saldos de liquidación #21"':
          - cell "octubre de 2026"
          - cell "Inmueble de prueba 12 Inquilino de prueba Vence 10/10/2026":
            - paragraph: Inmueble de prueba 12
            - paragraph: Inquilino de prueba
            - paragraph: Vence 10/10/2026
          - 'cell "Documento: Confirmada Cobro inquilino: Cobrado Pago propietario: Pendiente Cierre administrativo: Sin registro"'
          - cell "US$1.000,00 USD $135.760,00 ARS":
            - paragraph: US$1.000,00 USD $135.760,00 ARS
          - 'cell "Pagar al propietario: Propietario con nombre completo extenso que debe seguir accesible Comprobantes Ver saldos de liquidación #21"':
            - 'link "Pagar al propietario: Propietario con nombre completo extenso que debe seguir accesible"':
              - /url: /liquidaciones/21
              - text: Pagar al propietario
            - link "Comprobantes":
              - /url: /liquidaciones/21#comprobantes
            - 'button "Ver saldos de liquidación #21"': Saldos
    - paragraph: Mostrando 1 a 12 de 24
    - button "Página anterior" [disabled]
    - text: Página 1 de 2
    - button "Página siguiente"
```

# Test source

```ts
  1   | import { expect, test, type Page } from '@playwright/test';
  2   | import { admin, fixture } from './fixtures/liquidation-currency';
  3   | 
  4   | async function setup(page: Page) {
  5   |     const data = fixture('USD', true);
  6   |     const rows = Array.from({ length: 12 }, (_, index) => ({
  7   |         ...data.liquidation, id: 10 + index, fechaLiquidacion: null, cerradoPorId: null,
  8   |         propiedadDireccion: index === 1 ? 'Avenida de los Constituyentes 12345, edificio de administración, piso 12, departamento B' : `Inmueble de prueba ${index + 1}`,
  9   |         inquilinoNombre: index === 1 ? 'María de los Ángeles Fernández de la Administración' : 'Inquilino de prueba',
  10  |         propietarioNombre: 'Propietario con nombre completo extenso que debe seguir accesible',
  11  |     }));
  12  |     const requests: string[] = [];
  13  |     const errors: string[] = [];
  14  |     page.on('pageerror', error => errors.push(error.message));
  15  |     await page.addInitScript(user => { localStorage.setItem('user', JSON.stringify(user)); localStorage.setItem('loginTimestamp', String(Date.now())); }, admin);
  16  |     await page.route('**/api/**', async route => {
  17  |         const url = new URL(route.request().url());
  18  |         requests.push(`${route.request().method()} ${url.pathname}${url.search}`);
  19  |         let body: unknown = [];
  20  |         if (url.pathname.endsWith('/auth/me')) body = admin;
  21  |         else if (url.pathname === '/api/liquidaciones') body = { data: rows, meta: { total: 24, totalPages: 2, page: Number(url.searchParams.get('page') || 1), limit: 12 } };
  22  |         else if (url.pathname === '/api/liquidaciones/10') body = data.liquidation;
  23  |         else if (url.pathname === '/api/liquidaciones/filtros') body = { periodos: ['2026-10-01'], monedas: ['ARS', 'USD'] };
  24  |         else if (url.pathname.includes('/filtros/propiedades')) body = { data: [{ id: 1, direccion: 'Propiedad ' + 'Extensa'.repeat(35), piso: null, departamento: null }], meta: { page: 1, totalPages: 1, total: 1 } };
  25  |         else if (url.pathname.includes('/filtros/personas')) body = { data: [], meta: { page: 1, totalPages: 0, total: 0 } };
  26  |         else if (url.pathname.includes('/periodos')) body = data.timeline;
  27  |         await route.fulfill({ json: body });
  28  |     });
  29  |     return { requests, errors };
  30  | }
  31  | 
  32  | async function noOverflow(page: Page) {
  33  |     for (const selector of ['html', '#main-content', '[aria-labelledby=liquidation-history-title]', '[data-testid=liquidation-history-table]:visible']) {
  34  |         const element = page.locator(selector);
  35  |         if (await element.count()) {
  36  |             const bounds = await element.evaluate(el => ({ width: el.clientWidth, scroll: el.scrollWidth }));
  37  |             expect(bounds.scroll, selector).toBeLessThanOrEqual(bounds.width + 1);
  38  |         }
  39  |     }
  40  | }
  41  | 
  42  | for (const [width, height] of [[1280, 720], [1366, 768], [1440, 900]]) {
  43  |     test(`historial compacto, teclado y menú expandido/contraído ${width}x${height}`, async ({ page }, info) => {
  44  |         await page.setViewportSize({ width, height });
  45  |         const { errors, requests } = await setup(page);
  46  |         await page.goto('/liquidaciones?view=HISTORIAL');
  47  |         const table = page.getByTestId('liquidation-history-table');
  48  |         const first = table.getByTestId('liquidation-history-row').first();
  49  |         await expect(first).toBeVisible();
  50  |         await expect(page.getByRole('button', { name: 'Contraer menú', exact: true })).toBeVisible();
  51  |         expect((await page.getByRole('searchbox').boundingBox())!.width).toBeGreaterThan(280);
  52  |         await expect(first.getByTestId('liquidation-states')).toContainText('Cierre administrativo: Sin registro');
  53  |         await expect(first).toContainText('octubre de 2026');
  54  |         await expect(first).toContainText('US$1.000,00 USD');
  55  |         await expect(first).toContainText('$135.760,00 ARS');
  56  |         expect((await first.boundingBox())!.height).toBeLessThan(175);
  57  |         await expect(first.getByRole('link', { name: 'Comprobantes', exact: true })).toBeInViewport({ ratio: 1 });
  58  |         await noOverflow(page);
  59  |         await page.screenshot({ path: info.outputPath('history-expanded-sidebar.png') });
  60  |         const balances = first.getByRole('button', { name: /saldos de liquidación #10$/ });
  61  |         await balances.focus();
  62  |         await balances.press('Enter');
  63  |         await expect(balances).toHaveAttribute('aria-expanded', 'true');
  64  |         const details = page.locator('#history-table-balances-10');
  65  |         await expect(details).toContainText('Cobrado inquilino');
  66  |         await expect(details).toContainText('Adelanto a recuperar');
  67  |         await expect(details).toContainText('US$1.000,00 USD');
  68  |         await expect(details).toContainText('$135.760,00 ARS');
  69  |         await noOverflow(page);
  70  |         await balances.press('Enter');
  71  |         await expect(details).not.toBeVisible();
  72  |         const toggle = page.getByRole('button', { name: /^Filtros/ });
  73  |         await page.getByRole('searchbox').focus();
  74  |         await page.keyboard.press('Tab');
  75  |         await expect(toggle).toBeFocused();
  76  |         await toggle.press('Enter');
  77  |         await expect(page.getByLabel('Período', { exact: true })).toBeVisible();
  78  |         expect((await page.getByLabel('Período', { exact: true }).boundingBox())!.width).toBeGreaterThan(190);
  79  |         await page.getByLabel('Período', { exact: true }).fill('2026-10');
  80  |         const currency = page.getByRole('button', { name: /^Moneda:/ });
  81  |         await currency.focus();
  82  |         await currency.press('Enter');
  83  |         const currencyOptions = page.getByRole('listbox');
> 84  |         await expect(currencyOptions).toBeFocused();
      |                                       ^ Error: expect(locator).toBeFocused() failed
  85  |         await currencyOptions.press('End');
  86  |         await currencyOptions.press('Enter');
  87  |         await expect(page).toHaveURL(/moneda=USD/);
  88  |         await expect(currency).toBeFocused();
  89  |         const advanced = page.locator('summary', { hasText: 'Más filtros' });
  90  |         await advanced.focus();
  91  |         await advanced.press('Enter');
  92  |         await expect(page.getByRole('checkbox', { name: 'Con cuotas o acuerdos' })).toBeVisible();
  93  |         await page.getByRole('checkbox', { name: 'Con deuda', exact: true }).focus();
  94  |         await page.keyboard.press('Space');
  95  |         await expect(page).toHaveURL(/soloDeuda=true/);
  96  |         await noOverflow(page);
  97  |         await page.screenshot({ path: info.outputPath('history-filters.png') });
  98  |         await toggle.focus();
  99  |         await toggle.press('Enter');
  100 |         await expect(page.getByText('Período: octubre de 2026', { exact: true }).first()).toBeVisible();
  101 |         await page.reload();
  102 |         await expect(page.getByRole('button', { name: /^Filtros/ })).toContainText('3 activos');
  103 |         await page.getByRole('button', { name: 'Contraer menú', exact: true }).click();
  104 |         await noOverflow(page);
  105 |         await page.screenshot({ path: info.outputPath('history-collapsed-sidebar.png') });
  106 |         const documents = table.getByTestId('liquidation-history-row').first().getByRole('link', { name: 'Comprobantes', exact: true });
  107 |         await documents.focus();
  108 |         await documents.press('Enter');
  109 |         await expect(page).toHaveURL(/\/liquidaciones\/10#comprobantes$/);
  110 |         await expect(page.locator('#liquidation-vouchers')).toHaveAttribute('open', '');
  111 |         expect(requests.filter(request => !request.startsWith('GET '))).toEqual([]);
  112 |         expect(errors).toEqual([]);
  113 |     });
  114 | }
  115 | 
  116 | for (const [width, height] of [[1024, 576], [768, 1024], [390, 844]]) {
  117 |     test(`historial con espacio reducido ${width}x${height}: tarjetas, filtros largos y paginación`, async ({ page }, info) => {
  118 |         await page.setViewportSize({ width, height });
  119 |         const { requests, errors } = await setup(page);
  120 |         await page.goto('/liquidaciones?view=HISTORIAL');
  121 |         const card = page.locator('article:visible').first();
  122 |         await expect(card).toContainText('US$1.000,00 USD');
  123 |         await expect(card).toContainText('$135.760,00 ARS');
  124 |         const balances = card.getByRole('button', { name: 'Ver saldos de liquidación #10', exact: true });
  125 |         await balances.focus();
  126 |         await balances.press('Enter');
  127 |         await expect(card).toContainText('Cobrado inquilino');
  128 |         await noOverflow(page);
  129 |         await page.getByRole('searchbox').fill('ReferenciaSinEspacios'.repeat(12));
  130 |         await expect(page.getByRole('button', { name: /^Quitar filtro Búsqueda/ })).toBeVisible();
  131 |         await noOverflow(page);
  132 |         await page.getByRole('button', { name: /^Filtros/ }).click();
  133 |         await page.locator('summary', { hasText: 'Más filtros' }).click();
  134 |         await page.getByRole('combobox', { name: 'Propiedad', exact: true }).fill('Propiedad');
  135 |         await page.getByRole('option', { name: /^Propiedad Extensa/ }).click();
  136 |         await expect(page.getByRole('button', { name: /^Quitar filtro Propiedad:/ })).toBeVisible();
  137 |         await noOverflow(page);
  138 |         await page.screenshot({ path: info.outputPath('history-small-filters.png') });
  139 |         const next = page.getByRole('button', { name: 'Página siguiente', exact: true });
  140 |         await next.focus();
  141 |         await next.press('Enter');
  142 |         await expect.poll(() => requests.filter(request => request.startsWith('GET /api/liquidaciones?')).at(-1)).toContain('page=2');
  143 |         await noOverflow(page);
  144 |         expect(errors).toEqual([]);
  145 |     });
  146 | }
  147 | 
```