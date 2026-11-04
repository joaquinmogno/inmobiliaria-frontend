import FieldError, { useFieldValidation } from '../../components/FieldError';
import { DialogTitle } from '@headlessui/react';
import { Modal as Dialog, ModalBackdrop as DialogBackdrop, ModalPanel as DialogPanel } from '../../components/Modal';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useState, type ReactNode } from 'react';
import LocalizedFilePicker from '../../components/LocalizedFilePicker';
import AppSelect from '../../components/AppSelect';
import InternalAmountInput from './InternalAmountInput';
import { controlInternoService, type InternalControlService, type InternalMovement, type InternalMovementInput, type InternalOptions } from '../../services/control-interno.service';
import { formatCurrencyWithCents as formatCurrency, type Moneda } from '../../utils/currency';
import { formatDateTime, todayDateInput } from '../../utils/date';

export const internalInputClass = 'ui-field mt-1';
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
                <div className="modal-scroll flex-1 px-5 py-4">{children}</div>
                <div className="flex shrink-0 flex-wrap justify-end gap-2 border-t border-gray-100 px-5 py-4">{footer}</div>
            </DialogPanel>
        </div>
    </Dialog>;
}

interface Props { service?: InternalControlService; movementLabel?: string; record: InternalMovement | null; period: string; options: InternalOptions; close: () => void; saved: () => void }
export default function InternalMovementModal({ service = controlInternoService, movementLabel = 'movimiento interno', record, period, options, close, saved }: Props) {
    const today = todayDateInput();
    const [data, setData] = useState<InternalMovementInput>({
        fecha: record?.fecha.slice(0, 10) || (today.slice(0, 7) === period ? today : `${period}-01`),
        tipo: record?.tipo || 'GASTO', detalle: record?.detalle || '', monto: String(record?.monto || ''), moneda: record?.moneda || 'ARS',
        categoria: record?.categoria || '', metodoPago: record?.metodoPago || '', cuentaPago: record?.cuentaPago || '', observaciones: record?.observaciones || ''
    });
    const validation = useFieldValidation();
    const [fileError, setFileError] = useState('');
    const [files, setFiles] = useState<File[]>([]);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [customCategory, setCustomCategory] = useState(false);
    const [customPaymentMethod, setCustomPaymentMethod] = useState(false);
    const [customPaymentAccount, setCustomPaymentAccount] = useState(false);
    const categories = [...new Set(['Oficina', 'Servicios', 'Mantenimiento', 'Publicidad', 'Otros', ...options.categorias, ...(record?.categoria ? [record.categoria] : [])])];
    const paymentMethods = [...new Set(['Efectivo', 'Transferencia', 'Cheque', 'Tarjeta', 'Otro', ...options.mediosPago, ...(record?.metodoPago ? [record.metodoPago] : [])])];
    const paymentAccounts = [...new Set([...(options.cuentasPago || []), ...(record?.cuentaPago ? [record.cuentaPago] : [])])];
    const accountLabel = data.tipo === 'GASTO' ? 'Cuenta de origen (opcional)' : 'Cuenta de destino (opcional)';
    const change = (key: keyof InternalMovementInput, value: string) => setData(current => ({ ...current, [key]: value }));
    const save = async (event: React.FormEvent) => {
        event.preventDefault();
        if (busy) return;
        if (files.length > 10) { setFileError('Seleccioná hasta 10 comprobantes por carga.'); document.getElementById('internal-receipts')?.focus(); return; }
        if (!data.detalle.trim()) { validation.showErrors({ 'internal-detail': 'Ingresá el detalle del movimiento.' }); return; }
        if (!(Number(data.monto) > 0) || Number(data.monto) > 999999999999.99) { validation.showErrors({ 'internal-amount': 'Ingresá un importe mayor a cero y de hasta 999.999.999.999,99.' }); return; }
        validation.reset(); setFileError(''); setBusy(true); setError('');
        try {
            const normalized = { ...data, monto: data.monto.replace(/\.$/, ''), detalle: data.detalle.trim(), categoria: data.categoria?.trim(), metodoPago: data.metodoPago?.trim(), cuentaPago: data.cuentaPago?.trim(), observaciones: data.observaciones?.trim() };
            if (record) await service.update(record.id, record.version, normalized);
            else await service.create(normalized, files);
            saved(); close();
        } catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo guardar el movimiento'); }
        finally { setBusy(false); }
    };
    return <InternalDialog title={`${record ? 'Editar' : 'Agregar'} ${movementLabel}`} busy={busy} close={close} footer={<>
        <button type="button" disabled={busy} onClick={close} className="ui-button ui-button-secondary min-w-0 flex-1 sm:flex-none">Cancelar</button>
        <button type="submit" form="internal-movement-form" disabled={busy} className="ui-button ui-button-primary min-w-0 flex-1 sm:flex-none">{busy ? 'Guardando…' : 'Guardar movimiento'}</button>
    </>}>
        <form id="internal-movement-form" onSubmit={event => void save(event)} className="space-y-4">
            <p className="text-sm text-gray-600">Completá los datos obligatorios (*). La información adicional es opcional.</p>
            <fieldset className="min-w-0 space-y-4"><legend className="mb-3 text-base font-semibold text-slate-900">Datos del movimiento</legend>
            <div className="grid gap-3 sm:grid-cols-2">
                <div className="min-w-0"><label className="text-sm font-bold text-gray-800">Fecha *<input {...validation.inputProps('internal-date')} type="date" required value={data.fecha} onChange={event => change('fecha', event.target.value)} className={internalInputClass} /></label><FieldError id="internal-date" message={validation.errors['internal-date']} /></div>
                <div><label htmlFor="internal-type" className="text-sm font-bold text-gray-800">Tipo de movimiento *</label><AppSelect id="internal-type" ariaLabel="Tipo de movimiento" value={data.tipo} onChange={value => change('tipo', value)} options={[{ value: 'GASTO', label: 'Gasto' }, { value: 'INGRESO', label: 'Ingreso' }]} className="mt-1" /></div>
            </div>
            <div className="min-w-0"><label className="block text-sm font-bold text-gray-800">Detalle de lo pagado o recibido *<input {...validation.inputProps('internal-detail')} required maxLength={255} value={data.detalle} onChange={event => change('detalle', event.target.value)} placeholder="Ej.: compra de artículos de oficina" className={internalInputClass} /></label><FieldError id="internal-detail" message={validation.errors['internal-detail']} /></div>
            <div className="grid grid-cols-[1fr_7rem] gap-3">
                <div className="min-w-0"><label className="min-w-0 text-sm font-bold text-gray-800">Importe *<InternalAmountInput {...validation.inputProps('internal-amount')} value={data.monto} onChange={value => change('monto', value)} className={internalInputClass} /></label><FieldError id="internal-amount" message={validation.errors['internal-amount']} /></div>
                <div><label htmlFor="internal-currency" className="text-sm font-bold text-gray-800">Moneda *</label><AppSelect id="internal-currency" ariaLabel="Moneda" value={data.moneda} onChange={value => change('moneda', value as Moneda)} options={[{ value: 'ARS', label: 'ARS' }, { value: 'USD', label: 'USD' }]} className="mt-1" /></div>
            </div>
            </fieldset>
            <fieldset className="min-w-0 space-y-4 border-t border-slate-100 pt-4"><legend className="pr-2 text-base font-semibold text-slate-900">Información adicional · Opcional</legend>
            <div className="grid gap-3 sm:grid-cols-2">
                <div><label htmlFor="internal-category" className="text-sm font-bold text-gray-800">Categoría (opcional)</label><AppSelect id="internal-category" ariaLabel="Categoría (opcional)" value={customCategory ? '__custom__' : data.categoria || ''} onChange={value => { setCustomCategory(value === '__custom__'); change('categoria', value === '__custom__' ? '' : value); }} options={[{ value: '', label: 'Sin categoría' }, ...categories.map(value => ({ value, label: value })), { value: '__custom__', label: 'Agregar categoría…' }]} className="mt-1" />{customCategory && <input aria-label="Nueva categoría" maxLength={80} value={data.categoria} onChange={event => change('categoria', event.target.value)} className={internalInputClass} placeholder="Nombre de la categoría" />}</div>
                <div><label htmlFor="internal-payment-method" className="text-sm font-bold text-gray-800">Medio de pago (opcional)</label><AppSelect id="internal-payment-method" ariaLabel="Medio de pago (opcional)" value={customPaymentMethod ? '__custom__' : data.metodoPago || ''} onChange={value => { setCustomPaymentMethod(value === '__custom__'); change('metodoPago', value === '__custom__' ? '' : value); }} options={[{ value: '', label: 'Sin especificar' }, ...paymentMethods.map(value => ({ value, label: value })), { value: '__custom__', label: 'Agregar medio de pago…' }]} className="mt-1" />{customPaymentMethod && <input aria-label="Nuevo medio de pago" maxLength={80} value={data.metodoPago} onChange={event => change('metodoPago', event.target.value)} className={internalInputClass} placeholder="Nombre del medio de pago" />}</div>
            </div>
            <div>
                <label htmlFor="internal-payment-account" className="text-sm font-bold text-gray-800">{accountLabel}</label>
                <AppSelect id="internal-payment-account" ariaLabel={accountLabel} value={customPaymentAccount ? '__custom__' : data.cuentaPago ? `account:${data.cuentaPago}` : ''} onChange={value => {
                    setCustomPaymentAccount(value === '__custom__');
                    change('cuentaPago', value.startsWith('account:') ? value.slice(8) : '');
                }} options={[{ value: '', label: 'Sin especificar' }, ...paymentAccounts.map(value => ({ value: `account:${value}`, label: value })), { value: '__custom__', label: 'Escribir otra cuenta…' }]} className="mt-1" />
                {customPaymentAccount && <input aria-label="Nombre de la cuenta" maxLength={220} value={data.cuentaPago} onChange={event => change('cuentaPago', event.target.value)} className={internalInputClass} placeholder="Ej.: Banco Nación · Cuenta personal, o caja en efectivo" />}
                <p className="mt-1 text-xs text-gray-600">{data.tipo === 'GASTO' ? 'Identifica desde dónde se hizo el pago.' : 'Identifica dónde se recibió el dinero.'} Es informativo: no modifica saldos de caja ni bancos.</p>
            </div>
            <label className="block text-sm font-bold text-gray-800">Observaciones (opcional)<textarea rows={2} maxLength={2000} value={data.observaciones} onChange={event => change('observaciones', event.target.value)} className={internalInputClass} /></label>
            {!record && <>
                <LocalizedFilePicker id="internal-receipts" errorMessage={fileError} label="Comprobantes (opcional)" accept=".pdf,.jpg,.jpeg,.png,.webp" formatsLabel="PDF, JPG, PNG o WEBP" multiple selectedFiles={files} onFilesSelected={next => { setFiles(next); setFileError(''); }} validateFile={internalFileValidation} onValidationError={setFileError} disabled={busy} />
                {files.length > 0 && <ul className="space-y-1 text-sm text-gray-700">{files.map((file, index) => <li key={`${file.name}-${index}`} className="flex items-center justify-between gap-2"><span className="min-w-0 break-words">{file.name}</span><button type="button" onClick={() => setFiles(current => current.filter((_, position) => position !== index))} className="min-h-11 shrink-0 px-2 font-bold text-red-800">Quitar</button></li>)}</ul>}
            </>}
            {record && <p className="text-xs text-gray-600">Podés agregar archivos desde «Comprobantes» en la planilla.</p>}
            </fieldset>
            {Number(data.monto) > 0 && <p className="rounded-xl bg-indigo-50 p-3 text-sm font-bold text-indigo-950">{data.tipo === 'GASTO' ? 'Gasto' : 'Ingreso'}: {formatCurrency(Number(data.monto), data.moneda)}</p>}
            {record && <p className="text-xs text-gray-600">Cargado por {record.creadoPor.nombreCompleto} · {formatDateTime(record.fechaCreacion)}</p>}
            {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p>}
        </form>
    </InternalDialog>;
}
