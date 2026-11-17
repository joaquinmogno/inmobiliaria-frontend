import ContextHelp from '../../components/ContextHelp';
import MetricCard from '../../components/MetricCard';
import CurrencyAmounts from '../../components/CurrencyAmounts';
import LiquidationStates from './LiquidationStates';
import EmptyState from '../../components/EmptyState';
import { useAuth } from '../../context/AuthContext';
import { hasPermission } from '../../utils/permissions';
import LoadingState from '../../components/LoadingState';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppSelect from '../../components/AppSelect';
import { formatCurrency } from '../../utils/currency';
import { formatDate, formatMonthYear, todayDateInput } from '../../utils/date';
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
  PENDIENTE_PAGO_PROPIETARIO: 'Pendiente de pago al propietario', FINALIZADA: 'Cobro y pago resueltos',
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
  const { user } = useAuth();
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
    { label: 'Contratos administrados del mes', value: summary.total, filter: 'TODAS' },
    { label: 'Contratos con mora hoy', value: summary.moraHoy, filter: 'EN_MORA' },
    { label: 'Pendientes de liquidar', value: summary.pendientesGenerar, filter: 'PENDIENTE_LIQUIDAR' },
    { label: 'Borradores', value: summary.borradores, filter: 'BORRADOR' },
    { label: 'Pendientes de cobro', value: summary.pendientesCobro, filter: 'PENDIENTE_COBRO' },
    { label: 'Pendientes de pago al propietario', value: summary.pendientesPagoPropietario, filter: 'PENDIENTE_PAGO_PROPIETARIO' }
  ] : [];
  const open = (row: LiquidationPreparationRow) => navigate(`/liquidaciones/contrato/${row.contratoId}?periodo=${workspace.period}`);

  return <section aria-labelledby="monthly-workspace-title" className="space-y-3">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-2"><h2 id="monthly-workspace-title" className="ui-section-title">Liquidaciones de {formatMonthYear(`${workspace.period}-01`)}</h2><ContextHelp label="Ayuda de los indicadores del mes"><p>Se cuentan contratos administrados no eliminados que corresponden a {formatMonthYear(`${workspace.period}-01`)} por sus fechas de inicio, fin y entrega de llaves. Incluye borradores, omitidos y casos a revisar; no cuenta propiedades únicas. Los indicadores no cambian al buscar o filtrar.</p><p>Mora al {formatDate(todayDateInput())}: contratos de este listado con liquidaciones confirmadas vencidas y cobro pendiente o parcial, de cualquier período. Los demás indicadores corresponden al mes seleccionado. Cobros y pagos pendientes incluyen parciales; pendientes de liquidar incluye casos listos y a revisar.</p></ContextHelp></div>
      <input aria-label="Mes de trabajo" type="month" value={workspace.period} onChange={event => workspace.setPeriod(event.target.value)} className="ui-field sm:w-48" />
    </div>

    {workspace.loading ? <LoadingState label="Cargando el mes…" /> : !workspace.preparation ? <div role="alert" className="ui-panel p-5 text-sm text-red-800">No se pudo cargar el período.<button type="button" className="ui-button ui-button-secondary ml-3" onClick={() => void workspace.load()}>Reintentar</button></div> : <>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
        {cards.map(card => <MetricCard key={card.label} label={card.label} value={card.value} onClick={() => setFilter(card.filter)} selected={filter === card.filter} />)}
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-3 sm:flex-row">
        <input aria-label="Buscar por dirección" value={search} onChange={event => setSearch(event.target.value)} placeholder="Buscar dirección…" className="ui-field flex-1" />
        <AppSelect ariaLabel="Filtrar por estado" value={filter} onChange={value => setFilter(value as OperationalState)} options={Object.entries(labels).map(([value, label]) => ({ value, label }))} className="w-full sm:w-64" />
      </div>

      <div className="ui-panel overflow-hidden">
        <div className="divide-y divide-gray-100">
          {rows.map(row => {
            const status = stateOf(row);
            const address = [row.propiedad.direccion, row.propiedad.piso && `Piso ${row.propiedad.piso}`, row.propiedad.departamento && `Depto. ${row.propiedad.departamento}`].filter(Boolean).join(' · ');
            return <button key={row.contratoId} type="button" onClick={() => open(row)} className="grid w-full gap-3 p-3 text-left transition-colors hover:bg-slate-50 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1fr)] sm:items-start">
              <span className="min-w-0"><span className="block break-words font-semibold text-gray-950">{address}</span><span className="mt-1 block text-sm text-gray-700">{row.inquilino?.nombreCompleto || 'Inquilino sin definir'} · {row.propietario?.nombreCompleto || 'Propietario sin definir'}</span></span>
              <span className="min-w-0"><span className={`ui-status ${tone[status]}`}>{labels[status]}</span><LiquidationStates documentState={row.estadoLiquidacion} tenantState={row.estadoCobroInquilino} ownerState={row.estadoPagoPropietario} closedAt={row.fechaLiquidacion} closedById={row.cerradoPorId} className="mt-2 flex-col" />{row.moraHoy && status !== 'EN_MORA' && <span className="mt-1 block text-xs font-bold text-red-800">Tiene otra liquidación vencida al día de hoy</span>}{row.motivos[0] && status === 'REQUIERE_REVISION' && <span className="mt-1 block text-xs text-orange-900">{row.motivos[0]}</span>}{row.vencida && <span className="mt-1 block text-xs font-bold text-red-800">Vence {formatDate(row.fechaVencimiento)}</span>}</span>
              <span className="min-w-0 space-y-1 tabular-nums sm:col-span-2 xl:col-span-1 sm:text-right">
                {row.resumenMonedas?.length ? <>
                  <span className="block text-xs text-gray-600">Total documentado</span>
                  <span className="block font-bold text-gray-950"><CurrencyAmounts amounts={row.resumenMonedas.map(item => ({ moneda: item.moneda, monto: item.netoACobrar }))} /></span>
                  <span className="block text-xs text-gray-700">Cobrado <CurrencyAmounts amounts={row.resumenMonedas.map(item => ({ moneda: item.moneda, monto: item.cobradoInquilino }))} /></span>
                  {row.resumenMonedas.some(item => item.creditoAplicadoInquilino > 0) && <span className="block text-xs text-gray-700">Crédito aplicado <CurrencyAmounts amounts={row.resumenMonedas.filter(item => item.creditoAplicadoInquilino > 0).map(item => ({ moneda: item.moneda, monto: item.creditoAplicadoInquilino }))} /></span>}
                  <span className="block text-xs text-gray-700">Saldo inquilino <CurrencyAmounts amounts={row.resumenMonedas.map(item => ({ moneda: item.moneda, monto: item.saldoInquilino }))} /></span>
                  <span className="block text-xs text-gray-700">Saldo propietario <CurrencyAmounts amounts={row.resumenMonedas.map(item => ({ moneda: item.moneda, monto: item.saldoPropietario }))} /></span>
                </> : <><span className="block font-bold text-gray-950">{formatCurrency(Number(row.totalLiquidacion ?? row.montoAlquiler), row.moneda)}</span>{Number(row.pendiente) > 0 && <span className="block text-xs text-gray-700">Saldo {formatCurrency(Number(row.pendiente), row.moneda)}</span>}</>}
                <span className="block text-sm font-bold text-indigo-700">Abrir propiedad →</span>
              </span>
            </button>;
          })}
          {!rows.length && <EmptyState filtered={Boolean(search.trim()) || filter !== 'TODAS'} title="Sin contratos para liquidar este mes" onClear={() => { setSearch(''); setFilter('TODAS'); }} action={hasPermission(user, 'contratos.ver') && hasPermission(user, 'contratos.crear') ? { label: 'Crear contrato', onClick: () => navigate('/contratos', { state: { openNewContractModal: true } }) } : undefined} />}
        </div>
      </div>
    </>}
  </section>;
}
