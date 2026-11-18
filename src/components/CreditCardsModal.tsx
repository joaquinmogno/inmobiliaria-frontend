import { useState } from 'react';
import { DialogTitle } from '@headlessui/react';
import { Modal, ModalBackdrop, ModalPanel } from './Modal';
import { NewCreditCard } from './CreditCardSelector';
import { useCreditCards } from '../hooks/useCreditCards';
import { cardLabel, creditCardsService, type CardScope, type CreditCard } from '../services/credit-cards.service';

export default function CreditCardsModal({ scope, close, changed }: { scope: CardScope; close: () => void; changed: () => void }) {
    const { cards, error: loadError, refresh } = useCreditCards(scope);
    const [adding, setAdding] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const toggle = async (card: CreditCard) => {
        setBusy(true); setError('');
        try { await creditCardsService.setActive(scope, card, !card.activa); refresh(); changed(); }
        catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo actualizar la tarjeta.'); }
        finally { setBusy(false); }
    };
    return <Modal open onClose={() => !busy && close()} className="relative z-[100]">
        <ModalBackdrop className="fixed inset-0 bg-black/40" />
        <div className="fixed inset-0 flex items-center justify-center p-3"><ModalPanel className="flex max-h-[calc(100dvh-2rem)] w-full max-w-xl flex-col rounded-xl bg-white shadow-xl">
            <DialogTitle className="border-b p-5 text-lg font-semibold">Tarjetas de crédito</DialogTitle>
            <div className="modal-scroll space-y-4 p-5">
                {(error || loadError) && <p role="alert" className="text-sm text-red-700">{error || loadError}</p>}
                <ul className="space-y-3">{cards.map(card => <li key={card.id} className="flex flex-wrap items-center justify-between gap-2 border-b pb-3">
                    <div className="min-w-0 flex-1 break-words text-sm"><p className="font-semibold">{cardLabel(card)}</p><p className="text-slate-600">{card.activa ? 'Activa' : 'Inactiva'}</p></div>
                    <button type="button" disabled={busy} onClick={() => void toggle(card)} className="ui-button ui-button-secondary">{card.activa ? 'Desactivar' : 'Activar'}</button>
                </li>)}</ul>
                {adding ? <NewCreditCard scope={scope} cancel={() => setAdding(false)} saved={() => { setAdding(false); refresh(); changed(); }} /> : <button type="button" onClick={() => setAdding(true)} className="ui-button ui-button-primary">Agregar tarjeta</button>}
            </div>
            <div className="ui-dialog-footer"><button type="button" disabled={busy} onClick={close} className="ui-button ui-button-secondary">Cerrar</button></div>
        </ModalPanel></div>
    </Modal>;
}
