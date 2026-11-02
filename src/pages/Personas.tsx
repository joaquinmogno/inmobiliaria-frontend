import FieldError, { useFieldValidation } from '../components/FieldError';
import EmptyState from '../components/EmptyState';
import LoadingState from '../components/LoadingState';
import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import {
    UserGroupIcon,
    EyeIcon,
    PlusIcon,
    PencilSquareIcon,
    TrashIcon,
} from "@heroicons/react/24/outline";
import { personasService, type Persona, type CreatePersonaData, type PersonaCoincidencia } from "../services/personas.service";
import WhatsAppLink from "../components/WhatsAppLink";
import { useAuth } from "../context/AuthContext";
import { hasPermission } from "../utils/permissions";
import ServerPagination from "../components/ServerPagination";
import toast from "react-hot-toast";
import { requestConfirmation } from "../services/confirmation";
import FilterBar, { persistFilter, readPersistedFilter } from "../components/FilterBar";
import FormError, { useFormError } from "../components/FormError";
import AppSelect from "../components/AppSelect";
import { getStatusLabel } from "../utils/status";
import PersonDetailsModal from "../components/PersonDetailsModal";
import ActiveFilterChips from "../components/ActiveFilterChips";

export default function Personas() {
    const { user } = useAuth();
    const canCreate = hasPermission(user, "personas.crear");
    const canEdit = hasPermission(user, "personas.editar");
    const canDelete = hasPermission(user, "personas.eliminar");
    const [searchParams, setSearchParams] = useSearchParams();
    const [personas, setPersonas] = useState<Persona[]>([]);
    const [loadError, setLoadError] = useState('');
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState(() => searchParams.get('q') ?? readPersistedFilter("personas"));
    const [debouncedSearch, setDebouncedSearch] = useState(() => searchParams.get('q') ?? readPersistedFilter("personas"));
    const [currentPage, setCurrentPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingPersona, setEditingPersona] = useState<Persona | null>(null);
    const [selectedPersona, setSelectedPersona] = useState<Persona | null>(null);
    const [coincidencias, setCoincidencias] = useState<PersonaCoincidencia[]>([]);
    const { error: formError, setError: setFormError, reportError, formRef } = useFormError();
    const validation = useFieldValidation();
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState<CreatePersonaData>({
        nombreCompleto: "",
        dni: "",
        email: "",
        telefono: "",
        direccion: "",
        cuit: "",
        banco: "",
        cbu: "",
        aliasBancario: "",
        titularCuentaBancaria: "",
        titularidadBancariaVerificada: false,
        contactoAlternativo: "",
        telefonoAlternativo: "",
        estado: "ACTIVO",
    });

    useEffect(() => {
        persistFilter("personas", searchTerm);
        const timer = setTimeout(() => {
            setCurrentPage(1);
            setDebouncedSearch(searchTerm);
        }, 300);

        return () => clearTimeout(timer);
    }, [searchTerm]);

    useEffect(() => {
        const query = searchParams.get('q');
        if (query !== null && query !== searchTerm) {
            setSearchTerm(query);
            setDebouncedSearch(query);
            setCurrentPage(1);
        }
    }, [searchParams]);

    const updateSearch = (value: string) => {
        setSearchTerm(value);
        setSearchParams(current => {
            const next = new URLSearchParams(current);
            if (value.trim()) next.set('q', value.trim());
            else next.delete('q');
            return next;
        }, { replace: true });
    };

    useEffect(() => {
        const controller = new AbortController();
        loadPersonas(debouncedSearch, currentPage, controller.signal);
        return () => controller.abort();
    }, [debouncedSearch, currentPage]);

    useEffect(() => {
        if (!isModalOpen) {
            setCoincidencias([]);
            return;
        }
        const digits = (value?: string | null) => (value || '').replace(/\D/g, '');
        const identity = {
            dni: formData.dni?.trim() || undefined,
            cuit: digits(formData.cuit).length === 11 ? formData.cuit : undefined,
            email: formData.email?.includes('@') ? formData.email : undefined,
            telefono: digits(formData.telefono).length >= 8 ? formData.telefono : undefined,
            excluirId: editingPersona?.id
        };
        if (!identity.dni && !identity.cuit && !identity.email && !identity.telefono) {
            setCoincidencias([]);
            return;
        }
        let active = true;
        const timer = window.setTimeout(() => {
            personasService.findMatches(identity)
                .then(response => { if (active) setCoincidencias(response.coincidencias); })
                // The server remains authoritative at save time. While a phone/email is still being typed,
                // a validation error simply means that no useful pre-alert can be shown yet.
                .catch(() => { if (active) setCoincidencias([]); });
        }, 350);
        return () => { active = false; window.clearTimeout(timer); };
    }, [isModalOpen, editingPersona?.id, formData.dni, formData.cuit, formData.email, formData.telefono]);

    const loadPersonas = async (searchQuery: string = debouncedSearch, page: number = currentPage, signal?: AbortSignal) => {
        setLoading(true); setLoadError('');
        try {
            const response = await personasService.getAll({ search: searchQuery, page, limit: 25, signal });
            setPersonas(response.data);
            setTotal(response.meta.total);
            setTotalPages(response.meta.totalPages);
        } catch (error) {
            if (error instanceof DOMException && error.name === 'AbortError') return;
            setLoadError("No se pudieron cargar las personas. Intentá nuevamente.");
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (saving) return;
        setFormError("");
        const errors: Record<string, string> = {};
        if (!formData.nombreCompleto.trim()) errors['person-name'] = 'Ingresá el nombre completo o la razón social.';
        if (formData.cuit && formData.cuit.replace(/\D/g, '').length !== 11) errors['person-cuit'] = 'El CUIT debe tener 11 dígitos.';
        if (formData.cbu && formData.cbu.replace(/\D/g, '').length !== 22) errors['person-cbu'] = 'El CBU debe tener 22 dígitos.';
        if (Object.keys(errors).length) { validation.showErrors(errors); return; }
        validation.reset();
        setSaving(true);
        try {
            if (editingPersona) {
                await personasService.update(editingPersona.id, { ...formData, version: editingPersona.version });
            } else {
                await personasService.create(formData);
            }
            setIsModalOpen(false);
            setEditingPersona(null);
            resetForm();
            loadPersonas();
        } catch (error) {
            reportError(error, "No se pudo guardar la persona");
        } finally { setSaving(false); }
    };

    const handleDelete = async (id: number) => {
        if (await requestConfirmation({ title: "Eliminar persona", message: "La persona se eliminará si no tiene contratos o dependencias asociadas.", confirmText: "Eliminar" })) {
            try {
                await personasService.delete(id);
                loadPersonas(debouncedSearch);
            } catch (error: any) {
                toast.error(error instanceof Error ? error.message : "No se pudo eliminar la persona");
            }
        }
    };

    const handleMerge = async (target: PersonaCoincidencia) => {
        if (!editingPersona) return;
        const approved = await requestConfirmation({
            title: 'Fusionar personas',
            message: `Se conservará “${target.nombreCompleto}” como ficha principal. Los contratos, garantías y liquidaciones de “${editingPersona.nombreCompleto}” pasarán a esa ficha. Esta acción queda auditada y no se puede deshacer.`,
            confirmText: 'Fusionar'
        });
        if (!approved) return;
        const motivo = window.prompt('Motivo de la fusión (quedará en la auditoría):');
        if (!motivo?.trim()) return;
        try {
            await personasService.merge(editingPersona.id, {
                personaDestinoId: target.id,
                version: editingPersona.version,
                motivo: motivo.trim()
            });
            toast.success('Las personas se fusionaron y el historial fue reasignado.');
            setIsModalOpen(false);
            setEditingPersona(null);
            resetForm();
            loadPersonas();
        } catch (error) {
            reportError(error, 'No se pudieron fusionar las personas');
        }
    };

    const resetForm = () => {
        validation.reset();
        setFormError('');
        setCoincidencias([]);
        setFormData({
            nombreCompleto: "",
            dni: "",
            email: "",
            telefono: "",
            direccion: "",
            cuit: "",
            banco: "",
            cbu: "",
            aliasBancario: "",
            titularCuentaBancaria: "",
            titularidadBancariaVerificada: false,
            contactoAlternativo: "",
            telefonoAlternativo: "",
            estado: "ACTIVO",
        });
    };

    const handleEdit = (persona: Persona) => {
        validation.reset();
        setFormError('');
        setEditingPersona(persona);
        setFormData({
            nombreCompleto: persona.nombreCompleto,
            dni: persona.dni || "",
            email: persona.email || "",
            telefono: persona.telefono || "",
            direccion: persona.direccion || "",
            cuit: persona.cuit || "",
            banco: persona.banco || "",
            cbu: persona.cbu || "",
            aliasBancario: persona.aliasBancario || "",
            titularCuentaBancaria: persona.titularCuentaBancaria || "",
            titularidadBancariaVerificada: persona.titularidadBancariaVerificada || false,
            contactoAlternativo: persona.contactoAlternativo || "",
            telefonoAlternativo: persona.telefonoAlternativo || "",
            estado: persona.estado,
        });
        setIsModalOpen(true);
    };

    const personField = (id: string, label: string, key: Exclude<keyof CreatePersonaData, 'titularidadBancariaVerificada' | 'estado'>, type = 'text', required = false, placeholder?: string) => <div className="min-w-0">
        <label htmlFor={id} className="mb-1 block text-sm font-medium text-slate-700">{label}</label>
        <input {...validation.inputProps(id)} type={type} required={required} value={formData[key] || ''} placeholder={placeholder} className="ui-field" onChange={event => setFormData(current => ({ ...current, [key]: event.target.value, ...(['cbu', 'aliasBancario', 'titularCuentaBancaria'].includes(key) ? { titularidadBancariaVerificada: false } : {}) }))} />
        <FieldError id={id} message={validation.errors[id]} />
    </div>;

    const emptyState = loadError ? <div role="alert" className="p-6 text-center text-sm text-red-800">{loadError}<button type="button" className="ui-button ui-button-secondary mt-3" onClick={() => void loadPersonas(debouncedSearch, currentPage)}>Reintentar</button></div> : <EmptyState filtered={Boolean(searchTerm.trim())} title="Todavía no hay personas registradas" description="Agregá inquilinos, propietarios y garantes para vincularlos a tus contratos." onClear={() => updateSearch('')} action={canCreate ? { label: 'Crear la primera persona', onClick: () => { setEditingPersona(null); resetForm(); setIsModalOpen(true); } } : undefined} />;

    if (loading && personas.length === 0) return <LoadingState label="Cargando personas…" />;

    return (
        <div className="mx-auto w-full max-w-7xl">
            <div className="ui-page-header mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">Personas</h1>
                    <p className="mt-1 text-sm text-content-muted sm:text-base">Centraliza la información de inquilinos, propietarios y garantes</p>
                </div>
                {canCreate && <button
                    onClick={() => {
                        setEditingPersona(null);
                        resetForm();
                        setIsModalOpen(true);
                    }}
                    className="ui-button ui-button-primary"
                >
                    <PlusIcon className="w-5 h-5" />
                    Nueva persona
                </button>}
            </div>

            <div className="mb-6 space-y-3"><FilterBar query={searchTerm} onQueryChange={updateSearch} onClear={() => updateSearch("")} resultCount={total} placeholder="Buscar por nombre, DNI, CUIT, email o teléfono..." />
                <ActiveFilterChips filters={searchTerm ? [{ key: 'q', label: `Búsqueda: ${searchTerm}`, onRemove: () => updateSearch('') }] : []} />
            </div>

            {/* VISTA DESKTOP */}
            <div className="hidden bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden 2xl:block">
                <div className="overflow-x-auto">
                    <table className="tabular-nums w-full text-left border-collapse">
                        <thead className="sticky top-0 z-10 bg-gray-50">
                            <tr className="bg-gray-50/50 border-b border-gray-100">
                                <th className="px-6 py-4 text-xs font-bold text-content-muted uppercase tracking-wider">Persona</th>
                                <th className="px-6 py-4 text-xs font-bold text-content-muted uppercase tracking-wider">Contacto</th>
                                <th className="px-6 py-4 text-xs font-bold text-content-muted uppercase tracking-wider">Roles</th>
                                <th className="px-6 py-4 text-xs font-bold text-content-muted uppercase tracking-wider">Estado</th>
                                <th className="sticky right-0 z-20 bg-gray-50 px-6 py-4 text-xs font-bold text-content-muted uppercase tracking-wider text-right shadow-[-8px_0_12px_-12px_rgba(15,23,42,0.65)]">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {personas.map((p) => (
                                <tr key={p.id} className="hover:bg-gray-50/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="bg-indigo-50 p-2 rounded-lg">
                                                <UserGroupIcon className="w-5 h-5 text-indigo-600" />
                                            </div>
                                            <div className="min-w-0 max-w-64">
                                                <p className="truncate font-semibold text-gray-900" title={p.nombreCompleto}>{p.nombreCompleto}</p>
                                                <p className="text-sm text-content-muted">{p.dni || "Sin ID"}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm">
                                            <p className="text-gray-900">{p.email || "-"}</p>
                                            {p.telefono ? (
                                                <WhatsAppLink phone={p.telefono} className="text-content-muted" />
                                            ) : (
                                                <p className="text-content-muted">-</p>
                                            )}
                                            <p className="text-gray-600 text-xs truncate max-w-[150px]" title={p.direccion || undefined}>{p.direccion}</p>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-wrap gap-1">
                                            {p.roles && p.roles.length > 0 ? (
                                                p.roles.map(role => (
                                                    <span key={role} className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                                                        {role}
                                                    </span>
                                                ))
                                            ) : (
                                                <span className="text-xs text-gray-600">Sin roles</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${p.estado === 'ACTIVO' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                            }`}>
                                            {getStatusLabel(p.estado)}
                                        </span>
                                    </td>
                                    <td className="sticky right-0 z-10 bg-white px-6 py-4 text-right shadow-[-8px_0_12px_-12px_rgba(15,23,42,0.65)]">
                                        <div className="flex justify-end gap-2">
                                            <button
                                                onClick={() => setSelectedPersona(p)}
                                                className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-white text-indigo-700 transition-colors hover:bg-indigo-50"
                                                title="Ver ficha completa"
                                                aria-label={`Ver ficha de ${p.nombreCompleto}`}
                                            >
                                                <EyeIcon className="w-5 h-5" />
                                            </button>
                                            {canEdit && <button
                                                onClick={() => handleEdit(p)}
                                                className="inline-flex h-11 w-11 items-center justify-center text-gray-600 hover:text-blue-700 transition-colors bg-white hover:bg-blue-50 rounded-lg"
                                                title="Editar"
                                            >
                                                <PencilSquareIcon className="w-5 h-5" />
                                            </button>}
                                            {canDelete && <button
                                                onClick={() => handleDelete(p.id)}
                                                data-danger-trigger="true"
                                                className="destructive-icon-action inline-flex h-11 w-11 items-center justify-center rounded-lg transition-colors"
                                                title="Eliminar"
                                            >
                                                <TrashIcon className="w-5 h-5" />
                                            </button>}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {personas.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="text-center">
                                        {emptyState}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* VISTA MOBILE */}
            <div className="space-y-4 2xl:hidden">
                {personas.map((p) => (
                    <div key={p.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col gap-3">
                        <div className="flex justify-between items-start">
                            <div className="flex items-center gap-3">
                                <div className="bg-indigo-50 p-2 rounded-lg shrink-0">
                                    <UserGroupIcon className="w-5 h-5 text-indigo-600" />
                                </div>
                                <div>
                                    <p className="font-bold text-gray-900 leading-tight">{p.nombreCompleto}</p>
                                    <p className="text-xs font-bold text-gray-600 uppercase tracking-wider mt-0.5">{p.dni ? `DNI ${p.dni}` : "SIN ID"}</p>
                                </div>
                            </div>
                            <span className={`px-2 py-0.5 rounded-md text-xs font-bold uppercase tracking-wider shrink-0 ${p.estado === 'ACTIVO' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                {getStatusLabel(p.estado)}
                            </span>
                        </div>
                        
                        <div className="flex flex-col gap-1.5 mt-1 bg-gray-50 p-3 rounded-lg border border-gray-100 text-sm">
                             {p.email && <p className="text-gray-700 break-all"><span className="text-xs text-gray-600 uppercase font-bold mr-1">EMAIL:</span> {p.email}</p>}
                             {p.telefono && <div className="flex items-center gap-1 text-gray-700"><span className="text-xs text-gray-600 uppercase font-bold mr-1">TEL:</span> <WhatsAppLink phone={p.telefono} /></div>}
                             {p.direccion && <p className="text-gray-700 text-xs mt-1 truncate" title={p.direccion}>{p.direccion}</p>}
                        </div>

                        {p.roles && p.roles.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                                 {p.roles.map(role => (
                                     <span key={role} className="px-2 py-0.5 rounded-md text-xs font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-100">
                                         {role}
                                     </span>
                                 ))}
                            </div>
                        )}
                        
                        <div className="flex justify-end gap-2 pt-3 border-t border-gray-100 mt-1">
                            <button
                                onClick={() => setSelectedPersona(p)}
                                className="flex items-center gap-1.5 rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-800 transition-colors hover:bg-indigo-100"
                            >
                                <EyeIcon className="w-4 h-4" /> Ver ficha
                            </button>
                            {canEdit && <button
                                onClick={() => handleEdit(p)}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                            >
                                <PencilSquareIcon className="w-4 h-4" /> Editar
                            </button>}
                            {canDelete && <button
                                onClick={() => handleDelete(p.id)}
                                data-danger-trigger="true"
                                className="destructive-action flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-colors"
                            >
                                <TrashIcon className="w-4 h-4" /> Eliminar
                            </button>}
                        </div>
                    </div>
                ))}
                {personas.length === 0 && (
                    <div className="ui-panel">
                        {emptyState}
                    </div>
                )}
            </div>

            <ServerPagination page={currentPage} totalPages={totalPages} total={total} pageSize={25} currentCount={personas.length} onPageChange={setCurrentPage} />

            <PersonDetailsModal
                isOpen={Boolean(selectedPersona)}
                person={selectedPersona}
                canEdit={canEdit}
                onClose={() => setSelectedPersona(null)}
                onEdit={handleEdit}
            />

            {/* Modal */}
            {isModalOpen && (
                <div className="ui-backdrop-enter fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div data-modal-panel className="ui-modal-enter flex flex-col overflow-hidden bg-white rounded-2xl w-full max-w-2xl shadow-2xl max-h-[calc(100dvh-2rem)]">
                        <div className="flex shrink-0 justify-between items-center border-b border-slate-100 p-4 sm:px-6">
                            <h2 className="text-2xl font-bold text-gray-900">
                                {editingPersona ? "Editar persona" : "Nueva persona"}
                            </h2>
                            <button type="button" disabled={saving} aria-label="Cerrar ventana" onClick={() => setIsModalOpen(false)} className="h-11 w-11 text-gray-600 hover:text-gray-900">
                                ✕
                            </button>
                        </div>

                        <form id="person-form" ref={formRef} onSubmit={handleSubmit} className="modal-scroll flex-1 space-y-6 p-4 sm:p-6">
                            <FormError message={formError} />
                            {coincidencias.length > 0 && (
                                <aside className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950" aria-live="polite">
                                    <p className="font-bold">Posible persona duplicada</p>
                                    <p className="mt-1 text-amber-900">Antes de guardar, revisá la ficha existente para no fragmentar contratos, deudas ni documentación.</p>
                                    <ul className="mt-3 space-y-2">
                                        {coincidencias.map(persona => (
                                            <li key={persona.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white/70 px-3 py-2">
                                                <span><strong>{persona.nombreCompleto}</strong> · coincide por {persona.coincidencias.map(item => item.label).join(', ')}</span>
                                                {editingPersona && canEdit && (
                                                    <button type="button" onClick={() => handleMerge(persona)} className="rounded-lg border border-amber-500 px-2.5 py-1 text-xs font-bold text-amber-900 hover:bg-amber-100">
                                                        Fusionar en esta ficha
                                                    </button>
                                                )}
                                            </li>
                                        ))}
                                    </ul>
                                </aside>
                            )}
                            <fieldset className="min-w-0 space-y-4">
                                <legend className="mb-3 text-base font-semibold text-slate-900">Datos principales</legend>
                                <p className="text-sm text-slate-600">El nombre es obligatorio. Los demás datos son opcionales y podés completarlos después.</p>
                                {personField('person-name', 'Nombre y Apellido / Razón Social *', 'nombreCompleto', 'text', true, 'Ej.: Juan Pérez')}
                                <div className="grid gap-4 sm:grid-cols-2">
                                    {personField('person-document', 'DNI (opcional)', 'dni')}
                                    {personField('person-cuit', 'CUIT (opcional)', 'cuit', 'text', false, '11 dígitos')}
                                    <div><label htmlFor="person-status" className="mb-1 block text-sm font-medium text-slate-700">Estado</label><AppSelect id="person-status" ariaLabel="Estado de la persona" value={formData.estado} onChange={value => setFormData({ ...formData, estado: value as 'ACTIVO' | 'INACTIVO' })} options={[{ value: 'ACTIVO', label: 'Activo' }, { value: 'INACTIVO', label: 'Inactivo' }]} /></div>
                                </div>
                            </fieldset>
                            <fieldset className="min-w-0 border-t border-slate-100 pt-4">
                                <legend className="pr-2 text-base font-semibold text-slate-900">Contacto <span className="text-sm font-normal text-slate-500">· Opcional</span></legend>
                                <div className="grid gap-4 sm:grid-cols-2">
                                    {personField('person-email', 'Email', 'email', 'email')}
                                    {personField('person-phone', 'Teléfono', 'telefono', 'tel')}
                                    <div className="sm:col-span-2">{personField('person-address', 'Dirección', 'direccion', 'text', false, 'Calle, número, piso…')}</div>
                                    {personField('person-alternative-contact', 'Contacto alternativo (opcional)', 'contactoAlternativo')}
                                    {personField('person-alternative-phone', 'Teléfono alternativo (opcional)', 'telefonoAlternativo', 'tel')}
                                </div>
                            </fieldset>
                            <fieldset className="min-w-0 space-y-4 border-t border-slate-100 pt-4">
                                <legend className="pr-2 text-base font-semibold text-slate-900">Datos bancarios <span className="text-sm font-normal text-slate-500">· Opcional</span></legend>
                                <div className="grid gap-4 sm:grid-cols-2">
                                    {personField('person-bank', 'Banco (opcional)', 'banco')}
                                    {personField('person-cbu', 'CBU (opcional)', 'cbu', 'text', false, '22 dígitos')}
                                    {personField('person-bank-alias', 'Alias bancario (opcional)', 'aliasBancario', 'text', false, 'Ej.: LUZ.CASA.123')}
                                    {personField('person-account-holder', 'Titular de la cuenta (opcional si coincide con la persona)', 'titularCuentaBancaria', 'text', false, formData.nombreCompleto || 'Se asumirá el nombre de la persona')}
                                </div>
                                {(formData.cbu || formData.aliasBancario) && <label className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950"><input type="checkbox" checked={Boolean(formData.titularidadBancariaVerificada)} onChange={event => setFormData({ ...formData, titularidadBancariaVerificada: event.target.checked })} className="mt-0.5 h-4 w-4 shrink-0 rounded border-amber-400 text-indigo-600" /><span><strong>Cuenta verificada.</strong> Confirmo que el CBU o alias pertenece a {formData.titularCuentaBancaria?.trim() || formData.nombreCompleto || 'la persona indicada'}.</span></label>}
                            </fieldset>
                        </form>
                        <div className="grid shrink-0 grid-cols-2 gap-3 border-t border-slate-100 bg-white p-4 sm:flex sm:justify-end sm:px-6">
                            <button type="button" disabled={saving} onClick={() => setIsModalOpen(false)} className="ui-button ui-button-secondary">Cancelar</button>
                            <button type="submit" form="person-form" disabled={saving} className="ui-button ui-button-primary">{saving ? 'Guardando…' : 'Guardar persona'}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
