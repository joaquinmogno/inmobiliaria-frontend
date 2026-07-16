import { useState, useEffect } from "react";
import {
    UserGroupIcon,
    PlusIcon,
    PencilSquareIcon,
    TrashIcon,
} from "@heroicons/react/24/outline";
import { personasService, type Persona, type CreatePersonaData } from "../services/personas.service";
import WhatsAppLink from "../components/WhatsAppLink";
import { useAuth } from "../context/AuthContext";
import { hasPermission } from "../utils/permissions";
import ServerPagination from "../components/ServerPagination";
import toast from "react-hot-toast";
import { requestConfirmation } from "../services/confirmation";
import FilterBar, { persistFilter, readPersistedFilter } from "../components/FilterBar";
import FormError, { useFormError } from "../components/FormError";

export default function Personas() {
    const { user } = useAuth();
    const canCreate = hasPermission(user, "personas.crear");
    const canEdit = hasPermission(user, "personas.editar");
    const canDelete = hasPermission(user, "personas.eliminar");
    const [personas, setPersonas] = useState<Persona[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState(() => readPersistedFilter("personas"));
    const [debouncedSearch, setDebouncedSearch] = useState(() => readPersistedFilter("personas"));
    const [currentPage, setCurrentPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingPersona, setEditingPersona] = useState<Persona | null>(null);
    const { error: formError, setError: setFormError, reportError, formRef } = useFormError();
    const [formData, setFormData] = useState<CreatePersonaData>({
        nombreCompleto: "",
        dni: "",
        email: "",
        telefono: "",
        direccion: "",
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
        const controller = new AbortController();
        loadPersonas(debouncedSearch, currentPage, controller.signal);
        return () => controller.abort();
    }, [debouncedSearch, currentPage]);

    const loadPersonas = async (searchQuery: string = debouncedSearch, page: number = currentPage, signal?: AbortSignal) => {
        setLoading(true);
        try {
            const response = await personasService.getAll({ search: searchQuery, page, limit: 25, signal });
            setPersonas(response.data);
            setTotal(response.meta.total);
            setTotalPages(response.meta.totalPages);
        } catch (error) {
            if (error instanceof DOMException && error.name === 'AbortError') return;
            console.error("Error loading personas:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError("");
        try {
            if (editingPersona) {
                await personasService.update(editingPersona.id, formData);
            } else {
                await personasService.create(formData);
            }
            setIsModalOpen(false);
            setEditingPersona(null);
            resetForm();
            loadPersonas();
        } catch (error) {
            reportError(error, "No se pudo guardar la persona");
        }
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

    const resetForm = () => {
        setFormData({
            nombreCompleto: "",
            dni: "",
            email: "",
            telefono: "",
            direccion: "",
            estado: "ACTIVO",
        });
    };

    const handleEdit = (persona: Persona) => {
        setEditingPersona(persona);
        setFormData({
            nombreCompleto: persona.nombreCompleto,
            dni: persona.dni || "",
            email: persona.email || "",
            telefono: persona.telefono || "",
            direccion: persona.direccion || "",
            estado: persona.estado,
        });
        setIsModalOpen(true);
    };

    if (loading && personas.length === 0) return <div className="p-8 text-center text-indigo-600 font-semibold">Cargando personas...</div>;

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Módulo de Personas</h1>
                    <p className="text-gray-500 mt-1">Centraliza la información de inquilinos, propietarios y garantes</p>
                </div>
                {canCreate && <button
                    onClick={() => {
                        setEditingPersona(null);
                        resetForm();
                        setIsModalOpen(true);
                    }}
                    className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 font-semibold"
                >
                    <PlusIcon className="w-5 h-5" />
                    Nueva Persona
                </button>}
            </div>

            <div className="mb-6"><FilterBar query={searchTerm} onQueryChange={setSearchTerm} onClear={() => setSearchTerm("")} resultCount={total} placeholder="Buscar por nombre, DNI o email..." /></div>

            {/* VISTA DESKTOP */}
            <div className="hidden bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden lg:block">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="sticky top-0 z-10 bg-gray-50">
                            <tr className="bg-gray-50/50 border-b border-gray-100">
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Persona</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Contacto</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Roles</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Estado</th>
                                <th className="sticky right-0 z-20 bg-gray-50 px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right shadow-[-8px_0_12px_-12px_rgba(15,23,42,0.65)]">Acciones</th>
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
                                                <p className="text-sm text-gray-500">{p.dni || "Sin ID"}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm">
                                            <p className="text-gray-900">{p.email || "-"}</p>
                                            {p.telefono ? (
                                                <WhatsAppLink phone={p.telefono} className="text-gray-500" />
                                            ) : (
                                                <p className="text-gray-500">-</p>
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
                                            {p.estado}
                                        </span>
                                    </td>
                                    <td className="sticky right-0 z-10 bg-white px-6 py-4 text-right shadow-[-8px_0_12px_-12px_rgba(15,23,42,0.65)]">
                                        <div className="flex justify-end gap-2">
                                            {canEdit && <button
                                                onClick={() => handleEdit(p)}
                                                className="inline-flex h-11 w-11 items-center justify-center text-gray-600 hover:text-blue-700 transition-colors bg-white hover:bg-blue-50 rounded-lg"
                                                title="Editar"
                                            >
                                                <PencilSquareIcon className="w-5 h-5" />
                                            </button>}
                                            {canDelete && <button
                                                onClick={() => handleDelete(p.id)}
                                                className="inline-flex h-11 w-11 items-center justify-center text-gray-600 hover:text-red-700 transition-colors bg-white hover:bg-red-50 rounded-lg"
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
                                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                                        No se encontraron personas con ese criterio.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* VISTA MOBILE */}
            <div className="space-y-4 lg:hidden">
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
                                {p.estado}
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
                        
                        {(canEdit || canDelete) && <div className="flex justify-end gap-2 pt-3 border-t border-gray-100 mt-1">
                            {canEdit && <button
                                onClick={() => handleEdit(p)}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                            >
                                <PencilSquareIcon className="w-4 h-4" /> Editar
                            </button>}
                            {canDelete && <button
                                onClick={() => handleDelete(p.id)}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                            >
                                <TrashIcon className="w-4 h-4" /> Eliminar
                            </button>}
                        </div>}
                    </div>
                ))}
                {personas.length === 0 && (
                    <div className="p-8 text-center bg-white rounded-xl border border-gray-100 text-gray-500 text-sm">
                        No se encontraron personas con ese criterio.
                    </div>
                )}
            </div>

            <ServerPagination page={currentPage} totalPages={totalPages} total={total} pageSize={25} currentCount={personas.length} onPageChange={setCurrentPage} />

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold text-gray-900">
                                {editingPersona ? "Editar Persona" : "Nueva Persona"}
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-600 hover:text-gray-600">
                                ✕
                            </button>
                        </div>

                        <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
                            <FormError message={formError} />
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Nombre y Apellido / Razón Social *</label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                        value={formData.nombreCompleto}
                                        onChange={(e) => setFormData({ ...formData, nombreCompleto: e.target.value })}
                                        placeholder="Ej: Juan Pérez S.A."
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">DNI / CUIT</label>
                                    <input
                                        type="text"
                                        className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                        value={formData.dni || ""}
                                        onChange={(e) => setFormData({ ...formData, dni: e.target.value })}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                                    <select
                                        className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                        value={formData.estado}
                                        onChange={(e) => setFormData({ ...formData, estado: e.target.value as 'ACTIVO' | 'INACTIVO' })}
                                    >
                                        <option value="ACTIVO">Activo</option>
                                        <option value="INACTIVO">Inactivo</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                    <input
                                        type="email"
                                        className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                        value={formData.email || ""}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                                    <input
                                        type="tel"
                                        className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                        value={formData.telefono}
                                        onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                                    />
                                </div>

                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
                                    <input
                                        type="text"
                                        className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                        value={formData.direccion || ""}
                                        onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                                        placeholder="Calle, número, piso..."
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-xl transition-colors font-medium"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="px-6 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all font-semibold shadow-lg shadow-indigo-100"
                                >
                                    Guardar Persona
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
