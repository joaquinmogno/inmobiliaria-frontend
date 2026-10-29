import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useState, type ReactNode } from 'react';
import LocalizedFilePicker from '../../components/LocalizedFilePicker';
import { controlInternoService, type InternalMovement, type InternalMovementInput, type InternalOptions } from '../../services/control-interno.service';
import { formatCurrencyWithCents as formatCurrency, type Moneda } from '../../utils/currency';
import { formatDateTime, todayDateInput } from '../../utils/date';

export const internalInputClass = 'mt-1 min-h-11 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200';
export const internalFileValidation = (file: File) => {
    if (!/\.(pdf|jpe?g|png|webp)$/i.test(file.name)) return 'Usá comprobantes PDF, JPG, PNG o WEBP.';
    if (file.size > 30 * 1024 * 1024) return 'Cada comprobante puede pesar hasta 30 MB.';
    return null;
};

export function InternalDialog({ title, busy, close, children, footer }: { title: string; busy: boolean; close: () => void; children: ReactNode; footer: ReactNode }) {
    return <Dialog open onClose={() => !busy && close()} className="relative z-[90]">
        <DialogBackdrop className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
        <div className="fixed inset-0 flex items-center justify-center p-3 sm:p-5">
            <DialogPanel className="flex max-h-[calc(100dvh-2rem)] w-full max-w-xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
                <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-5 py-4"><DialogTitle className="text-lg font-black text-gray-950">{title}</DialogTitle><button type="button" onClick={close} disabled={busy} aria-label="Cerrar ventana" className="flex h-11 w-11 items-center justify-center rounded-xl text-gray-600 hover:bg-gray-100"><XMarkIcon className="h-5 w-5" /></button></div>
                <div className="overflow-y-auto px-5 py-4">{children}</div>
                <div className="flex shrink-0 flex-wrap justify-end gap-2 border-t border-gray-100 px-5 py-4">{footer}</div>
            </DialogPanel>
        </div>
    </Dialog>;
}

interface Props { record: InternalMovement | null; period: string; options: InternalOptions; close: () => void; saved: () => void }
export default function InternalMovementModal({ record, period, options, close, saved }: Props) {
    const today = todayDateInput();
    const [data, setData] = useState<InternalMovementInput>({
        fecha: record?.fecha.slice(0, 10) || (today.slice(0, 7) === period ? today : `${period}-01`),
        tipo: record?.tipo || 'GASTO', detalle: record?.detalle || '', monto: String(record?.monto || ''), moneda: record?.moneda || 'ARS',
        categoria: record?.categoria || '', metodoPago: record?.metodoPago || '', observaciones: record?.observaciones || ''
    });
    const [files, setFiles] = useState<File[]>([]);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const change = (key: keyof InternalMovementInput, value: string) => setData(current => ({ ...current, [key]: value }));
    const save = async (event: React.FormEvent) => {
        event.preventDefault();
        if (busy) return;
        if (files.length > 10) { setError('Seleccioná hasta 10 comprobantes por carga.'); return; }
        setBusy(true); setError('');
        try {
            const normalized = { ...data, detalle: data.detalle.trim(), categoria: data.categoria?.trim(), metodoPago: data.metodoPago?.trim(), observaciones: data.observaciones?.trim() };
            if (record) await controlInternoService.update(record.id, record.version, normalized);
            else await controlInternoService.create(normalized, files);
            saved(); close();
        } catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo guardar el movimiento'); }
        finally { setBusy(false); }
    };
    return <InternalDialog title={record ? 'Editar movimiento interno' : 'Agregar movimiento interno'} busy={busy} close={close} footer={<>
        <button type="button" disabled={busy} onClick={close} className="min-h-11 rounded-xl border border-gray-300 px-4 text-sm font-bold text-gray-700">Cancelar</button>
        <button type="submit" form="internal-movement-form" disabled={busy} className="min-h-11 rounded-xl bg-indigo-600 px-4 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-50">{busy ? 'Guardando…' : 'Guardar movimiento'}</button>
    </>}>
        <form id="internal-movement-form" onSubmit={event => void save(event)} className="space-y-4">
            <p className="text-sm text-gray-600">Registro para control interno de la inmobiliaria.</p>
            <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-sm font-bold text-gray-800">Fecha *<input type="date" required value={data.fecha} onChange={event => change('fecha', event.target.value)} className={internalInputClass} /></label>
                <label className="text-sm font-bold text-gray-800">Tipo de movimiento *<select value={data.tipo} onChange={event => change('tipo', event.target.value)} className={internalInputClass}><option value="GASTO">Gasto</option><option value="INGRESO">Ingreso</option></select></label>
            </div>
            <label className="block text-sm font-bold text-gray-800">Detalle de lo pagado o recibido *<input required maxLength={255} value={data.detalle} onChange={event => change('detalle', event.target.value)} placeholder="Ej.: compra de artículos de oficina" className={internalInputClass} /></label>
            <div className="grid grid-cols-[1fr_7rem] gap-3">
                <label className="min-w-0 text-sm font-bold text-gray-800">Importe *<input type="number" inputMode="decimal" step="0.01" min="0.01" max="999999999999.99" required value={data.monto} onChange={event => change('monto', event.target.value)} className={internalInputClass} /></label>
                <label className="text-sm font-bold text-gray-800">Moneda *<select value={data.moneda} onChange={event => change('moneda', event.target.value as Moneda)} className={internalInputClass}><option value="ARS">ARS</option><option value="USD">USD</option></select></label>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-sm font-bold text-gray-800">Categoría (opcional)<input list="internal-categories" maxLength={80} value={data.categoria} onChange={event => change('categoria', event.target.value)} className={internalInputClass} placeholder="Elegí o escribí una categoría" /></label>
                <label className="text-sm font-bold text-gray-800">Medio de pago (opcional)<input list="internal-payment-methods" maxLength={80} value={data.metodoPago} onChange={event => change('metodoPago', event.target.value)} className={internalInputClass} placeholder="Sin especificar" /></label>
            </div>
            <datalist id="internal-categories">{[...new Set(['Oficina', 'Servicios', 'Mantenimiento', 'Publicidad', 'Otros', ...options.categorias])].map(value => <option key={value} value={value} />)}</datalist>
            <datalist id="internal-payment-methods">{[...new Set(['Efectivo', 'Transferencia', 'Cheque', 'Tarjeta', 'Otro', ...options.mediosPago])].map(value => <option key={value} value={value} />)}</datalist>
            <label className="block text-sm font-bold text-gray-800">Observaciones (opcional)<textarea rows={2} maxLength={2000} value={data.observaciones} onChange={event => change('observaciones', event.target.value)} className={internalInputClass} /></label>
            {!record && <>
                <LocalizedFilePicker id="internal-receipts" label="Comprobantes (opcional)" accept=".pdf,.jpg,.jpeg,.png,.webp" formatsLabel="PDF, JPG, PNG o WEBP" multiple selectedFiles={files} onFilesSelected={setFiles} validateFile={internalFileValidation} onValidationError={setError} disabled={busy} />
                {files.length > 0 && <ul className="space-y-1 text-sm text-gray-700">{files.map((file, index) => <li key={`${file.name}-${index}`} className="flex items-center justify-between gap-2"><span className="min-w-0 break-words">{file.name}</span><button type="button" onClick={() => setFiles(current => current.filter((_, position) => position !== index))} className="min-h-11 shrink-0 px-2 font-bold text-red-800">Quitar</button></li>)}</ul>}
            </>}
            {record && <p className="text-xs text-gray-600">Podés agregar archivos desde «Comprobantes» en la planilla.</p>}
            {Number(data.monto) > 0 && <p className="rounded-xl bg-indigo-50 p-3 text-sm font-bold text-indigo-950">{data.tipo === 'GASTO' ? 'Gasto' : 'Ingreso'}: {formatCurrency(Number(data.monto), data.moneda)}</p>}
            {record && <p className="text-xs text-gray-600">Cargado por {record.creadoPor.nombreCompleto} · {formatDateTime(record.fechaCreacion)}</p>}
            {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p>}
        </form>
    </InternalDialog>;
}
