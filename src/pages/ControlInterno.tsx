import { useEffect, useState } from 'react';
import { PlusIcon, DocumentArrowDownIcon, PrinterIcon, ClipboardDocumentListIcon, PaperClipIcon, PencilSquareIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { hasPermission } from '../utils/permissions';
import { formatCurrencyWithCents as formatCurrency } from '../utils/currency';
import { formatDate, formatDateTime, formatMonthYear, todayDateInput } from '../utils/date';
import { controlInternoService, type InternalFilters, type InternalList, type InternalMovement, type InternalOptions } from '../services/control-interno.service';
import ServerPagination from '../components/ServerPagination';
import InternalMovementModal, { internalInputClass } from '../features/internal-control/InternalMovementModal';
import { InternalCancelModal, InternalReceiptsModal } from '../features/internal-control/InternalRecordDialogs';

const emptyOptions: InternalOptions = { categorias: [], mediosPago: [], usuarios: [] };

export default function ControlInterno() {
    const { user } = useAuth();
    const canCreate = hasPermission(user, 'control_interno.crear');
    const canEdit = hasPermission(user, 'control_interno.editar');
    const canCancel = hasPermission(user, 'control_interno.anular');
    const canReport = hasPermission(user, 'control_interno.reportes');
    const [filters, setFilters] = useState<InternalFilters>({ periodo: todayDateInput().slice(0, 7), estado: 'VIGENTES' });
    const [page, setPage] = useState(1);
    const [revision, setRevision] = useState(0);
    const [response, setResponse] = useState<InternalList | null>(null);
    const [options, setOptions] = useState(emptyOptions);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [reportBusy, setReportBusy] = useState('');
    const [editor, setEditor] = useState<{ record: InternalMovement | null } | null>(null);
    const [receipts, setReceipts] = useState<InternalMovement | null>(null);
    const [cancelRecord, setCancelRecord] = useState<InternalMovement | null>(null);
    const change = (key: keyof InternalFilters, value: string) => { setFilters(current => ({ ...current, [key]: value })); setPage(1); };
    const changed = () => setRevision(current => current + 1);

    useEffect(() => {
        let active = true;
        setLoading(true); setError('');
        const timer = window.setTimeout(() => {
            void controlInternoService.list(filters, page).then(result => {
                if (!active) return;
                if (result.meta.totalPages > 0 && page > result.meta.totalPages) { setPage(result.meta.totalPages); return; }
                setResponse(result);
            }).catch(cause => { if (active) setError(cause instanceof Error ? cause.message : 'No se pudo cargar el control interno'); })
                .finally(() => { if (active) setLoading(false); });
        }, 200);
        return () => { active = false; window.clearTimeout(timer); };
    }, [filters, page, revision]);

    useEffect(() => {
        let active = true;
        void controlInternoService.options().then(result => { if (active) setOptions(result); }).catch(() => {});
        return () => { active = false; };
    }, [revision]);

    const report = async (format: 'excel' | 'pdf' | 'print') => {
        if (reportBusy || loading || error) return;
        setReportBusy(format);
        try {
            if (format === 'print') await controlInternoService.printPdf(filters);
            else await controlInternoService.export(format, filters);
        } catch (cause) { toast.error(cause instanceof Error ? cause.message : 'No se pudo generar el reporte'); }
        finally { setReportBusy(''); }
    };

    const actions = (record: InternalMovement) => <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => setReceipts(record)} className="inline-flex min-h-11 items-center gap-1 rounded-lg border border-indigo-200 px-2 text-xs font-bold text-indigo-800 hover:bg-indigo-50"><PaperClipIcon className="h-4 w-4" />Comprobantes ({record.adjuntos.length})</button>
        {canEdit && !record.anuladoEn && <button type="button" onClick={() => setEditor({ record })} className="inline-flex min-h-11 items-center gap-1 rounded-lg border border-gray-300 px-2 text-xs font-bold text-gray-700"><PencilSquareIcon className="h-4 w-4" />Editar</button>}
        {canCancel && !record.anuladoEn && <button type="button" data-danger-trigger="true" onClick={() => setCancelRecord(record)} className="min-h-11 rounded-lg border border-red-200 px-2 text-xs font-bold text-red-800">Anular</button>}
    </div>;
    const recordDetails = (record: InternalMovement) => <>
        <p className="break-words font-bold text-gray-950">{record.detalle}</p>
        {record.observaciones && <p className="mt-1 whitespace-pre-wrap break-words text-xs text-gray-600">{record.observaciones}</p>}
        {record.anuladoEn && <p className="mt-2 rounded-lg bg-gray-100 p-2 text-xs text-gray-700"><strong>Anulado:</strong> {record.motivoAnulacion} · {record.anuladoPor?.nombreCompleto || 'Usuario'} · {formatDateTime(record.anuladoEn)}</p>}
    </>;

    return <div className="mx-auto max-w-7xl space-y-5 pb-8">
        <header className="flex flex-col justify-between gap-3 xl:flex-row xl:items-start">
            <div><h1 className="flex items-center gap-2 text-2xl font-black text-gray-950"><ClipboardDocumentListIcon className="h-7 w-7 text-indigo-600" />Control interno</h1><p className="mt-1 text-sm text-gray-600">Gastos y movimientos de control personal, organizados por mes.</p><p className="mt-1 text-xs text-indigo-800">Estos registros no modifican la caja, las liquidaciones ni los cobros de la aplicación.</p></div>
            <div className="flex flex-wrap gap-2">
                {canReport && <>
                    <button type="button" disabled={loading || !!error || !!reportBusy} onClick={() => void report('excel')} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-emerald-300 bg-white px-3 text-sm font-bold text-emerald-800 disabled:opacity-50"><DocumentArrowDownIcon className="h-5 w-5" />{reportBusy === 'excel' ? 'Generando…' : 'Excel'}</button>
                    <button type="button" disabled={loading || !!error || !!reportBusy} onClick={() => void report('pdf')} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-indigo-300 bg-white px-3 text-sm font-bold text-indigo-800 disabled:opacity-50"><DocumentArrowDownIcon className="h-5 w-5" />{reportBusy === 'pdf' ? 'Generando…' : 'PDF'}</button>
                    <button type="button" disabled={loading || !!error || !!reportBusy} onClick={() => void report('print')} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-gray-300 bg-white px-3 text-sm font-bold text-gray-700 disabled:opacity-50"><PrinterIcon className="h-5 w-5" />Imprimir PDF</button>
                </>}
                {canCreate && <button type="button" onClick={() => setEditor({ record: null })} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-indigo-600 px-3 text-sm font-bold text-white hover:bg-indigo-700"><PlusIcon className="h-5 w-5" />Agregar movimiento</button>}
            </div>
        </header>

        <section aria-label="Filtros del control interno" className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <label className="text-sm font-bold text-gray-800">Mes<input type="month" min="1900-01" max="2100-12" value={filters.periodo} onChange={event => { if (event.target.value) change('periodo', event.target.value); }} className={internalInputClass} /></label>
                <label className="text-sm font-bold text-gray-800 sm:col-span-1 lg:col-span-2">Buscar por detalle u observaciones<input type="search" maxLength={255} value={filters.search || ''} onChange={event => change('search', event.target.value)} placeholder="Ej.: luz, oficina, reparación…" className={internalInputClass} /></label>
                <label className="text-sm font-bold text-gray-800">Estado<select value={filters.estado} onChange={event => change('estado', event.target.value)} className={internalInputClass}><option value="VIGENTES">Vigentes</option><option value="ANULADOS">Anulados</option><option value="TODOS">Todos</option></select></label>
            </div>
            <details className="mt-3"><summary className="min-h-11 cursor-pointer text-sm font-bold text-indigo-800">Más filtros</summary><div className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                <label className="text-sm font-bold text-gray-800">Tipo<select value={filters.tipo || ''} onChange={event => change('tipo', event.target.value)} className={internalInputClass}><option value="">Ingresos y gastos</option><option value="GASTO">Gastos</option><option value="INGRESO">Ingresos</option></select></label>
                <label className="text-sm font-bold text-gray-800">Moneda<select value={filters.moneda || ''} onChange={event => change('moneda', event.target.value)} className={internalInputClass}><option value="">Todas las monedas</option><option value="ARS">Pesos (ARS)</option><option value="USD">Dólares (USD)</option></select></label>
                <label className="text-sm font-bold text-gray-800">Categoría<select value={filters.categoria || ''} onChange={event => change('categoria', event.target.value)} className={internalInputClass}><option value="">Todas las categorías</option>{options.categorias.map(value => <option key={value}>{value}</option>)}</select></label>
                <label className="text-sm font-bold text-gray-800">Medio de pago<select value={filters.metodoPago || ''} onChange={event => change('metodoPago', event.target.value)} className={internalInputClass}><option value="">Todos los medios</option>{options.mediosPago.map(value => <option key={value}>{value}</option>)}</select></label>
                <label className="text-sm font-bold text-gray-800">Cargado por<select value={filters.creadoPorId || ''} onChange={event => change('creadoPorId', event.target.value)} className={internalInputClass}><option value="">Todos los usuarios</option>{options.usuarios.map(person => <option key={person.id} value={person.id}>{person.nombreCompleto}</option>)}</select></label>
            </div></details>
        </section>

        <section aria-label="Totales del control interno" aria-busy={loading} className="grid gap-3 md:grid-cols-2">
            {(response?.resumen || []).filter(total => !filters.moneda || total.moneda === filters.moneda).map(total => <article key={total.moneda} className="rounded-2xl border border-indigo-100 bg-white p-4 shadow-sm">
                <h2 className="text-sm font-black text-indigo-950">{total.moneda === 'ARS' ? 'Pesos (ARS)' : 'Dólares (USD)'} · <span className="capitalize">{formatMonthYear(`${filters.periodo}-01`)}</span></h2>
                <dl className="mt-3 grid grid-cols-1 gap-3 min-[400px]:grid-cols-3"><div><dt className="text-xs font-bold text-gray-600">Ingresos</dt><dd className="break-words text-lg font-black text-emerald-800">{formatCurrency(total.ingresos, total.moneda)}</dd></div><div><dt className="text-xs font-bold text-gray-600">Gastos</dt><dd className="break-words text-lg font-black text-red-800">{formatCurrency(total.gastos, total.moneda)}</dd></div><div><dt className="text-xs font-bold text-gray-600">Diferencia</dt><dd className="break-words text-lg font-black text-indigo-900">{formatCurrency(total.diferencia, total.moneda)}</dd></div></dl>
            </article>)}
        </section>
        {error && <div role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-800">{error}<button type="button" onClick={changed} className="ml-3 min-h-11 font-bold underline">Reintentar</button></div>}

        <section aria-label="Planilla de movimientos internos" className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm" aria-busy={loading}>
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 px-4 py-3"><h2 className="font-black text-gray-950">Movimientos del mes</h2><p className="text-xs text-gray-600">{loading ? 'Cargando…' : `${response?.meta.total || 0} registros`} · Los anulados no suman a los totales.</p></div>
            {loading && <p role="status" className="p-5 text-sm text-gray-600">Cargando movimientos internos…</p>}
            {!loading && !error && response?.data.length === 0 && <div className="p-8 text-center"><p className="font-bold text-gray-700">No hay movimientos para esta selección.</p><p className="mt-1 text-sm text-gray-600">Elegí otro mes o agregá el primer registro.</p></div>}
            {!loading && !error && !!response?.data.length && <>
                <div className="divide-y divide-gray-100 lg:hidden">{response.data.map(record => <article key={record.id} aria-label={record.detalle} className="space-y-3 p-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0">{recordDetails(record)}<p className="mt-1 text-xs text-gray-600">{formatDate(record.fecha)} · {record.tipo === 'GASTO' ? 'Gasto' : 'Ingreso'} · {record.categoria || 'Sin categoría'}</p></div><p className={`shrink-0 text-sm font-black ${record.tipo === 'GASTO' ? 'text-red-800' : 'text-emerald-800'}`}>{formatCurrency(Number(record.monto), record.moneda)}</p></div><p className="text-xs text-gray-600">{record.metodoPago || 'Medio sin especificar'} · Cargó {record.creadoPor.nombreCompleto} · {formatDateTime(record.fechaCreacion)}</p>{actions(record)}</article>)}</div>
                <div className="hidden overflow-x-auto lg:block"><table className="w-full min-w-[65rem] text-left text-sm" aria-label="Planilla mensual del control interno"><thead className="bg-gray-50 text-xs uppercase text-gray-600"><tr>{['Fecha', 'Detalle', 'Categoría / medio', 'Importe', 'Usuario / carga', 'Acciones'].map(label => <th key={label} scope="col" className="px-4 py-3 font-black">{label}</th>)}</tr></thead><tbody className="divide-y divide-gray-100">{response.data.map(record => <tr key={record.id} className={`align-top ${record.anuladoEn ? 'bg-gray-50' : 'hover:bg-indigo-50/20'}`}><td className="whitespace-nowrap px-4 py-4">{formatDate(record.fecha)}<p className="mt-1 text-xs font-bold text-gray-600">{record.tipo === 'GASTO' ? 'Gasto' : 'Ingreso'} · #{record.id}</p></td><td className="min-w-56 max-w-sm px-4 py-4">{recordDetails(record)}</td><td className="max-w-48 break-words px-4 py-4">{record.categoria || 'Sin categoría'}<p className="mt-1 text-xs text-gray-600">{record.metodoPago || 'Sin especificar'}</p></td><td className={`whitespace-nowrap px-4 py-4 font-black ${record.tipo === 'GASTO' ? 'text-red-800' : 'text-emerald-800'}`}>{formatCurrency(Number(record.monto), record.moneda)}</td><td className="max-w-44 break-words px-4 py-4 text-xs text-gray-700"><p className="font-bold">{record.creadoPor.nombreCompleto}</p><p>{formatDateTime(record.fechaCreacion)}</p>{record.actualizadoPor && <p className="mt-1">Editó {record.actualizadoPor.nombreCompleto} · {formatDateTime(record.fechaActualizacion)}</p>}</td><td className="min-w-44 px-4 py-4">{actions(record)}</td></tr>)}</tbody></table></div>
            </>}
            {!loading && !error && response && <ServerPagination page={response.meta.page} totalPages={response.meta.totalPages} total={response.meta.total} pageSize={response.meta.limit} currentCount={response.data.length} onPageChange={setPage} />}
        </section>
        {canReport && <p className="text-xs text-gray-600">Los reportes incluyen todos los registros del mes que coinciden con los filtros, aunque la planilla tenga varias páginas. El Excel también incluye observaciones y nombres de comprobantes.</p>}

        {editor && <InternalMovementModal key={editor.record?.id || 'new'} record={editor.record} period={filters.periodo} options={options} close={() => setEditor(null)} saved={() => { toast.success(editor.record ? 'Movimiento actualizado' : 'Movimiento guardado'); changed(); }} />}
        {receipts && <InternalReceiptsModal key={receipts.id} record={receipts} canEdit={canEdit} close={() => setReceipts(null)} changed={changed} />}
        {cancelRecord && <InternalCancelModal record={cancelRecord} close={() => setCancelRecord(null)} changed={() => { toast.success('Movimiento anulado'); changed(); }} />}
    </div>;
}
