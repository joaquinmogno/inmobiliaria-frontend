import { expect, test } from '@playwright/test';

test('el cobro del inquilino permanece abierto al desplazar un formulario largo', async ({ page }) => {
  const admin = {
    id: 1, email: 'admin@test.local', fullName: 'Administrador', nombreCompleto: 'Administrador',
    tipo: 'ADMIN', role: 'ADMIN', rol: null, permissions: [], inmobiliaria: { id: 1, nombre: 'Test' }
  };
  const liquidation = {
    id: 1, version: 1, contratoId: 1, periodo: '2026-10-01', estado: 'CONFIRMADA',
    estadoCobroInquilino: 'PENDIENTE', estadoPagoPropietario: 'PENDIENTE', moneda: 'ARS',
    montoAlquilerBase: 500000, porcentajeHonorarios: 5, montoHonorarios: 25000,
    montoPropietario: 475000, netoACobrar: 500000, totalIngresos: 500000, totalDescuentos: 0,
    pagaHonorarios: 'PROPIETARIO', propiedadDireccion: 'Arregui 1234',
    inquilinoNombre: 'Inquilino de prueba', propietarioNombre: 'Propietario de prueba',
    fechaCreacion: '2026-10-01T12:00:00.000Z', fechaLiquidacion: '2026-10-01T12:00:00.000Z',
    fechaVencimiento: '2026-10-10', movimientos: [], pagos: [], ajustes: [],
    aplicacionesCredito: [], historialPagosPropietario: [], comprobantes: [], auditLogs: [],
    resumenOperativo: {
      cobradoInquilino: 0, creditoAplicadoInquilino: 0, saldoInquilino: 500000,
      pagadoPropietario: 0, saldoPropietario: 475000, capitalPropioExpuesto: 0
    },
    cuotas: Array.from({ length: 8 }, (_, index) => ({
      id: index + 1, numeroCuota: index + 1, monto: 5000, estado: 'PENDIENTE',
      plan: { concepto: `Acuerdo ${index + 1}`, _count: { cuotas: 8 } }, imputacionesPago: []
    })),
    contrato: {
      id: 1, version: 1, estado: 'ACTIVO', fechaInicio: '2026-01-01', fechaFin: '2027-12-31',
      fechaProximaActualizacion: '2027-01-01', requiereActualizacion: true,
      frecuenciaActualizacionMeses: 3, modalidadCobroInquilino: 'EFECTIVO',
      modalidadPagoPropietario: 'EFECTIVO', serviciosGastos: [],
      propiedad: { id: 1, direccion: 'Arregui 1234' },
      inquilinos: [{ esPrincipal: true, persona: { id: 2, nombreCompleto: 'Inquilino de prueba' } }],
      propietarios: [{ esPrincipal: true, persona: { id: 3, nombreCompleto: 'Propietario de prueba' } }]
    }
  };

  await page.route('**/api/**', async route => {
    const path = new URL(route.request().url()).pathname;
    const data = path.endsWith('/auth/me') ? admin
        : path.endsWith('/liquidaciones/1') ? liquidation
          : path.includes('/pagos/deuda/contrato/1') ? { totalDeuda: 0, moneda: 'ARS', detalle: [] }
            : path.includes('/liquidaciones/contrato/1/periodos') ? { periodos: [] }
              : path.endsWith('/cuentas-bancarias') || path.endsWith('/contratos/alertas') || path.includes('/alertas-operativas') ? [] : {};
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(data) });
  });

  await page.addInitScript(user => {
    localStorage.setItem('user', JSON.stringify(user));
    localStorage.setItem('loginTimestamp', String(Date.now()));
  }, admin);
  await page.goto('/liquidaciones/1');
  for (const width of [390, 1280]) {
    await page.setViewportSize({ width, height: 600 });
    await page.getByRole('button', { name: 'Registrar pago del inquilino' }).click();

    const dialog = page.getByRole('dialog', { name: 'Registrar pago' });
    await expect(dialog.getByRole('heading', { name: 'Registrar pago' })).toBeVisible();
    const amount = dialog.locator('#tenant-payment-amount');
    await amount.fill('150000');

    const scrollableForm = dialog.locator('form');
    const dimensions = await scrollableForm.evaluate(element => ({
      clientHeight: element.clientHeight, scrollHeight: element.scrollHeight
    }));
    expect(dimensions.scrollHeight).toBeGreaterThan(dimensions.clientHeight);

    await scrollableForm.hover();
    await page.mouse.wheel(0, 1200);
    await expect.poll(() => scrollableForm.evaluate(element => element.scrollTop)).toBeGreaterThan(0);
    const formBounds = await scrollableForm.boundingBox();
    if (formBounds) {
      await page.mouse.move(formBounds.x + formBounds.width - 2, formBounds.y + 80);
      await page.mouse.down();
      await page.mouse.move(formBounds.x + formBounds.width - 2, formBounds.y + formBounds.height - 20, { steps: 6 });
      await page.mouse.up();
    }
    await expect(dialog.getByRole('button', { name: 'Confirmar Ingreso de Pago' })).toBeVisible();
    await expect(dialog.getByRole('heading', { name: 'Registrar pago' })).toBeVisible();
    await expect(amount).toHaveValue('150.000');
    await dialog.getByRole('button', { name: 'Cancelar' }).click();
    await expect(dialog.getByRole('heading', { name: 'Registrar pago' })).toHaveCount(0);
  }
});
