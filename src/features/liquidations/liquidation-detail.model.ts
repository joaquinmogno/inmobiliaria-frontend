import type { Liquidacion } from '../../services/liquidaciones.service';

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
    liquidacion.pagos?.reduce((total, payment) => total + Number(payment.monto), 0) || 0;

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
