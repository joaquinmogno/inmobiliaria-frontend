import { useState, type FormEvent } from 'react';
import { DialogTitle } from '@headlessui/react';
import { Modal as Dialog, ModalBackdrop as DialogBackdrop, ModalPanel as DialogPanel } from '../../components/Modal';
import { XMarkIcon } from '@heroicons/react/24/outline';
import AppSelect from '../../components/AppSelect';
import { liquidationNoteRecipientLabels, type DestinatarioNotaLiquidacion } from '../../services/liquidaciones.service';

type NoteInput = { notaLiquidacion: string | null; destinatarioNotaLiquidacion: DestinatarioNotaLiquidacion };

export default function LiquidationNoteModal({ note, recipient, confirmed, onClose, onSave }: {
    note?: string | null;
    recipient?: DestinatarioNotaLiquidacion;
    confirmed: boolean;
    onClose: () => void;
    onSave: (data: NoteInput) => Promise<boolean>;
}) {
    const [text, setText] = useState(note || '');
    const [audience, setAudience] = useState<DestinatarioNotaLiquidacion>(recipient || 'AMBOS');
    const [saving, setSaving] = useState(false);
    const close = () => { if (!saving) onClose(); };
    const save = async (value: string | null) => {
        if (saving) return;
        setSaving(true);
        try {
            if (await onSave({ notaLiquidacion: value, destinatarioNotaLiquidacion: audience })) onClose();
        } finally {
            setSaving(false);
        }
    };
    const submit = (event: FormEvent) => {
        event.preventDefault();
        if (text.trim()) void save(text.trim());
    };

    return <Dialog open onClose={close} className="fixed inset-0 z-[60]">
        <DialogBackdrop className="fixed inset-0 bg-black/30 backdrop-blur-sm" />
        <div className="fixed inset-0 overflow-hidden">
            <div className="flex h-full min-h-0 items-center justify-center p-4">
                <DialogPanel className="modal-scroll max-h-full w-full max-w-xl rounded-2xl bg-white p-6 shadow-xl">
                    <div className="mb-4 flex items-start justify-between gap-3 border-b border-gray-100 pb-4">
                        <DialogTitle className="text-xl font-bold text-gray-900">Nota para liquidación</DialogTitle>
                        <button type="button" onClick={close} disabled={saving} aria-label="Cerrar nota" className="rounded-lg p-1 text-gray-600 hover:bg-gray-100 disabled:opacity-50"><XMarkIcon className="h-6 w-6" /></button>
                    </div>
                    <form onSubmit={submit} className="space-y-4">
                        <p id="liquidation-note-help" className="text-sm text-gray-700">Agregá una aclaración para este período. Es solo informativa: no convierte monedas ni modifica importes, saldos u honorarios.</p>
                        <div>
                            <label htmlFor="liquidation-note-text" className="mb-1 block text-sm font-bold text-gray-800">Texto de la nota</label>
                            <textarea id="liquidation-note-text" value={text} onChange={event => setText(event.target.value)} required maxLength={3000} rows={5} disabled={saving} aria-describedby="liquidation-note-help liquidation-note-counter" placeholder="Ej.: Cotización utilizada: $1.250 por dólar. El alquiler de USD 2.300 equivale a $2.875.000." className="block w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 disabled:opacity-60" />
                            <p id="liquidation-note-counter" className="mt-1 text-right text-xs text-gray-600">{text.length}/3000 caracteres</p>
                        </div>
                        <div>
                            <label htmlFor="liquidation-note-recipient" className="mb-1 block text-sm font-bold text-gray-800">Mostrar en el PDF de</label>
                            <AppSelect id="liquidation-note-recipient" ariaLabel="Mostrar en el PDF de" value={audience} disabled={saving} onChange={value => setAudience(value as DestinatarioNotaLiquidacion)} options={(['AMBOS', 'PROPIETARIO', 'INQUILINO'] as const).map(value => ({ value, label: liquidationNoteRecipientLabels[value] }))} />
                        </div>
                        {confirmed && <p className="rounded-xl bg-indigo-50 p-3 text-sm text-indigo-900">Al guardar o quitar la nota se emitirá una nueva versión del comprobante. Las versiones anteriores se conservan sin cambios.</p>}
                        <div className="flex flex-wrap justify-end gap-2 border-t border-gray-100 pt-4">
                            {note && <button type="button" disabled={saving} onClick={() => void save(null)} className="min-h-11 rounded-xl border border-red-300 px-3 text-sm font-bold text-red-800 hover:bg-red-50 disabled:opacity-50">Quitar nota</button>}
                            <button type="button" disabled={saving} onClick={close} className="min-h-11 rounded-xl border border-gray-300 px-4 text-sm font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-50">Cancelar</button>
                            <button type="submit" disabled={saving || !text.trim()} className="min-h-11 rounded-xl bg-indigo-600 px-4 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-50">{saving ? 'Guardando…' : 'Guardar nota'}</button>
                        </div>
                    </form>
                </DialogPanel>
            </div>
        </div>
    </Dialog>;
}
