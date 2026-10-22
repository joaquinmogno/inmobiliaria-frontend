import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { contractsService, type KeyDeliveryForm, type RescissionAct, type RescissionContext, type RescissionForm } from '../services/contracts.service';
import { openAuthenticatedFile, openAuthenticatedPdf } from '../services/api';
import { todayDateInput } from '../utils/date';
import { formatCurrency } from '../utils/currency';
import { useAuth } from '../context/AuthContext';
import { hasPermission } from '../utils/permissions';

type Preview = {
    contrato: RescissionContext['contrato'];
    declaracion: RescissionForm;
    saldosRegistrados: RescissionContext['saldosRegistrados'];
    wording: { title: string; introduction: string; reason: string; delivery: string; financial: string; closing: string };
};

const initialForm = (context: RescissionContext): RescissionForm => ({
    tipoCierre: context.contrato.fechaEntregaLlaves && context.contrato.fechaEntregaLlaves >= context.contrato.fechaFin ? 'VENCIMIENTO_ACORDADO' : 'ANTICIPADA_INQUILINO',
    sinReclamosConfirmado: false, serviciosSaldadosConfirmados: false, depositoResueltoConfirmado: false,
    motivo: '', fechaRescision: context.contrato.fechaEntregaLlaves || todayDateInput(), llavesEntregadas: Boolean(context.contrato.fechaEntregaLlaves),
    fechaEntregaLlaves: context.contrato.fechaEntregaLlaves || '', cantidadLlaves: context.actasLlaves[0]?.datos.entrega.cantidadLlaves || 0,
    estadoInmueble: context.actasLlaves[0]?.datos.entrega.estadoInmueble || '', observaciones: '',
    multaImporte: 0, multaResponsable: null, depositoADevolver: 0, depositoRetenido: 0,
    motivoRetencion: '', pendientesManuales: [], version: context.contrato.version
});

const initialKeys = (context: RescissionContext): KeyDeliveryForm => ({
    fechaEntregaLlaves: todayDateInput(), horaEntrega: null, cantidadLlaves: 1, receptorNombre: '',
    estadoInmueble: '', observaciones: '', inmuebleDesocupado: false, version: context.contrato.version
});

const section = 'rounded-2xl border border-gray-200 bg-white p-5 shadow-sm';
const inputClass = 'w-full rounded-xl border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-100';
const labelClass = 'block space-y-1 text-sm font-semibold text-gray-700';

export default function RescisionContrato() {
    const contractId = Number(useParams().id);
    const { user } = useAuth();
    const canEdit = hasPermission(user, 'contratos.editar');
    const canViewFiles = hasPermission(user, 'contratos.archivos.ver');
    const [context, setContext] = useState<RescissionContext | null>(null);
    const [latestAct, setLatestAct] = useState<RescissionAct | null>(null);
    const [form, setForm] = useState<RescissionForm | null>(null);
    const [keys, setKeys] = useState<KeyDeliveryForm | null>(null);
    const [keyPreview, setKeyPreview] = useState<{ snapshot: { entrega: KeyDeliveryForm }; vistaPreviaHash: string } | null>(null);
    const [preview, setPreview] = useState<Preview | null>(null);
    const [previewHash, setPreviewHash] = useState<string | null>(null);
    const [revision, setRevision] = useState(false);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');

    const load = async (resetForm = false) => {
        const next = await contractsService.getRescissionContext(contractId);
        setContext(next);
        setLatestAct(next.actas.length ? await contractsService.getRescissionAct(contractId, next.actas[0].version) : null);
        if (resetForm) { setForm(initialForm(next)); setKeys(initialKeys(next)); }
        return next;
    };

    useEffect(() => {
        if (!Number.isInteger(contractId) || contractId <= 0) { setError('Contrato inválido'); setLoading(false); return; }
        load(true).catch(err => setError(err instanceof Error ? err.message : 'No se pudo cargar el contrato')).finally(() => setLoading(false));
    }, [contractId]);

    const change = <K extends keyof RescissionForm>(key: K, value: RescissionForm[K]) => {
        setForm(current => current ? { ...current, [key]: value } : current);
        setPreview(null); setPreviewHash(null); setError('');
    };

    const changeKeys = <K extends keyof KeyDeliveryForm>(key: K, value: KeyDeliveryForm[K]) => {
        setKeys(current => current ? { ...current, [key]: value } : current);
        setKeyPreview(null); setError('');
    };

    const showKeyPreview = async () => {
        if (!keys) return;
        setBusy(true); setError('');
        try { setKeyPreview(await contractsService.previewKeyDelivery(contractId, keys) as { snapshot: { entrega: KeyDeliveryForm }; vistaPreviaHash: string }); }
        catch (err) { setError(err instanceof Error ? err.message : 'Revisá los datos de entrega'); }
        finally { setBusy(false); }
    };

    const confirmKeys = async () => {
        if (!keys || !keyPreview) return;
        setBusy(true); setError('');
        try {
            await contractsService.deliverKeys(contractId, { ...keys, vistaPreviaHash: keyPreview.vistaPreviaHash });
            await load(true); setKeyPreview(null);
            toast.success('Acta de entrega de llaves emitida; propiedad disponible');
        } catch (err) { setKeyPreview(null); setError(err instanceof Error ? err.message : 'No se pudo registrar la entrega'); }
        finally { setBusy(false); }
    };

    const loadLatestForRevision = async () => {
        if (!context?.actas.length) return;
        setBusy(true);
        try {
            const act = await contractsService.getRescissionAct(contractId, context.actas[0].version);
            const d = act.datos.declaracion;
            setForm({ ...initialForm(context), ...d,
                multaImporte: Number(d.multaImporte), depositoADevolver: Number(d.depositoADevolver), depositoRetenido: Number(d.depositoRetenido),
                pendientesManuales: d.pendientesManuales.map(item => ({ ...item, importe: Number(item.importe) })),
                version: context.contrato.version, motivoRevision: '' });
            setRevision(true); setPreview(null); setPreviewHash(null);
        } catch (err) { setError(err instanceof Error ? err.message : 'No se pudo cargar la última versión'); }
        finally { setBusy(false); }
    };

    const showPreview = async () => {
        if (!form) return;
        setBusy(true); setError('');
        try {
            const response = await contractsService.previewRescission(contractId, form);
            setPreview({ ...(response.snapshot as Omit<Preview, 'wording'>), wording: response.wording });
            setPreviewHash(response.vistaPreviaHash);
        } catch (err) { setError(err instanceof Error ? err.message : 'Revisá los datos del acta'); }
        finally { setBusy(false); }
    };

    const confirm = async () => {
        if (!form || !previewHash) return;
        if (revision && !form.motivoRevision?.trim()) { setError('Explicá por qué emitís una nueva versión'); return; }
        setBusy(true); setError('');
        try {
            const result = revision
                ? await contractsService.revisarActaRescision(contractId, { ...form, vistaPreviaHash: previewHash })
                : await contractsService.rescindir(contractId, { ...form, vistaPreviaHash: previewHash });
            await load(true);
            setPreview(null); setPreviewHash(null); setRevision(false);
            toast.success(`Acta de cierre sin reclamos v${result.actaVersion} emitida`);
        } catch (err) {
            setPreview(null); setPreviewHash(null);
            setError(err instanceof Error ? err.message : 'No se pudo confirmar el acta');
        } finally { setBusy(false); }
    };

    const uploadSigned = async (version: number, file?: File) => {
        if (!file) return;
        setBusy(true);
        try { await contractsService.adjuntarActaFirmada(contractId, version, file); await load(); toast.success('Copia firmada adjuntada'); }
        catch (err) { setError(err instanceof Error ? err.message : 'No se pudo adjuntar la copia'); }
        finally { setBusy(false); }
    };

    const uploadSignedKeys = async (version: number, file?: File) => {
        if (!file) return;
        setBusy(true);
        try { await contractsService.attachSignedKeyAct(contractId, version, file); await load(); toast.success('Copia firmada del acta de llaves adjuntada'); }
        catch (err) { setError(err instanceof Error ? err.message : 'No se pudo adjuntar la copia'); }
        finally { setBusy(false); }
    };

    if (loading) return <div className="p-8 text-gray-600">Cargando rescisión…</div>;
    if (!context || !form) return <div className="p-8 text-red-700">{error || 'Contrato no encontrado'}</div>;
    const { contrato, saldosRegistrados } = context;
    const hasKeys = Boolean(contrato.fechaEntregaLlaves && context.actasLlaves.length);
    const hasClosure = context.actas.length > 0;
    const isEditable = canEdit && hasKeys && (revision || !hasClosure);

    return <div className="mx-auto max-w-7xl space-y-5 pb-12">
        <div className="flex flex-wrap items-start justify-between gap-3">
            <div><Link to="/contratos" className="text-sm font-semibold text-orange-700 hover:underline">← Contratos</Link>
                <h1 className="mt-2 text-2xl font-bold text-gray-900">{hasClosure ? 'Cierre definitivo' : hasKeys ? 'Liquidación final y cierre pendiente' : 'Entrega de llaves'} · {contrato.direccion}</h1>
                <p className="mt-1 text-sm text-gray-600">Contrato #{contrato.id} · {contrato.fechaInicio} al {contrato.fechaFin} · {contrato.moneda}</p></div>
            {hasClosure && canEdit && !revision && <button type="button" onClick={loadLatestForRevision} disabled={busy} className="rounded-xl bg-orange-600 px-4 py-2 text-sm font-bold text-white hover:bg-orange-700">Emitir nueva versión del cierre</button>}
        </div>
        <section className={section}>
            <h2 className="font-bold text-gray-900">Datos del contrato</h2>
            <div className="mt-3 grid gap-2 text-sm text-gray-700 sm:grid-cols-2">
                <p><strong>Inmueble:</strong> {contrato.direccion}{contrato.piso && ` · Piso ${contrato.piso}`}{contrato.departamento && ` · Depto. ${contrato.departamento}`}</p>
                <p><strong>Vigencia:</strong> {contrato.fechaInicio} al {contrato.fechaFin}</p>
                <p><strong>Propietario/s:</strong> {contrato.propietarios.map(p => `${p.nombre}${p.dni ? ` (DNI ${p.dni})` : ''}`).join(', ')}</p>
                <p><strong>Inquilino/s:</strong> {contrato.inquilinos.map(p => `${p.nombre}${p.dni ? ` (DNI ${p.dni})` : ''}`).join(', ')}</p>
            </div>
            <p className="mt-3 rounded-lg bg-orange-50 px-3 py-2 text-sm text-orange-900">{hasKeys ? `Llaves entregadas el ${contrato.fechaEntregaLlaves}. La propiedad está disponible; el alquiler deja de devengarse desde la entrega.` : 'Llaves pendientes: el inmueble no se muestra como disponible.'}</p>
        </section>
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(300px,1fr)]">
            <div className="space-y-5">
                {!hasKeys && canEdit && keys && ['ACTIVO', 'FINALIZADO'].includes(contrato.estado) && <section className={section}>
                    <h2 className="text-lg font-bold text-gray-900">1. Registrar entrega de llaves</h2>
                    <p className="mt-1 text-sm text-gray-600">Se emite un acta independiente. La propiedad quedará disponible desde esta entrega; los importes finales se resolverán después.</p>
                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                        <label className={labelClass}>Fecha de entrega *<input type="date" className={inputClass} min={contrato.fechaInicio} max={todayDateInput()} value={keys.fechaEntregaLlaves} onChange={e => changeKeys('fechaEntregaLlaves', e.target.value)} /></label>
                        <label className={labelClass}>Hora de entrega<input type="time" className={inputClass} value={keys.horaEntrega || ''} onChange={e => changeKeys('horaEntrega', e.target.value || null)} /></label>
                        <label className={labelClass}>Cantidad de llaves *<input type="number" min="1" max="100" className={inputClass} value={keys.cantidadLlaves} onChange={e => changeKeys('cantidadLlaves', Number(e.target.value))} /></label>
                        <label className={labelClass}>Quién recibe las llaves *<input className={inputClass} maxLength={200} value={keys.receptorNombre} onChange={e => changeKeys('receptorNombre', e.target.value)} /></label>
                        <label className={`${labelClass} sm:col-span-2`}>Estado del inmueble *<textarea className={inputClass} rows={2} maxLength={2000} value={keys.estadoInmueble} onChange={e => changeKeys('estadoInmueble', e.target.value)} /></label>
                        <label className={`${labelClass} sm:col-span-2`}>Observaciones<textarea className={inputClass} rows={2} maxLength={4000} value={keys.observaciones || ''} onChange={e => changeKeys('observaciones', e.target.value)} /></label>
                    </div>
                    <label className="mt-4 flex items-start gap-2 text-sm text-gray-800"><input type="checkbox" checked={keys.inmuebleDesocupado} onChange={e => changeKeys('inmuebleDesocupado', e.target.checked)} /> Confirmo que el inmueble fue entregado desocupado.</label>
                    <button type="button" disabled={busy} onClick={showKeyPreview} className="mt-4 rounded-xl bg-orange-600 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50">Revisar acta de llaves</button>
                    {keyPreview && <div className="mt-4 rounded-xl border border-orange-200 bg-orange-50 p-4 text-sm"><h3 className="font-bold">Vista previa · entrega de llaves</h3><p className="mt-2">{contrato.direccion} · {keyPreview.snapshot.entrega.fechaEntregaLlaves}{keyPreview.snapshot.entrega.horaEntrega ? ` ${keyPreview.snapshot.entrega.horaEntrega} hs` : ''} · {keyPreview.snapshot.entrega.cantidadLlaves} llaves</p><p>Recibe: {keyPreview.snapshot.entrega.receptorNombre}. Estado: {keyPreview.snapshot.entrega.estadoInmueble}.</p><p className="mt-2 font-semibold">Esto no cancela deudas ni registra pagos.</p><button type="button" disabled={busy} onClick={confirmKeys} className="mt-4 rounded-xl bg-emerald-700 px-5 py-2.5 font-bold text-white disabled:opacity-50">Confirmar entrega y emitir PDF</button></div>}
                </section>}
                {isEditable && <section className={section}>
                    <h2 className="text-lg font-bold text-gray-900">3. Preparar cierre sin reclamos</h2>
                    <p className="mt-1 text-sm text-gray-600">La entrega de llaves ya está documentada. La liquidación final puede haberse preparado antes o después; los servicios y el depósito pueden resolverse meses después.</p>
                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                        <label className={labelClass}>Tipo de cierre<select className={inputClass} value={form.tipoCierre} disabled><option value="ANTICIPADA_INQUILINO">Anticipada por decisión del inquilino</option><option value="VENCIMIENTO_ACORDADO">Fin de contrato por acuerdo</option></select></label>
                        <p className="self-center text-sm text-gray-700">Entrega de llaves: {contrato.fechaEntregaLlaves} · {form.cantidadLlaves} llaves</p>
                        <label className={`${labelClass} sm:col-span-2`}>Motivo de rescisión *<textarea className={inputClass} rows={2} maxLength={1000} value={form.motivo} onChange={e => change('motivo', e.target.value)} /></label>
                        <p className="sm:col-span-2 text-sm text-gray-700">Estado al entregar: {form.estadoInmueble}</p>
                        <label className={`${labelClass} sm:col-span-2`}>Observaciones<textarea className={inputClass} rows={2} maxLength={4000} value={form.observaciones || ''} onChange={e => change('observaciones', e.target.value)} /></label>
                        {revision && <label className={`${labelClass} sm:col-span-2`}>Motivo de la nueva versión *<textarea className={inputClass} maxLength={1000} value={form.motivoRevision || ''} onChange={e => change('motivoRevision', e.target.value)} /></label>}
                    </div>
                    <h3 className="mt-6 font-bold text-gray-900">Importes acordados / informados manualmente</h3>
                    <p className="mt-1 text-xs text-gray-600">Estos importes quedan documentados; no generan caja ni cancelan deudas. Los saldos de liquidaciones figuran aparte.</p>
                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                        <label className={labelClass}>Multa acordada y saldada<input type="number" min="0" step="0.01" className={inputClass} value={form.multaImporte} onChange={e => change('multaImporte', Number(e.target.value))} /></label>
                        <label className={labelClass}>A cargo de<select className={inputClass} value={form.multaResponsable || ''} onChange={e => change('multaResponsable', e.target.value ? e.target.value as 'INQUILINO' | 'PROPIETARIO' : null)}><option value="">No corresponde</option><option value="INQUILINO">Inquilino</option><option value="PROPIETARIO">Propietario</option></select></label>
                        <label className={labelClass}>Depósito efectivamente devuelto<input type="number" min="0" step="0.01" className={inputClass} value={form.depositoADevolver} onChange={e => change('depositoADevolver', Number(e.target.value))} /></label>
                        <label className={labelClass}>Depósito retenido<input type="number" min="0" step="0.01" className={inputClass} value={form.depositoRetenido} onChange={e => change('depositoRetenido', Number(e.target.value))} /></label>
                        {form.depositoRetenido > 0 && <label className={`${labelClass} sm:col-span-2`}>Motivo de retención *<textarea className={inputClass} value={form.motivoRetencion || ''} onChange={e => change('motivoRetencion', e.target.value)} /></label>}
                    </div>
                    <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">Si falta cobrar alquiler, servicios, expensas o una multa, registralo en la liquidación final o mediante un ajuste. Si el propietario aplica el depósito a un saldo, registrá manualmente el ajuste correspondiente y explicá el acuerdo en observaciones; no se crea un cobro en caja. No emitas este cierre mientras haya importes pendientes.</div>
                    <div className="mt-4 space-y-2 text-sm">
                        <label className="flex gap-2"><input type="checkbox" checked={form.serviciosSaldadosConfirmados} onChange={e => change('serviciosSaldadosConfirmados', e.target.checked)} /> Confirmo que llegaron y se resolvieron todas las facturas de servicios y expensas.</label>
                        <label className="flex gap-2"><input type="checkbox" checked={form.depositoResueltoConfirmado} onChange={e => change('depositoResueltoConfirmado', e.target.checked)} /> Confirmo que se resolvió la devolución o retención del depósito y cualquier multa.</label>
                        <label className="flex gap-2 font-bold"><input type="checkbox" checked={form.sinReclamosConfirmado} onChange={e => change('sinReclamosConfirmado', e.target.checked)} /> Las partes confirmaron que nada tienen que reclamarse a futuro por este contrato.</label>
                    </div>
                    {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
                    <div className="mt-5 flex flex-wrap gap-3"><button type="button" disabled={busy} onClick={showPreview} className="rounded-xl bg-orange-600 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50">{busy ? 'Procesando…' : 'Revisar vista previa'}</button>{revision && <button type="button" onClick={() => { setRevision(false); setPreview(null); }} className="rounded-xl border border-gray-300 px-5 py-2.5 text-sm">Cancelar revisión</button>}</div>
                </section>}
                {preview && <section className={`${section} border-orange-300 bg-orange-50`}>
                    <h2 className="text-lg font-bold">Vista previa del acta {revision ? `v${context.actas[0].version + 1}` : 'v1'}</h2>
                    <div className="mt-3 space-y-2 rounded-xl border border-orange-200 bg-white p-4 text-sm leading-relaxed">
                        <h3 className="text-center font-bold">{preview.wording.title}</h3>
                        <p>{preview.wording.introduction}</p><p>{preview.wording.reason}</p><p>{preview.wording.delivery}</p><p>{preview.wording.financial}</p><p className="font-bold">{preview.wording.closing}</p>
                    </div>
                    <p className="mt-2 text-sm">{preview.contrato.direccion} · Propietario: {preview.contrato.propietarios.map(p => p.nombre).join(', ')} · Inquilino: {preview.contrato.inquilinos.map(p => p.nombre).join(', ')}</p>
                    <p className="mt-2 text-sm">Rescisión: {preview.declaracion.fechaRescision} · Llaves: {preview.declaracion.llavesEntregadas ? `entregadas el ${preview.declaracion.fechaEntregaLlaves} (${preview.declaracion.cantidadLlaves})` : 'PENDIENTES'}</p>
                    <p className="mt-2 text-sm">Motivo: {preview.declaracion.motivo} · Estado del inmueble: {preview.declaracion.estadoInmueble}</p>
                    {preview.declaracion.motivoRevision && <p className="mt-2 text-sm">Motivo de nueva versión: {preview.declaracion.motivoRevision}</p>}
                    <p className="mt-2 text-sm">Multa: {formatCurrency(Number(preview.declaracion.multaImporte), contrato.moneda)} · Depósito a devolver: {formatCurrency(Number(preview.declaracion.depositoADevolver), contrato.moneda)} · Retenido: {formatCurrency(Number(preview.declaracion.depositoRetenido), contrato.moneda)}</p>
                    <p className="mt-2 text-sm">Observaciones: {preview.declaracion.observaciones || 'Sin observaciones'}</p>
                    {preview.declaracion.motivoRetencion && <p className="mt-2 text-sm">Motivo de retención: {preview.declaracion.motivoRetencion}</p>}
                    <h3 className="mt-4 font-bold">Importes informados manualmente</h3>
                    {preview.declaracion.pendientesManuales.length === 0 ? <p className="text-sm">Sin conceptos adicionales.</p> : preview.declaracion.pendientesManuales.map((item, index) => <p key={index} className="text-sm">{item.tipo} · {item.concepto} · {item.responsable}: {formatCurrency(Number(item.importe), contrato.moneda)}</p>)}
                    <h3 className="mt-4 font-bold">Saldos registrados por la app al emitir</h3>
                    {preview.saldosRegistrados.cobrosPendientesInquilino.map(item => <p key={`c${item.liquidacionId}`} className="text-sm">Cobro liquidación #{item.liquidacionId}: {formatCurrency(Number(item.saldo), item.moneda)}</p>)}
                    {preview.saldosRegistrados.pagosPendientesPropietario.map(item => <p key={`p${item.liquidacionId}`} className="text-sm">Pago al propietario liquidación #{item.liquidacionId}: {formatCurrency(Number(item.saldo), item.moneda)}</p>)}
                    <p className="text-sm">Cuotas pendientes: {preview.saldosRegistrados.cuotasPendientes}</p>
                    {preview.saldosRegistrados.saldosAFavorInquilino.map(item => <p key={item.creditoId} className="text-sm">Crédito a favor del inquilino #{item.creditoId}: {formatCurrency(Number(item.saldo), item.moneda)}</p>)}
                    <p className="mt-3 text-xs text-gray-700">Si cualquiera de estos datos cambia antes de emitir, se deberá revisar una nueva vista previa.</p>
                    <button type="button" disabled={busy} onClick={confirm} className="mt-4 rounded-xl bg-emerald-700 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50">{busy ? 'Emitiendo…' : revision ? 'Confirmar nueva versión' : 'Emitir cierre definitivo sin reclamos'}</button>
                </section>}
            </div>
            <div className="space-y-5">
                {!hasClosure && <section className={section}>
                    <h2 className="font-bold text-gray-900">2. Liquidación final</h2>
                    <p className="mt-2 text-sm text-gray-700">Podés prepararla antes o después de entregar las llaves. El alquiler de los últimos días se ingresa manualmente; no se divide automáticamente por 30 ni por los días del mes. Los servicios que lleguen después se incorporan mediante conceptos o ajustes, sin crear dinero en caja.</p>
                    <Link to={`/liquidaciones/contrato/${contractId}`} className="mt-3 inline-block text-sm font-bold text-orange-700 underline">Abrir meses y liquidación final</Link>
                </section>}
                <section className={section}>
                    <h2 className="font-bold text-gray-900">Saldos registrados por la app</h2><p className="mt-1 text-xs text-gray-600">Se actualizan con cobros y pagos reales durante el cierre financiero, incluso después de entregar las llaves. El acta definitiva conserva la foto de su fecha de emisión.</p>
                    <div className="mt-3 space-y-2 text-sm">
                        {saldosRegistrados.cobrosPendientesInquilino.map(item => <p key={`c${item.liquidacionId}`} className="rounded-lg bg-amber-50 p-2">Inquilino · <Link className="underline" to={`/liquidaciones/${item.liquidacionId}`}>Liquidación {item.periodo.slice(0, 7)}</Link>: {formatCurrency(Number(item.saldo), item.moneda)}</p>)}
                        {saldosRegistrados.pagosPendientesPropietario.map(item => <p key={`p${item.liquidacionId}`} className="rounded-lg bg-blue-50 p-2">Propietario · <Link className="underline" to={`/liquidaciones/${item.liquidacionId}`}>Liquidación {item.periodo.slice(0, 7)}</Link>: {formatCurrency(Number(item.saldo), item.moneda)}</p>)}
                        <p>Cuotas pendientes: {saldosRegistrados.cuotasPendientes}</p>
                        {saldosRegistrados.saldosAFavorInquilino.map(item => <p key={item.creditoId}>Crédito a favor del inquilino #{item.creditoId}: {formatCurrency(Number(item.saldo), item.moneda)}</p>)}
                        {!saldosRegistrados.cobrosPendientesInquilino.length && !saldosRegistrados.pagosPendientesPropietario.length && !saldosRegistrados.saldosAFavorInquilino.length && !saldosRegistrados.cuotasPendientes && <p>Sin saldos registrados pendientes.</p>}
                    </div>
                </section>
                {latestAct && <section className={section}>
                    <h2 className="font-bold text-gray-900">Importes informados en el acta vigente (v{latestAct.version})</h2>
                    <p className="mt-1 text-xs text-gray-600">Son constancias manuales; no se concilian automáticamente con los cobros o pagos. Registrá cada operación real por separado.</p>
                    <div className="mt-3 space-y-1 text-sm">
                        <p>Multa: {formatCurrency(Number(latestAct.datos.declaracion.multaImporte), contrato.moneda)}{latestAct.datos.declaracion.multaResponsable && ` · a cargo de ${latestAct.datos.declaracion.multaResponsable.toLowerCase()}`}</p>
                        <p>Depósito a devolver: {formatCurrency(Number(latestAct.datos.declaracion.depositoADevolver), contrato.moneda)}</p>
                        <p>Depósito retenido: {formatCurrency(Number(latestAct.datos.declaracion.depositoRetenido), contrato.moneda)}</p>
                        {latestAct.datos.declaracion.pendientesManuales.map((item, index) => <p key={index}>{item.tipo} · {item.concepto} · {item.responsable}: {formatCurrency(Number(item.importe), contrato.moneda)}</p>)}
                    </div>
                </section>}
                <section className={section}><h2 className="font-bold text-gray-900">Liquidaciones anteriores</h2><div className="mt-3 max-h-[440px] space-y-2 overflow-y-auto">
                    {context.liquidaciones.length === 0 && <p className="text-sm text-gray-600">Sin liquidaciones.</p>}
                    {context.liquidaciones.map(item => <details key={item.id} className="rounded-xl border border-gray-200 p-3 text-sm"><summary className="cursor-pointer font-semibold">{item.periodo.slice(0, 7)} · {item.estado} · Saldo {formatCurrency(Number(item.saldoInquilino), item.moneda)}</summary><div className="mt-2 space-y-1 text-gray-700"><p>A cobrar: {formatCurrency(Number(item.totalInquilino), item.moneda)} · Pagado: {formatCurrency(Number(item.pagadoInquilino), item.moneda)}</p><p>Propietario: {formatCurrency(Number(item.totalPropietario), item.moneda)} · Pagado: {formatCurrency(Number(item.pagadoPropietario), item.moneda)}</p>{item.pagos.map((p, i) => <p key={i}>Cobro del inquilino {p.fecha}: {formatCurrency(Number(p.importe), item.moneda)} ({p.metodo})</p>)}{item.pagosPropietario.map((p, i) => <p key={i}>Pago al propietario {p.fecha}: {formatCurrency(Number(p.importe), item.moneda)} ({p.metodo})</p>)}<Link to={`/liquidaciones/${item.id}`} className="font-bold text-orange-700 underline">Abrir liquidación</Link></div></details>)}
                </div></section>
                <section className={section}><h2 className="font-bold text-gray-900">Actas de entrega de llaves</h2><div className="mt-3 space-y-3 text-sm">
                    {context.actasLlaves.length === 0 && <p className="text-gray-600">Todavía no se entregaron las llaves.</p>}
                    {context.actasLlaves.map(act => { const signed = context.copiasLlavesFirmadas.find(item => item.versionDocumento === act.version); return <div key={act.id} className="rounded-xl border border-gray-200 p-3"><p className="font-bold">Versión {act.version} · entrega {act.datos.entrega.fechaEntregaLlaves}</p>{canViewFiles && <button type="button" className="mt-2 font-bold text-orange-700 underline" onClick={() => openAuthenticatedPdf(`/contratos/${contractId}/actas-llaves/${act.version}/pdf`).catch(err => setError(err.message))}>Ver / descargar PDF</button>}{signed && canViewFiles ? <button type="button" className="ml-3 font-bold text-blue-700 underline" onClick={() => openAuthenticatedFile(signed.rutaArchivo).catch(err => setError(err.message))}>Copia firmada</button> : !signed && canEdit && canViewFiles ? <label className="mt-2 block cursor-pointer text-blue-700 underline">Adjuntar copia firmada<input type="file" className="sr-only" accept="application/pdf,image/jpeg,image/png" disabled={busy} onChange={e => uploadSignedKeys(act.version, e.target.files?.[0])} /></label> : null}</div>; })}
                </div></section>
                <section className={section}><h2 className="font-bold text-gray-900">Actas de cierre sin reclamos</h2><div className="mt-3 space-y-3 text-sm">
                    {context.actas.length === 0 && <p className="text-gray-600">Todavía no hay actas.</p>}
                    {context.actas.map(act => { const signed = context.copiasFirmadas.find(item => item.versionDocumento === act.version); return <div key={act.id} className="rounded-xl border border-gray-200 p-3"><p className="font-bold">Versión {act.version} · {new Date(act.fechaEmision).toLocaleDateString('es-AR')}</p>{act.motivoRevision && <p className="text-gray-600">Motivo: {act.motivoRevision}</p>}{canViewFiles && <button type="button" className="mt-2 font-bold text-orange-700 underline" onClick={() => openAuthenticatedPdf(`/contratos/${contractId}/actas-rescision/${act.version}/pdf`).catch(err => setError(err.message))}>Ver / descargar PDF</button>}{signed && canViewFiles ? <button type="button" className="ml-3 font-bold text-blue-700 underline" onClick={() => openAuthenticatedFile(signed.rutaArchivo).catch(err => setError(err.message))}>Copia firmada</button> : !signed && canEdit && canViewFiles ? <label className="mt-2 block cursor-pointer text-blue-700 underline">Adjuntar copia firmada<input type="file" className="sr-only" accept="application/pdf,image/jpeg,image/png" disabled={busy} onChange={e => uploadSigned(act.version, e.target.files?.[0])} /></label> : null}</div>; })}
                </div></section>
            </div>
        </div>
        {!isEditable && error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    </div>;
}
