import { useState, useEffect, useRef } from "react";
import {
    EyeIcon,
    HomeModernIcon,
    PlusIcon,
    PencilSquareIcon,
    TrashIcon,
} from "@heroicons/react/24/outline";
import { propertiesService, type Property, type PropertyInput, type TipoPropiedad, type EstadoPropiedad } from "../services/properties.service";
import { useAuth } from "../context/AuthContext";
import { hasPermission } from "../utils/permissions";
import ServerPagination from "../components/ServerPagination";
import toast from "react-hot-toast";
import { requestConfirmation } from "../services/confirmation";
import FilterBar, { persistFilter, readPersistedFilter } from "../components/FilterBar";
import FormError, { useFormError } from "../components/FormError";
import AppSelect from "../components/AppSelect";
import PropertyDetailsModal from "../components/PropertyDetailsModal";
import { useNavigate, useSearchParams } from "react-router-dom";
import { getPropertyTypeLabel, getStatusLabel } from "../utils/status";
import ActiveFilterChips from "../components/ActiveFilterChips";

const propertyTypes: TipoPropiedad[] = ["DEPARTAMENTO", "CASA", "LOCAL", "OTRO"];
const propertyStates: EstadoPropiedad[] = ["DISPONIBLE", "ALQUILADO", "INACTIVO"];

const readPage = (value: string | null) => {
    const page = Number(value);
    return Number.isInteger(page) && page > 0 ? page : 1;
};

const isPropertyType = (value: string | null): value is TipoPropiedad => propertyTypes.includes(value as TipoPropiedad);
const isPropertyState = (value: string | null): value is EstadoPropiedad => propertyStates.includes(value as EstadoPropiedad);
const readPropertyType = (value: string | null): TipoPropiedad | "" => isPropertyType(value) ? value : "";
const readPropertyState = (value: string | null): EstadoPropiedad | "" => isPropertyState(value) ? value : "";

export default function Propiedades() {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const { user } = useAuth();
    const canCreate = hasPermission(user, "propiedades.crear");
    const canEdit = hasPermission(user, "propiedades.editar");
    const canDelete = hasPermission(user, "propiedades.eliminar");
    const [properties, setProperties] = useState<Property[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState(() => searchParams.get("q") ?? readPersistedFilter("propiedades"));
    const [debouncedSearch, setDebouncedSearch] = useState(() => searchParams.get("q") ?? readPersistedFilter("propiedades"));
    const [currentPage, setCurrentPage] = useState(() => readPage(searchParams.get("page")));
    const [tipoFilter, setTipoFilter] = useState<TipoPropiedad | "">(() => readPropertyType(searchParams.get("tipo")));
    const [estadoFilter, setEstadoFilter] = useState<EstadoPropiedad | "">(() => readPropertyState(searchParams.get("estado")));
    const hasSyncedUrl = useRef(false);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProperty, setEditingProperty] = useState<Property | null>(null);
    const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
    const { error: formError, setError: setFormError, reportError, formRef } = useFormError();
    const [formData, setFormData] = useState<PropertyInput>({
        direccion: "",
        piso: "",
        departamento: "",
        tipo: "DEPARTAMENTO",
        estado: "DISPONIBLE",
        observaciones: "",
        servicios: "",
        llaves: "",
        partidaInmobiliaria: "",
        matricula: "",
        superficieM2: null,
    });

    useEffect(() => {
        persistFilter("propiedades", searchTerm);
        const timer = setTimeout(() => {
            setDebouncedSearch(searchTerm);
        }, 300);

        return () => clearTimeout(timer);
    }, [searchTerm]);

    // La URL es la fuente de verdad para vistas compartidas y navegación atrás/adelante.
    // Sólo se conserva el filtro de sesión cuando se llega por primera vez sin parámetros.
    useEffect(() => {
        const query = searchParams.get("q");
        if (query !== null || hasSyncedUrl.current) {
            const nextQuery = query ?? "";
            setSearchTerm(current => current === nextQuery ? current : nextQuery);
            setDebouncedSearch(current => current === nextQuery ? current : nextQuery);
        }
        setCurrentPage(readPage(searchParams.get("page")));
        setTipoFilter(readPropertyType(searchParams.get("tipo")));
        setEstadoFilter(readPropertyState(searchParams.get("estado")));
        hasSyncedUrl.current = true;
    }, [searchParams]);

    useEffect(() => {
        const controller = new AbortController();
        loadProperties(debouncedSearch, currentPage, controller.signal, tipoFilter || undefined, estadoFilter || undefined);
        return () => controller.abort();
    }, [debouncedSearch, currentPage, tipoFilter, estadoFilter]);

    const loadProperties = async (
        searchQuery: string = debouncedSearch,
        page: number = currentPage,
        signal?: AbortSignal,
        tipo: TipoPropiedad | undefined = tipoFilter || undefined,
        estado: EstadoPropiedad | undefined = estadoFilter || undefined
    ) => {
        setLoading(true);
        try {
            const response = await propertiesService.getAll({ search: searchQuery, tipo, estado, page, limit: 25, signal });
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

    const updateSearch = (value: string) => {
        setSearchTerm(value);
        setCurrentPage(1);
        setSearchParams(current => {
            const next = new URLSearchParams(current);
            if (value.trim()) next.set("q", value.trim());
            else next.delete("q");
            next.delete("page");
            return next;
        }, { replace: true });
    };

    const updateTipoFilter = (value: TipoPropiedad | "") => {
        setTipoFilter(value);
        setCurrentPage(1);
        setSearchParams(current => {
            const next = new URLSearchParams(current);
            if (value) next.set("tipo", value);
            else next.delete("tipo");
            next.delete("page");
            return next;
        }, { replace: true });
    };

    const updateEstadoFilter = (value: EstadoPropiedad | "") => {
        setEstadoFilter(value);
        setCurrentPage(1);
        setSearchParams(current => {
            const next = new URLSearchParams(current);
            if (value) next.set("estado", value);
            else next.delete("estado");
            next.delete("page");
            return next;
        }, { replace: true });
    };

    const updatePage = (page: number) => {
        setCurrentPage(page);
        setSearchParams(current => {
            const next = new URLSearchParams(current);
            if (page > 1) next.set("page", String(page));
            else next.delete("page");
            return next;
        }, { replace: true });
    };

    const clearFilters = () => {
        setSearchTerm("");
        setDebouncedSearch("");
        setTipoFilter("");
        setEstadoFilter("");
        setCurrentPage(1);
        setSearchParams(current => {
            const next = new URLSearchParams(current);
            ["q", "tipo", "estado", "page"].forEach(key => next.delete(key));
            return next;
        }, { replace: true });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError("");
        try {
            if (editingProperty) {
                await propertiesService.update(editingProperty.id, { ...formData, version: editingProperty.version });
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
            servicios: "",
            llaves: "",
            partidaInmobiliaria: "",
            matricula: "",
            superficieM2: null,
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
            servicios: property.servicios || "",
            llaves: property.llaves || "",
            partidaInmobiliaria: property.partidaInmobiliaria || "",
            matricula: property.matricula || "",
            superficieM2: property.superficieM2 === null ? null : Number(property.superficieM2),
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
                    <h1 className="text-3xl font-bold text-gray-900">Propiedades</h1>
                    <p className="text-content-muted mt-1">Gestión de unidades para alquiler</p>
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
                    Nueva propiedad
                </button>}
            </div>

            <div className="mb-4">
                <FilterBar query={searchTerm} onQueryChange={updateSearch} onClear={clearFilters} resultCount={total} placeholder="Buscar por dirección, partida, matrícula o servicios...">
                    <AppSelect
                        ariaLabel="Filtrar por tipo de propiedad"
                        value={tipoFilter}
                        onChange={value => updateTipoFilter(value as TipoPropiedad | "")}
                        options={[{ value: "", label: "Todos los tipos" }, ...propertyTypes.map(value => ({ value, label: getPropertyTypeLabel(value) }))]}
                    />
                    <AppSelect
                        ariaLabel="Filtrar por estado de propiedad"
                        value={estadoFilter}
                        onChange={value => updateEstadoFilter(value as EstadoPropiedad | "")}
                        options={[{ value: "", label: "Todos los estados" }, ...propertyStates.map(value => ({ value, label: getStatusLabel(value) }))]}
                    />
                </FilterBar>
            </div>
            <ActiveFilterChips filters={[
                ...(searchTerm ? [{ key: "q", label: `Búsqueda: ${searchTerm}`, onRemove: () => updateSearch("") }] : []),
                ...(tipoFilter ? [{ key: "tipo", label: `Tipo: ${getPropertyTypeLabel(tipoFilter)}`, onRemove: () => updateTipoFilter("") }] : []),
                ...(estadoFilter ? [{ key: "estado", label: `Estado: ${getStatusLabel(estadoFilter)}`, onRemove: () => updateEstadoFilter("") }] : [])
            ]} onClearAll={clearFilters} />

            {/* VISTA DESKTOP */}
            <div className="hidden bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden 2xl:block">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="sticky top-0 z-10 bg-gray-50">
                            <tr className="bg-gray-50/50 border-b border-gray-100">
                                <th className="px-6 py-4 text-xs font-bold text-content-muted uppercase tracking-wider">Propiedad</th>
                                <th className="px-6 py-4 text-xs font-bold text-content-muted uppercase tracking-wider">Detalles</th>
                                <th className="px-6 py-4 text-xs font-bold text-content-muted uppercase tracking-wider">Tipo</th>
                                <th className="px-6 py-4 text-xs font-bold text-content-muted uppercase tracking-wider">Estado</th>
                                <th className="sticky right-0 z-20 bg-gray-50 px-6 py-4 text-xs font-bold text-content-muted uppercase tracking-wider text-right shadow-[-8px_0_12px_-12px_rgba(15,23,42,0.65)]">Acciones</th>
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
                                                <p className="text-sm text-content-muted">{p.piso ? `Piso ${p.piso}` : ""} {p.departamento ? `Depto ${p.departamento}` : ""}</p>
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
                                            {getPropertyTypeLabel(p.tipo)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusBadgeClass(p.estado)}`}>
                                            {getStatusLabel(p.estado)}
                                        </span>
                                    </td>
                                    <td className="sticky right-0 z-10 bg-white px-6 py-4 text-right shadow-[-8px_0_12px_-12px_rgba(15,23,42,0.65)]">
                                        <div className="flex justify-end gap-2">
                                            <button
                                                onClick={() => setSelectedProperty(p)}
                                                className="inline-flex h-11 w-11 items-center justify-center text-indigo-700 transition-colors bg-white hover:bg-indigo-50 rounded-lg"
                                                title="Ver ficha completa"
                                                aria-label={`Ver ficha de ${p.direccion}`}
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
                            {properties.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-content-muted">
                                        No se encontraron propiedades con ese criterio.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* VISTA MOBILE */}
            <div className="space-y-4 2xl:hidden">
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
                                {getStatusLabel(p.estado)}
                            </span>
                        </div>
                        
                        <div className="flex items-center justify-between mt-1">
                             <span className="px-2 py-0.5 rounded-md text-xs font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700">
                                 {getPropertyTypeLabel(p.tipo)}
                             </span>
                        </div>

                        {p.observaciones && (
                             <p className="text-xs text-content-muted line-clamp-2 bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                                 {p.observaciones}
                             </p>
                        )}
                        
                        <div className="flex flex-wrap justify-end gap-2 pt-3 border-t border-gray-100 mt-1">
                            <button
                                onClick={() => setSelectedProperty(p)}
                                aria-label={`Ver ficha de ${p.direccion}`}
                                className="flex min-h-11 items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-indigo-800 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
                            >
                                <EyeIcon className="w-4 h-4" /> Ver ficha
                            </button>
                            {canEdit && <button
                                onClick={() => handleEdit(p)}
                                aria-label={`Editar ${p.direccion}`}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                            >
                                <PencilSquareIcon className="w-4 h-4" /> Editar
                            </button>}
                            {canDelete && <button
                                onClick={() => handleDelete(p.id)}
                                aria-label={`Eliminar ${p.direccion}`}
                                data-danger-trigger="true"
                                className="destructive-action flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-colors"
                            >
                                <TrashIcon className="w-4 h-4" /> Eliminar
                            </button>}
                        </div>
                    </div>
                ))}
                {properties.length === 0 && (
                    <div className="p-8 text-center bg-white rounded-xl border border-gray-100 text-content-muted text-sm">
                        No se encontraron propiedades con ese criterio.
                    </div>
                )}
            </div>

            <ServerPagination page={currentPage} totalPages={totalPages} total={total} pageSize={25} currentCount={properties.length} onPageChange={updatePage} />

            <PropertyDetailsModal
                isOpen={Boolean(selectedProperty)}
                property={selectedProperty}
                canEdit={canEdit}
                onClose={() => setSelectedProperty(null)}
                onEdit={handleEdit}
                onChanged={() => void loadProperties(debouncedSearch, currentPage)}
                onGoToContracts={() => {
                    setSelectedProperty(null);
                    navigate('/contratos');
                }}
            />

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold text-gray-900">
                                {editingProperty ? "Editar propiedad" : "Nueva propiedad"}
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-600 hover:text-gray-600">
                                ✕
                            </button>
                        </div>

                        <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
                            <FormError message={formError} />
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="md:col-span-2">
                                    <label htmlFor="property-address" className="block text-sm font-medium text-gray-700 mb-1">Dirección *</label>
                                    <input
                                        id="property-address"
                                        type="text"
                                        required
                                        className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                        value={formData.direccion}
                                        onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                                        placeholder="Ej: Av. Siempreviva 742"
                                    />
                                </div>

                                <div>
                                    <label htmlFor="property-floor" className="block text-sm font-medium text-gray-700 mb-1">Piso</label>
                                    <input
                                        id="property-floor"
                                        type="text"
                                        className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                        value={formData.piso || ""}
                                        onChange={(e) => setFormData({ ...formData, piso: e.target.value })}
                                    />
                                </div>

                                <div>
                                    <label htmlFor="property-unit" className="block text-sm font-medium text-gray-700 mb-1">Dpto / Unidad</label>
                                    <input
                                        id="property-unit"
                                        type="text"
                                        className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                        value={formData.departamento || ""}
                                        onChange={(e) => setFormData({ ...formData, departamento: e.target.value })}
                                    />
                                </div>

                                <div>
                                    <label htmlFor="property-type" className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                                    <AppSelect
                                        id="property-type"
                                        ariaLabel="Tipo de propiedad"
                                        value={formData.tipo}
                                        onChange={(value) => setFormData({ ...formData, tipo: value as TipoPropiedad })}
                                        options={[
                                            { value: "DEPARTAMENTO", label: "Departamento" },
                                            { value: "CASA", label: "Casa" },
                                            { value: "LOCAL", label: "Local" },
                                            { value: "OTRO", label: "Otro" }
                                        ]}
                                    />
                                </div>

                                <div>
                                    <label htmlFor="property-status" className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                                    <AppSelect
                                        id="property-status"
                                        ariaLabel="Estado de la propiedad"
                                        value={formData.estado}
                                        onChange={(value) => setFormData({ ...formData, estado: value as EstadoPropiedad })}
                                        options={[
                                            { value: "DISPONIBLE", label: "Disponible" },
                                            { value: "ALQUILADO", label: "Alquilado" },
                                            { value: "INACTIVO", label: "Inactivo" }
                                        ]}
                                    />
                                </div>

                                <div className="md:col-span-2 mt-2 border-t border-gray-100 pt-4">
                                    <p className="text-sm font-semibold text-gray-900">Datos catastrales (opcionales)</p>
                                    <p className="mt-1 text-xs text-content-muted">Sirven para identificar la unidad; pueden completarse más adelante.</p>
                                </div>

                                <div>
                                    <label htmlFor="property-land-record" className="block text-sm font-medium text-gray-700 mb-1">Partida inmobiliaria</label>
                                    <input
                                        id="property-land-record"
                                        type="text"
                                        maxLength={100}
                                        className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                        value={formData.partidaInmobiliaria || ""}
                                        onChange={(e) => setFormData({ ...formData, partidaInmobiliaria: e.target.value })}
                                        placeholder="Ej.: 12-345678-9"
                                    />
                                </div>

                                <div>
                                    <label htmlFor="property-registration" className="block text-sm font-medium text-gray-700 mb-1">Matrícula</label>
                                    <input
                                        id="property-registration"
                                        type="text"
                                        maxLength={100}
                                        className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                        value={formData.matricula || ""}
                                        onChange={(e) => setFormData({ ...formData, matricula: e.target.value })}
                                        placeholder="Ej.: 12345/6"
                                    />
                                </div>

                                <div>
                                    <label htmlFor="property-area" className="block text-sm font-medium text-gray-700 mb-1">Superficie (m²)</label>
                                    <input
                                        id="property-area"
                                        type="number"
                                        min="0.01"
                                        max="100000"
                                        step="0.01"
                                        inputMode="decimal"
                                        className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                        value={formData.superficieM2 ?? ""}
                                        onChange={(e) => setFormData({ ...formData, superficieM2: e.target.value === "" ? null : Number(e.target.value) })}
                                        placeholder="Ej.: 58,50"
                                    />
                                </div>

                                <div className="md:col-span-2">
                                    <label htmlFor="property-services" className="block text-sm font-medium text-gray-700 mb-1">Servicios, medidores y cuentas</label>
                                    <textarea
                                        id="property-services"
                                        rows={3}
                                        maxLength={2000}
                                        className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                        value={formData.servicios || ""}
                                        onChange={(e) => setFormData({ ...formData, servicios: e.target.value })}
                                        placeholder="Ej: Luz medidor 12345; gas cuenta 987; agua incluida en expensas..."
                                    />
                                </div>

                                <div className="md:col-span-2">
                                    <label htmlFor="property-keys" className="block text-sm font-medium text-gray-700 mb-1">Llaves y accesos</label>
                                    <textarea
                                        id="property-keys"
                                        rows={2}
                                        maxLength={1000}
                                        className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                        value={formData.llaves || ""}
                                        onChange={(e) => setFormData({ ...formData, llaves: e.target.value })}
                                        placeholder="Ej: 2 juegos; uno en oficina, casillero 4; llave magnética..."
                                    />
                                </div>

                                <div className="md:col-span-2">
                                    <label htmlFor="property-observations" className="block text-sm font-medium text-gray-700 mb-1">Observaciones</label>
                                    <textarea
                                        id="property-observations"
                                        rows={4}
                                        maxLength={2000}
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
                                    Guardar propiedad
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
