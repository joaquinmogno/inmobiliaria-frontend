import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { admin, fixture } from './fixtures/liquidation-currency';

type PhoneUpdate = { personaId: number; version: number; telefono: string | null };
async function setup(page: Page, options: { noContactPermission?: boolean; legacyPhone?: boolean; failSave?: boolean } = {}) {
    const base = fixture('ARS', false).contract;
    const contract = {
        ...base, porcentajeHonorarios: 5,
        propietarios: base.propietarios.map(party => ({ ...party, persona: { ...party.persona, version: 3, telefono: options.legacyPhone ? 'Número antiguo incompleto' : null as string | null } })),
        inquilinos: base.inquilinos.map(party => ({ ...party, persona: { ...party.persona, version: 4, telefono: null as string | null } }))
    };
    contract.propietarios.push({ id: 3, esPrincipal: false, persona: { id: 3, nombreCompleto: 'Copropietario', version: 2, telefono: null } });
    const user = options.noContactPermission ? { ...admin, tipo: 'USUARIO', role: 'USUARIO', permissions: ['contratos.ver', 'contratos.editar'] } : admin;
    const writes: Array<{ updates?: PhoneUpdate[]; body: string }> = [];
    await page.addInitScript(value => {
        localStorage.setItem('user', JSON.stringify(value));
        localStorage.setItem('loginTimestamp', String(Date.now()));
    }, user);
    await page.route('**/api/**', async route => {
        const request = route.request();
        const path = new URL(request.url()).pathname;
        let body: unknown = [];
        if (path === '/api/auth/me') body = user;
        else if (path === '/api/contratos/1' && request.method() === 'PUT') {
            const raw = request.postData() || '';
            const value = raw.match(/name="telefonosPersonas"\r\n\r\n([^\r]*)/)?.[1];
            const updates: PhoneUpdate[] | undefined = value ? JSON.parse(value) : undefined;
            writes.push({ updates, body: raw });
            if (options.failSave) return route.fulfill({ status: 409, json: { code: 'STALE_WRITE', message: 'Otro usuario modificó este contacto. Cerrá y volvé a abrir la ficha.' } });
            for (const update of updates || []) {
                const person = [...contract.propietarios, ...contract.inquilinos].find(party => party.persona.id === update.personaId)!.persona;
                person.telefono = update.telefono;
                person.version += 1;
            }
            contract.version += 1;
            body = contract;
        } else if (path === '/api/contratos') body = { data: [{ ...contract, propietarios: contract.propietarios.filter(party => party.esPrincipal) }], meta: { total: 1, page: 1, limit: 10, totalPages: 1 } };
        else if (path === '/api/contratos/1') body = contract;
        await route.fulfill({ json: body });
    });
    await page.goto('/contratos');
    return { writes };
}
async function edit(page: Page) {
    await page.getByRole('button', { name: 'Acciones del contrato', exact: true }).filter({ visible: true }).click();
    await page.getByRole('menuitem', { name: /^Editar/ }).click();
    const dialog = page.getByRole('dialog', { name: 'Editar contrato', exact: true });
    await expect(dialog.getByRole('heading', { name: 'Editar contrato', exact: true })).toBeVisible();
    return dialog;
}

for (const width of [1366, 390]) test(`cargar teléfonos posteriores de todos los participantes, guardar y reabrir ${width}`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: 768 });
    const { writes } = await setup(page);
    let dialog = await edit(page);
    await expect(dialog.getByLabel('Nombre completo de propietario 1', { exact: true })).toBeDisabled();
    await dialog.getByLabel('Teléfono de propietario 1', { exact: true }).fill('+5491123456701');
    await dialog.getByLabel('Teléfono de propietario 2', { exact: true }).fill('+5491123456702');
    await dialog.getByLabel('Teléfono de inquilino 1', { exact: true }).fill('+5491123456703');
    expect((await new AxeBuilder({ page }).include('#contract-owner-group').include('#contract-tenant-group').withTags(['wcag2a', 'wcag2aa']).analyze()).violations).toEqual([]);
    await dialog.getByRole('button', { name: 'Guardar cambios', exact: true }).click();
    await expect(dialog.getByRole('heading', { name: 'Editar contrato', exact: true })).not.toBeVisible();
    expect(writes[0].updates).toEqual([
        { personaId: 1, version: 3, telefono: '+5491123456701' },
        { personaId: 3, version: 2, telefono: '+5491123456702' },
        { personaId: 2, version: 4, telefono: '+5491123456703' }
    ]);
    await page.reload();
    dialog = await edit(page);
    await expect(dialog.getByLabel('Teléfono de propietario 1', { exact: true })).toHaveValue('+5491123456701');
    await expect(dialog.getByLabel('Teléfono de inquilino 1', { exact: true })).toHaveValue('+5491123456703');
    await page.screenshot({ path: info.outputPath('editar-telefonos.png') });
    await dialog.getByLabel('Teléfono de propietario 1', { exact: true }).fill('');
    await dialog.getByRole('button', { name: 'Guardar cambios', exact: true }).click();
    await expect(dialog.getByRole('heading', { name: 'Editar contrato', exact: true })).not.toBeVisible();
    expect(writes[1].updates).toEqual([{ personaId: 1, version: 4, telefono: null }]);
});

test('valida el teléfono, conserva los cambios ante un conflicto y cancelar no guarda', async ({ page }) => {
    const { writes } = await setup(page, { failSave: true });
    const dialog = await edit(page);
    const phone = dialog.getByLabel('Teléfono de inquilino 1', { exact: true });
    await phone.fill('123');
    await dialog.getByRole('button', { name: 'Guardar cambios', exact: true }).click();
    await expect(phone).toHaveAttribute('aria-invalid', 'true');
    await expect(phone).toBeFocused();
    expect(writes).toHaveLength(0);
    await phone.fill('+5491123456704');
    await dialog.getByRole('button', { name: 'Guardar cambios', exact: true }).click();
    await expect(dialog.getByRole('alert')).toContainText('Otro usuario modificó este contacto');
    await expect(phone).toHaveValue('+5491123456704');
    await dialog.getByRole('button', { name: 'Cancelar', exact: true }).click();
    expect(writes).toHaveLength(1);
    const reopened = await edit(page);
    await expect(reopened.getByLabel('Teléfono de inquilino 1', { exact: true })).toHaveValue('');
});

test('los teléfonos antiguos intactos no se reenvían ni bloquean el guardado', async ({ page }) => {
    const { writes } = await setup(page, { legacyPhone: true });
    const dialog = await edit(page);
    await dialog.getByLabel('Teléfono de inquilino 1', { exact: true }).fill('+5491123456705');
    await dialog.getByRole('button', { name: 'Guardar cambios', exact: true }).click();
    await expect(dialog.getByRole('heading', { name: 'Editar contrato', exact: true })).not.toBeVisible();
    expect(writes[0].updates).toEqual([{ personaId: 2, version: 4, telefono: '+5491123456705' }]);
});

test('sin permiso para editar personas conserva los teléfonos y permite guardar el contrato', async ({ page }) => {
    const { writes } = await setup(page, { noContactPermission: true });
    const dialog = await edit(page);
    await expect(dialog.getByLabel('Teléfono de propietario 1', { exact: true })).toBeDisabled();
    await expect(dialog.getByLabel('Teléfono de inquilino 1', { exact: true })).toBeDisabled();
    await dialog.getByRole('button', { name: 'Guardar cambios', exact: true }).click();
    await expect(dialog.getByRole('heading', { name: 'Editar contrato', exact: true })).not.toBeVisible();
    expect(writes[0].updates).toBeUndefined();
});
