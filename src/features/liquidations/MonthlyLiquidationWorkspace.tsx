import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppSelect from '../../components/AppSelect';
import { formatCurrency } from '../../utils/currency';
import { formatDate, formatMonthYear } from '../../utils/date';
import { useMonthlyLiquidationWorkspace } from './useMonthlyLiquidationWorkspace';
import type { LiquidationPreparationRow } from '../../services/liquidaciones.service';

type OperationalState = 'TODAS' | 'PENDIENTE_LIQUIDAR' | 'BORRADOR' | 'PENDIENTE_COBRO' | 'EN_MORA' | 'PENDIENTE_PAGO_PROPIETARIO' | 'FINALIZADA' | 'REQUIERE_REVISION' | 'OMITIDA' | 'ANULADA';

const stateOf = (row: LiquidationPreparationRow): OperationalState => {
  if (row.estadoLiquidacion === 'ANULADA') return 'ANULADA';
  if (row.estadoLiquidacion === 'BORRADOR') return 'BORRADOR';
  if (row.estadoLiquidacion === 'CONFIRMADA') {
    if (row.vencida) return 'EN_MORA';
    if (row.estadoCobroInquilino === 'PENDIENTE' || row.estadoCobroInquilino === 'PARCIAL') return 'PENDIENTE_COBRO';
    if (row.estadoPagoPropietario === 'PENDIENTE' || row.estadoPagoPropietario === 'PARCIAL') return 'PENDIENTE_PAGO_PROPIETARIO';
    return 'FINALIZADA';
  }
  if (row.descartada) return 'OMITIDA';
  if (row.status === 'REVISAR' || row.status === 'NO_ELEGIBLE') return 'REQUIERE_REVISION';
  return 'PENDIENTE_LIQUIDAR';
};

const matchesFilter = (row: LiquidationPreparationRow, filter: OperationalState) => {
  if (filter === 'TODAS') return true;
  if (filter === 'EN_MORA') return row.moraHoy;
  if (filter === 'PENDIENTE_LIQUIDAR') return row.status === 'LISTA' || row.status === 'REVISAR';
  if (filter === 'PENDIENTE_COBRO') return row.estadoLiquidacion === 'CONFIRMADA' && (row.estadoCobroInquilino === 'PENDIENTE' || row.estadoCobroInquilino === 'PARCIAL');
  if (filter === 'PENDIENTE_PAGO_PROPIETARIO') return row.estadoLiquidacion === 'CONFIRMADA' && (row.estadoPagoPropietario === 'PENDIENTE' || row.estadoPagoPropietario === 'PARCIAL');
  return stateOf(row) === filter;
};

const labels: Record<OperationalState, string> = {
  TODAS: 'Todos los estados', PENDIENTE_LIQUIDAR: 'Pendiente de liquidar', BORRADOR: 'Borrador',
  PENDIENTE_COBRO: 'Pendiente de cobro', EN_MORA: 'En mora',
  PENDIENTE_PAGO_PROPIETARIO: 'Pendiente de pago al propietario', FINALIZADA: 'Finalizada',
  REQUIERE_REVISION: 'Requiere revisión', OMITIDA: 'Omitida', ANULADA: 'Anulada'
};

const tone: Record<OperationalState, string> = {
  TODAS: '', PENDIENTE_LIQUIDAR: 'bg-indigo-50 text-indigo-900 border-indigo-200',
  BORRADOR: 'bg-slate-100 text-slate-800 border-slate-200',
  PENDIENTE_COBRO: 'bg-amber-50 text-amber-900 border-amber-200',
  EN_MORA: 'bg-red-50 text-red-900 border-red-200',
  PENDIENTE_PAGO_PROPIETARIO: 'bg-blue-50 text-blue-900 border-blue-200',
  FINALIZADA: 'bg-green-50 text-green-900 border-green-200',
  REQUIERE_REVISION: 'bg-orange-50 text-orange-900 border-orange-200',
  OMITIDA: 'bg-gray-50 text-gray-800 border-gray-200',
  ANULADA: 'bg-gray-50 text-gray-800 border-gray-200'
};

export default function MonthlyLiquidationWorkspace() {
  const navigate = useNavigate();
  const workspace = useMonthlyLiquidationWorkspace();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<OperationalState>('TODAS');
  const rows = useMemo(() => (workspace.preparation?.data || [])
    .filter(row => matchesFilter(row, filter))
    .filter(row => `${row.propiedad.direccion} ${row.propiedad.piso || ''} ${row.propiedad.departamento || ''}`.toLocaleLowerCase('es-AR').includes(search.trim().toLocaleLowerCase('es-AR')))
    .sort((a, b) => a.propiedad.direccion.localeCompare(b.propiedad.direccion, 'es-AR') || a.contratoId - b.contratoId),
  [workspace.preparation, search, filter]);
  const summary = workspace.preparation?.resumen;
  const cards: Array<{ label: string; value: number; filter: OperationalState }> = summary ? [
    { label: 'Propiedades administradas', value: summary.total, filter: 'TODAS' },
    { label: 'Propiedades en mora hoy', value: summary.moraHoy, filter: 'EN_MORA' },
    { label: 'Pendientes de liquidar', value: summary.pendientesGenerar, filter: 'PENDIENTE_LIQUIDAR' },
    { label: 'Borradores', value: summary.borradores, filter: 'BORRADOR' },
    { label: 'Pendientes de cobro', value: summary.pendientesCobro, filter: 'PENDIENTE_COBRO' },
    { label: 'Pendientes de pago al propietario', value: summary.pendientesPagoPropietario, filter: 'PENDIENTE_PAGO_PROPIETARIO' }
  ] : [];
  const open = (row: LiquidationPreparationRow) => navigate(`/liquidaciones/contrato/${row.contratoId}?periodo=${workspace.period}`);

  return <section aria-labelledby="monthly-workspace-title" className="space-y-4">
    <div className="flex flex-col gap-3 rounded-2xl border border-indigo-100 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div><h2 id="monthly-workspace-title" className="text-xl font-black text-gray-950 sm:text-2xl">Liquidaciones de {formatMonthYear(`${workspace.period}-01`)}</h2><p className="mt-1 text-sm text-gray-600">Elegí una dirección para ver sus meses, deuda y pagos.</p></div>
      <input aria-label="Mes de trabajo" type="month" value={workspace.period} onChange={event => workspace.setPeriod(event.target.value)} className="min-h-11 w-full rounded-xl border border-gray-300 bg-white px-3 text-sm sm:w-56" />
    </div>

    {workspace.loading ? <p className="rounded-xl bg-white p-8 text-center text-gray-700">Cargando el mes…</p> : <>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
        {cards.map(card => <button key={card.label} type="button" onClick={() => setFilter(card.filter)} className={`rounded-xl border bg-white p-3 text-left shadow-sm hover:border-indigo-400 ${filter === card.filter ? 'border-indigo-500 ring-2 ring-indigo-100' : 'border-gray-200'}`}><span className="block text-2xl font-black text-indigo-900">{card.value}</span><span className="mt-1 block text-xs font-bold text-gray-700">{card.label}</span></button>)}
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-3 sm:flex-row">
        <input aria-label="Buscar por dirección" value={search} onChange={event => setSearch(event.target.value)} placeholder="Buscar dirección…" className="min-h-11 flex-1 rounded-lg border border-gray-300 px-3 text-sm" />
        <AppSelect ariaLabel="Filtrar por estado" value={filter} onChange={value => setFilter(value as OperationalState)} options={Object.entries(labels).map(([value, label]) => ({ value, label }))} className="w-full sm:w-64" />
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="divide-y divide-gray-100">
          {rows.map(row => {
            const status = stateOf(row);
            const address = [row.propiedad.direccion, row.propiedad.piso && `Piso ${row.propiedad.piso}`, row.propiedad.departamento && `Depto. ${row.propiedad.departamento}`].filter(Boolean).join(' · ');
            return <button key={row.contratoId} type="button" onClick={() => open(row)} className="grid w-full gap-3 p-4 text-left hover:bg-indigo-50/40 focus-visible:outline-indigo-500 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_auto] sm:items-center">
              <span className="min-w-0"><span className="block break-words font-black text-gray-950">{address}</span><span className="mt-1 block text-sm text-gray-700">{row.inquilino?.nombreCompleto || 'Inquilino sin definir'} · {row.propietario?.nombreCompleto || 'Propietario sin definir'}</span></span>
              <span className="min-w-0"><span className={`inline-flex rounded-full border px-2 py-1 text-xs font-bold ${tone[status]}`}>{labels[status]}</span>{row.moraHoy && status !== 'EN_MORA' && <span className="mt-1 block text-xs font-bold text-red-800">Tiene un mes anterior en mora</span>}{row.motivos[0] && status === 'REQUIERE_REVISION' && <span className="mt-1 block text-xs text-orange-900">{row.motivos[0]}</span>}{row.vencida && <span className="mt-1 block text-xs font-bold text-red-800">Vence {formatDate(row.fechaVencimiento)}</span>}</span>
              <span className="flex items-center justify-between gap-4 sm:block sm:text-right"><span className="block font-black text-gray-950">{formatCurrency(Number(row.totalLiquidacion ?? row.montoAlquiler), row.moneda)}</span>{Number(row.pendiente) > 0 && <span className="block text-xs text-gray-700">Saldo {formatCurrency(Number(row.pendiente), row.moneda)}</span>}<span className="text-sm font-bold text-indigo-700">Abrir propiedad →</span></span>
            </button>;
          })}
          {!rows.length && <p className="p-10 text-center text-sm text-gray-600">No hay propiedades con estos filtros.</p>}
        </div>
      </div>
    </>}
  </section>;
}
