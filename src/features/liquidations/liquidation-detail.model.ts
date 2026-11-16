import type { ContractLiquidationTimeline, Liquidacion } from '../../services/liquidaciones.service';

export const LIQUIDATION_STEPS = [
    { id: 'BORRADOR', label: 'Borrador', description: 'Se pueden editar los conceptos' },
    { id: 'CONFIRMADA', label: 'Confirmada', description: 'Cobro y pago al propietario se gestionan por separado' },
    { id: 'ANULADA', label: 'Anulada', description: 'Documento sin circuito operativo vigente' }
] as const;

export const getLiquidationStatusLabel = (status: string) => {
    switch (status) {
        case 'BORRADOR': return 'Borrador';
        case 'CONFIRMADA': return 'Confirmada';
        case 'ANULADA': return 'Anulada';
        default: return status;
    }
};

export const isLiquidationEditable = (status: string) =>
    status === 'BORRADOR';

export const getTenantPaidTotal = (liquidacion: Liquidacion) =>
    liquidacion.pagos?.filter(payment => !payment.moneda || payment.moneda === liquidacion.moneda)
        .reduce((total, payment) => total + Number(payment.monto), 0) || 0;

export const getTenantCreditAppliedTotal = (liquidacion: Liquidacion) =>
    liquidacion.aplicacionesCredito?.reduce((total, application) => total + Number(application.monto), 0) || 0;

export const getTenantRemainingBalance = (liquidacion: Liquidacion) =>
    Math.max(0, Number(liquidacion.netoACobrar) - getTenantPaidTotal(liquidacion) - getTenantCreditAppliedTotal(liquidacion));

export const getOwnerNetAmount = (liquidacion: Liquidacion) => {
    if (liquidacion.montoPropietario !== undefined && liquidacion.montoPropietario !== null) {
        return Number(liquidacion.montoPropietario);
    }
    const agencyMovements = liquidacion.movimientos
        ?.filter(movement => movement.esParaInmobiliaria)
        .reduce((total, movement) => total + Number(movement.monto), 0) || 0;
    return Number(liquidacion.netoACobrar) - Number(liquidacion.montoHonorarios || 0) - agencyMovements;
};

// El backend calcula los importes; todas las vistas comparten esta selección.
export const getCurrencySummaries = (liquidacion: Liquidacion): NonNullable<Liquidacion['resumenMonedas']> => liquidacion.resumenMonedas?.length ? liquidacion.resumenMonedas.filter(summary =>
        summary.moneda === liquidacion.moneda || summary.netoACobrar > 0 || summary.montoPropietario > 0 || summary.cobradoInquilino > 0 || summary.pagadoPropietario > 0
    ) : [{
        moneda: liquidacion.moneda,
        totalIngresos: Number(liquidacion.totalIngresos || 0),
        totalDescuentos: Number(liquidacion.totalDescuentos || 0),
        netoACobrar: Number(liquidacion.netoACobrar || 0),
        montoPropietario: Number(liquidacion.montoPropietario || 0),
        cobradoInquilino: Number(liquidacion.resumenOperativo?.cobradoInquilino ?? getTenantPaidTotal(liquidacion)),
        creditoAplicadoInquilino: Number(liquidacion.resumenOperativo?.creditoAplicadoInquilino || 0),
        saldoInquilino: getTenantRemainingBalance(liquidacion),
        pagadoPropietario: Number(liquidacion.resumenOperativo?.pagadoPropietario ?? liquidacion.montoPagadoPropietario ?? 0),
        saldoPropietario: Math.max(0, Number(liquidacion.montoPropietario || 0) - Number(liquidacion.resumenOperativo?.pagadoPropietario ?? liquidacion.montoPagadoPropietario ?? 0)),
        capitalPropioExpuesto: Number(liquidacion.resumenOperativo?.capitalPropioExpuesto || 0)
    }];

export const getPeriodCurrencySummaries = (
    period: ContractLiquidationTimeline['periodos'][number],
    moneda: Liquidacion['moneda']
) => period.resumenMonedas?.length ? period.resumenMonedas : [{
    moneda,
    netoACobrar: Number(period.total || 0),
    cobradoInquilino: period.cobrado,
    saldoInquilino: period.saldoInquilino,
    pagadoPropietario: period.pagadoPropietario,
    saldoPropietario: period.saldoPropietario
}];
