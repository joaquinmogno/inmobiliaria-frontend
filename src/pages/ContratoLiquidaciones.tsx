import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { liquidacionesService, type ContractLiquidationTimeline } from '../services/liquidaciones.service';
import { planesCuotasService, type CuotaPlan } from '../services/planes-cuotas.service';
import { formatCurrency } from '../utils/currency';
import { formatDate, formatMonthYear, todayDateInput } from '../utils/date';
import { hasPermission } from '../utils/permissions';
import { useAuth } from '../context/AuthContext';

const labels: Record<string, string> = {
  PENDIENTE_LIQUIDAR: 'Pendiente de liquidar', BORRADOR: 'Borrador', PENDIENTE_COBRO: 'Pendiente de cobro',
  EN_MORA: 'En mora', PENDIENTE_PAGO_PROPIETARIO: 'Pendiente de pago al propietario', FINALIZADA: 'Finalizada',
  REQUIERE_REVISION: 'Requiere revisión', OMITIDA: 'Omitida', ANULADA: 'Anulada'
};

export default function ContratoLiquidaciones() {
  const { contratoId: id } = useParams<{ contratoId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const canCreate = hasPermission(user, 'liquidaciones.crear');
  const [timeline, setTimeline] = useState<ContractLiquidationTimeline | null>(null);
  const [selected, setSelected] = useState('');
  const [available, setAvailable] = useState<CuotaPlan[]>([]);
  const [selectedQuotaIds, setSelectedQuotaIds] = useState<number[]>([]);
  const [reviewedOverdue, setReviewedOverdue] = useState(false);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    liquidacionesService.getContractTimeline(Number(id), searchParams.get('periodo') || undefined)
      .then(data => { if (active) { setTimeline(data); setSelected(data.defaultPeriod); } })
      .catch(error => toast.error(error instanceof Error ? error.message : 'No se pudo cargar la propiedad'))
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id, searchParams]);

  useEffect(() => {
    if (!selected || !timeline) return;
    const row = timeline.periodos.find(item => item.periodo === selected);
    if (row?.liquidacionId || row?.estado === 'OMITIDA' || row?.estado === 'ANULADA') { setAvailable([]); setSelectedQuotaIds([]); return; }
    let active = true;
    planesCuotasService.getPendientes(Number(id), selected.slice(0, 7) + '-01', true)
      .then(data => { if (active) { setAvailable(data); setSelectedQuotaIds(data.filter(cuota => cuota.correspondeAlPeriodo).map(cuota => cuota.id)); setReviewedOverdue(false); } })
      .catch(() => { if (active) setAvailable([]); });
    return () => { active = false; };
  }, [id, selected, timeline]);

  const active = useMemo(() => timeline?.periodos.find(item => item.periodo === selected), [timeline, selected]);
  const earlier = useMemo(() => timeline?.periodos.filter(item => item.periodo < selected && item.liquidacionId).reverse() || [], [timeline, selected]);
  const toggleQuota = (idToToggle: number) => setSelectedQuotaIds(current => current.includes(idToToggle) ? current.filter(value => value !== idToToggle) : [...current, idToToggle]);
  const create = async () => {
    if (!timeline || !active) return;
    setWorking(true);
    try {
      const created = await liquidacionesService.create(timeline.contrato.id, active.periodo, undefined, undefined, selectedQuotaIds);
      navigate(`/liquidaciones/${created.id}`);
    } catch (error) { toast.error(error instanceof Error ? error.message : 'No se pudo crear el borrador'); }
    finally { setWorking(false); }
  };
  const reopen = async () => {
    if (!timeline || !active) return;
    setWorking(true);
    try {
      await liquidacionesService.reopenPreparation(timeline.contrato.id, active.periodo);
      const updated = await liquidacionesService.getContractTimeline(timeline.contrato.id, active.periodo);
      setTimeline(updated);
      setSelected(active.periodo);
      toast.success('El período volvió a estar disponible para revisión');
    } catch (error) { toast.error(error instanceof Error ? error.message : 'No se pudo reabrir el período'); }
    finally { setWorking(false); }
  };

  if (loading) return <p className="p-8 text-center text-gray-700">Cargando períodos…</p>;
  if (!timeline) return <p className="p-8 text-center text-red-800">No se pudo abrir el contrato.</p>;
  const contract = timeline.contrato;
  const address = [contract.propiedad.direccion, contract.propiedad.piso && `Piso ${contract.propiedad.piso}`, contract.propiedad.departamento && `Depto. ${contract.propiedad.departamento}`].filter(Boolean).join(' · ');

  return <div className="mx-auto max-w-7xl space-y-5">
    <button type="button" onClick={() => navigate('/liquidaciones')} className="text-sm font-bold text-indigo-700">← Liquidaciones</button>
    <header className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <h1 className="text-2xl font-black text-gray-950">{address}</h1>
      <p className="mt-1 text-sm text-gray-700">{contract.inquilino?.nombreCompleto || 'Sin inquilino'} · Propietario: {contract.propietario?.nombreCompleto || 'Sin propietario'}</p>
      <p className="mt-2 text-xs text-gray-600">Contrato: {formatDate(contract.fechaInicio)} al {formatDate(contract.fechaFin)} · Próxima actualización: {contract.requiereActualizacion ? formatDate(contract.fechaProximaActualizacion) : 'No programada'}</p>
      <p className="mt-1 text-xs text-gray-600">Cobro acordado: {contract.modalidadCobroInquilino || 'Sin acordar'}{contract.modalidadCobroInquilino === 'TRANSFERENCIA' ? ` (${contract.cuentaCobroAcordada ? `${contract.cuentaCobroAcordada.banco} · ${contract.cuentaCobroAcordada.nombre}` : 'cuenta no definida'})` : ''} · Pago al propietario acordado: {contract.modalidadPagoPropietario || 'Sin acordar'}{contract.modalidadPagoPropietario === 'TRANSFERENCIA' && contract.propietario?.aliasBancario ? ` (${contract.propietario.aliasBancario})` : ''}</p>
    </header>

    <div className="grid gap-5 lg:grid-cols-[minmax(16rem,20rem)_minmax(0,1fr)]">
      <nav aria-label="Meses del contrato" className="max-h-[75vh] overflow-y-auto rounded-2xl border border-gray-200 bg-white p-2 shadow-sm">
        <h2 className="px-3 py-2 text-sm font-black text-gray-800">Meses del contrato</h2>
        {timeline.periodos.map(row => <button type="button" key={row.periodo} onClick={() => setSelected(row.periodo)} aria-current={selected === row.periodo ? 'page' : undefined} className={`mb-1 flex w-full items-center justify-between gap-2 rounded-xl p-3 text-left ${selected === row.periodo ? 'bg-indigo-600 text-white' : 'hover:bg-gray-50'}`}>
          <span className="font-bold capitalize">{formatMonthYear(row.periodo)}</span><span className="text-xs font-semibold">{labels[row.estado]}</span>
        </button>)}
      </nav>

      <main className="min-w-0 space-y-5">
        {active && <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-xl font-black capitalize text-gray-950">{formatMonthYear(active.periodo)}</h2><p className="mt-1 text-sm font-bold text-indigo-700">{labels[active.estado]}</p></div><span className="text-xs text-gray-600">Hoy: {formatDate(todayDateInput())}</span></div>
          {active.observaciones?.length > 0 && <details className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm"><summary className="cursor-pointer font-bold text-gray-900">Observaciones del período ({active.observaciones.length})</summary><ul className="mt-2 list-inside list-disc space-y-1 text-gray-700">{active.observaciones.map((note, index) => <li key={`${index}-${note}`}>{note}</li>)}</ul></details>}
          {active.liquidacionId ? <>
            <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              <div className="rounded-xl bg-gray-50 p-3"><p className="text-xs font-bold text-gray-600">Total liquidado</p><p className="font-black">{formatCurrency(active.total || 0, contract.moneda)}</p></div>
              <div className="rounded-xl bg-gray-50 p-3"><p className="text-xs font-bold text-gray-600">Cobrado al inquilino</p><p className="font-black">{formatCurrency(active.cobrado, contract.moneda)}</p><p className="text-xs">Saldo {formatCurrency(active.saldoInquilino, contract.moneda)}</p></div>
              <div className="rounded-xl bg-gray-50 p-3"><p className="text-xs font-bold text-gray-600">Pagado al propietario</p><p className="font-black">{formatCurrency(active.pagadoPropietario, contract.moneda)}</p><p className="text-xs">Saldo {formatCurrency(active.saldoPropietario, contract.moneda)}</p></div>
            </div>
            {(active.pagos.length > 0 || active.pagosPropietario.length > 0) && <div className="mt-4 grid gap-3 sm:grid-cols-2"><div className="rounded-xl border border-gray-200 p-3"><h3 className="text-sm font-black">Cobros del inquilino</h3>{active.pagos.length ? active.pagos.map((payment, index) => <p key={index} className="mt-1 text-sm text-gray-700">{formatDate(payment.fechaPago)} · {payment.metodoPago} · {formatCurrency(Number(payment.monto), contract.moneda)}</p>) : <p className="mt-1 text-sm text-gray-600">Sin cobros</p>}</div><div className="rounded-xl border border-gray-200 p-3"><h3 className="text-sm font-black">Pagos al propietario</h3>{active.pagosPropietario.length ? active.pagosPropietario.map((payment, index) => <p key={index} className="mt-1 text-sm text-gray-700">{formatDate(payment.fechaPago)} · {payment.metodoPago} · {formatCurrency(Number(payment.monto), contract.moneda)}</p>) : <p className="mt-1 text-sm text-gray-600">Sin pagos</p>}</div></div>}
            {active.cuotas.length > 0 && <div className="mt-4"><h3 className="text-sm font-black">Cuotas</h3>{active.cuotas.map(cuota => <p key={cuota.id} className="mt-1 text-sm text-gray-700">{cuota.concepto} · cuota {cuota.numeroCuota}/{cuota.cantidadCuotas} · {cuota.estado.toLowerCase()} · saldo {formatCurrency(cuota.saldo, contract.moneda)}</p>)}</div>}
            {active.ajustes.length > 0 && <div className="mt-4"><h3 className="text-sm font-black">Correcciones</h3>{active.ajustes.map(ajuste => <p key={ajuste.id} className="mt-1 text-sm text-gray-700">{ajuste.tipo} · {ajuste.concepto}: {ajuste.motivo}</p>)}</div>}
            <button type="button" onClick={() => navigate(`/liquidaciones/${active.liquidacionId}`)} className="mt-5 min-h-11 rounded-xl bg-indigo-600 px-4 font-bold text-white">Abrir liquidación y comprobantes</button>
          </> : active.estado === 'OMITIDA' ? <div className="mt-4"><p className="text-sm text-gray-700">Este período se omitió. Revisá el motivo antes de volver a prepararlo.</p>{canCreate && <button type="button" disabled={working} onClick={() => void reopen()} className="mt-3 min-h-11 rounded-xl border border-indigo-300 px-4 font-bold text-indigo-800 disabled:opacity-50">Reabrir período</button>}</div> : active.estado === 'ANULADA' ? <p className="mt-4 text-sm text-gray-700">La liquidación de este período fue anulada. Abrí su historial para consultar el motivo y los comprobantes.</p> : <>
            <p className="mt-4 text-sm text-gray-700">Todavía no hay liquidación para este período.</p>
            {available.length > 0 && <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-4"><h3 className="font-black text-blue-950">Cuotas y acuerdos disponibles</h3><p className="mt-1 text-xs text-blue-900">Las del mes se sugieren. Las anteriores y futuras requieren una decisión expresa.</p>
              {([['Del mes', available.filter(cuota => cuota.correspondeAlPeriodo)], ['Vencidas anteriores', available.filter(cuota => cuota.vencida)], ['Futuras por acuerdo', available.filter(cuota => !cuota.vencida && !cuota.correspondeAlPeriodo)]] as const).map(([title, cuotas]) => cuotas.length > 0 && <div key={title} className="mt-3"><h4 className="text-sm font-black text-blue-950">{title}</h4><div className="mt-2 space-y-2">{cuotas.map(cuota => <label key={cuota.id} className="flex gap-3 rounded-lg bg-white p-2 text-sm"><input type="checkbox" checked={selectedQuotaIds.includes(cuota.id)} onChange={() => toggleQuota(cuota.id)} className="mt-0.5 h-5 w-5" /><span><strong>{cuota.plan?.concepto || 'Acuerdo'} · cuota {cuota.numeroCuota}/{cuota.plan?._count?.cuotas || '?'}</strong><br />{formatCurrency(Number(cuota.monto), contract.moneda)} · {formatMonthYear(cuota.fechaVencimiento)}</span></label>)}</div></div>)}
              {available.some(cuota => cuota.vencida) && <label className="mt-4 flex items-center gap-2 text-sm font-bold text-blue-950"><input type="checkbox" checked={reviewedOverdue} onChange={event => setReviewedOverdue(event.target.checked)} className="h-5 w-5" />Revisé las cuotas vencidas y decidí cuáles incluir</label>}
            </div>}
            {canCreate && <button type="button" disabled={working || active.estado === 'REQUIERE_REVISION' || contract.estado !== 'ACTIVO' || (available.some(cuota => cuota.vencida) && !reviewedOverdue)} onClick={() => void create()} className="mt-5 min-h-11 rounded-xl bg-indigo-600 px-4 font-bold text-white disabled:opacity-50">{working ? 'Creando…' : 'Crear liquidación'}</button>}
          </>}
        </section>}

        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"><h2 className="font-black text-gray-950">Meses anteriores</h2><p className="mt-1 text-sm text-gray-600">Consultá rápidamente cómo venía este contrato.</p>{earlier.length ? <div className="mt-3 space-y-2">{earlier.map(row => <button key={row.periodo} type="button" onClick={() => setSelected(row.periodo)} className="flex w-full flex-wrap justify-between gap-2 rounded-lg border border-gray-200 p-3 text-left text-sm hover:bg-gray-50"><span className="font-bold capitalize">{formatMonthYear(row.periodo)} · {labels[row.estado]}</span><span>Cobrado {formatCurrency(row.cobrado, contract.moneda)} · saldo {formatCurrency(row.saldoInquilino, contract.moneda)} · {row.ajustes.length} ajuste(s)</span></button>)}</div> : <p className="mt-3 text-sm text-gray-600">No hay liquidaciones anteriores de este contrato.</p>}</section>
      </main>
    </div>
  </div>;
}
