import { Fragment, useMemo, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import type { Moneda } from '../utils/currency';
import { PAYMENT_METHOD_OPTIONS, type MetodoPago } from '../services/pagos.service';
import { todayDateInput } from '../utils/date';

type CreditDestination = 'DEVOLUCION' | 'SALDO_A_FAVOR' | 'COMPENSACION';

type AdjustmentPayload = {
  tipo: 'CREDITO' | 'DEBITO';
  concepto: string;
  motivo: string;
  monto: number;
  impactoInquilino: number;
  impactoPropietario: number;
  destinoCredito?: CreditDestination;
  liquidacionDestinoId?: number;
  fechaDevolucion?: string;
  metodoDevolucion?: MetodoPago;
  observacionesDevolucion?: string;
};

export default function LiquidationAdjustmentModal({
  isOpen, onClose, onSave, moneda, tenantTotal, tenantPaid, debtTargets
}: {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: AdjustmentPayload) => void;
  moneda: Moneda;
  tenantTotal: number;
  tenantPaid: number;
  debtTargets: Array<{ id: number; periodo: string; deuda: number }>;
}) {
  const [tipo, setTipo] = useState<'CREDITO' | 'DEBITO'>('CREDITO');
  const [concepto, setConcepto] = useState('');
  const [motivo, setMotivo] = useState('');
  const [monto, setMonto] = useState('');
  const [parte, setParte] = useState<'INQUILINO' | 'PROPIETARIO'>('INQUILINO');
  const [destinoCredito, setDestinoCredito] = useState<CreditDestination>('SALDO_A_FAVOR');
  const [liquidacionDestinoId, setLiquidacionDestinoId] = useState('');
  const [fechaDevolucion, setFechaDevolucion] = useState(() => todayDateInput());
  const [metodoDevolucion, setMetodoDevolucion] = useState<MetodoPago>('EFECTIVO');
  const [observacionesDevolucion, setObservacionesDevolucion] = useState('');

  const value = Number(monto) || 0;
  const impacto = tipo === 'CREDITO' ? -value : value;
  const excess = useMemo(() => {
    if (tipo !== 'CREDITO' || parte !== 'INQUILINO' || value <= 0) return 0;
    return Math.max(0, tenantPaid - (tenantTotal - value));
  }, [parte, tenantPaid, tenantTotal, tipo, value]);
  const compensationTargets = debtTargets.filter(target => target.deuda >= excess && target.deuda > 0);
  const canCompensate = destinoCredito !== 'COMPENSACION' || Boolean(liquidacionDestinoId);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!value || !canCompensate) return;
    const data: AdjustmentPayload = {
      tipo,
      concepto,
      motivo,
      monto: value,
      impactoInquilino: parte === 'INQUILINO' ? impacto : 0,
      impactoPropietario: parte === 'PROPIETARIO' ? impacto : 0
    };
    if (excess > 0) {
      data.destinoCredito = destinoCredito;
      if (destinoCredito === 'COMPENSACION') data.liquidacionDestinoId = Number(liquidacionDestinoId);
      if (destinoCredito === 'DEVOLUCION') {
        data.fechaDevolucion = fechaDevolucion;
        data.metodoDevolucion = metodoDevolucion;
        data.observacionesDevolucion = observacionesDevolucion || undefined;
      }
    }
    onSave(data);
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-[70]" onClose={onClose}>
        <div className="fixed inset-0 bg-black/30" />
        <div className="fixed inset-0 overflow-y-auto p-4">
          <div className="flex min-h-full items-center justify-center">
            <Dialog.Panel className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
              <Dialog.Title className="text-xl font-black text-gray-950">Emitir ajuste de liquidación</Dialog.Title>
              <p className="mt-1 text-sm text-gray-600">El ajuste conserva su motivo e historial. Si reduce una liquidación ya cobrada, definí cómo se resuelve el excedente.</p>
              <form onSubmit={submit} className="mt-5 space-y-4">
                <label className="block text-sm font-bold">Tipo
                  <select value={tipo} onChange={event => setTipo(event.target.value as 'CREDITO' | 'DEBITO')} className="mt-1 w-full rounded-lg border p-2">
                    <option value="CREDITO">Nota de crédito — reduce saldo</option>
                    <option value="DEBITO">Nota de débito — aumenta saldo</option>
                  </select>
                </label>
                <label className="block text-sm font-bold">Afecta a
                  <select value={parte} onChange={event => setParte(event.target.value as 'INQUILINO' | 'PROPIETARIO')} className="mt-1 w-full rounded-lg border p-2">
                    <option value="INQUILINO">Inquilino</option>
                    <option value="PROPIETARIO">Propietario</option>
                  </select>
                </label>
                <label className="block text-sm font-bold">Concepto
                  <input required maxLength={255} value={concepto} onChange={event => setConcepto(event.target.value)} className="mt-1 w-full rounded-lg border p-2" />
                </label>
                <label className="block text-sm font-bold">Importe ({moneda})
                  <input required min="0.01" step="0.01" type="number" value={monto} onChange={event => setMonto(event.target.value)} className="mt-1 w-full rounded-lg border p-2" />
                </label>
                <label className="block text-sm font-bold">Motivo
                  <textarea required minLength={5} value={motivo} onChange={event => setMotivo(event.target.value)} className="mt-1 w-full rounded-lg border p-2" />
                </label>

                {excess > 0 && (
                  <fieldset className="space-y-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
                    <legend className="px-1 text-sm font-black text-amber-950">El inquilino quedará con {moneda} {excess.toLocaleString('es-AR', { minimumFractionDigits: 2 })} a favor</legend>
                    <p className="text-xs text-amber-900">El importe ya fue cobrado. Elegí su destino para que no quede una diferencia sin resolver.</p>
                    <label className="block text-sm font-bold">Resolver como
                      <select value={destinoCredito} onChange={event => { setDestinoCredito(event.target.value as CreditDestination); setLiquidacionDestinoId(''); }} className="mt-1 w-full rounded-lg border bg-white p-2">
                        <option value="SALDO_A_FAVOR">Saldo a favor para una próxima liquidación</option>
                        <option value="DEVOLUCION">Devolución al inquilino</option>
                        <option value="COMPENSACION" disabled={compensationTargets.length === 0}>Compensar otra liquidación pendiente</option>
                      </select>
                    </label>
                    {destinoCredito === 'COMPENSACION' && (
                      <label className="block text-sm font-bold">Liquidación a compensar
                        <select required value={liquidacionDestinoId} onChange={event => setLiquidacionDestinoId(event.target.value)} className="mt-1 w-full rounded-lg border bg-white p-2">
                          <option value="">Seleccionar liquidación</option>
                          {compensationTargets.map(target => <option key={target.id} value={target.id}>Período {target.periodo.slice(0, 7)} · pendiente {moneda} {target.deuda.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</option>)}
                        </select>
                      </label>
                    )}
                    {destinoCredito === 'DEVOLUCION' && <>
                      <div className="grid grid-cols-2 gap-3">
                        <label className="block text-sm font-bold">Fecha
                          <input required type="date" max={todayDateInput()} value={fechaDevolucion} onChange={event => setFechaDevolucion(event.target.value)} className="mt-1 w-full rounded-lg border bg-white p-2" />
                        </label>
                        <label className="block text-sm font-bold">Medio
                          <select value={metodoDevolucion} onChange={event => setMetodoDevolucion(event.target.value as MetodoPago)} className="mt-1 w-full rounded-lg border bg-white p-2">
                            {PAYMENT_METHOD_OPTIONS.map(method => <option key={method.value} value={method.value}>{method.label}</option>)}
                          </select>
                        </label>
                      </div>
                      <label className="block text-sm font-bold">Referencia u observación
                        <input maxLength={1000} value={observacionesDevolucion} onChange={event => setObservacionesDevolucion(event.target.value)} className="mt-1 w-full rounded-lg border bg-white p-2" />
                      </label>
                    </>}
                  </fieldset>
                )}
                <div className="flex justify-end gap-3">
                  <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 font-bold">Cancelar</button>
                  <button disabled={!canCompensate} className="rounded-lg bg-indigo-600 px-4 py-2 font-bold text-white disabled:cursor-not-allowed disabled:bg-gray-400">Emitir ajuste</button>
                </div>
              </form>
            </Dialog.Panel>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
