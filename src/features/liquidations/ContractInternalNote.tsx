import { useState, type FormEvent } from 'react';
import { DialogTitle } from '@headlessui/react';
import { ExclamationTriangleIcon, PencilSquareIcon, PlusIcon, TrashIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { Modal, ModalBackdrop, ModalPanel } from '../../components/Modal';
import type { ContractInternalNote as InternalNote } from '../../services/liquidaciones.service';
import { formatDateTime } from '../../utils/date';

export default function ContractInternalNote({ note, canEdit, onSave }: {
    note?: InternalNote;
    canEdit: boolean;
    onSave: (texto: string | null, expectedVersion: number) => Promise<void>;
}) {
    const [editor, setEditor] = useState<{ mode: 'edit' | 'delete'; text: string; version: number } | null>(null);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    if (!note || (!note.texto && !canEdit)) return null;

    const open = (mode: 'edit' | 'delete') => {
        setError(null);
        setEditor({ mode, text: note.texto || '', version: note.version });
    };
    const close = () => { if (!saving) setEditor(null); };
    const submit = async (event: FormEvent) => {
        event.preventDefault();
        if (!editor || saving || (editor.mode === 'edit' && !editor.text.trim())) return;
        setSaving(true);
        setError(null);
        try {
            await onSave(editor.mode === 'delete' ? null : editor.text.trim(), editor.version);
            setEditor(null);
        } catch (failure) {
            setError(failure instanceof Error ? failure.message : 'No se pudo guardar la nota interna. Volvé a intentar.');
        } finally {
            setSaving(false);
        }
    };

    return <section aria-labelledby="contract-internal-note-title" className="rounded-2xl border border-amber-300 bg-amber-50 p-4 shadow-sm print:hidden sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="contract-internal-note-title" className="flex items-center gap-2 text-base font-semibold text-amber-950">
                <ExclamationTriangleIcon className="h-5 w-5 shrink-0" aria-hidden="true" />NOTA INTERNA (IMPORTANTE)
            </h2>
            {canEdit && <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => open('edit')} className="inline-flex min-h-[var(--ui-control-height)] items-center gap-2 rounded-xl border border-amber-400 bg-white px-3 text-sm font-bold text-amber-950 hover:bg-amber-100">
                    {note.texto ? <PencilSquareIcon className="h-5 w-5" aria-hidden="true" /> : <PlusIcon className="h-5 w-5" aria-hidden="true" />}
                    {note.texto ? 'Editar nota interna' : 'Agregar nota interna'}
                </button>
                {note.texto && <button type="button" onClick={() => open('delete')} data-danger-trigger="true" className="inline-flex min-h-[var(--ui-control-height)] items-center gap-2 rounded-xl border border-red-300 bg-white px-3 text-sm font-bold text-red-800 hover:bg-red-50"><TrashIcon className="h-5 w-5" aria-hidden="true" />Eliminar nota interna</button>}
            </div>}
        </div>
        <p className="mt-2 text-sm text-amber-900">Recordatorio del equipo para este contrato. Se mantiene en los próximos meses hasta eliminarlo. No aparece en los comprobantes.</p>
        {note.texto && <>
            <p className="mt-3 whitespace-pre-wrap break-words text-sm font-medium text-amber-950 [overflow-wrap:anywhere]">{note.texto}</p>
            {note.actualizadaEn && <p className="mt-3 text-xs text-amber-900">Actualizada por {note.actualizadaPor?.nombreCompleto || 'Usuario no disponible'} · {formatDateTime(note.actualizadaEn)}</p>}
        </>}

        {editor && <Modal open onClose={close} className="fixed inset-0 z-[60] print:hidden">
            <ModalBackdrop className="fixed inset-0 bg-black/30 backdrop-blur-sm" />
            <div className="fixed inset-0 flex min-h-0 items-center justify-center overflow-hidden p-4">
                <ModalPanel className="modal-scroll max-h-full w-full max-w-xl rounded-2xl bg-white p-6 shadow-xl">
                    <div className="mb-4 flex items-start justify-between gap-3">
                        <DialogTitle className="text-xl font-bold text-gray-900">{editor.mode === 'delete' ? 'Eliminar nota interna' : 'Nota interna del contrato'}</DialogTitle>
                        <button type="button" onClick={close} disabled={saving} aria-label="Cerrar nota interna" className="rounded-lg p-1 text-gray-600 hover:bg-gray-100 disabled:opacity-50"><XMarkIcon className="h-6 w-6" aria-hidden="true" /></button>
                    </div>
                    <form onSubmit={event => void submit(event)} className="space-y-4" aria-busy={saving}>
                        {editor.mode === 'delete'
                            ? <p className="text-sm text-gray-700">La nota dejará de mostrarse en todas las liquidaciones de este contrato, incluidas las próximas. La eliminación quedará registrada en auditoría.</p>
                            : <>
                                <p id="internal-note-help" className="text-sm text-gray-700">Esta aclaración es solo para el equipo y se mantiene cada mes hasta que la eliminen.</p>
                                <div>
                                    <label htmlFor="internal-note-text" className="mb-1 block text-sm font-bold text-gray-800">Texto de la nota interna</label>
                                    <textarea id="internal-note-text" required maxLength={3000} rows={6} value={editor.text} disabled={saving} onChange={event => setEditor({ ...editor, text: event.target.value })} aria-describedby="internal-note-help internal-note-counter" placeholder="Ej.: Pedir el comprobante de expensas antes de confirmar. Consultar si hubo uso del SUM." className="block w-full rounded-xl border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-amber-600 focus:ring-2 focus:ring-amber-600 disabled:opacity-60" />
                                    <p id="internal-note-counter" className="mt-1 text-right text-xs text-gray-600">{editor.text.length}/3000 caracteres</p>
                                </div>
                            </>}
                        {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
                        <div className="flex flex-wrap justify-end gap-2 border-t border-gray-100 pt-4">
                            <button type="button" onClick={close} disabled={saving} className="min-h-[var(--ui-control-height)] rounded-xl border border-gray-300 px-4 text-sm font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-50">Cancelar</button>
                            <button type="submit" disabled={saving || (editor.mode === 'edit' && !editor.text.trim())} data-danger-confirm={editor.mode === 'delete' ? 'true' : undefined} className={`min-h-[var(--ui-control-height)] rounded-xl px-4 text-sm font-bold text-white disabled:opacity-50 ${editor.mode === 'delete' ? 'bg-red-700 hover:bg-red-800' : 'bg-amber-800 hover:bg-amber-900'}`}>
                                {saving ? 'Guardando…' : editor.mode === 'delete' ? 'Confirmar eliminación' : 'Guardar nota interna'}
                            </button>
                        </div>
                    </form>
                </ModalPanel>
            </div>
        </Modal>}
    </section>;
}
