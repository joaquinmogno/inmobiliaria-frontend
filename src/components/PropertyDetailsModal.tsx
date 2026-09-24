import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from "@headlessui/react";
import {
    ArrowTopRightOnSquareIcon,
    CalendarDaysIcon,
    DocumentTextIcon,
    HomeModernIcon,
    KeyIcon,
    PaperClipIcon,
    PencilSquareIcon,
    PlusIcon,
    TrashIcon,
    UserGroupIcon,
    WrenchScrewdriverIcon,
    XMarkIcon,
} from "@heroicons/react/24/outline";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { getFileUrl, openAuthenticatedFile } from "../services/api";
import {
    propertiesService,
    type Property,
    type PropertyAttachment,
    type DeletedPropertyAttachment,
    type PropertyDetails,
    type PropertyPersonRelation,
} from "../services/properties.service";
import { formatDate, formatDateTime } from "../utils/date";
import { requestConfirmation } from "../services/confirmation";
import { ATTACHMENT_ACCEPT, ATTACHMENT_FORMATS_LABEL, validateAttachmentFile } from "../utils/documentFiles";
import AppSelect from "./AppSelect";
import LocalizedFilePicker from "./LocalizedFilePicker";
import { getPropertyTypeLabel, getStatusLabel } from "../utils/status";
import { useAuth } from "../context/AuthContext";

interface Props {
    isOpen: boolean;
    property: Property | null;
    canEdit: boolean;
    onClose: () => void;
    onEdit: (property: Property) => void;
    onGoToContracts: () => void;
    onChanged: () => void;
}

const relationNames = (relations: PropertyPersonRelation[]) =>
    relations.length ? relations.map(item => item.persona.nombreCompleto).join(", ") : "Sin registrar";

const statusClass: Record<string, string> = {
    DISPONIBLE: "bg-emerald-100 text-emerald-800",
    ALQUILADO: "bg-blue-100 text-blue-800",
    INACTIVO: "bg-red-100 text-red-800",
    ACTIVO: "bg-emerald-100 text-emerald-800",
    PROGRAMADO: "bg-blue-100 text-blue-800",
    FINALIZADO: "bg-gray-200 text-gray-800",
    RESCINDIDO: "bg-orange-100 text-orange-800",
};

export default function PropertyDetailsModal({
    isOpen,
    property,
    canEdit,
    onClose,
    onEdit,
    onGoToContracts,
    onChanged,
}: Props) {
    const { user } = useAuth();
    const [details, setDetails] = useState<PropertyDetails | null>(null);
    const [loading, setLoading] = useState(false);
    const [note, setNote] = useState("");
    const [attachmentType, setAttachmentType] = useState<'FOTO' | 'DOCUMENTO'>('FOTO');
    const [attachmentName, setAttachmentName] = useState("");
    const [file, setFile] = useState<File | null>(null);
    const [saving, setSaving] = useState(false);
    const [fileInputKey, setFileInputKey] = useState(0);
    const [deletedAttachments, setDeletedAttachments] = useState<DeletedPropertyAttachment[]>([]);
    const canPurgeAttachments = user?.tipo === 'ADMIN';

    const loadDetails = async () => {
        if (!property) return;
        setLoading(true);
        try {
            const nextDetails = await propertiesService.getById(property.id);
            setDetails(nextDetails);
            setDeletedAttachments(canEdit ? await propertiesService.getAttachmentTrash(property.id) : []);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "No se pudo cargar la ficha de la propiedad");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen && property) {
            setDetails(null);
            setNote("");
            setFile(null);
            setAttachmentName("");
            void loadDetails();
        }
    }, [isOpen, property?.id]);

    const addNote = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!details || !note.trim()) return;
        setSaving(true);
        try {
            await propertiesService.addNote(details.id, note);
            setNote("");
            await loadDetails();
            toast.success("Nota agregada al historial");
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "No se pudo guardar la nota");
        } finally {
            setSaving(false);
        }
    };

    const uploadAttachment = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!details || !file) return;
        setSaving(true);
        try {
            await propertiesService.addAttachment(details.id, file, attachmentType, attachmentName.trim() || undefined);
            setFile(null);
            setAttachmentName("");
            setFileInputKey(key => key + 1);
            await loadDetails();
            onChanged();
            toast.success(attachmentType === 'FOTO' ? "Foto agregada" : "Documento agregado");
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "No se pudo subir el archivo");
        } finally {
            setSaving(false);
        }
    };

    const deleteAttachment = async (attachment: PropertyAttachment) => {
        if (!details || !await requestConfirmation({
            title: "Enviar archivo a papelera",
            message: `“${attachment.nombreArchivo}” dejará de verse en la ficha, pero podrá restaurarse durante el período de retención.`,
            confirmText: "Enviar a papelera"
        })) return;

        try {
            await propertiesService.deleteAttachment(details.id, attachment.id);
            await loadDetails();
            onChanged();
            toast.success("Archivo enviado a la papelera");
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "No se pudo eliminar el archivo");
        }
    };

    const restoreAttachment = async (attachment: DeletedPropertyAttachment) => {
        if (!details) return;
        try {
            await propertiesService.restoreAttachment(details.id, attachment.id);
            await loadDetails();
            onChanged();
            toast.success("Archivo restaurado en la ficha");
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "No se pudo restaurar el archivo");
        }
    };

    const purgeAttachment = async (attachment: DeletedPropertyAttachment) => {
        if (!details || !await requestConfirmation({
            title: "Eliminar definitivamente",
            message: `Se eliminará de forma permanente “${attachment.nombreArchivo}”. Esta acción no se puede deshacer.`,
            confirmText: "Eliminar definitivamente"
        })) return;
        try {
            await propertiesService.purgeAttachment(details.id, attachment.id);
            await loadDetails();
            toast.success("Archivo eliminado definitivamente");
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "No se pudo eliminar definitivamente el archivo");
        }
    };

    const openAttachment = async (attachment: PropertyAttachment) => {
        try {
            await openAuthenticatedFile(attachment.rutaArchivo);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "No se pudo abrir el archivo");
        }
    };

    const photos = details?.adjuntos.filter(item => item.tipo === 'FOTO') || [];
    const documents = details?.adjuntos.filter(item => item.tipo === 'DOCUMENTO') || [];

    return (
        <Dialog open={isOpen} onClose={onClose} className="relative z-50">
            <DialogBackdrop className="fixed inset-0 bg-slate-950/55 backdrop-blur-sm" />
            <div className="fixed inset-0 overflow-y-auto p-3 sm:p-6">
                <div className="flex min-h-full items-center justify-center">
                    <DialogPanel className="w-full max-w-5xl overflow-hidden rounded-2xl bg-white shadow-2xl">
                        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-gray-200 bg-white px-5 py-4 sm:px-7">
                            <div className="min-w-0">
                                <DialogTitle className="truncate text-xl font-bold text-gray-950 sm:text-2xl">
                                    {details?.direccion || property?.direccion || "Ficha de propiedad"}
                                </DialogTitle>
                                <p className="mt-1 text-sm text-gray-600">
                                    {[details?.piso && `Piso ${details.piso}`, details?.departamento && `Unidad ${details.departamento}`].filter(Boolean).join(" · ") || "Sin piso o unidad"}
                                </p>
                            </div>
                            <div className="flex shrink-0 items-center gap-2">
                                {canEdit && details && <button
                                    type="button"
                                    onClick={() => { onClose(); onEdit(details); }}
                                    className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-blue-50 px-3 text-sm font-semibold text-blue-800 hover:bg-blue-100"
                                >
                                    <PencilSquareIcon className="h-5 w-5" />
                                    <span className="hidden sm:inline">Editar</span>
                                </button>}
                                <button type="button" onClick={onClose} aria-label="Cerrar ficha" className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-gray-700 hover:bg-gray-100">
                                    <XMarkIcon className="h-6 w-6" />
                                </button>
                            </div>
                        </div>

                        <div className="max-h-[calc(100vh-7rem)] overflow-y-auto p-5 sm:p-7">
                            {loading && !details ? <p className="py-16 text-center font-semibold text-indigo-700">Cargando ficha...</p> : details && <div className="space-y-7">
                                <div className="flex flex-wrap gap-2">
                                    <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-bold text-indigo-800">{getPropertyTypeLabel(details.tipo)}</span>
                                    <span className={`rounded-full px-3 py-1 text-xs font-bold ${statusClass[details.estado]}`}>{getStatusLabel(details.estado)}</span>
                                </div>

                                <section aria-labelledby="cadastral-title">
                                    <div className="mb-3 flex items-center gap-2">
                                        <HomeModernIcon className="h-5 w-5 text-indigo-700" />
                                        <h3 id="cadastral-title" className="text-lg font-bold text-gray-950">Datos catastrales</h3>
                                    </div>
                                    <div className="grid gap-3 md:grid-cols-3">
                                        <InfoCard label="Partida inmobiliaria" value={details.partidaInmobiliaria} />
                                        <InfoCard label="Matrícula" value={details.matricula} />
                                        <InfoCard label="Superficie" value={formatSurface(details.superficieM2)} />
                                    </div>
                                </section>

                                <section aria-labelledby="ocupacion-title">
                                    <div className="mb-3 flex items-center gap-2">
                                        <UserGroupIcon className="h-5 w-5 text-indigo-700" />
                                        <h3 id="ocupacion-title" className="text-lg font-bold text-gray-950">Titulares y ocupación</h3>
                                    </div>
                                    <div className="grid gap-3 md:grid-cols-3">
                                        <InfoCard label="Titulares registrados" value={relationNames(details.titularesRegistrados)} />
                                        <InfoCard label="Ocupantes actuales" value={relationNames(details.ocupantesActuales)} />
                                        <InfoCard
                                            label="Contrato vigente"
                                            value={details.contratoVigente ? `N.º ${details.contratoVigente.id} · hasta ${formatDate(details.contratoVigente.fechaFin)}` : "Sin contrato activo"}
                                        />
                                    </div>
                                    {details.contratoProgramado && <p className="mt-3 rounded-xl bg-blue-50 p-3 text-sm font-medium text-blue-900">
                                        Próximo contrato N.º {details.contratoProgramado.id}, desde {formatDate(details.contratoProgramado.fechaInicio)}.
                                    </p>}
                                </section>

                                <section className="grid gap-4 md:grid-cols-2">
                                    <TextSection icon={<WrenchScrewdriverIcon className="h-5 w-5" />} title="Servicios" value={details.servicios} empty="Sin datos de servicios, medidores o cuentas." />
                                    <TextSection icon={<KeyIcon className="h-5 w-5" />} title="Llaves" value={details.llaves} empty="Sin información sobre juegos de llaves o ubicación." />
                                </section>

                                <TextSection icon={<HomeModernIcon className="h-5 w-5" />} title="Observaciones generales" value={details.observaciones} empty="Sin observaciones generales." />

                                <section aria-labelledby="files-title">
                                    <div className="mb-3 flex items-center gap-2">
                                        <PaperClipIcon className="h-5 w-5 text-indigo-700" />
                                        <h3 id="files-title" className="text-lg font-bold text-gray-950">Fotos y documentos</h3>
                                    </div>

                                    {photos.length > 0 ? <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                                        {photos.map(photo => <div key={photo.id} className="group relative overflow-hidden rounded-xl border border-gray-200 bg-gray-100">
                                            <button type="button" onClick={() => void openAttachment(photo)} className="block w-full text-left">
                                                <img src={getFileUrl(photo.rutaArchivo)} alt={photo.nombreArchivo} className="aspect-[4/3] w-full object-cover" />
                                                <span className="block truncate bg-white px-3 py-2 text-xs font-semibold text-gray-800">{photo.nombreArchivo}</span>
                                            </button>
                                            {canEdit && <button type="button" onClick={() => void deleteAttachment(photo)} aria-label={`Eliminar ${photo.nombreArchivo}`} data-danger-trigger="true" className="destructive-icon-action absolute right-2 top-2 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-white/95 transition-colors">
                                                <TrashIcon className="h-5 w-5" />
                                            </button>}
                                        </div>)}
                                    </div> : <p className="mb-4 rounded-xl border border-dashed border-gray-300 p-4 text-sm text-gray-600">Todavía no hay fotos cargadas.</p>}

                                    <div className="space-y-2">
                                        {documents.map(document => <div key={document.id} className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 p-3">
                                            <button type="button" onClick={() => void openAttachment(document)} className="flex min-w-0 items-center gap-3 text-left text-indigo-800 hover:text-indigo-950">
                                                <DocumentTextIcon className="h-6 w-6 shrink-0" />
                                                <span className="min-w-0">
                                                    <span className="block truncate text-sm font-bold">{document.nombreArchivo}</span>
                                                    <span className="block text-xs text-gray-600">{formatDateTime(document.fechaCreacion)} · {document.creadoPor?.nombreCompleto || "Usuario eliminado"}</span>
                                                </span>
                                            </button>
                                            {canEdit && <button type="button" onClick={() => void deleteAttachment(document)} aria-label={`Eliminar ${document.nombreArchivo}`} data-danger-trigger="true" className="destructive-icon-action inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg transition-colors">
                                                <TrashIcon className="h-5 w-5" />
                                            </button>}
                                        </div>)}
                                        {documents.length === 0 && <p className="rounded-xl border border-dashed border-gray-300 p-4 text-sm text-gray-600">Todavía no hay documentos cargados.</p>}
                                    </div>

                                    {canEdit && <form onSubmit={uploadAttachment} className="mt-4 grid gap-3 rounded-xl bg-gray-50 p-4 md:grid-cols-[11rem_1fr_auto] md:items-end">
                                        <LocalizedFilePicker
                                            key={fileInputKey}
                                            id="property-attachment-file"
                                            label="Archivo"
                                            accept={ATTACHMENT_ACCEPT}
                                            formatsLabel={ATTACHMENT_FORMATS_LABEL}
                                            selectedFiles={file ? [file] : []}
                                            onFilesSelected={files => setFile(files[0] || null)}
                                            validateFile={validateAttachmentFile}
                                            onValidationError={message => toast.error(message)}
                                            required
                                            disabled={saving}
                                            className="md:col-span-3"
                                        />
                                        <div>
                                            <label htmlFor="property-attachment-type" className="mb-1 block text-sm font-semibold text-gray-800">Tipo</label>
                                            <AppSelect id="property-attachment-type" ariaLabel="Tipo de archivo" value={attachmentType} onChange={value => setAttachmentType(value as 'FOTO' | 'DOCUMENTO')} options={[{ value: 'FOTO', label: 'Foto' }, { value: 'DOCUMENTO', label: 'Documento' }]} />
                                        </div>
                                        <label htmlFor="property-attachment-name" className="block text-sm font-semibold text-gray-800">
                                            Nombre descriptivo
                                            <input id="property-attachment-name" value={attachmentName} maxLength={255} onChange={event => setAttachmentName(event.target.value)} placeholder="Ej. escritura o frente" className="mt-1 min-h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm" />
                                        </label>
                                        <button disabled={saving || !file} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-indigo-700 px-4 font-semibold text-white hover:bg-indigo-800 disabled:opacity-50">
                                            <PlusIcon className="h-5 w-5" /> Subir
                                        </button>
                                    </form>}
                                    {canEdit && <details className="mt-4 rounded-xl border border-dashed border-gray-300 bg-gray-50">
                                        <summary className="cursor-pointer px-4 py-3 text-sm font-bold text-gray-800">Papelera de documentos ({deletedAttachments.length})</summary>
                                        <div className="space-y-2 border-t border-gray-200 p-3">
                                            {deletedAttachments.map(attachment => <div key={attachment.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white p-3"><div className="min-w-0"><p className="truncate text-sm font-bold text-gray-900">{attachment.nombreArchivo}</p><p className="mt-1 text-xs text-gray-600">Eliminado {formatDateTime(attachment.eliminadoEn)} por {attachment.eliminadoPor?.nombreCompleto || 'Usuario eliminado'}</p></div><div className="flex gap-2"><button type="button" onClick={() => void restoreAttachment(attachment)} className="min-h-11 rounded-lg border border-indigo-300 px-3 text-sm font-bold text-indigo-800 hover:bg-indigo-50">Restaurar</button>{canPurgeAttachments && <button type="button" onClick={() => void purgeAttachment(attachment)} data-danger-trigger="true" className="destructive-action min-h-11 rounded-lg px-3 text-sm font-bold">Purgar</button>}</div></div>)}
                                            {!deletedAttachments.length && <p className="text-sm text-gray-600">No hay archivos en papelera.</p>}
                                        </div>
                                    </details>}
                                </section>

                                <section aria-labelledby="notes-title">
                                    <div className="mb-3 flex items-center gap-2">
                                        <CalendarDaysIcon className="h-5 w-5 text-indigo-700" />
                                        <h3 id="notes-title" className="text-lg font-bold text-gray-950">Notas históricas</h3>
                                    </div>
                                    {canEdit && <form onSubmit={addNote} className="mb-4 flex flex-col gap-2 sm:flex-row">
                                        <label className="sr-only" htmlFor="property-history-note">Nueva nota histórica</label>
                                        <textarea id="property-history-note" required maxLength={2000} rows={2} value={note} onChange={event => setNote(event.target.value)} placeholder="Dejá una nota fechada sin reemplazar el historial anterior..." className="min-h-20 flex-1 rounded-xl border border-gray-300 px-3 py-2 text-sm" />
                                        <button disabled={saving || !note.trim()} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-indigo-700 px-4 font-semibold text-white hover:bg-indigo-800 disabled:opacity-50">
                                            <PlusIcon className="h-5 w-5" /> Agregar nota
                                        </button>
                                    </form>}
                                    <div className="space-y-3">
                                        {details.notas.map(item => <article key={item.id} className="rounded-xl border border-gray-200 p-4">
                                            <p className="whitespace-pre-wrap text-sm text-gray-900">{item.contenido}</p>
                                            <p className="mt-2 text-xs font-medium text-gray-600">{formatDateTime(item.fechaCreacion)} · {item.creadoPor?.nombreCompleto || "Usuario eliminado"}</p>
                                        </article>)}
                                        {details.notas.length === 0 && <p className="rounded-xl border border-dashed border-gray-300 p-4 text-sm text-gray-600">No hay notas históricas.</p>}
                                    </div>
                                </section>

                                <section aria-labelledby="contracts-title">
                                    <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                                        <h3 id="contracts-title" className="text-lg font-bold text-gray-950">Historial contractual</h3>
                                        <button type="button" onClick={onGoToContracts} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-gray-100 px-4 text-sm font-semibold text-gray-900 hover:bg-gray-200">
                                            Abrir contratos <ArrowTopRightOnSquareIcon className="h-5 w-5" />
                                        </button>
                                    </div>
                                    <div className="space-y-2">
                                        {details.contratos.map(contract => <div key={contract.id} className="grid gap-2 rounded-xl border border-gray-200 p-4 sm:grid-cols-[auto_1fr_auto] sm:items-center">
                                            <span className="font-bold text-gray-950">N.º {contract.id}</span>
                                            <span className="text-sm text-gray-700">{formatDate(contract.fechaInicio)} al {formatDate(contract.fechaFin)} · {relationNames(contract.inquilinos)}</span>
                                            <span className={`w-fit rounded-full px-3 py-1 text-xs font-bold ${statusClass[contract.estado]}`}>{getStatusLabel(contract.estado)}</span>
                                        </div>)}
                                        {details.contratos.length === 0 && <p className="rounded-xl border border-dashed border-gray-300 p-4 text-sm text-gray-600">La propiedad todavía no tiene contratos.</p>}
                                    </div>
                                </section>
                            </div>}
                        </div>
                    </DialogPanel>
                </div>
            </div>
        </Dialog>
    );
}

function InfoCard({ label, value }: { label: string; value: string | null | undefined }) {
    return <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
        <p className="text-xs font-bold uppercase tracking-wide text-gray-600">{label}</p>
        <p className="mt-2 break-words text-sm font-semibold text-gray-950">{value?.trim() || "Sin informar"}</p>
    </div>;
}

function formatSurface(value: string | number | null) {
    if (value === null || value === "") return null;
    const surface = Number(value);
    if (!Number.isFinite(surface)) return null;
    return `${surface.toLocaleString("es-AR", { maximumFractionDigits: 2 })} m²`;
}

function TextSection({ icon, title, value, empty }: { icon: React.ReactNode; title: string; value: string | null; empty: string }) {
    return <section className="rounded-xl border border-gray-200 p-4">
        <div className="mb-2 flex items-center gap-2 font-bold text-gray-950"><span className="text-indigo-700">{icon}</span>{title}</div>
        <p className="whitespace-pre-wrap text-sm text-gray-700">{value || empty}</p>
    </section>;
}
