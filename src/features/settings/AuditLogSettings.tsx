import { useCallback, useEffect, useState } from 'react';
import { ListBulletIcon } from '@heroicons/react/24/outline';
import AppSelect from '../../components/AppSelect';
import { auditService, type AuditLog } from '../../services/audit.service';
import { formatDateTime } from '../../utils/date';
import { PERMISSION_LABELS, type PermissionKey } from '../../utils/permissions';

const PAGE_SIZE = 15;

const PermissionList = ({ title, permissions }: { title: string; permissions?: string[] }) => {
    if (!permissions?.length) return null;
    return (
        <div className="space-y-1">
            <p className="text-xs font-black uppercase tracking-wide text-gray-600">{title}</p>
            <div className="flex flex-wrap gap-1.5">
                {permissions.map(permission => <span key={`${title}-${permission}`} className="rounded-lg border border-gray-100 bg-gray-50 px-2 py-1 text-xs font-bold text-gray-600">{PERMISSION_LABELS[permission as PermissionKey] || permission}</span>)}
            </div>
        </div>
    );
};

type PermissionAuditDetail = {
    usuarioAfectado?: string;
    permisosAgregados?: string[];
    permisosQuitados?: string[];
    denegacionesAgregadas?: string[];
    denegacionesQuitadas?: string[];
};

const parsePermissionDetail = (log: AuditLog): PermissionAuditDetail | null => {
    if (log.accion !== 'CAMBIAR_PERMISOS_USUARIO' || !log.detalle) return null;
    try {
        return JSON.parse(log.detalle) as PermissionAuditDetail;
    } catch {
        return null;
    }
};

const AuditDetail = ({ log }: { log: AuditLog }) => {
    const detail = parsePermissionDetail(log);
    if (!detail) return <>{log.detalle || '-'}</>;
    return (
        <div className="space-y-3">
            <p className="text-sm font-semibold text-gray-800">Usuario afectado: <span className="text-indigo-700">{detail.usuarioAfectado || '-'}</span></p>
            <PermissionList title="Permisos agregados" permissions={detail.permisosAgregados} />
            <PermissionList title="Permisos quitados" permissions={detail.permisosQuitados} />
            <PermissionList title="Denegaciones agregadas" permissions={detail.denegacionesAgregadas} />
            <PermissionList title="Denegaciones quitadas" permissions={detail.denegacionesQuitadas} />
        </div>
    );
};

export default function AuditLogSettings({ refreshToken }: { refreshToken: number }) {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(false);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [action, setAction] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [user, setUser] = useState('');
    const [result, setResult] = useState<'' | 'EXITO' | 'FALLIDO'>('');
    const [requestId, setRequestId] = useState('');

    const loadLogs = useCallback(async (requestedPage = 1, clearFilters = false) => {
        setLoading(true);
        try {
            const response = await auditService.getLogs({
                page: requestedPage,
                limit: PAGE_SIZE,
                accion: clearFilters ? undefined : action || undefined,
                fechaDesde: clearFilters ? undefined : dateFrom || undefined,
                fechaHasta: clearFilters ? undefined : dateTo || undefined,
                usuario: clearFilters ? undefined : user || undefined,
                resultado: clearFilters ? undefined : result || undefined,
                requestId: clearFilters ? undefined : requestId || undefined
            });
            setLogs(response.data);
            setTotal(response.meta.total);
            setPage(response.meta.page);
        } catch (error) {
            console.error('Error loading logs:', error);
        } finally {
            setLoading(false);
        }
    }, [action, dateFrom, dateTo, requestId, result, user]);

    useEffect(() => { void loadLogs(1); }, [refreshToken]); // Los filtros se aplican sólo al presionar Filtrar.

    const clearFilters = () => {
        setAction(''); setDateFrom(''); setDateTo(''); setUser(''); setResult(''); setRequestId('');
        void loadLogs(1, true);
    };

    return (
        <section className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-gray-100 p-6">
                <h2 className="flex items-center text-lg font-semibold text-gray-900"><ListBulletIcon className="mr-2 h-5 w-5 text-indigo-600" />Registro de Actividad (Auditoría)</h2>
            </div>
            <div className="flex flex-wrap items-end gap-4 border-b border-gray-100 bg-gray-50 p-4">
                <div className="min-w-[200px] flex-1"><label htmlFor="audit-action" className="mb-1 block text-xs font-bold uppercase text-content-muted">Acción (ej. CREAR_CONTRATO)</label><input id="audit-action" type="text" value={action} onChange={event => setAction(event.target.value.toUpperCase())} placeholder="Buscar por acción..." className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" /></div>
                <div className="min-w-[180px] flex-1"><label htmlFor="audit-user" className="mb-1 block text-xs font-bold uppercase text-content-muted">Usuario</label><input id="audit-user" type="text" value={user} onChange={event => setUser(event.target.value)} placeholder="Nombre o email" className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" /></div>
                <div className="min-w-[180px] flex-1"><label htmlFor="audit-request-id" className="mb-1 block text-xs font-bold uppercase text-content-muted">ID de solicitud</label><input id="audit-request-id" type="text" value={requestId} onChange={event => setRequestId(event.target.value.slice(0, 100))} placeholder="Rastrear una operación" className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" /></div>
                <div><label htmlFor="audit-result" className="mb-1 block text-xs font-bold uppercase text-content-muted">Resultado</label><AppSelect id="audit-result" ariaLabel="Filtrar auditoría por resultado" value={result} onChange={value => setResult(value as typeof result)} options={[{ value: '', label: 'Todos' }, { value: 'EXITO', label: 'Éxito' }, { value: 'FALLIDO', label: 'Fallido' }]} className="min-w-36" /></div>
                <div><label htmlFor="audit-date-from" className="mb-1 block text-xs font-bold uppercase text-content-muted">Desde</label><input id="audit-date-from" type="date" value={dateFrom} onChange={event => setDateFrom(event.target.value)} className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" /></div>
                <div><label htmlFor="audit-date-to" className="mb-1 block text-xs font-bold uppercase text-content-muted">Hasta</label><input id="audit-date-to" type="date" value={dateTo} onChange={event => setDateTo(event.target.value)} className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" /></div>
                <div className="flex gap-2"><button onClick={() => void loadLogs(1)} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-indigo-700">Filtrar</button><button onClick={clearFilters} className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-bold text-gray-600 hover:bg-gray-50">Limpiar</button></div>
            </div>
            <div className="divide-y divide-gray-100 2xl:hidden">
                {loading ? <div className="p-6 text-content-muted">Cargando auditoría...</div> : logs.length === 0 ? <div className="px-6 py-12 text-center italic text-gray-600">No se han registrado acciones críticas aún.</div> : logs.map(log => (
                    <article key={log.id} className="p-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-xs font-black uppercase tracking-wider text-indigo-700">{log.accion.replace(/_/g, ' ')}</p><h3 className="mt-1 text-sm font-bold text-gray-900">{log.usuario?.nombreCompleto || 'Sistema'}</h3></div><span className={`shrink-0 rounded-full px-2 py-1 text-xs font-bold ${log.resultado === 'FALLIDO' ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>{log.resultado === 'FALLIDO' ? 'Fallido' : 'Éxito'}</span></div><div className="mt-2 text-sm text-gray-600"><AuditDetail log={log} /></div>{log.entidadId && <p className="mt-1 text-xs text-gray-600">{log.entidad} #{log.entidadId}</p>}<p className="mt-2 break-all text-xs text-gray-600">IP: {log.ipAddress || '-'} · Solicitud: {log.requestId || '-'}</p></article>
                ))}
            </div>
            <table className="hidden w-full text-left 2xl:table">
                <thead className="border-b border-gray-100 bg-gray-50 text-xs font-semibold uppercase tracking-wider text-content-muted"><tr><th className="px-6 py-3">Acción</th><th className="px-6 py-3">Usuario</th><th className="px-6 py-3">Resultado</th><th className="px-6 py-3">Detalle</th><th className="px-6 py-3">Fecha</th></tr></thead>
                <tbody className="divide-y divide-gray-100 text-sm">
                    {loading ? <tr><td colSpan={5} className="px-6 py-12 text-center text-content-muted">Cargando auditoría...</td></tr> : logs.length === 0 ? <tr><td colSpan={5} className="px-6 py-12 text-center italic text-gray-600">No se han registrado acciones críticas aún.</td></tr> : logs.map(log => (
                        <tr key={log.id} className="hover:bg-gray-50"><td className="whitespace-nowrap px-6 py-4"><span className="rounded border border-indigo-100 bg-indigo-50 px-2 py-0.5 text-xs font-bold text-indigo-700">{log.accion.replace(/_/g, ' ')}</span></td><td className="px-6 py-4 font-medium text-gray-900">{log.usuario?.nombreCompleto || 'Sistema'}</td><td className="px-6 py-4"><span className={`rounded-full px-2 py-1 text-xs font-bold ${log.resultado === 'FALLIDO' ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>{log.resultado === 'FALLIDO' ? 'Fallido' : 'Éxito'}</span></td><td className="px-6 py-4 text-gray-600"><AuditDetail log={log} />{log.entidadId && <span className="ml-2 text-xs text-gray-600">({log.entidad} #{log.entidadId})</span>}<p className="mt-1 break-all text-xs text-gray-600">IP: {log.ipAddress || '-'} · Solicitud: {log.requestId || '-'}</p></td><td className="whitespace-nowrap px-6 py-4 text-content-muted">{formatDateTime(log.fechaCreacion)}</td></tr>
                    ))}
                </tbody>
            </table>
            <div className="flex flex-col gap-3 border-t border-gray-100 bg-gray-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm font-medium text-content-muted">Mostrando página <strong>{page}</strong> de {Math.max(1, Math.ceil(total / PAGE_SIZE))} <span className="mx-2">·</span>{total} registros en total</p>
                <div className="flex gap-2"><button onClick={() => void loadLogs(page - 1)} disabled={page <= 1 || loading} className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-bold text-gray-600 disabled:opacity-50">Anterior</button><button onClick={() => void loadLogs(page + 1)} disabled={page * PAGE_SIZE >= total || loading} className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-bold text-gray-600 disabled:opacity-50">Siguiente</button></div>
            </div>
        </section>
    );
}
