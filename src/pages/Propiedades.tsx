import { useState, useEffect } from "react";
import {
    HomeModernIcon,
    PlusIcon,
    PencilSquareIcon,
    TrashIcon,
    MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";
import { propertiesService, type Property, type TipoPropiedad, type EstadoPropiedad } from "../services/properties.service";

export default function Propiedades() {
    const [properties, setProperties] = useState<Property[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProperty, setEditingProperty] = useState<Property | null>(null);
    const [formData, setFormData] = useState<Omit<Property, 'id'>>({
        direccion: "",
        piso: "",
        departamento: "",
        tipo: "DEPARTAMENTO",
        estado: "DISPONIBLE",
        observaciones: "",
    });

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchTerm);
        }, 300);

        return () => clearTimeout(timer);
    }, [searchTerm]);

    useEffect(() => {
        loadProperties(debouncedSearch);
    }, [debouncedSearch]);

    const loadProperties = async (searchQuery: string = "") => {
        setLoading(true);
        try {
            const data = await propertiesService.getAll(searchQuery);
            setProperties(data);
        } catch (error) {
            console.error("Error loading properties:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
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
            alert("Error al guardar propiedad");
        }
    };

    const handleDelete = async (id: number) => {
        if (window.confirm("¿Estás seguro de eliminar esta propiedad?")) {
            try {
                await propertiesService.delete(id);
                loadProperties(debouncedSearch);
            } catch (error: any) {
                alert(error.response?.data?.message || "Error al eliminar propiedad");
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
                <button
                    onClick={() => {
                        setEditingProperty(null);
                        resetForm();
                        setIsModalOpen(true);
                    }}
                    className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 font-semibold"
                >
                    <PlusIcon className="w-5 h-5" />
                    Nueva Propiedad
                </button>
            </div>

            {/* Buscador */}
            <div className="mb-6 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                </div>
                <input
                    type="text"
                    placeholder="Buscar por dirección, tipo o estado..."
                    className="pl-10 w-full md:w-1/3 px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            {/* VISTA DESKTOP */}
            <div className="hidden md:block bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50/50 border-b border-gray-100">
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Propiedad</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Detalles</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Tipo</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Estado</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Acciones</th>
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
                                            <div>
                                                <p className="font-semibold text-gray-900">{p.direccion}</p>
                                                <p className="text-sm text-gray-500">{p.piso ? `Piso ${p.piso}` : ""} {p.departamento ? `Depto ${p.departamento}` : ""}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm">
                                            <p className="text-gray-400 text-xs truncate max-w-[200px]" title={p.observaciones || ""}>
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
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button
                                                onClick={() => handleEdit(p)}
                                                className="p-2 text-gray-400 hover:text-blue-600 transition-colors bg-white hover:bg-blue-50 rounded-lg"
                                                title="Editar"
                                            >
                                                <PencilSquareIcon className="w-5 h-5" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(p.id)}
                                                className="p-2 text-gray-400 hover:text-red-600 transition-colors bg-white hover:bg-red-50 rounded-lg"
                                                title="Eliminar"
                                            >
                                                <TrashIcon className="w-5 h-5" />
                                            </button>
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
            <div className="md:hidden space-y-4">
                {properties.map((p) => (
                    <div key={p.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col gap-3">
                        <div className="flex justify-between items-start">
                            <div className="flex items-center gap-3">
                                <div className="bg-indigo-50 p-2 rounded-lg">
                                    <HomeModernIcon className="w-5 h-5 text-indigo-600" />
                                </div>
                                <div>
                                    <p className="font-bold text-gray-900 leading-tight">{p.direccion}</p>
                                    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mt-0.5">{p.piso ? `PISO ${p.piso}` : ""} {p.departamento ? `DEPTO ${p.departamento}` : ""}</p>
                                </div>
                            </div>
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${getStatusBadgeClass(p.estado)}`}>
                                {p.estado}
                            </span>
                        </div>
                        
                        <div className="flex items-center justify-between mt-1">
                             <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700">
                                 {p.tipo}
                             </span>
                        </div>

                        {p.observaciones && (
                             <p className="text-[11px] text-gray-500 line-clamp-2 bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                                 {p.observaciones}
                             </p>
                        )}
                        
                        <div className="flex justify-end gap-2 pt-3 border-t border-gray-100 mt-1">
                            <button
                                onClick={() => handleEdit(p)}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                            >
                                <PencilSquareIcon className="w-4 h-4" /> Editar
                            </button>
                            <button
                                onClick={() => handleDelete(p.id)}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                            >
                                <TrashIcon className="w-4 h-4" /> Eliminar
                            </button>
                        </div>
                    </div>
                ))}
                {properties.length === 0 && (
                    <div className="p-8 text-center bg-white rounded-xl border border-gray-100 text-gray-500 text-sm">
                        No se encontraron propiedades con ese criterio.
                    </div>
                )}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold text-gray-900">
                                {editingProperty ? "Editar Propiedad" : "Nueva Propiedad"}
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">
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
