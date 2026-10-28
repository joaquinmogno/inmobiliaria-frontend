import { PencilSquareIcon } from '@heroicons/react/24/outline';
import { getLiquidationStatusLabel } from './liquidation-detail.model';
import { settlementStatusLabel, type Liquidacion } from '../../services/liquidaciones.service';
import { formatCurrency } from '../../utils/currency';
import { formatDate, formatMonthYear } from '../../utils/date';

export type CurrencySummary = NonNullable<Liquidacion['resumenMonedas']>[number];

interface Props {
    liquidacion: Liquidacion;
    summaries: CurrencySummary[];
    canEdit: boolean;
    onEditRent: () => void;
    onEditFees: () => void;
}

export default function LiquidationSummary({ liquidacion, summaries, canEdit, onEditRent, onEditFees }: Props) {
    const property = liquidacion.contrato?.propiedad;
    const address = [
        liquidacion.propiedadDireccion || property?.direccion || 'Sin dirección',
        property?.piso && `Piso ${property.piso}`,
        property?.departamento && `Depto. ${property.departamento}`
    ].filter(Boolean).join(' · ');
    const owner = liquidacion.propietarioNombre || liquidacion.propietarioPago?.nombreCompleto
        || liquidacion.contrato?.propietarios.find(person => person.esPrincipal)?.persona.nombreCompleto || 'Sin definir';
    const tenant = liquidacion.inquilinoNombre
        || liquidacion.contrato?.inquilinos.find(person => person.esPrincipal)?.persona.nombreCompleto || 'Sin definir';
    const moneyClass = 'mt-1 break-words text-xl font-black tracking-tight [overflow-wrap:anywhere]';
    const cardClass = 'min-w-0 rounded-2xl border p-3 sm:p-4';

    return <section data-testid="liquidation-document" aria-labelledby="liquidation-title" className="min-w-0 rounded-3xl border border-indigo-100 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
            <h1 id="liquidation-title" className="text-xl font-black text-gray-950 sm:text-2xl">
                Resumen de liquidación <span className="capitalize">· {formatMonthYear(liquidacion.periodo)}</span>
            </h1>
            <span className={`rounded-full px-3 py-1 text-xs font-bold ${liquidacion.estado === 'BORRADOR' ? 'bg-amber-100 text-amber-900' : liquidacion.estado === 'CONFIRMADA' ? 'bg-emerald-100 text-emerald-900' : 'bg-gray-100 text-gray-700'}`}>
                {getLiquidationStatusLabel(liquidacion.estado)} · N° {String(liquidacion.id).padStart(6, '0')}
            </span>
        </div>
        <dl className="mt-3 grid gap-3 rounded-2xl bg-indigo-50/60 p-3 text-sm sm:grid-cols-2 xl:grid-cols-[1.4fr_1fr_1fr_auto]">
            <div className="min-w-0"><dt className="text-xs font-bold text-gray-600">Inmueble</dt><dd data-testid="liquidation-fact-value" className="break-words font-black text-gray-950">{address}</dd></div>
            <div className="min-w-0"><dt className="text-xs font-bold text-gray-600">Propietario</dt><dd data-testid="liquidation-fact-value" className="break-words font-bold text-gray-900">{owner}</dd></div>
            <div className="min-w-0"><dt className="text-xs font-bold text-gray-600">Inquilino</dt><dd data-testid="liquidation-fact-value" className="break-words font-bold text-gray-900">{tenant}</dd></div>
            <div><dt className="text-xs font-bold text-gray-600">Vencimiento de pago</dt><dd className="font-bold text-gray-900">{formatDate(liquidacion.fechaVencimiento)}</dd></div>
        </dl>
        <div className="mt-3 grid grid-cols-1 gap-3 min-[400px]:grid-cols-2 xl:grid-cols-5">
            <div data-testid="liquidation-summary-card" className={`${cardClass} border-indigo-100 bg-indigo-50/30`}>
                <h2 className="text-xs font-bold text-gray-600">Alquiler mensual</h2>
                <p data-testid="liquidation-summary-amount" className={`${moneyClass} text-gray-950`}>{formatCurrency(Number(liquidacion.montoAlquilerBase), liquidacion.moneda)}</p>
                {canEdit && <button type="button" onClick={onEditRent} className="mt-2 inline-flex min-h-11 items-center gap-1 rounded-lg border border-indigo-300 px-2 text-xs font-bold text-indigo-800 hover:bg-indigo-50"><PencilSquareIcon className="h-4 w-4" />Editar alquiler</button>}
                <p className="mt-2 text-xs text-gray-600">{liquidacion.alquilerExcepcional ? 'Importe manual de este período' : 'Alquiler vigente precargado'}</p>
            </div>
            <div data-testid="liquidation-summary-card" className={`${cardClass} border-gray-200 bg-white`}>
                <h2 className="text-xs font-bold text-gray-600">Otros conceptos netos</h2>
                {summaries.map(summary => <p key={summary.moneda} className={`${moneyClass} text-gray-950`}>{formatCurrency(summary.netoACobrar - (summary.moneda === liquidacion.moneda ? Number(liquidacion.montoAlquilerBase) + (liquidacion.pagaHonorarios === 'INQUILINO' ? Number(liquidacion.montoHonorarios) : 0) : 0), summary.moneda)}</p>)}
                <p className="mt-2 text-xs text-gray-600">Ingresos y descuentos adicionales</p>
            </div>
            <div data-testid="liquidation-summary-card" className={`${cardClass} border-gray-200 bg-white`}>
                <h2 className="text-xs font-bold text-gray-600">Honorarios {liquidacion.porcentajeHonorarios != null ? `${liquidacion.porcentajeHonorarios}%` : '(fijos)'}</h2>
                <p data-testid="liquidation-summary-amount" className={`${moneyClass} text-indigo-700`}>{formatCurrency(Number(liquidacion.montoHonorarios), liquidacion.moneda)}</p>
                {canEdit && <button type="button" onClick={onEditFees} className="mt-2 inline-flex min-h-11 items-center gap-1 rounded-lg border border-indigo-300 px-2 text-xs font-bold text-indigo-800 hover:bg-indigo-50"><PencilSquareIcon className="h-4 w-4" />Editar honorarios</button>}
                <p className="mt-2 text-xs text-gray-600">{liquidacion.porcentajeHonorarios != null ? 'Sobre el alquiler completo' : 'Importe acordado'} · paga {liquidacion.pagaHonorarios === 'PROPIETARIO' ? 'propietario' : 'inquilino'}</p>
            </div>
            <div data-testid="liquidation-summary-card" className={`${cardClass} border-gray-200 bg-white`}>
                <h2 className="text-xs font-bold text-gray-600">Total a cobrar al inquilino</h2>
                {summaries.map(summary => <p data-testid="liquidation-summary-amount" key={summary.moneda} className={`${moneyClass} text-gray-950`}>{formatCurrency(summary.netoACobrar, summary.moneda)}</p>)}
                <p className="mt-2 text-xs text-gray-600">Total de este período</p>
            </div>
            <div data-testid="liquidation-summary-card" className={`${cardClass} border-emerald-200 bg-emerald-50`}>
                <h2 className="text-xs font-bold text-emerald-800">Neto propietario</h2>
                {summaries.map(summary => <p data-testid="liquidation-summary-amount" key={summary.moneda} className={`${moneyClass} text-emerald-900`}>{formatCurrency(summary.montoPropietario, summary.moneda)}</p>)}
                <p className="mt-2 text-xs text-emerald-800">Luego de honorarios y descuentos</p>
            </div>
        </div>
        {summaries.length > 1 && <p className="mt-2 text-xs font-semibold text-indigo-800">Pesos y dólares se administran por separado. Cada importe conserva su moneda.</p>}
        {liquidacion.estado === 'CONFIRMADA' && <div data-testid="liquidation-lifecycle" className="mt-3 grid gap-3 border-t border-gray-100 pt-3 text-xs sm:grid-cols-2">
            <div><p className="font-bold text-indigo-800">Cobro inquilino · {settlementStatusLabel(liquidacion.estadoCobroInquilino)}</p>{summaries.map(summary => <p key={summary.moneda} className="mt-1 text-gray-700">Cobrado {formatCurrency(summary.cobradoInquilino, summary.moneda)} · Saldo <strong>{formatCurrency(summary.saldoInquilino, summary.moneda)}</strong></p>)}</div>
            <div><p className="font-bold text-orange-800">Pago propietario · {settlementStatusLabel(liquidacion.estadoPagoPropietario)}</p>{summaries.map(summary => <p key={summary.moneda} className="mt-1 text-gray-700">Entregado {formatCurrency(summary.pagadoPropietario, summary.moneda)} · Saldo <strong>{formatCurrency(summary.saldoPropietario, summary.moneda)}</strong>{summary.capitalPropioExpuesto > 0 && <span className="block font-bold text-rose-800">Capital propio expuesto: {formatCurrency(summary.capitalPropioExpuesto, summary.moneda)}</span>}</p>)}</div>
        </div>}
    </section>;
}
