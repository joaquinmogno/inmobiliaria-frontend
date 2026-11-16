export const admin = { id: 1, email: 'admin@test.local', nombreCompleto: 'Administración', fullName: 'Administración', tipo: 'ADMIN', role: 'ADMIN', permissions: [], inmobiliaria: { id: 1, nombre: 'PropControl' } };

export function fixture(moneda: 'ARS' | 'USD', mixed: boolean) {
    const amounts = mixed ? [{ moneda: 'USD', monto: 1000 }, { moneda: 'ARS', monto: 135760 }] : [{ moneda, monto: 1000 }];
    const summaries = amounts.map(amount => ({
        moneda: amount.moneda, totalIngresos: amount.monto, totalDescuentos: 0,
        netoACobrar: amount.monto, montoPropietario: amount.monto, cobradoInquilino: amount.monto,
        creditoAplicadoInquilino: 0, saldoInquilino: 0, pagadoPropietario: 0, saldoPropietario: amount.monto, capitalPropioExpuesto: 0,
    }));
    const contract = {
        id: 1, version: 1, estado: 'ACTIVO', administrado: true, moneda, montoAlquiler: 1000, montoHonorarios: 0,
        pagaHonorarios: 'PROPIETARIO', diaVencimiento: 10, fechaInicio: '2026-01-01', fechaFin: '2027-12-31',
        requiereActualizacion: false, actualizaciones: [], serviciosGastos: [], adjuntos: [], auditLogs: [],
        propiedad: { id: 1, direccion: 'Contrato monedas', piso: null, departamento: null },
        propietarios: [{ id: 1, esPrincipal: true, persona: { id: 1, nombreCompleto: 'Propietario' } }],
        inquilinos: [{ id: 2, esPrincipal: true, persona: { id: 2, nombreCompleto: 'Inquilino' } }],
    };
    const pagos = amounts.map((amount, index) => ({ ...amount, id: index + 1, fechaPago: '2026-10-10', metodoPago: 'EFECTIVO' }));
    const liquidation = {
        id: 10, version: 3, contratoId: 1, contrato: contract, periodo: '2026-10-01', estado: 'CONFIRMADA', moneda,
        fechaCreacion: '2026-10-01', fechaVencimiento: '2026-10-10', montoAlquilerBase: 1000, montoHonorarios: 0,
        montoPropietario: 1000, netoACobrar: 1000, totalIngresos: 1000, totalDescuentos: 0, pagaHonorarios: 'PROPIETARIO',
        estadoCobroInquilino: 'COBRADO', estadoPagoPropietario: 'PENDIENTE', resumenMonedas: summaries,
        pagos, movimientos: amounts.map((amount, index) => ({ ...amount, id: index + 1, tipo: 'INGRESO', concepto: index ? 'Servicio' : 'Alquiler', esParaInmobiliaria: false })),
        ajustes: [], aplicacionesCredito: [], historialPagosPropietario: [], auditLogs: [],
        comprobantes: [{
            id: 1, version: 1, fechaEmision: '2026-10-10', creadoPor: admin, moneda,
            importeOriginal: 1000, importeCorregido: 1000, importePropietarioOriginal: 1000, importePropietarioCorregido: 1000,
            importesPorMoneda: amounts.map(amount => ({ moneda: amount.moneda, importeOriginal: amount.monto, importeCorregido: amount.monto, importePropietarioOriginal: amount.monto, importePropietarioCorregido: amount.monto })),
            ajustes: [],
        }],
    };
    const period = {
        periodo: '2026-10-01', estado: 'PENDIENTE_PAGO_PROPIETARIO', liquidacionId: 10,
        total: 1000, cobrado: 1000, saldoInquilino: 0, pagadoPropietario: 0, saldoPropietario: 1000,
        pagos, pagosPropietario: [], cuotas: [], ajustes: [], observaciones: [], resumenMonedas: summaries,
    };
    return { contract, liquidation, timeline: { contrato: contract, defaultPeriod: period.periodo, periodos: [{ ...period, periodo: '2026-09-01', liquidacionId: 9 }, period] }, amounts };
}

