import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react';
import { ArrowTopRightOnSquareIcon, ExclamationTriangleIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useEffect, useState } from 'react';
import type { LiquidationPreparationRow } from '../../services/liquidaciones.service';
import { formatCurrency } from '../../utils/currency';
import { formatDate } from '../../utils/date';

type Props = {
  row: LiquidationPreparationRow | null;
  busy: boolean;
  canCreate: boolean;
  onClose: () => void;
  onGenerate: (row: LiquidationPreparationRow, overdueIds: number[]) => Promise<void>;
  onDismiss: (row: LiquidationPreparationRow, reason: string) => Promise<void>;
};

export default function ExceptionReviewDialog({ row, busy, canCreate, onClose, onGenerate, onDismiss }: Props) {
  const [selectedOverdue, setSelectedOverdue] = useState<number[]>([]);
  const [dismissReason, setDismissReason] = useState('');
  const [showDismiss, setShowDismiss] = useState(false);

  useEffect(() => {
    setSelectedOverdue([]);
    setDismissReason('');
    setShowDismiss(false);
  }, [row?.contratoId]);

  if (!row) return null;
  const address = `${row.propiedad.direccion}${row.propiedad.piso ? ` · Piso ${row.propiedad.piso}` : ''}${row.propiedad.departamento ? ` · Depto. ${row.propiedad.departamento}` : ''}`;

  return <Dialog open={Boolean(row)} onClose={() => !busy && onClose()} className="relative z-[120]">
    <DialogBackdrop className="fixed inset-0 bg-gray-950/55 backdrop-blur-sm" />
    <div className="fixed inset-0 overflow-y-auto p-0 sm:p-4">
      <div className="flex min-h-full items-end justify-center sm:items-center">
        <DialogPanel className="max-h-[100dvh] w-full overflow-y-auto rounded-t-2xl bg-white shadow-2xl sm:max-w-2xl sm:rounded-2xl">
          <header className="sticky top-0 z-10 flex items-start justify-between border-b border-gray-200 bg-white p-5">
            <div className="min-w-0 pr-4">
              <p className="text-sm font-bold text-amber-800">Caso que requiere revisión</p>
              <DialogTitle className="mt-1 break-words text-xl font-black text-gray-950">{address}</DialogTitle>
              <p className="mt-1 text-sm text-gray-700">{row.inquilino?.nombreCompleto || 'Sin inquilino principal'}</p>
            </div>
            <button type="button" onClick={onClose} disabled={busy} aria-label="Cerrar revisión" className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-gray-700 hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-200"><XMarkIcon className="h-6 w-6" /></button>
          </header>

          <div className="space-y-6 p-5 sm:p-6">
            <section aria-labelledby="review-problems-title">
              <h3 id="review-problems-title" className="text-sm font-black uppercase tracking-wide text-gray-800">Qué hay que resolver</h3>
              <ul className="mt-3 space-y-2">
                {row.problemas.map(problem => <li key={problem.codigo} className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-950"><ExclamationTriangleIcon className="mt-0.5 h-5 w-5 shrink-0" /><span>{problem.mensaje}</span></li>)}
              </ul>
            </section>

            {row.cuotasVencidas.length > 0 && <fieldset className="rounded-2xl border border-gray-200 p-4">
              <legend className="px-1 text-sm font-black text-gray-900">Cuotas vencidas</legend>
              <p className="mb-3 text-sm text-gray-700">No se agregan automáticamente. Marcá sólo las que correspondan a esta liquidación; también podés continuar sin incluir ninguna.</p>
              <div className="space-y-2">
                {row.cuotasVencidas.map(installment => <label key={installment.id} className="flex min-h-12 cursor-pointer items-start gap-3 rounded-xl border border-gray-200 p-3 hover:border-indigo-300 hover:bg-indigo-50/40">
                  <input type="checkbox" className="mt-0.5 h-5 w-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" checked={selectedOverdue.includes(installment.id)} onChange={() => setSelectedOverdue(current => current.includes(installment.id) ? current.filter(id => id !== installment.id) : [...current, installment.id])} />
                  <span className="min-w-0 flex-1"><span className="block break-words text-sm font-bold text-gray-900">{installment.concepto} · cuota {installment.numeroCuota}</span><span className="block text-xs text-gray-700">Venció el {formatDate(installment.fechaVencimiento)}</span></span>
                  <span className="shrink-0 text-sm font-black text-gray-900">{formatCurrency(Number(installment.monto), installment.moneda)}</span>
                </label>)}
              </div>
            </fieldset>}

            {row.problemas.some(problem => problem.accion === 'REVISAR_CONTRATO') && <a href={`/contratos?contratoId=${row.contratoId}`} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-indigo-300 px-4 py-2 text-sm font-bold text-indigo-800 hover:bg-indigo-50">Abrir contrato en otra pestaña <ArrowTopRightOnSquareIcon className="h-5 w-5" /></a>}

            {showDismiss && <div className="rounded-2xl border border-gray-300 bg-gray-50 p-4">
              <label htmlFor="dismiss-liquidation-reason" className="text-sm font-bold text-gray-900">Motivo para omitir este mes</label>
              <textarea id="dismiss-liquidation-reason" rows={3} maxLength={500} value={dismissReason} onChange={event => setDismissReason(event.target.value)} placeholder="Ej.: el contrato comenzó efectivamente el mes siguiente" className="mt-2 w-full rounded-xl border border-gray-300 p-3 text-base focus:border-indigo-500 focus:ring-indigo-500" />
              <p className="mt-1 text-xs text-gray-600">La decisión quedará registrada en auditoría y puede reabrirse.</p>
            </div>}
          </div>

          <footer className="sticky bottom-0 flex flex-col-reverse gap-2 border-t border-gray-200 bg-white p-4 sm:flex-row sm:justify-end">
            {canCreate && <button type="button" disabled={busy} onClick={() => showDismiss ? setShowDismiss(false) : setShowDismiss(true)} className="min-h-11 rounded-xl px-4 text-sm font-bold text-gray-700 hover:bg-gray-100 disabled:opacity-50">{showDismiss ? 'Volver' : 'Omitir este mes'}</button>}
            {canCreate && (showDismiss ? <button type="button" disabled={busy || dismissReason.trim().length < 5} onClick={() => void onDismiss(row, dismissReason.trim())} className="min-h-11 rounded-xl bg-gray-800 px-5 text-sm font-bold text-white hover:bg-gray-900 disabled:opacity-50">Guardar omisión</button>
              : row.puedeGenerarseAlResolverCuotas && <button type="button" disabled={busy} onClick={() => void onGenerate(row, selectedOverdue)} className="min-h-11 rounded-xl bg-indigo-600 px-5 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-50">Generar borrador</button>)}
            {!canCreate && <button type="button" onClick={onClose} className="min-h-11 rounded-xl border border-gray-300 px-4 text-sm font-bold text-gray-800 hover:bg-gray-100">Cerrar</button>}
          </footer>
        </DialogPanel>
      </div>
    </div>
  </Dialog>;
}
