import { expect, request as playwrightRequest, test, type APIRequestContext } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const admin = {
  email: 'admin.integration@example.com',
  password: 'ProdTest!2026_Strong'
};

async function authenticateAdmin(request: APIRequestContext) {
  const login = await request.post('/api/auth/login', {
    data: { email: admin.email, password: admin.password }
  });
  expect(login.status()).toBe(200);
  const payload = await login.json();
  const cookie = login.headersArray()
    .filter((header: { name: string }) => header.name.toLowerCase() === 'set-cookie')
    .map((header: { value: string }) => header.value.split(';')[0])
    .join('; ');
  return { cookie, csrfToken: payload.csrfToken as string, userId: payload.user.id as number };
}

test('stack real: instalación única, readiness, CSP, sesión y CSRF', async ({ page, request }) => {
  const backend = await playwrightRequest.newContext({ baseURL: 'http://127.0.0.1:3100' });
  const readiness = await backend.get('/health/ready');
  expect(readiness.status()).toBe(200);
  expect(await readiness.json()).toMatchObject({ status: 'ready', database: 'ok' });
  await backend.dispose();

  const documentResponse = await page.goto('/login');
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  const csp = documentResponse?.headers()['content-security-policy'] || '';
  expect(csp).not.toContain('accounts.google.com');
  expect(csp).toContain("frame-src 'none'");
  expect(csp).toContain('connect-src');

  const login = await request.post('/api/auth/login', {
    data: { email: admin.email, password: admin.password }
  });
  expect(login.status()).toBe(200);
  const loginPayload = await login.json();
  expect(loginPayload.csrfToken).toBeTruthy();
  expect(login.headers()['set-cookie']).toContain('HttpOnly');
  const cookieHeader = login.headersArray()
    .filter(header => header.name.toLowerCase() === 'set-cookie')
    .map(header => header.value.split(';')[0])
    .join('; ');

  const withoutCsrf = await request.put('/api/inmobiliaria/me', {
    headers: { cookie: cookieHeader },
    data: { nombre: 'Cambio rechazado' }
  });
  expect(withoutCsrf.status()).toBe(403);

  const installation = await request.get('/api/inmobiliaria/me', { headers: { cookie: cookieHeader } });
  expect(installation.status()).toBe(200);
  expect(await installation.json()).toMatchObject({ nombre: 'Integration PropControl' });

  const mutationHeaders = {
    cookie: cookieHeader,
    'x-csrf-token': loginPayload.csrfToken
  };
  const dbBackupResponse = await request.post('/api/backups/db', { headers: mutationHeaders });
  expect(dbBackupResponse.status()).toBe(201);
  const dbBackup = await dbBackupResponse.json();
  const uploadsBackupResponse = await request.post('/api/backups/uploads', { headers: mutationHeaders });
  expect(uploadsBackupResponse.status()).toBe(201);
  const uploadsBackup = await uploadsBackupResponse.json();
  const backups = await request.get('/api/backups', { headers: { cookie: cookieHeader } });
  expect(backups.status()).toBe(200);
  expect(await backups.json()).toEqual(expect.arrayContaining([
    expect.objectContaining({ type: 'db' }),
    expect.objectContaining({ type: 'uploads' })
  ]));

  const dbDownload = await request.get(`/api/backups/download/db/${encodeURIComponent(dbBackup.filename)}`, {
    headers: { cookie: cookieHeader }
  });
  expect(dbDownload.status()).toBe(200);
  expect(dbDownload.headers()['content-disposition']).toContain(dbBackup.filename.replace(/\.enc$/, ''));
  expect(dbDownload.headers()['content-disposition']).not.toContain('.enc');
  expect((await dbDownload.body()).toString('utf8')).toContain('PostgreSQL database dump');

  const uploadsDownload = await request.get(`/api/backups/download/uploads/${encodeURIComponent(uploadsBackup.filename)}`, {
    headers: { cookie: cookieHeader }
  });
  expect(uploadsDownload.status()).toBe(200);
  expect(uploadsDownload.headers()['content-disposition']).toContain(uploadsBackup.filename.replace(/\.enc$/, ''));
  expect(uploadsDownload.headers()['content-disposition']).not.toContain('.enc');
  const uploadsPayload = await uploadsDownload.body();
  expect([...uploadsPayload.subarray(0, 2)]).toEqual([0x1f, 0x8b]);

  const removedSaasEndpoint = await request.get('/api/superadmin/inmobiliarias');
  expect(removedSaasEndpoint.status()).toBe(404);

  await page.getByPlaceholder('ejemplo@correo.com').fill(admin.email);
  await page.getByPlaceholder('••••••••').fill(admin.password);
  await page.getByRole('button', { name: /Ingresar a mi cuenta/i }).click();
  await expect(page).toHaveURL(/\/home$/);
  for (const route of ['/home', '/configuracion']) {
    await page.goto(route);
    await expect(page.locator('main')).toBeVisible();
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    expect(results.violations, `${route}: ${results.violations.map(item => item.id).join(', ')}`).toEqual([]);
  }

  await page.getByRole('button', { name: 'Backups', exact: true }).click();
  const dbBackupItem = page.locator('article').filter({ hasText: dbBackup.filename });
  await expect(dbBackupItem).toBeVisible();
  const browserDownloadPromise = page.waitForEvent('download');
  await dbBackupItem.getByRole('button', { name: 'Descargar', exact: true }).click();
  const browserDownload = await browserDownloadPromise;
  expect(browserDownload.suggestedFilename()).toBe(dbBackup.filename.replace(/\.enc$/, ''));
  expect(await browserDownload.failure()).toBeNull();
});

test('stack real: ciclo de usuarios y roles, incluida la concurrencia', async ({ request }) => {
  const { cookie, csrfToken } = await authenticateAdmin(request);
  const headers = { cookie, 'x-csrf-token': csrfToken };
  const unique = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;

  const createRole = async (name: string) => {
    const response = await request.post('/api/roles', {
      headers,
      data: { nombre: name, descripcion: 'Prueba de integración PC-001', permisos: [] }
    });
    expect(response.status()).toBe(201);
    return response.json();
  };

  const initialRole = await createRole(`PC001 Inicial ${unique}`);
  const assignedRole = await createRole(`PC001 Asignado ${unique}`);
  const userEmail = `pc001-${unique}@example.test`;

  const createUser = await request.post('/api/usuarios', {
    headers,
    data: {
      email: userEmail,
      password: 'Temporal!2026_Segura',
      nombreCompleto: `Usuario PC001 ${unique}`,
      tipo: 'USUARIO',
      rolId: initialRole.id
    }
  });
  expect(createUser.status()).toBe(201);
  const user = await createUser.json();
  expect(user.rol.id).toBe(initialRole.id);

  const updateUser = await request.put(`/api/usuarios/${user.id}`, {
    headers,
    data: { nombreCompleto: `Usuario PC001 editado ${unique}`, rolId: assignedRole.id }
  });
  expect(updateUser.status()).toBe(200);
  expect((await updateUser.json()).rol.id).toBe(assignedRole.id);

  const resetPassword = await request.post(`/api/auth/reset-password/${user.id}`, {
    headers,
    data: { newPassword: 'OtraTemporal!2026_Segura' }
  });
  expect(resetPassword.status()).toBe(200);

  const updateUnusedRole = await request.put(`/api/roles/${initialRole.id}`, {
    headers,
    data: { descripcion: 'Rol editado por la prueba PC-001', version: initialRole.version }
  });
  expect(updateUnusedRole.status()).toBe(200);
  expect((await updateUnusedRole.json()).descripcion).toBe('Rol editado por la prueba PC-001');
  expect((await request.delete(`/api/roles/${initialRole.id}`, { headers })).status()).toBe(204);
  expect((await request.delete(`/api/usuarios/${user.id}`, { headers })).status()).toBe(204);

  const concurrentRole = await createRole(`PC001 Concurrente ${unique}`);
  const [concurrentUser, concurrentDisable] = await Promise.all([
    request.post('/api/usuarios', {
      headers,
      data: {
        email: `pc001-race-${unique}@example.test`,
        password: 'Concurrente!2026_Segura',
        nombreCompleto: `Usuario concurrente ${unique}`,
        tipo: 'USUARIO',
        rolId: concurrentRole.id
      }
    }),
    request.put(`/api/roles/${concurrentRole.id}`, {
      headers,
      data: { activo: false, version: concurrentRole.version }
    })
  ]);

  const concurrentStatuses = [concurrentUser.status(), concurrentDisable.status()];
  expect(
    (concurrentStatuses[0] === 201 && concurrentStatuses[1] === 409)
      || (concurrentStatuses[0] === 400 && concurrentStatuses[1] === 200)
  ).toBe(true);
});

test('stack real: los sueldos impactan una sola vez en caja y banco', async ({ request }) => {
  const { cookie, csrfToken, userId } = await authenticateAdmin(request);
  const headers = { cookie, 'x-csrf-token': csrfToken };
  const readHeaders = { cookie };
  const today = new Date().toISOString().slice(0, 10);
  const period = today.slice(0, 7);
  const [year, month] = period.split('-').map(Number);

  const getCashSummary = async () => {
    const response = await request.get(`/api/cajachica/resumen?mes=${month}&anio=${year}`, { headers: readHeaders });
    expect(response.status()).toBe(200);
    return response.json();
  };
  const getDashboard = async () => {
    const response = await request.get('/api/reportes/dashboard', { headers: readHeaders });
    expect(response.status()).toBe(200);
    return response.json();
  };

  const cashBefore = await getCashSummary();
  const dashboardBefore = await getDashboard();
  const salaryPayload = {
    usuarioId: userId,
    monto: 300000,
    moneda: 'ARS',
    fecha: today,
    periodo: period,
    metodoPago: 'EFECTIVO',
    observaciones: 'Prueba de integración PC-005'
  };

  const createSalary = await request.post('/api/sueldos', { headers, data: salaryPayload });
  expect(createSalary.status()).toBe(201);
  const salary = await createSalary.json();

  const cashAfterCreate = await getCashSummary();
  expect(cashAfterCreate.totalesPorMoneda.ARS.totalEgresos).toBe(cashBefore.totalesPorMoneda.ARS.totalEgresos + 300000);
  expect(cashAfterCreate.totalesPorMoneda.ARS.balanceCaja).toBe(cashBefore.totalesPorMoneda.ARS.balanceCaja - 300000);
  expect(cashAfterCreate.totalesPorMoneda.ARS.balanceBanco).toBe(cashBefore.totalesPorMoneda.ARS.balanceBanco);
  const dashboardAfterCreate = await getDashboard();
  expect(dashboardAfterCreate.finanzas.porMoneda.ARS.gastosAgencia)
    .toBe(dashboardBefore.finanzas.porMoneda.ARS.gastosAgencia + 300000);

  const duplicateSalary = await request.post('/api/sueldos', { headers, data: salaryPayload });
  expect(duplicateSalary.status()).toBe(409);
  const movementsAfterDuplicate = await request.get('/api/cajachica?limit=100', { headers: readHeaders });
  expect(movementsAfterDuplicate.status()).toBe(200);
  const linkedAfterDuplicate = (await movementsAfterDuplicate.json()).data
    .filter((movement: { pagoSueldoId: number | null }) => movement.pagoSueldoId === salary.id);
  expect(linkedAfterDuplicate).toHaveLength(1);

  const updateSalary = await request.put(`/api/sueldos/${salary.id}`, {
    headers,
    data: { monto: 500, moneda: 'USD', metodoPago: 'TRANSFERENCIA', version: salary.version }
  });
  expect(updateSalary.status()).toBe(200);

  const movementsAfterUpdate = await request.get('/api/cajachica?limit=100', { headers: readHeaders });
  expect(movementsAfterUpdate.status()).toBe(200);
  const linkedAfterUpdate = (await movementsAfterUpdate.json()).data
    .filter((movement: { pagoSueldoId: number | null }) => movement.pagoSueldoId === salary.id);
  expect(linkedAfterUpdate).toHaveLength(1);
  expect(linkedAfterUpdate[0]).toMatchObject({
    tipo: 'EGRESO',
    moneda: 'USD',
    metodoPago: 'TRANSFERENCIA',
    cuenta: 'BANCO'
  });
  expect(Number(linkedAfterUpdate[0].monto)).toBe(500);

  const cashAfterUpdate = await getCashSummary();
  expect(cashAfterUpdate.totalesPorMoneda.ARS.totalEgresos).toBe(cashBefore.totalesPorMoneda.ARS.totalEgresos);
  expect(cashAfterUpdate.totalesPorMoneda.ARS.balanceCaja).toBe(cashBefore.totalesPorMoneda.ARS.balanceCaja);
  expect(cashAfterUpdate.totalesPorMoneda.USD.totalEgresos).toBe(cashBefore.totalesPorMoneda.USD.totalEgresos + 500);
  expect(cashAfterUpdate.totalesPorMoneda.USD.balanceBanco).toBe(cashBefore.totalesPorMoneda.USD.balanceBanco - 500);
  const dashboardAfterUpdate = await getDashboard();
  expect(dashboardAfterUpdate.finanzas.porMoneda.ARS.gastosAgencia)
    .toBe(dashboardBefore.finanzas.porMoneda.ARS.gastosAgencia);
  expect(dashboardAfterUpdate.finanzas.porMoneda.USD.gastosAgencia)
    .toBe(dashboardBefore.finanzas.porMoneda.USD.gastosAgencia + 500);

  expect((await request.delete(`/api/sueldos/${salary.id}`, { headers })).status()).toBe(200);
  const movementsAfterDelete = await request.get('/api/cajachica?limit=100', { headers: readHeaders });
  const linkedAfterDelete = (await movementsAfterDelete.json()).data
    .filter((movement: { pagoSueldoId: number | null }) => movement.pagoSueldoId === salary.id);
  expect(linkedAfterDelete).toHaveLength(0);
  const cashAfterDelete = await getCashSummary();
  expect(cashAfterDelete.totalesPorMoneda).toEqual(cashBefore.totalesPorMoneda);
  const dashboardAfterDelete = await getDashboard();
  expect(dashboardAfterDelete.finanzas.porMoneda).toEqual(dashboardBefore.finanzas.porMoneda);
});

test('stack real: ciclo de vida contractual y disponibilidad de propiedades', async ({ request }) => {
  const { cookie, csrfToken } = await authenticateAdmin(request);
  const headers = { cookie, 'x-csrf-token': csrfToken };
  const readHeaders = { cookie };
  const unique = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  const dateAtOffset = (days: number) => {
    const date = new Date();
    date.setUTCDate(date.getUTCDate() + days);
    return date.toISOString().slice(0, 10);
  };

  const createContract = async (label: string, startOffset: number, endOffset: number) => {
    const address = `PC006 ${label} ${unique}`;
    const response = await request.post('/api/contratos', {
      headers,
      data: {
        fechaInicio: dateAtOffset(startOffset),
        fechaFin: dateAtOffset(endOffset),
        propiedad: { direccion: address, tipo: 'DEPARTAMENTO', estado: 'DISPONIBLE' },
        propietarios: [{ nombreCompleto: `Propietario ${label} ${unique}`, estado: 'ACTIVO' }],
        inquilinos: [{ nombreCompleto: `Inquilino ${label} ${unique}`, estado: 'ACTIVO' }],
        montoAlquiler: 100000,
        montoHonorarios: 0,
        moneda: 'ARS',
        pagaHonorarios: 'INQUILINO',
        diaVencimiento: 10,
        administrado: true,
        requiereActualizacion: false
      }
    });
    expect(response.status()).toBe(201);
    return { contract: await response.json(), address };
  };

  const getProperty = async (address: string) => {
    const response = await request.get(`/api/propiedades?search=${encodeURIComponent(address)}&limit=10`, { headers: readHeaders });
    expect(response.status()).toBe(200);
    const properties = (await response.json()).data;
    expect(properties).toHaveLength(1);
    return properties[0];
  };

  const dashboardBeforeResponse = await request.get('/api/reportes/dashboard', { headers: readHeaders });
  const dashboardBefore = await dashboardBeforeResponse.json();

  const future = await createContract('Futuro', 30, 60);
  expect(future.contract.estado).toBe('PROGRAMADO');
  expect((await getProperty(future.address)).estado).toBe('DISPONIBLE');

  const overlappingFuture = await request.post('/api/contratos', {
    headers,
    data: {
      fechaInicio: dateAtOffset(40),
      fechaFin: dateAtOffset(50),
      propiedadId: future.contract.propiedadId,
      propietarios: [{ nombreCompleto: `Propietario superpuesto ${unique}`, estado: 'ACTIVO' }],
      inquilinos: [{ nombreCompleto: `Inquilino superpuesto ${unique}`, estado: 'ACTIVO' }],
      montoAlquiler: 90000,
      montoHonorarios: 0,
      moneda: 'ARS',
      administrado: true,
      requiereActualizacion: false
    }
  });
  expect(overlappingFuture.status()).toBe(409);
  expect((await overlappingFuture.json()).code).toBe('PROPERTY_ALREADY_RENTED');

  const expired = await createContract('Vencido', -60, -30);
  expect(expired.contract.estado).toBe('FINALIZADO');
  expect((await getProperty(expired.address)).estado).toBe('DISPONIBLE');

  const current = await createContract('Vigente', -10, 10);
  expect(current.contract.estado).toBe('ACTIVO');
  expect((await getProperty(current.address)).estado).toBe('ALQUILADO');
  const dashboardCurrentResponse = await request.get('/api/reportes/dashboard', { headers: readHeaders });
  const dashboardCurrent = await dashboardCurrentResponse.json();
  expect(dashboardCurrent.contratos.activos).toBe(dashboardBefore.contratos.activos + 1);

  const rescind = await request.patch(`/api/contratos/${current.contract.id}/estado`, {
    headers,
    data: { estado: 'RESCINDIDO', version: current.contract.version }
  });
  expect(rescind.status()).toBe(200);
  const rescindedContract = await request.get(`/api/contratos/${current.contract.id}`, { headers: readHeaders });
  expect((await rescindedContract.json()).estado).toBe('RESCINDIDO');
  expect((await getProperty(current.address)).estado).toBe('DISPONIBLE');
  const dashboardAfterResponse = await request.get('/api/reportes/dashboard', { headers: readHeaders });
  const dashboardAfter = await dashboardAfterResponse.json();
  expect(dashboardAfter.contratos.activos).toBe(dashboardBefore.contratos.activos);
});

test('stack real: cada listado contractual queda aislado por estado', async ({ request }) => {
  const { cookie, csrfToken } = await authenticateAdmin(request);
  const headers = { cookie, 'x-csrf-token': csrfToken };
  const readHeaders = { cookie };
  const unique = `PC007-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  const dateAtOffset = (days: number) => {
    const date = new Date();
    date.setUTCDate(date.getUTCDate() + days);
    return date.toISOString().slice(0, 10);
  };

  const createContract = async (label: string, startOffset: number, endOffset: number) => {
    const response = await request.post('/api/contratos', {
      headers,
      data: {
        fechaInicio: dateAtOffset(startOffset),
        fechaFin: dateAtOffset(endOffset),
        propiedad: { direccion: `${unique} ${label}`, tipo: 'DEPARTAMENTO', estado: 'DISPONIBLE' },
        propietarios: [{ nombreCompleto: `Propietario ${unique} ${label}`, estado: 'ACTIVO' }],
        inquilinos: [{ nombreCompleto: `Inquilino ${unique} ${label}`, estado: 'ACTIVO' }],
        montoAlquiler: 100000,
        montoHonorarios: 0,
        moneda: 'ARS',
        pagaHonorarios: 'INQUILINO',
        diaVencimiento: 10,
        administrado: true,
        requiereActualizacion: false
      }
    });
    expect(response.status()).toBe(201);
    return response.json();
  };

  const active = await createContract('Activo', -5, 30);
  const programmed = await createContract('Programado', 30, 60);
  const finalized = await createContract('Finalizado', -60, -30);
  const rescinded = await createContract('Rescindido', -5, 30);
  const trashed = await createContract('Papelera', -5, 30);

  expect((await request.patch(`/api/contratos/${rescinded.id}/estado`, {
    headers,
    data: { estado: 'RESCINDIDO', version: rescinded.version }
  })).status()).toBe(200);
  expect((await request.delete(`/api/contratos/${trashed.id}`, { headers })).status()).toBe(200);

  const list = async (status?: string, legacyExpired = false) => {
    const params = new URLSearchParams({ search: unique, limit: '20' });
    if (status) params.set('status', status);
    if (legacyExpired) params.set('expired', 'false');
    const response = await request.get(`/api/contratos?${params}`, { headers: readHeaders });
    expect(response.status()).toBe(200);
    return response.json();
  };

  const defaultList = await list();
  expect(defaultList.meta.status).toBe('ACTIVO');
  expect(defaultList.data.map((contract: { id: number }) => contract.id)).toEqual([active.id]);

  const legacyDefaultList = await list(undefined, true);
  expect(legacyDefaultList.meta.status).toBe('ACTIVO');
  expect(legacyDefaultList.data.map((contract: { id: number }) => contract.id)).toEqual([active.id]);

  for (const [status, expectedId] of [
    ['PROGRAMADO', programmed.id],
    ['FINALIZADO', finalized.id],
    ['RESCINDIDO', rescinded.id],
    ['PAPELERA', trashed.id]
  ] as const) {
    const result = await list(status);
    expect(result.meta.status).toBe(status);
    expect(result.data.map((contract: { id: number }) => contract.id)).toEqual([expectedId]);
  }

  const invalidStatus = await request.get(`/api/contratos?search=${unique}&status=DESCONOCIDO`, { headers: readHeaders });
  expect(invalidStatus.status()).toBe(400);
  expect((await invalidStatus.json()).code).toBe('INVALID_CONTRACT_STATUS');
});

test('stack real: un plan sólo ofrece y permite liquidar las cuotas vencidas del período', async ({ request }) => {
  const { cookie, csrfToken } = await authenticateAdmin(request);
  const headers = { cookie, 'x-csrf-token': csrfToken };
  const readHeaders = { cookie };
  const unique = `PC008-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  const dateAtOffset = (days: number) => {
    const date = new Date();
    date.setUTCDate(date.getUTCDate() + days);
    return date.toISOString().slice(0, 10);
  };
  const periodAtOffset = (months: number) => {
    const today = new Date();
    return new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + months, 1)).toISOString().slice(0, 10);
  };

  const contractResponse = await request.post('/api/contratos', {
    headers,
    data: {
      fechaInicio: dateAtOffset(-30),
      fechaFin: dateAtOffset(365),
      propiedad: { direccion: unique, tipo: 'DEPARTAMENTO', estado: 'DISPONIBLE' },
      propietarios: [{ nombreCompleto: `Propietario ${unique}`, estado: 'ACTIVO' }],
      inquilinos: [{ nombreCompleto: `Inquilino ${unique}`, estado: 'ACTIVO' }],
      montoAlquiler: 100000,
      montoHonorarios: 0,
      moneda: 'ARS',
      pagaHonorarios: 'INQUILINO',
      diaVencimiento: 10,
      administrado: true,
      requiereActualizacion: false
    }
  });
  expect(contractResponse.status()).toBe(201);
  const contract = await contractResponse.json();
  const currentPeriod = periodAtOffset(0);
  const nextPeriod = periodAtOffset(1);
  const thirdPeriod = periodAtOffset(2);

  const planResponse = await request.post('/api/planes-cuotas', {
    headers,
    data: {
      contratoId: contract.id,
      concepto: `Plan ${unique}`,
      montoTotal: 300,
      cantidadCuotas: 3,
      fechaPrimeraCuota: currentPeriod,
      tipoMovimiento: 'INGRESO',
      esParaInmobiliaria: false
    }
  });
  expect(planResponse.status()).toBe(201);

  const plansResponse = await request.get(`/api/planes-cuotas/contrato/${contract.id}`, { headers: readHeaders });
  expect(plansResponse.status()).toBe(200);
  const [plan] = await plansResponse.json();
  expect(plan.cuotas.map((cuota: { fechaVencimiento: string }) => cuota.fechaVencimiento.slice(0, 10)))
    .toEqual([currentPeriod, nextPeriod, thirdPeriod]);

  const dueNowResponse = await request.get(
    `/api/planes-cuotas/contrato/${contract.id}/pendientes?periodo=${currentPeriod}`,
    { headers: readHeaders }
  );
  expect(dueNowResponse.status()).toBe(200);
  const dueNow = await dueNowResponse.json();
  expect(dueNow).toHaveLength(1);
  expect(dueNow[0]).toMatchObject({ numeroCuota: 1, correspondeAlPeriodo: true, vencida: false });

  const prematureLiquidation = await request.post('/api/liquidaciones', {
    headers,
    data: {
      contratoId: contract.id,
      periodo: currentPeriod,
      montoHonorarios: 0,
      cuotasIds: plan.cuotas.map((cuota: { id: number }) => cuota.id)
    }
  });
  expect(prematureLiquidation.status()).toBe(409);
  expect((await prematureLiquidation.json()).code).toBe('INSTALLMENT_NOT_DUE');

  const dueAfterRollback = await request.get(
    `/api/planes-cuotas/contrato/${contract.id}/pendientes?periodo=${currentPeriod}`,
    { headers: readHeaders }
  );
  expect((await dueAfterRollback.json()).map((cuota: { id: number }) => cuota.id)).toEqual([plan.cuotas[0].id]);

  const currentLiquidation = await request.post('/api/liquidaciones', {
    headers,
    data: {
      contratoId: contract.id,
      periodo: currentPeriod,
      montoHonorarios: 0,
      cuotasIds: [plan.cuotas[0].id]
    }
  });
  expect(currentLiquidation.status()).toBe(201);
  const currentLiquidationBody = await currentLiquidation.json();
  expect(currentLiquidationBody.movimientos.filter((movement: { concepto: string }) => movement.concepto.includes('Cuota')))
    .toHaveLength(1);

  const dueNextResponse = await request.get(
    `/api/planes-cuotas/contrato/${contract.id}/pendientes?periodo=${nextPeriod}`,
    { headers: readHeaders }
  );
  const dueNext = await dueNextResponse.json();
  expect(dueNext).toHaveLength(1);
  expect(dueNext[0]).toMatchObject({ numeroCuota: 2, correspondeAlPeriodo: true, vencida: false });

  const futureInstallmentResponse = await request.post('/api/liquidaciones', {
    headers,
    data: {
      contratoId: contract.id,
      periodo: nextPeriod,
      montoHonorarios: 0,
      cuotasIds: [plan.cuotas[2].id]
    }
  });
  expect(futureInstallmentResponse.status()).toBe(409);
  expect((await futureInstallmentResponse.json()).code).toBe('INSTALLMENT_NOT_DUE');
});

test('stack real: el prorrateo conserva exactamente el total del plan', async ({ request }) => {
  const { cookie, csrfToken } = await authenticateAdmin(request);
  const headers = { cookie, 'x-csrf-token': csrfToken };
  const readHeaders = { cookie };
  const unique = `PC009-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  const dateAtOffset = (days: number) => {
    const date = new Date();
    date.setUTCDate(date.getUTCDate() + days);
    return date.toISOString().slice(0, 10);
  };
  const today = new Date();
  const firstPeriod = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1)).toISOString().slice(0, 10);

  const contractResponse = await request.post('/api/contratos', {
    headers,
    data: {
      fechaInicio: dateAtOffset(-30),
      fechaFin: dateAtOffset(365),
      propiedad: { direccion: unique, tipo: 'DEPARTAMENTO', estado: 'DISPONIBLE' },
      propietarios: [{ nombreCompleto: `Propietario ${unique}`, estado: 'ACTIVO' }],
      inquilinos: [{ nombreCompleto: `Inquilino ${unique}`, estado: 'ACTIVO' }],
      montoAlquiler: 1000,
      montoHonorarios: 0,
      moneda: 'USD',
      pagaHonorarios: 'INQUILINO',
      diaVencimiento: 10,
      administrado: true,
      requiereActualizacion: false
    }
  });
  expect(contractResponse.status()).toBe(201);
  const contract = await contractResponse.json();

  const planResponse = await request.post('/api/planes-cuotas', {
    headers,
    data: {
      contratoId: contract.id,
      concepto: `Prorrateo ${unique}`,
      montoTotal: 100,
      cantidadCuotas: 3,
      fechaPrimeraCuota: firstPeriod,
      tipoMovimiento: 'INGRESO',
      esParaInmobiliaria: false
    }
  });
  expect(planResponse.status()).toBe(201);
  const createdPlan = await planResponse.json();

  const plansResponse = await request.get(`/api/planes-cuotas/contrato/${contract.id}`, { headers: readHeaders });
  expect(plansResponse.status()).toBe(200);
  const plan = (await plansResponse.json()).find((item: { id: number }) => item.id === createdPlan.id);
  const amounts = plan.cuotas.map((cuota: { monto: string | number }) => Number(cuota.monto));

  expect(amounts).toEqual([33.33, 33.33, 33.34]);
  expect(Math.round(amounts.reduce((sum: number, amount: number) => sum + amount, 0) * 100)).toBe(10000);
  expect(Number(plan.montoTotal)).toBe(100);
});

test('stack real: los medios de pago se limitan a efectivo, transferencia y cheque', async ({ request }) => {
  const { cookie, csrfToken } = await authenticateAdmin(request);
  const headers = { cookie, 'x-csrf-token': csrfToken };
  const readHeaders = { cookie };
  const unique = `PC010-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  const dateAtOffset = (days: number) => {
    const date = new Date();
    date.setUTCDate(date.getUTCDate() + days);
    return date.toISOString().slice(0, 10);
  };

  const createContract = (method: string, suffix: string) => {
    const address = `${unique}-${suffix}`;
    return {
      address,
      response: request.post('/api/contratos', {
        headers,
        data: {
          fechaInicio: dateAtOffset(-30),
          fechaFin: dateAtOffset(365),
          propiedad: { direccion: address, tipo: 'DEPARTAMENTO', estado: 'DISPONIBLE' },
          propietarios: [{ nombreCompleto: `Propietario ${address}`, estado: 'ACTIVO' }],
          inquilinos: [{ nombreCompleto: `Inquilino ${address}`, estado: 'ACTIVO' }],
          montoAlquiler: 100000,
          montoHonorarios: 0,
          moneda: 'ARS',
          pagaHonorarios: 'INQUILINO',
          diaVencimiento: 10,
          administrado: true,
          requiereActualizacion: false,
          honorarioInicial: 500,
          honorarioInicialMetodoPago: method
        }
      })
    };
  };

  const invalidDeposit = createContract('DEPOSITO', 'DEPOSITO');
  const invalidDepositResponse = await invalidDeposit.response;
  expect(invalidDepositResponse.status()).toBe(400);
  expect((await invalidDepositResponse.json()).errors).toEqual(expect.arrayContaining([
    expect.objectContaining({ field: 'honorarioInicialMetodoPago' })
  ]));

  for (const [method, expectedAccount] of [
    ['TRANSFERENCIA', 'BANCO'],
    ['CHEQUE', 'BANCO']
  ] as const) {
    const contract = createContract(method, method);
    expect((await contract.response).status()).toBe(201);

    const cashResponse = await request.get(`/api/cajachica?search=${encodeURIComponent(contract.address)}`, {
      headers: readHeaders
    });
    expect(cashResponse.status()).toBe(200);
    expect((await cashResponse.json()).data).toEqual([
      expect.objectContaining({ metodoPago: method, cuenta: expectedAccount })
    ]);
  }

});

test('stack real: la ficha de propiedad documenta servicios, llaves, notas y fotos', async ({ page, request }) => {
  const { cookie, csrfToken } = await authenticateAdmin(request);
  const headers = { cookie, 'x-csrf-token': csrfToken };
  const unique = `PC026 UI ${Date.now()}`;
  const creation = await request.post('/api/propiedades', {
    headers,
    data: {
      direccion: unique,
      tipo: 'DEPARTAMENTO',
      estado: 'DISPONIBLE',
      servicios: 'Luz medidor 4321 y gas cuenta 8765',
      llaves: 'Juego principal en casillero 7',
      observaciones: 'Acceso por portón lateral'
    }
  });
  expect(creation.status()).toBe(201);
  const property = await creation.json();

  try {
    await page.goto('/login');
    await page.getByPlaceholder('ejemplo@correo.com').fill(admin.email);
    await page.getByPlaceholder('••••••••').fill(admin.password);
    await page.getByRole('button', { name: /Ingresar a mi cuenta/i }).click();
    await expect(page).toHaveURL(/\/home$/);
    await page.goto('/propiedades');
    await page.getByPlaceholder(/Buscar por dirección, servicios/i).fill(unique);
    await page.getByRole('button', { name: `Ver ficha de ${unique}` }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('heading', { name: unique })).toBeVisible();
    await expect(dialog.getByText('Luz medidor 4321 y gas cuenta 8765')).toBeVisible();
    await expect(dialog.getByText('Juego principal en casillero 7')).toBeVisible();
    await expect(dialog.getByText('Sin contrato activo')).toBeVisible();

    await dialog.getByPlaceholder(/Dejá una nota fechada/i).fill('Inspección visual realizada sin novedades.');
    await dialog.getByRole('button', { name: 'Agregar nota' }).click();
    await expect(dialog.getByText('Inspección visual realizada sin novedades.')).toBeVisible();

    await dialog.locator('#property-attachment-file').setInputFiles({
      name: 'frente.png',
      mimeType: 'image/png',
      buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0, 0, 0, 0, 0])
    });
    await dialog.getByLabel('Nombre descriptivo').fill('Frente del inmueble');
    await dialog.getByRole('button', { name: 'Subir' }).click();
    await expect(dialog.getByAltText('Frente del inmueble')).toBeVisible();

    const accessibility = await new AxeBuilder({ page }).include('[role="dialog"]').withTags(['wcag2a', 'wcag2aa']).analyze();
    expect(accessibility.violations, accessibility.violations.map(item => `${item.id}: ${item.help}`).join('\n')).toEqual([]);
  } finally {
    const deletion = await request.delete(`/api/propiedades/${property.id}`, { headers });
    expect(deletion.status()).toBe(200);
  }
});
