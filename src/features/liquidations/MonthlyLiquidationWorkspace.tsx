import {
  BanknotesIcon,
  CheckCircleIcon,
  ClockIcon,
  DocumentCheckIcon,
  DocumentPlusIcon,
  ExclamationTriangleIcon,
  UserGroupIcon
} from '@heroicons/react/24/outline';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppSelect from '../../components/AppSelect';
import { formatCurrency } from '../../utils/currency';
import { formatDate, formatMonthYear } from '../../utils/date';
import ExceptionReviewDialog from './ExceptionReviewDialog';
import { useMonthlyLiquidationWorkspace } from './useMonthlyLiquidationWorkspace';
import { settlementStatusLabel } from '../../services/liquidaciones.service';

type Props = { canCreate: boolean; onOpenIndividual: () => void };
type ViewFilter = 'PENDIENTES' | 'REVISAR' | 'FINALIZADAS' | 'TODAS';
const tenantPending = (state: string | null) => state === 'PENDIENTE' || state === 'PARCIAL';
const ownerPending = (state: string | null) => state === 'PENDIENTE' || state === 'PARCIAL';
const tenantResolved = (state: string | null) => state === 'COBRADO' || state === 'NO_APLICA';
const ownerResolved = (state: string | null) => state === 'PAGADO' || state === 'NO_APLICA';

export default function MonthlyLiquidationWorkspace({ canCreate, onOpenIndividual }: Props) {
  const navigate = useNavigate();
  const workspace = useMonthlyLiquidationWorkspace();
  const [filter, setFilter] = useState<ViewFilter>('PENDIENTES');
  const rows = useMemo(() => (workspace.preparation?.data || []).filter(row => {
    if (filter === 'REVISAR') return row.status === 'REVISAR';
    if (filter === 'FINALIZADAS') return row.estadoLiquidacion === 'CONFIRMADA' && tenantResolved(row.estadoCobroInquilino) && ownerResolved(row.estadoPagoPropietario);
    if (filter === 'PENDIENTES') return row.status === 'LISTA' || row.status === 'REVISAR'
      || row.estadoLiquidacion === 'BORRADOR'
      || (row.estadoLiquidacion === 'CONFIRMADA' && (tenantPending(row.estadoCobroInquilino) || ownerPending(row.estadoPagoPropietario)));
    return true;
  }), [filter, workspace.preparation]);

  const summary = workspace.preparation?.resumen;
  const summaryCards = summary ? [
    { label: 'Por generar', value: summary.pendientesGenerar, icon: DocumentPlusIcon, tone: 'text-indigo-800 bg-indigo-50 border-indigo-200', filter: 'PENDIENTES' as ViewFilter },
    { label: 'Borradores', value: summary.borradores, icon: DocumentCheckIcon, tone: 'text-gray-800 bg-gray-50 border-gray-200', filter: 'PENDIENTES' as ViewFilter },
    { label: 'Por cobrar', value: summary.pendientesCobro, icon: BanknotesIcon, tone: 'text-amber-900 bg-amber-50 border-amber-200', filter: 'PENDIENTES' as ViewFilter },
    { label: 'Por pagar al propietario', value: summary.pendientesPagoPropietario, icon: UserGroupIcon, tone: 'text-blue-900 bg-blue-50 border-blue-200', filter: 'PENDIENTES' as ViewFilter },
    { label: 'Finalizadas', value: summary.finalizadas, icon: CheckCircleIcon, tone: 'text-green-900 bg-green-50 border-green-200', filter: 'FINALIZADAS' as ViewFilter },
    { label: 'Requieren revisión', value: summary.revisar, icon: ExclamationTriangleIcon, tone: 'text-red-900 bg-red-50 border-red-200', filter: 'REVISAR' as ViewFilter }
  ] : [];

  const address = (row: typeof rows[number]) => `${row.propiedad.direccion}${row.propiedad.piso ? ` · Piso ${row.propiedad.piso}` : ''}${row.propiedad.departamento ? ` · Depto. ${row.propiedad.departamento}` : ''}`;
  const statusLabel = (row: typeof rows[number]) => row.status === 'LISTA' ? 'Lista para generar'
    : row.status === 'REVISAR' ? 'Requiere revisión'
      : row.estadoLiquidacion === 'BORRADOR' ? 'Borrador'
        : row.estadoLiquidacion === 'CONFIRMADA' && row.estadoCobroInquilino && row.estadoPagoPropietario ? `Cobro ${settlementStatusLabel(row.estadoCobroInquilino)} · dueño ${settlementStatusLabel(row.estadoPagoPropietario)}`
          : row.estadoLiquidacion === 'ANULADA' ? 'Anulada'
            : row.descartada ? 'Omitida este mes' : 'No corresponde';
  const statusTone = (row: typeof rows[number]) => row.status === 'REVISAR' || row.vencida
    ? 'border-red-300 bg-red-50 text-red-900'
    : row.estadoLiquidacion === 'CONFIRMADA' && tenantResolved(row.estadoCobroInquilino) && ownerResolved(row.estadoPagoPropietario)
      ? 'border-green-300 bg-green-50 text-green-900'
      : row.status === 'LISTA'
        ? 'border-indigo-300 bg-indigo-50 text-indigo-900'
        : 'border-gray-300 bg-gray-50 text-gray-800';
  const rowAction = (row: typeof rows[number], fullWidth = false) => row.liquidacionId
    ? <button type="button" onClick={() => navigate(`/liquidaciones/${row.liquidacionId}`)} className={`min-h-11 rounded-xl bg-indigo-600 px-3 text-sm font-bold leading-4 text-white hover:bg-indigo-700 ${fullWidth ? 'w-full' : 'w-full xl:w-auto'}`}>{row.proximaAccion}</button>
    : row.status === 'REVISAR'
      ? <button type="button" onClick={() => workspace.setReviewing(row)} className={`min-h-11 rounded-xl border border-red-300 px-3 text-sm font-bold text-red-900 hover:bg-red-50 ${fullWidth ? 'w-full' : 'w-full xl:w-auto'}`}>{canCreate ? 'Resolver excepción' : 'Ver excepción'}</button>
      : row.descartada && canCreate
        ? <button type="button" disabled={workspace.working} onClick={() => void workspace.reopen(row)} className={`min-h-11 rounded-xl border border-gray-300 px-3 text-sm font-bold text-gray-800 hover:bg-gray-100 disabled:opacity-50 ${fullWidth ? 'w-full' : 'w-full xl:w-auto'}`}>Reabrir este mes</button>
        : <span className="text-sm font-semibold text-gray-600">{row.proximaAccion}</span>;

  return <section aria-labelledby="monthly-workspace-title" className="space-y-5">
    <div className="rounded-2xl border border-indigo-100 bg-white shadow-sm">
      <div className="flex flex-col gap-4 border-b border-gray-200 p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-bold text-indigo-700">Espacio de trabajo mensual</p>
          <h2 id="monthly-workspace-title" className="mt-1 text-xl font-black text-gray-950 sm:text-2xl">Liquidaciones de {formatMonthYear(`${workspace.period}-01`)}</h2>
          <p className="mt-1 text-sm text-gray-700">Revisá únicamente las excepciones y avanzá según la próxima acción indicada.</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <AppSelect ariaLabel="Mes de trabajo" value={workspace.period} onChange={workspace.setPeriod} options={workspace.monthOptions} className="w-full sm:w-56" />
          {canCreate && <button type="button" onClick={onOpenIndividual} className="min-h-11 rounded-xl border border-indigo-300 px-4 text-sm font-bold text-indigo-800 hover:bg-indigo-50">Crear individual</button>}
        </div>
      </div>

      {workspace.loading ? <div className="flex min-h-40 items-center justify-center gap-3 p-8 text-gray-700"><ClockIcon className="h-5 w-5 animate-pulse" /><span>Cargando el mes…</span></div> : <>
        <div className="grid grid-cols-2 gap-2 p-3 sm:grid-cols-3 lg:grid-cols-6 sm:p-4">
          {summaryCards.map(card => <button key={card.label} type="button" onClick={() => setFilter(card.filter)} className={`min-w-0 rounded-xl border p-3 text-left transition hover:-translate-y-0.5 hover:shadow-sm focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-200 ${card.tone}`}>
            <card.icon className="h-5 w-5" aria-hidden="true" />
            <span className="mt-2 block text-2xl font-black">{card.value}</span>
            <span className="block break-words text-xs font-bold leading-4">{card.label}</span>
          </button>)}
        </div>

        <div className="flex flex-col gap-3 border-y border-gray-200 bg-gray-50/70 p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">
          <div className="flex gap-1 overflow-x-auto" role="group" aria-label="Filtrar trabajo mensual">
            {([['PENDIENTES', 'Pendientes'], ['REVISAR', 'A revisar'], ['FINALIZADAS', 'Finalizadas'], ['TODAS', 'Todo']] as const).map(([value, label]) => <button key={value} type="button" aria-pressed={filter === value} onClick={() => setFilter(value)} className={`min-h-11 whitespace-nowrap rounded-xl px-3 text-sm font-bold ${filter === value ? 'bg-indigo-600 text-white' : 'text-gray-700 hover:bg-white'}`}>{label}</button>)}
          </div>
          {canCreate && workspace.selectedIds.length > 0 && <button type="button" disabled={workspace.working} onClick={() => void workspace.generateSelected()} className="min-h-11 rounded-xl bg-indigo-600 px-5 text-sm font-bold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50">{workspace.working ? 'Generando…' : `Generar ${workspace.selectedIds.length} borrador${workspace.selectedIds.length === 1 ? '' : 'es'}`}</button>}
        </div>

        <div className="hidden overflow-x-auto lg:block">
          <table className="w-full table-fixed border-collapse text-left">
            <caption className="sr-only">Contratos y liquidaciones del período seleccionado</caption>
            <thead className="border-b border-gray-200 bg-gray-50 text-xs font-black uppercase tracking-wide text-gray-700">
              <tr>
                <th scope="col" className="w-12 px-3 py-3"><span className="sr-only">Seleccionar</span></th>
                <th scope="col" className="w-[25%] px-3 py-3">Propiedad</th>
                <th scope="col" className="w-[21%] px-3 py-3">Personas</th>
                <th scope="col" className="w-[19%] px-3 py-3">Estado</th>
                <th scope="col" className="w-[16%] px-3 py-3 text-right">Importe</th>
                <th scope="col" className="w-[19%] px-3 py-3 text-right">Próxima acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {rows.map(row => {
                const amount = Number(row.totalLiquidacion ?? row.montoAlquiler);
                return <tr key={row.contratoId} className="align-top hover:bg-gray-50/80">
                  <td className="px-3 py-3.5">
                    {row.status === 'LISTA' && canCreate ? <input type="checkbox" aria-label={`Seleccionar ${address(row)}`} checked={workspace.selectedIds.includes(row.contratoId)} onChange={() => workspace.toggle(row.contratoId)} className="h-5 w-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                      : row.status === 'REVISAR' ? <ExclamationTriangleIcon className="h-5 w-5 text-red-700" aria-label="Requiere revisión" />
                        : row.estadoLiquidacion === 'CONFIRMADA' && tenantResolved(row.estadoCobroInquilino) && ownerResolved(row.estadoPagoPropietario) ? <CheckCircleIcon className="h-5 w-5 text-green-700" aria-label="Finalizada" />
                          : <DocumentCheckIcon className="h-5 w-5 text-indigo-700" aria-hidden="true" />}
                  </td>
                  <td className="min-w-0 px-3 py-3.5">
                    <p className="break-words text-sm font-black text-gray-950">{address(row)}</p>
                    <p className="mt-1 text-xs font-semibold text-gray-600">{row.totalLiquidacion ? `Vence ${formatDate(row.fechaVencimiento)}` : 'Alquiler del período'}</p>
                  </td>
                  <td className="min-w-0 px-3 py-3.5 text-sm text-gray-800">
                    <p className="break-words font-bold">{row.inquilino?.nombreCompleto || 'Sin inquilino principal'}</p>
                    <p className="mt-1 break-words text-xs text-gray-600">Propietario: {row.propietario?.nombreCompleto || 'sin principal'}</p>
                  </td>
                  <td className="min-w-0 px-3 py-3.5">
                    <span className={`inline-flex rounded-full border px-2 py-1 text-xs font-bold leading-4 ${statusTone(row)}`}>{statusLabel(row)}</span>
                    {row.status === 'REVISAR' && <p className="mt-2 break-words text-xs font-semibold text-red-800">{row.motivos[0]}</p>}
                    {row.cuotasPeriodo.length > 0 && <p className="mt-1 text-xs font-semibold text-blue-900">{row.cuotasPeriodo.length} cuota(s) del mes</p>}
                  </td>
                  <td className="px-3 py-3.5 text-right">
                    <p className="break-words text-sm font-black text-gray-950">{formatCurrency(amount, row.moneda)}</p>
                    {row.estadoLiquidacion === 'CONFIRMADA' && tenantPending(row.estadoCobroInquilino) && Number(row.pagado) > 0 && <p className="mt-1 text-xs font-semibold text-gray-600">Falta {formatCurrency(Number(row.pendiente), row.moneda)}</p>}
                  </td>
                  <td className="px-3 py-3.5 text-right">{rowAction(row)}</td>
                </tr>;
              })}
              {!rows.length && <tr><td colSpan={6} className="px-4 py-10 text-center"><CheckCircleIcon className="mx-auto h-9 w-9 text-green-700" /><p className="mt-2 font-black text-gray-950">No hay casos en esta vista</p><p className="mt-1 text-sm text-gray-700">Cambiá el filtro para consultar el resto del período.</p></td></tr>}
            </tbody>
          </table>
        </div>

        <div className="divide-y divide-gray-200 lg:hidden">
          {rows.map(row => {
            const amount = Number(row.totalLiquidacion ?? row.montoAlquiler);
            return <article key={row.contratoId} className="grid min-w-0 gap-3 p-4 hover:bg-gray-50/70 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
              <div className="flex min-w-0 items-start gap-3">
                {row.status === 'LISTA' && canCreate ? <input type="checkbox" aria-label={`Seleccionar ${address(row)}`} checked={workspace.selectedIds.includes(row.contratoId)} onChange={() => workspace.toggle(row.contratoId)} className="mt-1 h-5 w-5 shrink-0 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                  : row.status === 'REVISAR' ? <ExclamationTriangleIcon className="mt-0.5 h-6 w-6 shrink-0 text-red-700" />
                    : row.estadoLiquidacion === 'CONFIRMADA' && tenantResolved(row.estadoCobroInquilino) && ownerResolved(row.estadoPagoPropietario) ? <CheckCircleIcon className="mt-0.5 h-6 w-6 shrink-0 text-green-700" />
                      : <DocumentCheckIcon className="mt-0.5 h-6 w-6 shrink-0 text-indigo-700" />}
                <div className="min-w-0">
                  <h3 className="break-words text-base font-black text-gray-950">{address(row)}</h3>
                  <p className="mt-0.5 break-words text-sm text-gray-700">{row.inquilino?.nombreCompleto || 'Sin inquilino principal'} · {row.propietario?.nombreCompleto || 'Sin propietario principal'}</p>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs font-bold">
                    <span className={`rounded-full border px-2 py-1 ${statusTone(row)}`}>{statusLabel(row)}</span>
                    {row.vencida && <span className="rounded-full border border-red-300 bg-red-50 px-2 py-1 text-red-900">Vencida</span>}
                    {row.cuotasPeriodo.length > 0 && <span className="rounded-full border border-blue-300 bg-blue-50 px-2 py-1 text-blue-900">{row.cuotasPeriodo.length} cuota(s) del mes incluida(s)</span>}
                  </div>
                  {row.status === 'REVISAR' && <p className="mt-2 text-sm font-semibold text-red-800">{row.motivos[0]}</p>}
                </div>
              </div>

              <div className="flex min-w-0 flex-col gap-2 border-t border-gray-100 pt-3 md:min-w-56 md:items-end md:border-0 md:pt-0">
                <div className="flex w-full items-end justify-between gap-3 md:justify-end">
                  <span className="text-xs font-bold text-gray-600">{row.totalLiquidacion ? `Vence ${formatDate(row.fechaVencimiento)}` : 'Alquiler del período'}</span>
                  <span className="break-words text-lg font-black text-gray-950">{formatCurrency(amount, row.moneda)}</span>
                </div>
                {row.estadoLiquidacion === 'CONFIRMADA' && tenantPending(row.estadoCobroInquilino) && Number(row.pagado) > 0 && <p className="text-xs font-semibold text-gray-700">Pagado {formatCurrency(Number(row.pagado), row.moneda)} · falta {formatCurrency(Number(row.pendiente), row.moneda)}</p>}
                {rowAction(row, true)}
              </div>
            </article>;
          })}
          {!rows.length && <div className="p-10 text-center"><CheckCircleIcon className="mx-auto h-10 w-10 text-green-700" /><p className="mt-3 font-black text-gray-950">No hay casos en esta vista</p><p className="mt-1 text-sm text-gray-700">Cambiá el filtro para consultar el resto del período.</p></div>}
        </div>
      </>}
    </div>

    <ExceptionReviewDialog row={workspace.reviewing} busy={workspace.working} canCreate={canCreate} onClose={() => workspace.setReviewing(null)} onGenerate={workspace.generateReviewed} onDismiss={workspace.dismiss} />
  </section>;
}
