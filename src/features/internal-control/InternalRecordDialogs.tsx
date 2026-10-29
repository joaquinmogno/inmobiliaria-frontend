import { useState } from 'react';
import LocalizedFilePicker from '../../components/LocalizedFilePicker';
import { controlInternoService, type InternalMovement } from '../../services/control-interno.service';
import { formatDateTime } from '../../utils/date';
import { InternalDialog, internalFileValidation, internalInputClass } from './InternalMovementModal';

export function InternalReceiptsModal({ record: original, canEdit, close, changed }: { record: InternalMovement; canEdit: boolean; close: () => void; changed: () => void }) {
    const [record, setRecord] = useState(original);
    const [files, setFiles] = useState<File[]>([]);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const attach = async () => {
        if (busy || !files.length) return;
        if (files.length > 10) { setError('Seleccioná hasta 10 comprobantes por carga.'); return; }
        setBusy(true); setError('');
        try { setRecord(await controlInternoService.attach(record, files)); setFiles([]); changed(); }
        catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudieron adjuntar los archivos'); }
        finally { setBusy(false); }
    };
    const open = (index: number, download: boolean) => {
        setError('');
        void controlInternoService.openAttachment(record.adjuntos[index], download).catch(cause => setError(cause instanceof Error ? cause.message : 'No se pudo abrir el comprobante'));
    };
    return <InternalDialog title={`Comprobantes del movimiento #${record.id}`} busy={busy} close={close} footer={<>
        <button type="button" onClick={close} disabled={busy} className="min-h-11 rounded-xl border border-gray-300 px-4 text-sm font-bold text-gray-700">Cerrar</button>
        {canEdit && !record.anuladoEn && <button type="button" disabled={busy || !files.length} onClick={() => void attach()} className="min-h-11 rounded-xl bg-indigo-600 px-4 text-sm font-bold text-white disabled:opacity-50">{busy ? 'Adjuntando…' : 'Adjuntar comprobantes'}</button>}
    </>}>
        <p className="mb-3 break-words font-bold text-gray-900">{record.detalle}</p>
        {!record.adjuntos.length && <p className="mb-4 text-sm text-gray-600">Todavía no hay comprobantes adjuntos.</p>}
        <ul className="mb-4 space-y-3">{record.adjuntos.map((file, index) => <li key={file.id} className="rounded-xl border border-gray-200 p-3">
            <p className="break-words text-sm font-bold text-gray-900">{file.nombreArchivo}</p>
            <p className="mt-1 text-xs text-gray-600">{formatDateTime(file.fechaCreacion)} · {file.creadoPor?.nombreCompleto || 'Usuario'} · {Math.max(1, Math.round(file.tamano / 1024))} KB</p>
            <div className="mt-2 flex gap-2"><button type="button" onClick={() => open(index, false)} className="min-h-11 rounded-lg border border-indigo-300 px-3 text-sm font-bold text-indigo-800">Ver</button><button type="button" onClick={() => open(index, true)} className="min-h-11 rounded-lg border border-gray-300 px-3 text-sm font-bold text-gray-700">Descargar</button></div>
        </li>)}</ul>
        {canEdit && !record.anuladoEn && <LocalizedFilePicker id="additional-internal-receipts" label="Agregar comprobantes" accept=".pdf,.jpg,.jpeg,.png,.webp" formatsLabel="PDF, JPG, PNG o WEBP" multiple selectedFiles={files} onFilesSelected={setFiles} validateFile={internalFileValidation} onValidationError={setError} disabled={busy} />}
        {record.anuladoEn && <p className="mt-3 text-sm text-gray-600">El movimiento está anulado. Sus comprobantes se conservan para consulta.</p>}
        {error && <p role="alert" className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p>}
    </InternalDialog>;
}

export function InternalCancelModal({ record, close, changed }: { record: InternalMovement; close: () => void; changed: () => void }) {
    const [reason, setReason] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const submit = async (event: React.FormEvent) => {
        event.preventDefault();
        if (busy || reason.trim().length < 5) return;
        setBusy(true); setError('');
        try { await controlInternoService.cancel(record, reason.trim()); changed(); close(); }
        catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo anular el registro'); }
        finally { setBusy(false); }
    };
    return <InternalDialog title="Anular movimiento interno" busy={busy} close={close} footer={<>
        <button type="button" onClick={close} disabled={busy} className="min-h-11 rounded-xl border border-gray-300 px-4 text-sm font-bold text-gray-700">Cancelar</button>
        <button type="submit" form="cancel-internal-form" disabled={busy || reason.trim().length < 5} className="min-h-11 rounded-xl bg-red-700 px-4 text-sm font-bold text-white disabled:opacity-50">{busy ? 'Anulando…' : 'Confirmar anulación'}</button>
    </>}>
        <form id="cancel-internal-form" onSubmit={event => void submit(event)} className="space-y-4">
            <p className="text-sm text-gray-700">El movimiento «{record.detalle}» y sus comprobantes quedarán guardados para consulta. Su importe se excluirá de los totales del control interno.</p>
            <label className="block text-sm font-bold text-gray-800">Motivo de la anulación *<textarea required minLength={5} maxLength={1000} value={reason} onChange={event => setReason(event.target.value)} rows={3} className={internalInputClass} /></label>
            {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p>}
        </form>
    </InternalDialog>;
}
