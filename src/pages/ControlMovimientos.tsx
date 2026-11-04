import FilterBar from '../components/FilterBar';
import EmptyState from '../components/EmptyState';
import LoadingState from '../components/LoadingState';
import { useEffect, useState } from 'react';
import { PlusIcon, DocumentArrowDownIcon, PrinterIcon, ClipboardDocumentListIcon, PaperClipIcon, PencilSquareIcon, XCircleIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { hasPermission } from '../utils/permissions';
import { formatCurrencyWithCents as formatCurrency } from '../utils/currency';
import { formatDate, formatDateTime, formatMonthYear, todayDateInput } from '../utils/date';
import { controlInternoService, teodoroService, danielService, type InternalFilters, type InternalList, type InternalMovement, type InternalOptions } from '../services/control-interno.service';
import ServerPagination from '../components/ServerPagination';
import AppSelect from '../components/AppSelect';
import InternalMovementModal, { internalInputClass } from '../features/internal-control/InternalMovementModal';
import { InternalCancelModal, InternalReceiptsModal } from '../features/internal-control/InternalRecordDialogs';

const emptyOptions: InternalOptions = { categorias: [], mediosPago: [], cuentasPago: [], usuarios: [] };

const sections = {
    INTERNO: {
        title: 'Control interno', description: 'Gastos y movimientos de control personal, organizados por mes.',
        totalsLabel: 'del control interno', movementLabel: 'movimiento interno', listLabel: 'Planilla de movimientos internos',
        service: controlInternoService,
        permissions: { create: 'control_interno.crear', edit: 'control_interno.editar', cancel: 'control_interno.anular', report: 'control_interno.reportes' }
    },
    TEODORO: {
        title: 'Teodoro', description: 'Ingresos, gastos y pagos de Teodoro, organizados por mes.',
        totalsLabel: 'de Teodoro', movementLabel: 'movimiento de Teodoro', listLabel: 'Planilla de movimientos de Teodoro',
        service: teodoroService,
        permissions: { create: 'teodoro.crear', edit: 'teodoro.editar', cancel: 'teodoro.anular', report: 'teodoro.reportes' }
    },
    DANIEL: {
        title: 'Daniel', description: 'Ingresos, gastos y pagos de Daniel, organizados por mes.',
        totalsLabel: 'de Daniel', movementLabel: 'movimiento de Daniel', listLabel: 'Planilla de movimientos de Daniel',
        service: danielService,
        permissions: { create: 'daniel.crear', edit: 'daniel.editar', cancel: 'daniel.anular', report: 'daniel.reportes' }
    }
} as const;

type MovementControlScope = keyof typeof sections;

export default function ControlMovimientos({ ambito = 'INTERNO' }: { ambito?: MovementControlScope }) {
    // Al navegar entre apartados se descartan filtros, resultados y diálogos del anterior.
    return <MovementControlPage key={ambito} ambito={ambito} />;
}

function MovementControlPage({ ambito }: { ambito: MovementControlScope }) {
    const section = sections[ambito];
    const service = section.service;
    const { user } = useAuth();
    const canCreate = hasPermission(user, section.permissions.create);
    const canEdit = hasPermission(user, section.permissions.edit);
    const canCancel = hasPermission(user, section.permissions.cancel);
    const canReport = hasPermission(user, section.permissions.report);
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
    const activeFilterCount = [filters.tipo, filters.moneda, filters.categoria, filters.metodoPago, filters.creadoPorId, filters.estado !== 'TODOS' ? filters.estado : ''].filter(Boolean).length;
    const clearFilters = () => { setFilters({ periodo: filters.periodo, estado: 'TODOS' }); setPage(1); };
    const changed = () => setRevision(current => current + 1);

    useEffect(() => {
        let active = true;
        setLoading(true); setError('');
        const timer = window.setTimeout(() => {
            void service.list(filters, page).then(result => {
                if (!active) return;
                if (result.meta.totalPages > 0 && page > result.meta.totalPages) { setPage(result.meta.totalPages); return; }
                setResponse(result);
            }).catch(cause => { if (active) setError(cause instanceof Error ? cause.message : `No se pudo cargar ${section.title}`); })
                .finally(() => { if (active) setLoading(false); });
        }, 200);
        return () => { active = false; window.clearTimeout(timer); };
    }, [filters, page, revision, service, section.title]);

    useEffect(() => {
        let active = true;
        void service.options().then(result => { if (active) setOptions(result); }).catch(() => {});
        return () => { active = false; };
    }, [revision, service]);

    const report = async (format: 'excel' | 'pdf' | 'print') => {
        if (reportBusy || loading || error) return;
        setReportBusy(format);
        try {
            if (format === 'print') await service.printPdf(filters);
            else await service.export(format, filters);
        } catch (cause) { toast.error(cause instanceof Error ? cause.message : 'No se pudo generar el reporte'); }
        finally { setReportBusy(''); }
    };

    const actions = (record: InternalMovement) => <div className="flex flex-nowrap gap-1.5">
        <button type="button" onClick={() => setReceipts(record)} aria-label={`Comprobantes (${record.adjuntos.length})`} title={`Ver comprobantes (${record.adjuntos.length})`} className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-indigo-200 text-indigo-800 hover:bg-indigo-50 focus-visible:ring-2 focus-visible:ring-indigo-500"><PaperClipIcon className="h-5 w-5" aria-hidden="true" /></button>
        {canEdit && !record.anuladoEn && <button type="button" onClick={() => setEditor({ record })} aria-label="Editar" title="Editar movimiento" className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 focus-visible:ring-2 focus-visible:ring-indigo-500"><PencilSquareIcon className="h-5 w-5" aria-hidden="true" /></button>}
        {canCancel && !record.anuladoEn && <button type="button" data-danger-trigger="true" onClick={() => setCancelRecord(record)} aria-label="Anular" title="Anular movimiento" className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-red-200 text-red-800 hover:bg-red-50 focus-visible:ring-2 focus-visible:ring-red-500"><XCircleIcon className="h-5 w-5" aria-hidden="true" /></button>}
    </div>;
    const recordDetails = (record: InternalMovement) => <>
        <p className="break-words font-bold text-gray-950">{record.detalle}</p>
        {record.observaciones && <p className="mt-1 whitespace-pre-wrap break-words text-xs text-gray-600">{record.observaciones}</p>}
        {record.cuentaPago && <p className="mt-1 break-words text-xs text-indigo-800 [overflow-wrap:anywhere]"><strong>{record.tipo === 'GASTO' ? 'Cuenta de origen' : 'Cuenta de destino'}:</strong> {record.cuentaPago}</p>}
        {record.anuladoEn && <p className="mt-2 rounded-lg bg-gray-100 p-2 text-xs text-gray-700"><strong>Anulado:</strong> {record.motivoAnulacion} · {record.anuladoPor?.nombreCompleto || 'Usuario'} · {formatDateTime(record.anuladoEn)}</p>}
    </>;

    return <div className="mx-auto max-w-7xl space-y-5 pb-8">
        <header className="ui-page-header">
            <div><h1 className="flex items-center gap-2 text-2xl font-black text-gray-950"><ClipboardDocumentListIcon className="h-7 w-7 text-indigo-600" />{section.title}</h1><p className="mt-1 text-sm text-gray-600">{section.description}</p><p className="mt-1 text-xs text-indigo-800">Estos registros no modifican la caja, las liquidaciones ni los cobros de la aplicación.</p></div>
            <div className="ui-page-actions">
                {canCreate && <button type="button" onClick={() => setEditor({ record: null })} className="ui-button ui-button-primary"><PlusIcon className="h-5 w-5" />Agregar movimiento</button>}
                {canReport && <div className="grid grid-cols-2 gap-2 sm:flex">
                    <button type="button" disabled={loading || !!error || !!reportBusy} onClick={() => void report('excel')} className="ui-button ui-button-secondary"><DocumentArrowDownIcon className="h-5 w-5" />{reportBusy === 'excel' ? 'Generando…' : 'Excel'}</button>
                    <button type="button" disabled={loading || !!error || !!reportBusy} onClick={() => void report('pdf')} className="ui-button ui-button-secondary"><DocumentArrowDownIcon className="h-5 w-5" />{reportBusy === 'pdf' ? 'Generando…' : 'PDF'}</button>
                    <button type="button" disabled={loading || !!error || !!reportBusy} onClick={() => void report('print')} className="ui-button ui-button-secondary col-span-2"><PrinterIcon className="h-5 w-5" />Imprimir PDF</button>
                </div>}
            </div>
        </header>

        <FilterBar collapsibleOnMobile activeFilterCount={activeFilterCount} query={filters.search || ''} onQueryChange={value => change('search', value)} onClear={clearFilters} searchLabel="Buscar por detalle, cuenta u observaciones" searchMaxLength={255} placeholder="Ej.: luz, oficina, banco…" context={<>Período: {formatMonthYear(`${filters.periodo}-01`)}</>} filters={<>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-2">
                <label className="block text-sm font-semibold text-slate-700">Mes<input type="month" min="1900-01" max="2100-12" value={filters.periodo} onChange={event => { if (event.target.value) change('periodo', event.target.value); }} className={internalInputClass} /></label>

                <div><label htmlFor="internal-filter-state" className="block text-sm font-semibold text-slate-700">Estado</label><AppSelect id="internal-filter-state" ariaLabel="Estado" value={filters.estado || 'VIGENTES'} onChange={value => change('estado', value)} options={[{ value: 'VIGENTES', label: 'Vigentes' }, { value: 'ANULADOS', label: 'Anulados' }, { value: 'TODOS', label: 'Todos' }]} className="mt-1" /></div>
            </div>
            <details className="mt-3"><summary className="min-h-11 cursor-pointer text-sm font-bold text-indigo-800">Más filtros</summary><div className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                <div><label htmlFor="internal-filter-type" className="block text-sm font-semibold text-slate-700">Tipo</label><AppSelect id="internal-filter-type" ariaLabel="Tipo" value={filters.tipo || ''} onChange={value => change('tipo', value)} options={[{ value: '', label: 'Ingresos y gastos' }, { value: 'GASTO', label: 'Gastos' }, { value: 'INGRESO', label: 'Ingresos' }]} className="mt-1" /></div>
                <div><label htmlFor="internal-filter-currency" className="block text-sm font-semibold text-slate-700">Moneda</label><AppSelect id="internal-filter-currency" ariaLabel="Moneda" value={filters.moneda || ''} onChange={value => change('moneda', value)} options={[{ value: '', label: 'Todas las monedas' }, { value: 'ARS', label: 'Pesos (ARS)' }, { value: 'USD', label: 'Dólares (USD)' }]} className="mt-1" /></div>
                <div><label htmlFor="internal-filter-category" className="block text-sm font-semibold text-slate-700">Categoría</label><AppSelect id="internal-filter-category" ariaLabel="Categoría" value={filters.categoria || ''} onChange={value => change('categoria', value)} options={[{ value: '', label: 'Todas las categorías' }, ...options.categorias.map(value => ({ value, label: value }))]} className="mt-1" /></div>
                <div><label htmlFor="internal-filter-method" className="block text-sm font-semibold text-slate-700">Medio de pago</label><AppSelect id="internal-filter-method" ariaLabel="Medio de pago" value={filters.metodoPago || ''} onChange={value => change('metodoPago', value)} options={[{ value: '', label: 'Todos los medios' }, ...options.mediosPago.map(value => ({ value, label: value }))]} className="mt-1" /></div>
                <div><label htmlFor="internal-filter-author" className="block text-sm font-semibold text-slate-700">Cargado por</label><AppSelect id="internal-filter-author" ariaLabel="Cargado por" value={filters.creadoPorId || ''} onChange={value => change('creadoPorId', value)} options={[{ value: '', label: 'Todos los usuarios' }, ...options.usuarios.map(person => ({ value: String(person.id), label: person.nombreCompleto }))]} className="mt-1" /></div>
            </div></details>
        </>} />

        <section aria-label={`Totales ${section.totalsLabel}`} aria-busy={loading} className="grid gap-3 md:grid-cols-2">
            {(response?.resumen || []).filter(total => !filters.moneda || total.moneda === filters.moneda).map(total => <article key={total.moneda} className="rounded-2xl border border-indigo-100 bg-white p-4 shadow-sm">
                <h2 className="text-sm font-black text-indigo-950">{total.moneda === 'ARS' ? 'Pesos (ARS)' : 'Dólares (USD)'} · <span className="capitalize">{formatMonthYear(`${filters.periodo}-01`)}</span></h2>
                <dl className="mt-3 grid grid-cols-1 gap-3 min-[400px]:grid-cols-3"><div><dt className="text-xs font-bold text-gray-600">Ingresos</dt><dd className="break-words text-lg font-bold tabular-nums text-emerald-800">{formatCurrency(total.ingresos, total.moneda)}</dd></div><div><dt className="text-xs font-bold text-gray-600">Gastos</dt><dd className="break-words text-lg font-bold tabular-nums text-red-800">{formatCurrency(total.gastos, total.moneda)}</dd></div><div><dt className="text-xs font-bold text-gray-600">Diferencia</dt><dd className="break-words text-lg font-bold tabular-nums text-indigo-900">{formatCurrency(total.diferencia, total.moneda)}</dd></div></dl>
            </article>)}
        </section>
        {error && <div role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-800">{error}<button type="button" onClick={changed} className="ml-3 min-h-11 font-bold underline">Reintentar</button></div>}

        <section aria-label={section.listLabel} className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm" aria-busy={loading}>
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 px-4 py-3"><h2 className="font-black text-gray-950">Movimientos del mes</h2><p className="text-xs text-gray-600">{loading ? 'Cargando…' : `${response?.meta.total || 0} registros`} · Los anulados no suman a los totales.</p></div>
            {loading && <LoadingState compact label={`Cargando movimientos ${section.totalsLabel}…`} />}
            {!loading && !error && response?.data.length === 0 && <EmptyState filtered={Boolean(filters.search?.trim()) || activeFilterCount > 0} title="Todavía no hay movimientos en este mes" description="Elegí otro período o registrá el primer ingreso o gasto del mes." onClear={clearFilters} action={canCreate ? { label: 'Crear el primer movimiento', onClick: () => setEditor({ record: null }) } : undefined} />}
            {!loading && !error && !!response?.data.length && <>
                <div className="divide-y divide-gray-100 lg:hidden">{response.data.map(record => <article key={record.id} aria-label={record.detalle} className="space-y-3 p-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0">{recordDetails(record)}<p className="mt-1 text-xs text-gray-600">{formatDate(record.fecha)} · {record.tipo === 'GASTO' ? 'Gasto' : 'Ingreso'} · {record.categoria || 'Sin categoría'}</p></div><p className={`shrink-0 text-sm font-bold text-right tabular-nums ${record.tipo === 'GASTO' ? 'text-red-800' : 'text-emerald-800'}`}>{formatCurrency(Number(record.monto), record.moneda)}</p></div><p className="text-xs text-gray-600">{record.metodoPago || 'Medio sin especificar'} · Cargó {record.creadoPor.nombreCompleto} · {formatDateTime(record.fechaCreacion)}</p>{actions(record)}</article>)}</div>
                <div className="hidden overflow-x-auto lg:block"><table className="tabular-nums w-full min-w-[65rem] text-left text-sm" aria-label={`Planilla mensual ${section.totalsLabel}`}><thead className="bg-gray-50 text-xs uppercase text-gray-600"><tr>{['Fecha', 'Detalle', 'Categoría / medio', 'Importe', 'Usuario / carga', 'Acciones'].map(label => <th key={label} scope="col" className={`px-4 py-3 font-black ${label === 'Importe' ? 'text-right' : ''}`}>{label}</th>)}</tr></thead><tbody className="divide-y divide-gray-100">{response.data.map(record => <tr key={record.id} className={`align-top ${record.anuladoEn ? 'bg-gray-50' : 'hover:bg-indigo-50/20'}`}><td className="whitespace-nowrap px-4 py-4">{formatDate(record.fecha)}<p className="mt-1 text-xs font-bold text-gray-600">{record.tipo === 'GASTO' ? 'Gasto' : 'Ingreso'} · #{record.id}</p></td><td className="min-w-56 max-w-sm px-4 py-4">{recordDetails(record)}</td><td className="max-w-48 break-words px-4 py-4">{record.categoria || 'Sin categoría'}<p className="mt-1 text-xs text-gray-600">{record.metodoPago || 'Sin especificar'}</p></td><td className={`whitespace-nowrap px-4 py-4 font-bold text-right tabular-nums ${record.tipo === 'GASTO' ? 'text-red-800' : 'text-emerald-800'}`}>{formatCurrency(Number(record.monto), record.moneda)}</td><td className="max-w-44 break-words px-4 py-4 text-xs text-gray-700"><p className="font-bold">{record.creadoPor.nombreCompleto}</p><p>{formatDateTime(record.fechaCreacion)}</p>{record.actualizadoPor && <p className="mt-1">Editó {record.actualizadoPor.nombreCompleto} · {formatDateTime(record.fechaActualizacion)}</p>}</td><td className="min-w-44 px-4 py-4">{actions(record)}</td></tr>)}</tbody></table></div>
            </>}
            {!loading && !error && response && <ServerPagination page={response.meta.page} totalPages={response.meta.totalPages} total={response.meta.total} pageSize={response.meta.limit} currentCount={response.data.length} onPageChange={setPage} />}
        </section>
        {canReport && <p className="text-xs text-gray-600">Los reportes incluyen todos los registros del mes que coinciden con los filtros, aunque la planilla tenga varias páginas. El Excel también incluye observaciones y nombres de comprobantes.</p>}

        {editor && <InternalMovementModal service={service} movementLabel={section.movementLabel} key={editor.record?.id || 'new'} record={editor.record} period={filters.periodo} options={options} close={() => setEditor(null)} saved={() => { toast.success(editor.record ? 'Movimiento actualizado' : 'Movimiento guardado'); changed(); }} />}
        {receipts && <InternalReceiptsModal service={service} key={receipts.id} record={receipts} canEdit={canEdit} close={() => setReceipts(null)} changed={changed} />}
        {cancelRecord && <InternalCancelModal service={service} movementLabel={section.movementLabel} totalsLabel={section.totalsLabel} record={cancelRecord} close={() => setCancelRecord(null)} changed={() => { toast.success('Movimiento anulado'); changed(); }} />}
    </div>;
}
