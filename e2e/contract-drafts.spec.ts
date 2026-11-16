import { expect, test, type Page } from '@playwright/test';
import { admin } from './fixtures/liquidation-currency';
import { buildContractDraftData, createEmptyContractForm, createContractFormFromDraft } from '../src/features/contracts/contract-form.model';
import type { ContractDraft } from '../src/services/contracts.service';

function draftFixture(): ContractDraft {
  const form = { ...createEmptyContractForm(), address: 'Borrador vigente', startDate: '2026-01-01', endDate: '2027-12-31', updateDate: '2026-09-17',
    montoAlquiler: '1000.25', honorarioInicial: '50.10', moneda: 'USD' as const, modalidadCobroInquilino: 'TRANSFERENCIA', modalidadPagoPropietario: 'CHEQUE',
    cuentaCobroAcordadaId: '42', serviciosGastos: [{ concepto: 'Expensas', responsable: 'INQUILINO' as const }], observacionDocumento: 'Conservar nota del documento' };
  return { id: 501, version: 3, datos: buildContractDraftData(form, null, [{ id: 1, nombreCompleto: 'Dueño seleccionado', telefono: '111' }], [{ id: 2, nombreCompleto: 'Inquilino seleccionado', telefono: '222' }]),
    fechaCreacion: '2026-11-16T12:00:00Z', fechaActualizacion: '2026-11-16T12:00:00Z', adjuntos: [], creadoPor: { id: 1, nombreCompleto: 'Admin' }, resumen: { direccion: form.address, propietario: null, inquilino: null } };
}
async function mock(page: Page, initial: ContractDraft | null = null) {
  const state = { saved: initial, creates: 0, updates: [] as Record<string, unknown>[], uploads: [] as string[], gets: 0, failRead: false, failUpload: false, failUploadName: 'pendiente.pdf', conflict: false };
  await page.addInitScript(user => { localStorage.setItem('user', JSON.stringify(user)); localStorage.setItem('loginTimestamp', String(Date.now())); }, admin);
  await page.route('**/api/**', async route => {
    const path = new URL(route.request().url()).pathname;
    const method = route.request().method();
    let body: unknown = [], status = 200;
    if (path === '/api/auth/me') body = admin;
    if (path === '/api/contratos') body = { data: [], meta: { total: 0, totalPages: 1, page: 1, limit: 10 } };
    if (path === '/api/cuentas-bancarias') body = [{ id: 42, nombre: 'Cuenta USD', banco: 'Banco', moneda: 'USD', activa: true }];
    if (path === '/api/contratos/borradores' && method === 'GET') body = state.saved ? [{ ...state.saved, datos: { ...state.saved.datos, form: { ...state.saved.datos.form, observations: 'Listado antiguo' } } }] : [];
    if (path === '/api/contratos/borradores' && method === 'POST') {
      state.creates++;
      const datos = route.request().postDataJSON().datos;
      state.saved = { ...draftFixture(), datos, version: 1, resumen: { direccion: datos.form.address || 'Sin dirección', propietario: null, inquilino: null } };
      body = state.saved; status = 201;
    }
    if (path === '/api/contratos/borradores/501' && method === 'GET') {
      state.gets++;
      body = state.saved;
      if (state.failRead) { status = 503; body = { message: 'No se pudo recuperar el borrador. Reintentá.' }; }
    }
    if (path === '/api/contratos/borradores/501' && method === 'PUT') {
      const payload = route.request().postDataJSON(); state.updates.push(payload);
      if (state.conflict || payload.version !== state.saved?.version) { status = 409; body = { code: 'DRAFT_CHANGED', message: 'Otra pestaña guardó una versión nueva. Tus cambios siguen en el formulario.' }; }
      else { state.saved = { ...state.saved!, datos: payload.datos, version: payload.version + 1 }; body = state.saved; }
    }
    if (path.startsWith('/api/contratos/borradores/501/adjuntos/') && method === 'DELETE') {
      state.saved!.adjuntos = state.saved!.adjuntos.filter(item => item.id !== Number(path.split('/').pop()));
      return route.fulfill({ status: 204 });
    }
    if (path.endsWith('/borradores/501/adjuntos')) {
      const filename = route.request().postDataBuffer()!.toString().match(/filename="([^"]+)"/)![1];
      state.uploads.push(filename);
      if (state.failUpload && filename === state.failUploadName) { state.failUpload = false; status = 503; body = { message: 'Subida interrumpida' }; }
      else {
        const attachment = { id: state.uploads.length, nombreArchivo: filename, rutaArchivo: filename, tipo: filename === 'principal.pdf' ? 'CONTRATO_PRINCIPAL' as const : 'ADJUNTO' as const, fechaCreacion: '2026-11-16T12:00:00Z' };
        state.saved!.adjuntos.push(attachment); body = attachment; status = 201;
      }
    }
    await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
  });
  await page.goto('/contratos');
  return state;
}
const dialog = (page: Page) => page.getByRole('dialog');
const save = (page: Page) => dialog(page).getByRole('button', { name: 'Guardar borrador', exact: true });

for (const width of [1280, 1366]) {
  test(`partial upload retries only pending files and retains identity and edits at ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: width === 1280 ? 720 : 768 });
    const state = await mock(page); state.failUpload = true;
    if (width === 1280) state.failUploadName = 'principal.pdf';
    await page.getByRole('button', { name: 'Nuevo contrato' }).click();
    await dialog(page).locator('#contract-property-address').fill('Conservar dirección');
    await dialog(page).locator('#contract-observations').fill('Mis observaciones con centavos 10,25');
    await dialog(page).locator('#contract-main-file').setInputFiles({ name: 'principal.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4\n') });
    await dialog(page).locator('[name="observacionDocumento"]').fill('Conservar nota del documento');
    await dialog(page).locator('#contract-additional-files').setInputFiles([
      { name: 'primero.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4\n1') },
      { name: 'pendiente.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4\n2') }
    ]);
    await save(page).click();
    await expect(dialog(page).getByRole('alert')).toContainText('Datos guardados; quedó pendiente subir un archivo');
    expect(state.creates).toBe(1);
    await expect(dialog(page).locator('#contract-property-address')).toHaveValue('Conservar dirección');
    await expect(dialog(page).locator('[name="observacionDocumento"]')).toHaveValue('Conservar nota del documento');
    if (width === 1366) await expect(dialog(page).getByLabel('Documentos guardados en el borrador')).toContainText('principal.pdf');
    else await expect(dialog(page).getByLabel('Documentos guardados en el borrador')).toHaveCount(0);
    await dialog(page).locator('#contract-observations').fill('Edición después del fallo');
    await save(page).focus(); await page.keyboard.press('Enter');
    await expect(page.getByText('Borrador guardado. Podés retomarlo cuando quieras.', { exact: true })).toBeVisible();
    expect(state.creates).toBe(1);
    expect(state.uploads).toEqual(width === 1280
      ? ['principal.pdf', 'principal.pdf', 'primero.pdf', 'pendiente.pdf']
      : ['principal.pdf', 'primero.pdf', 'pendiente.pdf', 'pendiente.pdf']);
    expect(state.updates).toHaveLength(1); expect(state.updates[0].version).toBe(1);
    expect(state.saved!.datos.form.observations).toBe('Edición después del fallo');
    expect(state.saved!.adjuntos).toHaveLength(3);
    await expect(dialog(page).locator('[name="observacionDocumento"]')).toHaveValue('Conservar nota del documento');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await dialog(page).getByRole('button', { name: 'Cancelar', exact: true }).click();
    await page.getByRole('button', { name: /Borradores \(1\)/ }).click();
    await page.getByRole('button', { name: 'Continuar', exact: true }).click();
    await expect(dialog(page).locator('#contract-observations')).toHaveValue('Edición después del fallo');
    expect(state.gets).toBe(1);
  });
}

test('continue fetches latest data, preserves custom date and cents, and leaves edits after a conflict', async ({ page }) => {
  const initial = draftFixture(); initial.datos.form.observations = 'Versión nueva del servidor';
  const state = await mock(page, initial);
  await page.getByRole('button', { name: /Borradores/ }).click();
  state.failRead = true;
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  await expect(page.getByText('No se pudo recuperar el borrador. Reintentá.')).toBeVisible();
  await expect(dialog(page)).toHaveCount(0);
  state.failRead = false;
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  await expect(dialog(page).locator('#contract-observations')).toHaveValue('Versión nueva del servidor');
  await expect(dialog(page).locator('[name="updateDate"]')).toHaveValue('2026-09-17');
  await save(page).click();
  await expect(page.getByText('Borrador guardado. Podés retomarlo cuando quieras.', { exact: true })).toBeVisible();
  expect(state.saved!.datos).toEqual(initial.datos);
  state.conflict = true;
  await dialog(page).locator('#contract-observations').fill('Edición local que no debe perderse');
  await save(page).click();
  await expect(dialog(page).getByRole('alert')).toContainText('Otra pestaña');
  await expect(dialog(page).locator('#contract-observations')).toHaveValue('Edición local que no debe perderse');
  expect(state.saved!.datos.form.observations).toBe('Versión nueva del servidor');
});

test('legacy model fills only missing fields and keeps selected entities, cents and dates', () => {
  const original = draftFixture().datos;
  const legacy = structuredClone(original);
  for (const name of ['modalidadCobroInquilino', 'modalidadPagoPropietario', 'cuentaCobroAcordadaId', 'serviciosGastos'] as const) delete (legacy.form as Partial<typeof legacy.form>)[name];
  const restored = createContractFormFromDraft(legacy);
  expect(restored.form.serviciosGastos).toEqual([]);
  expect(restored.form.modalidadCobroInquilino).toBe('');
  expect(restored.form.cuentaCobroAcordadaId).toBe('');
  expect(restored.form.montoAlquiler).toBe('1000.25');
  expect(restored.form.updateDate).toBe('2026-09-17');
  expect(restored.owners).toEqual(original.owners); expect(restored.tenants).toEqual(original.tenants);
  expect(buildContractDraftData(createContractFormFromDraft(original).form, null, original.owners, original.tenants)).toEqual(original);
});


test('removing an attachment preserves local edits and the original optimistic version', async ({ page }) => {
  const initial = draftFixture();
  initial.adjuntos = [{ id: 99, nombreArchivo: 'anexo.pdf', rutaArchivo: 'anexo.pdf', tipo: 'ADJUNTO', fechaCreacion: '2026-11-16T12:00:00Z' }];
  const state = await mock(page, initial);
  await page.getByRole('button', { name: /Borradores/ }).click();
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  await dialog(page).locator('#contract-observations').fill('Edición sin guardar');
  state.saved = { ...state.saved!, version: 4, datos: { ...state.saved!.datos, form: { ...state.saved!.datos.form, observations: 'Cambio de otra pestaña' } } };
  await dialog(page).getByLabel('Documentos guardados en el borrador').getByRole('button', { name: 'Quitar' }).click();
  await expect(page.getByText('Archivo eliminado del borrador', { exact: true })).toBeVisible();
  await expect(dialog(page).locator('#contract-observations')).toHaveValue('Edición sin guardar');
  await save(page).click();
  await expect(dialog(page).getByRole('alert')).toContainText('Otra pestaña');
  expect(state.updates[0].version).toBe(3);
  expect(state.saved.datos.form.observations).toBe('Cambio de otra pestaña');
  expect(state.gets).toBe(1);
});
