import { useId, useState } from 'react';
import AppSelect from './AppSelect';
import { useCreditCards } from '../hooks/useCreditCards';
import { cardLabel, creditCardsService, type CardScope, type CreditCard } from '../services/credit-cards.service';

export function NewCreditCard({ scope, saved, cancel }: { scope: CardScope; saved: (card: CreditCard) => void; cancel: () => void }) {
    const [data, setData] = useState({ nombre: '', banco: '', ultimosCuatro: '' });
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const save = async () => {
        if (busy) return;
        if (!data.nombre.trim() || !data.banco.trim() || !/^\d{4}$/.test(data.ultimosCuatro)) {
            setError('Completá el nombre, el banco o emisor y exactamente los últimos 4 dígitos.'); return;
        }
        setBusy(true); setError('');
        try { saved(await creditCardsService.create(scope, data)); }
        catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo guardar la tarjeta.'); }
        finally { setBusy(false); }
    };
    return <fieldset disabled={busy} className="mt-3 space-y-3 rounded-xl border border-indigo-200 bg-indigo-50/40 p-3">
        <legend className="px-1 text-sm font-semibold">Nueva tarjeta</legend>
        <label className="block text-sm font-medium">Nombre de la tarjeta *<input className="ui-field mt-1" value={data.nombre} maxLength={80} onChange={event => setData({ ...data, nombre: event.target.value })} placeholder="Ej.: Visa Ricardo" /></label>
        <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm font-medium">Banco o emisor *<input className="ui-field mt-1" value={data.banco} maxLength={80} onChange={event => setData({ ...data, banco: event.target.value })} placeholder="Ej.: Galicia" /></label>
            <label className="block text-sm font-medium">Últimos 4 dígitos *<input className="ui-field mt-1" type="text" inputMode="numeric" autoComplete="off" value={data.ultimosCuatro} maxLength={4} onChange={event => setData({ ...data, ultimosCuatro: event.target.value.replace(/\D/g, '') })} placeholder="4821" /></label>
        </div>
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        <div className="flex flex-wrap gap-2"><button type="button" onClick={() => void save()} className="ui-button ui-button-primary">{busy ? 'Guardando…' : 'Guardar tarjeta'}</button><button type="button" className="ui-button ui-button-secondary" onClick={cancel}>Cancelar tarjeta</button></div>
    </fieldset>;
}

export default function CreditCardSelector({ scope, value, onChange, existingCardId, disabled = false }: {
    scope: CardScope; value: string; onChange: (value: string) => void; existingCardId?: number | null; disabled?: boolean;
}) {
    const { cards, error, refresh } = useCreditCards(scope);
    const [adding, setAdding] = useState(false);
    const [created, setCreated] = useState<CreditCard | null>(null);
    const id = useId();
    const options = [...cards, ...(created && !cards.some(card => card.id === created.id) ? [created] : [])]
        .filter(card => card.activa || card.id === existingCardId);
    return <div className="min-w-0">
        <label htmlFor={id} className="block text-sm font-semibold">Tarjeta de crédito *</label>
        <AppSelect id={id} ariaLabel="Tarjeta de crédito" value={value} disabled={disabled} onChange={onChange} options={[
            { value: '', label: 'Seleccionar tarjeta' }, ...options.map(card => ({ value: String(card.id), label: `${cardLabel(card)}${card.activa ? '' : ' (inactiva)'}` }))
        ]} className="mt-1" />
        {error && <p role="alert" className="mt-1 text-sm text-red-700">{error} <button type="button" onClick={refresh} className="underline">Reintentar</button></p>}
        {!adding && <button type="button" disabled={disabled} onClick={() => setAdding(true)} className="mt-1 min-h-[var(--ui-control-height)] text-sm font-semibold text-indigo-700">Agregar tarjeta</button>}
        {adding && <NewCreditCard scope={scope} cancel={() => setAdding(false)} saved={card => { setCreated(card); onChange(String(card.id)); setAdding(false); refresh(); }} />}
    </div>;
}
