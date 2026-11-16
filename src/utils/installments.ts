// Values arrive with two decimal places. Subtract cents to keep e.g.
// 33.33 - 10.10 at 23.23, including the input's maximum allowed payment.
export function installmentOutstanding(cuota: {
    monto: number | string;
    estado: string;
    imputacionesPago: Array<{ monto: number | string }>;
}): number {
    if (cuota.estado === 'PAGADA') return 0;
    const allocatedCents = cuota.imputacionesPago.reduce((sum, item) => sum + Math.round(Number(item.monto) * 100), 0);
    return Math.max(0, Math.round(Number(cuota.monto) * 100) - allocatedCents) / 100;
}
