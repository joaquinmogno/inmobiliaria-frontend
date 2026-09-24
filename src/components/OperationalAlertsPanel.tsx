import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react';
import { BellAlertIcon, CheckCircleIcon, ClockIcon, UserCircleIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import AppSelect from './AppSelect';
import {
    alertasOperativasService,
    type AlertManagementStatus,
    type AlertNotificationChannel,
    type OperationalAlert,
    type OperationalAlertManagementInput,
    type AlertResponsible
} from '../services/alertas-operativas.service';
import { formatDate, formatDateTime } from '../utils/date';

type Draft = Omit<OperationalAlertManagementInput, 'clave'> & { observacion: string; destinatario: string; proximaRevision: string };

const statusLabels: Record<AlertManagementStatus, string> = {
    PENDIENTE: 'Pendiente',
    EN_SEGUIMIENTO: 'En seguimiento',
    RESUELTA: 'Gestión registrada como resuelta'
};

const initialDraft = (alert: OperationalAlert): Draft => ({
    responsableId: alert.gestion?.responsable?.id ?? null,
    estado: alert.gestion?.estado ?? 'PENDIENTE',
    observacion: '',
    canal: alert.gestion?.canal ?? 'INTERNO',
    destinatario: alert.gestion?.destinatario ?? '',
    proximaRevision: alert.gestion?.proximaRevision?.slice(0, 10) ?? ''
});

const managementTone: Record<AlertManagementStatus, string> = {
    PENDIENTE: 'bg-amber-100 text-amber-900',
    EN_SEGUIMIENTO: 'bg-blue-100 text-blue-900',
    RESUELTA: 'bg-emerald-100 text-emerald-900'
};

export default function OperationalAlertsPanel() {
    const [alerts, setAlerts] = useState<OperationalAlert[]>([]);
    const [responsibles, setResponsibles] = useState<AlertResponsible[]>([]);
    const [loading, setLoading] = useState(true);
    const [selected, setSelected] = useState<OperationalAlert | null>(null);
    const [draft, setDraft] = useState<Draft | null>(null);
    const [saving, setSaving] = useState(false);

    const load = async () => {
        setLoading(true);
        try {
            const [nextAlerts, nextResponsibles] = await Promise.all([
                alertasOperativasService.getAll(),
                alertasOperativasService.getResponsibles()
            ]);
            setAlerts(nextAlerts);
            setResponsibles(nextResponsibles);
        } catch (error) {
            console.error('Error loading operational alerts:', error);
            toast.error('No se pudieron cargar las alertas operativas');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { void load(); }, []);

    const openManagement = (alert: OperationalAlert) => {
        setSelected(alert);
        setDraft(initialDraft(alert));
    };

    const closeManagement = () => {
        if (saving) return;
        setSelected(null);
        setDraft(null);
    };

    const save = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!selected || !draft) return;
        setSaving(true);
        try {
            await alertasOperativasService.saveManagement({
                clave: selected.clave,
                responsableId: draft.responsableId,
                estado: draft.estado,
                observacion: draft.observacion.trim() || undefined,
                canal: draft.canal,
                destinatario: draft.destinatario.trim() || undefined,
                proximaRevision: draft.proximaRevision || null
            });
            toast.success('Gestión registrada; no se envió ningún mensaje');
            closeManagement();
            await load();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'No se pudo registrar la gestión');
        } finally {
            setSaving(false);
        }
    };

    const notificationDraftUrl = () => {
        if (!selected || !draft?.destinatario) return null;
        const message = `${selected.titulo}: ${selected.cantidad} caso(s). ${selected.descripcion}`;
        if (draft.canal === 'EMAIL') return `mailto:${encodeURIComponent(draft.destinatario)}?subject=${encodeURIComponent(`[PropControl] ${selected.titulo}`)}&body=${encodeURIComponent(message)}`;
        if (draft.canal === 'WHATSAPP') return `https://wa.me/${draft.destinatario.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
        return null;
    };

    return <section id="alertas-operativas" aria-labelledby="operational-alerts-title" className="rounded-2xl border border-indigo-100 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
                <div className="flex items-center gap-2"><BellAlertIcon className="h-5 w-5 text-indigo-700" /><h2 id="operational-alerts-title" className="text-lg font-bold text-gray-950">Alertas y seguimiento operativo</h2></div>
                <p className="mt-1 text-sm text-content-muted">Asigná un responsable, dejá una nota y conservá el historial de cada prioridad.</p>
            </div>
            <button type="button" onClick={() => void load()} className="min-h-11 rounded-xl bg-gray-100 px-4 text-sm font-bold text-gray-800 hover:bg-gray-200">Actualizar</button>
        </div>

        {loading ? <p className="py-10 text-center text-sm font-semibold text-gray-700">Cargando alertas…</p>
            : alerts.length === 0 ? <div className="mt-4 rounded-xl border border-dashed border-gray-300 bg-gray-50 p-5 text-center"><CheckCircleIcon className="mx-auto h-8 w-8 text-emerald-600" /><p className="mt-2 text-sm font-bold text-gray-800">No hay alertas operativas activas.</p></div>
                : <div className="mt-4 grid gap-3 lg:grid-cols-2">
                    {alerts.map(alert => <article key={alert.clave} className={`rounded-xl border p-4 ${alert.prioridad === 'ALTA' ? 'border-red-200 bg-red-50/60' : 'border-gray-200 bg-gray-50'}`}>
                        <div className="flex items-start justify-between gap-3">
                            <div><p className="text-2xl font-black text-gray-950">{alert.cantidad}</p><h3 className="mt-1 font-bold text-gray-950">{alert.titulo}</h3></div>
                            <span className={`rounded-full px-2.5 py-1 text-xs font-black ${alert.prioridad === 'ALTA' ? 'bg-red-200 text-red-900' : 'bg-indigo-100 text-indigo-900'}`}>{alert.prioridad === 'ALTA' ? 'Prioridad alta' : 'Prioridad media'}</span>
                        </div>
                        <p className="mt-2 text-sm text-gray-700">{alert.descripcion}</p>
                        {alert.gestion && <div className="mt-3 rounded-lg border border-white/80 bg-white/75 p-3 text-sm">
                            <div className="flex flex-wrap items-center gap-2"><span className={`rounded-full px-2 py-0.5 text-xs font-bold ${managementTone[alert.gestion.estado]}`}>{statusLabels[alert.gestion.estado]}</span>{alert.gestion.responsable && <span className="inline-flex items-center gap-1 text-xs font-semibold text-gray-700"><UserCircleIcon className="h-4 w-4" />{alert.gestion.responsable.nombreCompleto}</span>}</div>
                            {alert.gestion.proximaRevision && <p className="mt-2 text-xs text-gray-700">Próxima revisión: {formatDate(alert.gestion.proximaRevision)}</p>}
                            {alert.gestion.registros[0] && <p className="mt-2 line-clamp-2 text-xs text-gray-600">Última gestión: {alert.gestion.registros[0].observacion || statusLabels[alert.gestion.registros[0].estado]} · {alert.gestion.registros[0].usuario.nombreCompleto}</p>}
                        </div>}
                        <div className="mt-4 flex flex-wrap gap-2">
                            <Link to={alert.enlace} className="inline-flex min-h-11 items-center rounded-xl bg-indigo-700 px-4 text-sm font-bold text-white hover:bg-indigo-800">Ver casos filtrados</Link>
                            <button type="button" onClick={() => openManagement(alert)} className="inline-flex min-h-11 items-center rounded-xl border border-gray-300 bg-white px-4 text-sm font-bold text-gray-800 hover:bg-gray-100">{alert.gestion ? 'Actualizar gestión' : 'Asignar y registrar'}</button>
                        </div>
                    </article>)}
                </div>}

        <Dialog open={Boolean(selected && draft)} onClose={closeManagement} className="relative z-50">
            <DialogBackdrop className="fixed inset-0 bg-slate-950/55 backdrop-blur-sm" />
            <div className="fixed inset-0 overflow-y-auto p-3 sm:p-6"><div className="flex min-h-full items-center justify-center"><DialogPanel className="w-full max-w-2xl rounded-2xl bg-white p-5 shadow-2xl sm:p-7">
                {selected && draft && <form onSubmit={save} className="space-y-5">
                    <div className="flex items-start justify-between gap-4"><div><DialogTitle className="text-xl font-bold text-gray-950">Gestionar: {selected.titulo}</DialogTitle><p className="mt-1 text-sm text-gray-600">La alerta permanece visible mientras la condición operativa siga activa.</p></div><button type="button" onClick={closeManagement} aria-label="Cerrar" className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-gray-700 hover:bg-gray-100"><XMarkIcon className="h-6 w-6" /></button></div>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <label className="block text-sm font-semibold text-gray-800">Responsable<AppSelect ariaLabel="Responsable de la alerta" value={draft.responsableId ? String(draft.responsableId) : ''} onChange={value => {
                            const responsible = responsibles.find(item => item.id === Number(value));
                            setDraft(current => current ? { ...current, responsableId: value ? Number(value) : null, destinatario: current.canal === 'EMAIL' && !current.destinatario ? responsible?.email || '' : current.destinatario } : current);
                        }} options={[{ value: '', label: 'Sin asignar' }, ...responsibles.map(person => ({ value: String(person.id), label: person.nombreCompleto }))]} className="mt-1 w-full" /></label>
                        <label className="block text-sm font-semibold text-gray-800">Estado<AppSelect ariaLabel="Estado de gestión" value={draft.estado} onChange={value => setDraft(current => current ? { ...current, estado: value as AlertManagementStatus } : current)} options={Object.entries(statusLabels).map(([value, label]) => ({ value, label }))} className="mt-1 w-full" /></label>
                        <label className="block text-sm font-semibold text-gray-800">Próxima revisión (registro manual)<input type="date" value={draft.proximaRevision} onChange={event => setDraft(current => current ? { ...current, proximaRevision: event.target.value } : current)} className="mt-1 min-h-11 w-full rounded-lg border border-gray-300 px-3" /></label>
                        <label className="block text-sm font-semibold text-gray-800">Canal de gestión<AppSelect ariaLabel="Canal de gestión" value={draft.canal} onChange={value => setDraft(current => current ? { ...current, canal: value as AlertNotificationChannel } : current)} options={[{ value: 'INTERNO', label: 'Registro interno' }, { value: 'EMAIL', label: 'Borrador manual por email' }, { value: 'WHATSAPP', label: 'Borrador manual por WhatsApp' }]} className="mt-1 w-full" /></label>
                        {draft.canal !== 'INTERNO' && <label className="block text-sm font-semibold text-gray-800 sm:col-span-2">{draft.canal === 'EMAIL' ? 'Email para el borrador manual' : 'Teléfono para el borrador de WhatsApp'}<input required type={draft.canal === 'EMAIL' ? 'email' : 'tel'} value={draft.destinatario} onChange={event => setDraft(current => current ? { ...current, destinatario: event.target.value } : current)} className="mt-1 min-h-11 w-full rounded-lg border border-gray-300 px-3" placeholder={draft.canal === 'EMAIL' ? 'operaciones@ejemplo.com' : '+5491112345678'} /></label>}
                        <label className="block text-sm font-semibold text-gray-800 sm:col-span-2">Registro de gestión<textarea value={draft.observacion} maxLength={2000} onChange={event => setDraft(current => current ? { ...current, observacion: event.target.value } : current)} rows={3} placeholder="Ej.: se contactó al inquilino y se acordó fecha de pago." className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2" /></label>
                    </div>
                    <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-950">Esta pantalla no programa avisos ni envía email o WhatsApp. “Abrir borrador” sólo abre tu cliente de correo o WhatsApp para que revises y envíes el mensaje manualmente.</p>
                    {selected.gestion?.registros.length ? <div className="rounded-xl bg-gray-50 p-4"><p className="font-bold text-gray-900">Historial reciente</p><div className="mt-3 space-y-2">{selected.gestion.registros.map(record => <p key={record.id} className="text-sm text-gray-700"><ClockIcon className="mr-1 inline h-4 w-4" />{formatDateTime(record.fechaCreacion)} · {record.usuario.nombreCompleto}: {record.observacion || statusLabels[record.estado]}</p>)}</div></div> : null}
                    <div className="flex flex-wrap justify-end gap-3 border-t border-gray-100 pt-4"><button type="button" onClick={closeManagement} className="min-h-11 rounded-xl px-4 font-semibold text-gray-700 hover:bg-gray-100">Cancelar</button>{notificationDraftUrl() && <a href={notificationDraftUrl()!} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center rounded-xl border border-indigo-300 px-4 text-sm font-bold text-indigo-800 hover:bg-indigo-50">Abrir borrador manual</a>}<button disabled={saving} className="min-h-11 rounded-xl bg-indigo-700 px-5 font-bold text-white hover:bg-indigo-800 disabled:opacity-50">{saving ? 'Guardando…' : 'Guardar gestión'}</button></div>
                </form>}
            </DialogPanel></div></div>
        </Dialog>
    </section>;
}
