import { Fragment, useMemo, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import type { Moneda } from '../utils/currency';

export default function TenantCreditApplicationModal({
  isOpen, onClose, onApply, creditId, saldo, moneda, debtTargets
}: {
  isOpen: boolean;
  onClose: () => void;
  onApply: (data: { creditId: number; liquidacionDestinoId: number; monto: number }) => void;
  creditId: number | null;
  saldo: number;
  moneda: Moneda;
  debtTargets: Array<{ id: number; periodo: string; deuda: number }>;
}) {
  const [targetId, setTargetId] = useState('');
  const target = debtTargets.find(item => item.id === Number(targetId));
  const maximum = Math.min(saldo, target?.deuda || 0);
  const [amount, setAmount] = useState('');
  const suggestedAmount = useMemo(() => maximum.toFixed(2), [maximum]);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const value = Number(amount);
    if (!creditId || !target || !value || value > maximum) return;
    onApply({ creditId, liquidacionDestinoId: target.id, monto: value });
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-[70]" onClose={onClose}>
        <div className="fixed inset-0 bg-black/30" />
        <div className="fixed inset-0 grid place-items-center p-4">
          <Dialog.Panel className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <Dialog.Title className="text-xl font-black text-gray-950">Aplicar saldo a favor</Dialog.Title>
            <p className="mt-1 text-sm text-gray-600">Disponible: {moneda} {saldo.toLocaleString('es-AR', { minimumFractionDigits: 2 })}. No genera un nuevo movimiento de caja.</p>
            <form onSubmit={submit} className="mt-5 space-y-4">
              <label className="block text-sm font-bold">Liquidación pendiente
                <select required value={targetId} onChange={event => { setTargetId(event.target.value); setAmount(''); }} className="mt-1 w-full rounded-lg border p-2">
                  <option value="">Seleccionar liquidación</option>
                  {debtTargets.map(targetItem => <option key={targetItem.id} value={targetItem.id}>Período {targetItem.periodo.slice(0, 7)} · pendiente {moneda} {targetItem.deuda.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</option>)}
                </select>
              </label>
              <label className="block text-sm font-bold">Importe a compensar
                <input required type="number" min="0.01" max={maximum || undefined} step="0.01" placeholder={suggestedAmount} value={amount} onChange={event => setAmount(event.target.value)} className="mt-1 w-full rounded-lg border p-2" />
              </label>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 font-bold">Cancelar</button>
                <button disabled={!target || !amount} className="rounded-lg bg-indigo-600 px-4 py-2 font-bold text-white disabled:cursor-not-allowed disabled:bg-gray-400">Aplicar saldo</button>
              </div>
            </form>
          </Dialog.Panel>
        </div>
      </Dialog>
    </Transition>
  );
}
