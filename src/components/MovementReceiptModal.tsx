import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { ApiError } from '../services/api';
import { movementReceiptService as service, type ReceiptContext, type ReceiptFields, type ReceiptModule } from '../services/movement-receipt.service';
import { formatCurrencyWithCents } from '../utils/currency';
import { formatDate, formatDateTime } from '../utils/date';
import { InternalDialog, internalInputClass } from '../features/internal-control/InternalMovementModal';

const emptyFields: ReceiptFields = { pagador: '', receptor: '', documentoReceptor: '', inmueble: '', descripcion: '' };
const states = { VIGENTE: 'Vigente', ANULADO: 'Anulado', REEMPLAZADO: 'Reemplazado', DESACTUALIZADO: 'Desactualizado' };

export default function MovementReceiptModal({ module, movementId, canIssue, close }: { module: ReceiptModule; movementId: number; canIssue: boolean; close: () => void }) {
    const [context, setContext] = useState<ReceiptContext | null>(null);
    const [fields, setFields] = useState(emptyFields);
    const [reason, setReason] = useState('');
    const [editing, setEditing] = useState(false);
    const [busy, setBusy] = useState('cargar');
    const [error, setError] = useState('');
    const [conflict, setConflict] = useState(false);
    const [preview, setPreview] = useState<string | null>(null);
    const [reload, setReload] = useState(0);

    useEffect(() => {
        let active = true;
        void service.context(module, movementId).then(data => {
            if (!active) return;
            setContext(data); setFields(data.datos); setReason(''); setEditing(!data.ultimaVersion); setConflict(false);
        }).catch(cause => { if (active) setError(cause instanceof Error ? cause.message : 'No se pudo cargar el recibo'); })
            .finally(() => { if (active) setBusy(''); });
        return () => { active = false; };
    }, [module, movementId, reload]);
    useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

    const handleError = (cause: unknown) => {
        setError(cause instanceof Error ? cause.message : 'No se pudo completar la operación');
        if (cause instanceof ApiError && cause.status === 409) { setConflict(true); setPreview(null); }
    };
    const refresh = () => { setBusy('cargar'); setError(''); setPreview(null); setReload(value => value + 1); };
    const change = (key: keyof ReceiptFields, value: string) => { setFields(current => ({ ...current, [key]: value })); setPreview(null); };
    const input = () => ({ ...fields, motivo: reason, huellaMovimiento: context!.huellaMovimiento, ultimaVersion: context!.ultimaVersion });
    const showPreview = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!context || busy || conflict) return;
        setBusy('preview'); setError(''); setPreview(null);
        try { setPreview(await service.preview(module, movementId, input())); }
        catch (cause) { handleError(cause); }
        finally { setBusy(''); }
    };
    const issue = async () => {
        if (!context || !preview || busy || conflict) return;
        setBusy('emitir'); setError('');
        try {
            const result = await service.issue(module, movementId, input());
            toast.success(`${result.numero} · Versión ${result.version}${result.creada ? ' emitida' : ' ya emitida'}`);
            setPreview(null); setEditing(false);
            const updated = await service.context(module, movementId);
            setContext(updated); setFields(updated.datos); setReason('');
        } catch (cause) { handleError(cause); }
        finally { setBusy(''); }
    };
    const open = async (version: number) => {
        if (busy) return;
        setBusy('abrir'); setError('');
        try { await service.open(module, movementId, version); }
        catch (cause) { handleError(cause); }
        finally { setBusy(''); }
    };
    const allowed = canIssue && context?.puedeEmitir;
    return <InternalDialog title={`Recibo del movimiento #${movementId}`} busy={Boolean(busy)} close={close} footer={<>
        <button type="button" onClick={close} disabled={Boolean(busy)} className="min-h-11 rounded-xl border border-gray-300 px-4 text-sm font-bold text-gray-700">Cerrar</button>
        {allowed && editing && !conflict && (preview
            ? <button type="button" onClick={() => void issue()} disabled={Boolean(busy)} className="min-h-11 rounded-xl bg-indigo-600 px-4 text-sm font-bold text-white disabled:opacity-50">{busy === 'emitir' ? 'Emitiendo…' : context.ultimaVersion ? 'Emitir nueva versión' : 'Emitir recibo'}</button>
            : <button type="submit" form="movement-receipt-form" disabled={Boolean(busy)} className="min-h-11 rounded-xl bg-indigo-600 px-4 text-sm font-bold text-white disabled:opacity-50">{busy === 'preview' ? 'Preparando…' : 'Vista previa'}</button>)}
    </>}>
        {busy === 'cargar' && <p role="status" className="text-sm text-gray-600">Cargando recibo…</p>}
        {error && <div role="alert" className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-800"><p>{error}</p><button type="button" disabled={Boolean(busy)} onClick={refresh} className="mt-2 min-h-11 font-bold underline">Volver a cargar los datos</button></div>}
        {context && <>
            <div className="mb-4 rounded-xl bg-indigo-50 p-4 text-sm text-indigo-950">
                <p className="break-words font-bold">{context.movimiento.concepto}</p>
                <p className="mt-1 text-xl font-black">{formatCurrencyWithCents(Number(context.movimiento.monto), context.movimiento.moneda)} <span className="text-sm">{context.movimiento.moneda}</span></p>
                <p className="mt-1">{formatDate(context.movimiento.fecha)} · {context.movimiento.metodoPago?.replace(/_/g, ' ') || 'Medio de pago no informado'}</p>
            </div>
            {context.bloqueo && <p className="mb-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">{context.bloqueo}</p>}
            {context.versiones.length > 0 && <section aria-label="Historial de recibos" className="mb-5">
                <h3 className="font-bold text-gray-900">{context.numero} · Historial</h3>
                <ul className="mt-2 space-y-2">{context.versiones.map(row => <li key={row.version} className="rounded-xl border border-gray-200 p-3 text-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2"><strong>Versión {row.version}</strong><span className={`rounded-full px-2 py-1 text-xs font-bold ${row.estado === 'VIGENTE' ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-900'}`}>{states[row.estado]}</span></div>
                    <p className="mt-1 break-words text-xs text-gray-600">{formatDateTime(row.fechaEmision)} · {row.creadoPor}</p>
                    {row.motivo && <p className="mt-2 break-words text-gray-700">Motivo: {row.motivo}</p>}
                    <button type="button" onClick={() => void open(row.version)} disabled={Boolean(busy)} className="mt-2 min-h-11 rounded-lg border border-indigo-200 px-3 font-bold text-indigo-800 disabled:opacity-50" aria-label={`Ver PDF versión ${row.version}`}>Ver PDF / imprimir</button>
                </li>)}</ul>
                <p className="mt-2 text-xs text-gray-600">Podés descargar o imprimir el PDF y adjuntar la copia firmada en los comprobantes del movimiento.</p>
                {allowed && !editing && <button type="button" disabled={Boolean(busy)} onClick={() => setEditing(true)} className="mt-3 min-h-11 rounded-xl border border-indigo-300 px-4 text-sm font-bold text-indigo-800">{context.versiones[0].estado === 'DESACTUALIZADO' ? 'Actualizar recibo' : 'Corregir recibo'}</button>}
            </section>}
            {!context.versiones.length && !allowed && <p className="text-sm text-gray-600">Este movimiento todavía no tiene un recibo emitido.</p>}
            {allowed && editing && <form id="movement-receipt-form" onSubmit={event => void showPreview(event)} className="space-y-4">
                <p className="text-sm text-gray-600">Completá los datos que verá quien recibe el comprobante. La firma se agrega al imprimirlo.</p>
                <fieldset disabled={Boolean(busy) || conflict} className="space-y-4">
                    <label className="block text-sm font-bold text-gray-800">Entrega el dinero *<input required maxLength={180} value={fields.pagador} onChange={event => change('pagador', event.target.value)} className={internalInputClass} /></label>
                    <label className="block text-sm font-bold text-gray-800">Recibe el dinero *<input required maxLength={180} value={fields.receptor} onChange={event => change('receptor', event.target.value)} className={internalInputClass} /></label>
                    <label className="block text-sm font-bold text-gray-800">DNI/CUIT de quien recibe (opcional)<input maxLength={40} value={fields.documentoReceptor} onChange={event => change('documentoReceptor', event.target.value)} className={internalInputClass} /></label>
                    <label className="block text-sm font-bold text-gray-800">Inmueble (opcional)<input maxLength={255} value={fields.inmueble} onChange={event => change('inmueble', event.target.value)} className={internalInputClass} /></label>
                    <label className="block text-sm font-bold text-gray-800">Concepto del recibo *<textarea required rows={3} maxLength={1500} value={fields.descripcion} onChange={event => change('descripcion', event.target.value)} className={internalInputClass} /></label>
                    {context.ultimaVersion > 0 && <label className="block text-sm font-bold text-gray-800">Motivo de la nueva versión *<textarea required rows={2} minLength={5} maxLength={500} value={reason} onChange={event => { setReason(event.target.value); setPreview(null); }} className={internalInputClass} /><span className="mt-1 block text-xs font-normal text-gray-600">Queda en el historial interno. El PDF conserva los datos de cada versión.</span></label>}
                </fieldset>
                {preview && <section aria-label="Vista previa del recibo" className="space-y-2">
                    <h3 className="font-bold text-gray-900">Revisá el recibo antes de emitirlo</h3>
                    <a href={preview} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center font-bold text-indigo-800 underline">Abrir vista previa en otra pestaña</a>
                    <iframe title="Vista previa del recibo PDF" src={preview} className="h-96 w-full rounded-lg border border-gray-200" />
                </section>}
            </form>}
        </>}
    </InternalDialog>;
}
