import { useState, useEffect } from "react";
import {
    HomeModernIcon,
    PlusIcon,
    PencilSquareIcon,
    TrashIcon,
} from "@heroicons/react/24/outline";
import { propertiesService, type Property, type TipoPropiedad, type EstadoPropiedad } from "../services/properties.service";
import { useAuth } from "../context/AuthContext";
import { hasPermission } from "../utils/permissions";
import ServerPagination from "../components/ServerPagination";
import toast from "react-hot-toast";
import { requestConfirmation } from "../services/confirmation";
import FilterBar, { persistFilter, readPersistedFilter } from "../components/FilterBar";
import FormError, { useFormError } from "../components/FormError";

export default function Propiedades() {
    const { user } = useAuth();
    const canCreate = hasPermission(user, "propiedades.crear");
    const canEdit = hasPermission(user, "propiedades.editar");
    const canDelete = hasPermission(user, "propiedades.eliminar");
    const [properties, setProperties] = useState<Property[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState(() => readPersistedFilter("propiedades"));
    const [debouncedSearch, setDebouncedSearch] = useState(() => readPersistedFilter("propiedades"));
    const [currentPage, setCurrentPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProperty, setEditingProperty] = useState<Property | null>(null);
    const { error: formError, setError: setFormError, reportError, formRef } = useFormError();
    const [formData, setFormData] = useState<Omit<Property, 'id'>>({
        direccion: "",
        piso: "",
        departamento: "",
        tipo: "DEPARTAMENTO",
        estado: "DISPONIBLE",
        observaciones: "",
    });

    useEffect(() => {
        persistFilter("propiedades", searchTerm);
        const timer = setTimeout(() => {
            setCurrentPage(1);
            setDebouncedSearch(searchTerm);
        }, 300);

        return () => clearTimeout(timer);
    }, [searchTerm]);

    useEffect(() => {
        const controller = new AbortController();
        loadProperties(debouncedSearch, currentPage, controller.signal);
        return () => controller.abort();
    }, [debouncedSearch, currentPage]);

    const loadProperties = async (searchQuery: string = debouncedSearch, page: number = currentPage, signal?: AbortSignal) => {
        setLoading(true);
        try {
            const response = await propertiesService.getAll({ search: searchQuery, page, limit: 25, signal });
            setProperties(response.data);
            setTotal(response.meta.total);
            setTotalPages(response.meta.totalPages);
        } catch (error) {
            if (error instanceof DOMException && error.name === 'AbortError') return;
            console.error("Error loading properties:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError("");
        try {
            if (editingProperty) {
                await propertiesService.update(editingProperty.id, formData);
            } else {
                await propertiesService.create(formData);
            }
            setIsModalOpen(false);
            setEditingProperty(null);
            resetForm();
            loadProperties();
        } catch (error) {
            reportError(error, "No se pudo guardar la propiedad");
        }
    };

    const handleDelete = async (id: number) => {
        if (await requestConfirmation({ title: "Eliminar propiedad", message: "La propiedad se eliminará si no tiene contratos o dependencias asociadas.", confirmText: "Eliminar" })) {
            try {
                await propertiesService.delete(id);
                loadProperties(debouncedSearch);
            } catch (error: any) {
                toast.error(error instanceof Error ? error.message : "No se pudo eliminar la propiedad");
            }
        }
    };

    const resetForm = () => {
        setFormData({
            direccion: "",
            piso: "",
            departamento: "",
            tipo: "DEPARTAMENTO",
            estado: "DISPONIBLE",
            observaciones: "",
        });
    };

    const handleEdit = (property: Property) => {
        setEditingProperty(property);
        setFormData({
            direccion: property.direccion,
            piso: property.piso || "",
            departamento: property.departamento || "",
            tipo: property.tipo,
            estado: property.estado,
            observaciones: property.observaciones || "",
        });
        setIsModalOpen(true);
    };

    const getStatusBadgeClass = (estado: EstadoPropiedad) => {
        switch (estado) {
            case "DISPONIBLE": return "bg-green-100 text-green-700";
            case "ALQUILADO": return "bg-blue-100 text-blue-700";
            case "INACTIVO": return "bg-red-100 text-red-700";
            default: return "bg-gray-100 text-gray-700";
        }
    };

    if (loading && properties.length === 0) return <div className="p-8 text-center text-indigo-600 font-semibold">Cargando propiedades...</div>;

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Módulo de Propiedades</h1>
                    <p className="text-gray-500 mt-1">Gestión de unidades para alquiler</p>
                </div>
                {canCreate && <button
                    onClick={() => {
                        setEditingProperty(null);
                        resetForm();
                        setIsModalOpen(true);
                    }}
                    className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 font-semibold"
                >
                    <PlusIcon className="w-5 h-5" />
                    Nueva Propiedad
                </button>}
            </div>

            <div className="mb-6"><FilterBar query={searchTerm} onQueryChange={setSearchTerm} onClear={() => setSearchTerm("")} resultCount={total} placeholder="Buscar por dirección, tipo o estado..." /></div>

            {/* VISTA DESKTOP */}
            <div className="hidden bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden lg:block">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="sticky top-0 z-10 bg-gray-50">
                            <tr className="bg-gray-50/50 border-b border-gray-100">
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Propiedad</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Detalles</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Tipo</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Estado</th>
                                <th className="sticky right-0 z-20 bg-gray-50 px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right shadow-[-8px_0_12px_-12px_rgba(15,23,42,0.65)]">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {properties.map((p) => (
                                <tr key={p.id} className="hover:bg-gray-50/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="bg-indigo-50 p-2 rounded-lg">
                                                <HomeModernIcon className="w-5 h-5 text-indigo-600" />
                                            </div>
                                            <div className="min-w-0 max-w-72">
                                                <p className="truncate font-semibold text-gray-900" title={p.direccion}>{p.direccion}</p>
                                                <p className="text-sm text-gray-500">{p.piso ? `Piso ${p.piso}` : ""} {p.departamento ? `Depto ${p.departamento}` : ""}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm">
                                            <p className="text-gray-600 text-xs truncate max-w-[200px]" title={p.observaciones || ""}>
                                                {p.observaciones || "Sin observaciones"}
                                            </p>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700">
                                            {p.tipo}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusBadgeClass(p.estado)}`}>
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
                            {properties.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                                        No se encontraron propiedades con ese criterio.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* VISTA MOBILE */}
            <div className="space-y-4 lg:hidden">
                {properties.map((p) => (
                    <div key={p.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col gap-3">
                        <div className="flex justify-between items-start">
                            <div className="flex items-center gap-3">
                                <div className="bg-indigo-50 p-2 rounded-lg">
                                    <HomeModernIcon className="w-5 h-5 text-indigo-600" />
                                </div>
                                <div>
                                    <p className="font-bold text-gray-900 leading-tight">{p.direccion}</p>
                                    <p className="text-xs font-bold text-gray-600 uppercase tracking-wider mt-0.5">{p.piso ? `PISO ${p.piso}` : ""} {p.departamento ? `DEPTO ${p.departamento}` : ""}</p>
                                </div>
                            </div>
                            <span className={`px-2 py-0.5 rounded-md text-xs font-bold uppercase tracking-wider ${getStatusBadgeClass(p.estado)}`}>
                                {p.estado}
                            </span>
                        </div>
                        
                        <div className="flex items-center justify-between mt-1">
                             <span className="px-2 py-0.5 rounded-md text-xs font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700">
                                 {p.tipo}
                             </span>
                        </div>

                        {p.observaciones && (
                             <p className="text-xs text-gray-500 line-clamp-2 bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                                 {p.observaciones}
                             </p>
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
                {properties.length === 0 && (
                    <div className="p-8 text-center bg-white rounded-xl border border-gray-100 text-gray-500 text-sm">
                        No se encontraron propiedades con ese criterio.
                    </div>
                )}
            </div>

            <ServerPagination page={currentPage} totalPages={totalPages} total={total} pageSize={25} currentCount={properties.length} onPageChange={setCurrentPage} />

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold text-gray-900">
                                {editingProperty ? "Editar Propiedad" : "Nueva Propiedad"}
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-600 hover:text-gray-600">
                                ✕
                            </button>
                        </div>

                        <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
                            <FormError message={formError} />
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Dirección *</label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                        value={formData.direccion}
                                        onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                                        placeholder="Ej: Av. Siempreviva 742"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Piso</label>
                                    <input
                                        type="text"
                                        className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                        value={formData.piso || ""}
                                        onChange={(e) => setFormData({ ...formData, piso: e.target.value })}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Dpto / Unidad</label>
                                    <input
                                        type="text"
                                        className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                        value={formData.departamento || ""}
                                        onChange={(e) => setFormData({ ...formData, departamento: e.target.value })}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                                    <select
                                        className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                        value={formData.tipo}
                                        onChange={(e) => setFormData({ ...formData, tipo: e.target.value as TipoPropiedad })}
                                    >
                                        <option value="DEPARTAMENTO">Departamento</option>
                                        <option value="CASA">Casa</option>
                                        <option value="LOCAL">Local</option>
                                        <option value="OTRO">Otro</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                                    <select
                                        className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                        value={formData.estado}
                                        onChange={(e) => setFormData({ ...formData, estado: e.target.value as EstadoPropiedad })}
                                    >
                                        <option value="DISPONIBLE">Disponible</option>
                                        <option value="ALQUILADO">Alquilado</option>
                                        <option value="INACTIVO">Inactivo</option>
                                    </select>
                                </div>

                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Observaciones</label>
                                    <textarea
                                        rows={3}
                                        className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                        value={formData.observaciones || ""}
                                        onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                                        placeholder="Detalles adicionales de la propiedad..."
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
                                    Guardar Propiedad
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
