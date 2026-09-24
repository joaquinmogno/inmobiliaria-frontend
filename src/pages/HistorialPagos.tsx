import { Fragment, useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { pagosService, type Pago } from "../services/pagos.service";
import { ChevronLeftIcon, ChevronRightIcon, DocumentTextIcon, EllipsisVerticalIcon, NoSymbolIcon } from "@heroicons/react/24/outline";
import { Menu, MenuButton, MenuItem, MenuItems, Transition } from "@headlessui/react";
import { formatCurrency, formatSignedCurrency } from "../utils/currency";
import FilterBar, { persistFilter, readPersistedFilter } from "../components/FilterBar";
import ReversalModal from "../components/ReversalModal";
import { useAuth } from "../context/AuthContext";
import { hasPermission } from "../utils/permissions";
import { toast } from "react-hot-toast";
import { formatDate, formatDateTime, formatMonthYear } from "../utils/date";
import AutocompleteSelector from "../components/AutocompleteSelector";
import { personasService, type Persona } from "../services/personas.service";
import ActiveFilterChips from "../components/ActiveFilterChips";

type PaymentFilters = {
    moneda: string;
    metodoPago: string;
    estado: string;
    propietarioId: string;
    inquilinoId: string;
    desde: string;
    hasta: string;
    cuenta: string;
};

const PAYMENT_FILTERS_STORAGE_KEY = "pagos-filtros-v1";
const defaultPaymentFilters: PaymentFilters = {
    moneda: '', metodoPago: '', estado: 'VIGENTE', propietarioId: '', inquilinoId: '', desde: '', hasta: '', cuenta: ''
};

const readStoredPaymentFilters = (): PaymentFilters => {
    try {
        const stored = JSON.parse(localStorage.getItem(PAYMENT_FILTERS_STORAGE_KEY) || '{}');
        return { ...defaultPaymentFilters, ...stored };
    } catch {
        return defaultPaymentFilters;
    }
};

const readPaymentFilters = (params: URLSearchParams): PaymentFilters => {
    const stored = readStoredPaymentFilters();
    return Object.fromEntries(Object.keys(defaultPaymentFilters).map(key => [key, params.get(key) ?? stored[key as keyof PaymentFilters]])) as PaymentFilters;
};

export default function HistorialPagos() {
    const { user } = useAuth();
    const canVoid = hasPermission(user, "pagos.eliminar");
    const [searchParams, setSearchParams] = useSearchParams();
    const initialFilters = readPaymentFilters(searchParams);
    const [pagos, setPagos] = useState<Pago[]>([]);
    const [searchTerm, setSearchTerm] = useState(() => searchParams.get('q') ?? readPersistedFilter("pagos"));
    const [debouncedSearch, setDebouncedSearch] = useState(() => searchParams.get('q') ?? readPersistedFilter("pagos"));
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [selectedPayment, setSelectedPayment] = useState<Pago | null>(null);
    const [monedaFilter, setMonedaFilter] = useState(initialFilters.moneda);
    const [metodoFilter, setMetodoFilter] = useState(initialFilters.metodoPago);
    const [estadoFilter, setEstadoFilter] = useState(initialFilters.estado);
    const [propietarioId, setPropietarioId] = useState(initialFilters.propietarioId);
    const [inquilinoId, setInquilinoId] = useState(initialFilters.inquilinoId);
    const [desdeFilter, setDesdeFilter] = useState(initialFilters.desde);
    const [hastaFilter, setHastaFilter] = useState(initialFilters.hasta);
    const [cuentaFilter, setCuentaFilter] = useState(initialFilters.cuenta);
    const [selectedOwner, setSelectedOwner] = useState<Persona | null>(null);
    const [selectedTenant, setSelectedTenant] = useState<Persona | null>(null);

    const itemsPerPage = 15;

    useEffect(() => {
        persistFilter("pagos", searchTerm);
        setSearchParams(current => {
            const next = new URLSearchParams(current);
            if (searchTerm.trim()) next.set('q', searchTerm.trim());
            else next.delete('q');
            return next;
        }, { replace: true });
        const timer = setTimeout(() => {
            setDebouncedSearch(searchTerm);
        }, 300);
        return () => clearTimeout(timer);
    }, [searchTerm, setSearchParams]);

    useEffect(() => {
        const nextFilters = readPaymentFilters(searchParams);
        const nextSearch = searchParams.get('q');
        if (nextSearch !== null && nextSearch !== searchTerm) {
            setSearchTerm(nextSearch);
            setDebouncedSearch(nextSearch);
        }
        setMonedaFilter(nextFilters.moneda);
        setMetodoFilter(nextFilters.metodoPago);
        setEstadoFilter(nextFilters.estado);
        setPropietarioId(nextFilters.propietarioId);
        setInquilinoId(nextFilters.inquilinoId);
        setDesdeFilter(nextFilters.desde);
        setHastaFilter(nextFilters.hasta);
        setCuentaFilter(nextFilters.cuenta);
    }, [searchParams]);

    useEffect(() => {
        refreshData(currentPage, debouncedSearch);
    }, [currentPage, debouncedSearch, monedaFilter, metodoFilter, estadoFilter, propietarioId, inquilinoId, desdeFilter, hastaFilter, cuentaFilter]);

    useEffect(() => {
        setCurrentPage(1);
    }, [debouncedSearch, monedaFilter, metodoFilter, estadoFilter, propietarioId, inquilinoId, desdeFilter, hastaFilter, cuentaFilter]);

    useEffect(() => {
        const filters: PaymentFilters = { moneda: monedaFilter, metodoPago: metodoFilter, estado: estadoFilter, propietarioId, inquilinoId, desde: desdeFilter, hasta: hastaFilter, cuenta: cuentaFilter };
        localStorage.setItem(PAYMENT_FILTERS_STORAGE_KEY, JSON.stringify(filters));
        setSearchParams(current => {
            const next = new URLSearchParams(current);
            Object.entries(filters).forEach(([key, value]) => value ? next.set(key, value) : next.delete(key));
            return next;
        }, { replace: true });
    }, [monedaFilter, metodoFilter, estadoFilter, propietarioId, inquilinoId, desdeFilter, hastaFilter, cuentaFilter, setSearchParams]);

    useEffect(() => {
        let active = true;
        if (!propietarioId) { setSelectedOwner(null); return; }
        void personasService.getById(Number(propietarioId)).then(person => active && setSelectedOwner(person));
        return () => { active = false; };
    }, [propietarioId]);

    useEffect(() => {
        let active = true;
        if (!inquilinoId) { setSelectedTenant(null); return; }
        void personasService.getById(Number(inquilinoId)).then(person => active && setSelectedTenant(person));
        return () => { active = false; };
    }, [inquilinoId]);

    const refreshData = async (page: number = 1, searchQuery: string = "") => {
        setIsLoading(true);
        setLoadError(null);
        try {
            const response = await pagosService.getAll(page, itemsPerPage, searchQuery, {
                moneda: monedaFilter || undefined,
                metodoPago: metodoFilter || undefined,
                estado: estadoFilter || undefined,
                propietarioId: propietarioId || undefined,
                inquilinoId: inquilinoId || undefined,
                desde: desdeFilter || undefined,
                hasta: hastaFilter || undefined,
                cuenta: cuentaFilter || undefined
            });
            setPagos(response.data);
            setTotalPages(response.meta.totalPages);
            setTotalItems(response.meta.total);
        } catch (error: unknown) {
            console.error("Error loading pagos:", error);
            setPagos([]);
            setTotalPages(1);
            setTotalItems(0);
            setLoadError(error instanceof Error ? error.message : "Ocurrió un error inesperado al consultar los pagos.");
        } finally {
            setIsLoading(false);
        }
    };

    const handlePageChange = (newPage: number) => {
        if (newPage >= 1 && newPage <= totalPages) {
            setCurrentPage(newPage);
        }
    };

    const handleVoid = async (motivo: string) => {
        if (!selectedPayment) return;
        await pagosService.anular(selectedPayment.id, motivo);
        toast.success("Pago anulado y asiento de caja revertido");
        await refreshData(currentPage, debouncedSearch);
    };

    const clearFilters = () => {
        setSearchTerm("");
        setMonedaFilter('');
        setMetodoFilter('');
        setEstadoFilter('VIGENTE');
        setPropietarioId('');
        setInquilinoId('');
        setDesdeFilter('');
        setHastaFilter('');
        setCuentaFilter('');
        setSelectedOwner(null);
        setSelectedTenant(null);
    };

    const activeFilters = [
        ...(searchTerm ? [{ key: 'q', label: `Búsqueda: ${searchTerm}`, onRemove: () => setSearchTerm('') }] : []),
        ...(monedaFilter ? [{ key: 'moneda', label: `Moneda: ${monedaFilter}`, onRemove: () => setMonedaFilter('') }] : []),
        ...(metodoFilter ? [{ key: 'metodoPago', label: `Medio: ${metodoFilter.toLowerCase()}`, onRemove: () => setMetodoFilter('') }] : []),
        ...(cuentaFilter ? [{ key: 'cuenta', label: `Cuenta: ${cuentaFilter === 'CAJA' ? 'Caja' : 'Banco'}`, onRemove: () => setCuentaFilter('') }] : []),
        ...(estadoFilter ? [{ key: 'estado', label: `Estado: ${estadoFilter === 'VIGENTE' ? 'Vigentes' : 'Anulados'}`, onRemove: () => setEstadoFilter('') }] : []),
        ...(selectedOwner ? [{ key: 'propietarioId', label: `Propietario: ${selectedOwner.nombreCompleto}`, onRemove: () => setPropietarioId('') }] : []),
        ...(selectedTenant ? [{ key: 'inquilinoId', label: `Inquilino: ${selectedTenant.nombreCompleto}`, onRemove: () => setInquilinoId('') }] : []),
        ...(desdeFilter ? [{ key: 'desde', label: `Desde: ${formatDate(desdeFilter)}`, onRemove: () => setDesdeFilter('') }] : []),
        ...(hastaFilter ? [{ key: 'hasta', label: `Hasta: ${formatDate(hastaFilter)}`, onRemove: () => setHastaFilter('') }] : [])
    ];

    const formatAddress = (propiedad: any) => {
        if (!propiedad) return "N/A";
        let addr = propiedad.direccion;
        if (propiedad.piso) addr += ` - Piso ${propiedad.piso}`;
        if (propiedad.departamento) addr += ` Dpto ${propiedad.departamento}`;
        return addr;
    };

    const formatPeriod = (dateStr?: string | null) => {
        if (!dateStr) return "N/A";
        const period = formatMonthYear(dateStr);
        return `${period.charAt(0).toUpperCase()}${period.slice(1)}`;
    };

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Historial de pagos</h1>
                    <p className="text-sm text-content-muted">Registro histórico de todos los cobros recibidos</p>
                </div>
            </div>

            <FilterBar query={searchTerm} onQueryChange={setSearchTerm} onClear={clearFilters} resultCount={totalItems} placeholder="Buscar por propiedad, inquilino u observaciones..." />
            <div className="flex flex-wrap gap-2"><select aria-label="Filtrar moneda" value={monedaFilter} onChange={e => setMonedaFilter(e.target.value)} className="rounded-lg border px-3 py-2 text-sm"><option value="">Todas las monedas</option><option value="ARS">ARS</option><option value="USD">USD</option></select><select aria-label="Filtrar método" value={metodoFilter} onChange={e => setMetodoFilter(e.target.value)} className="rounded-lg border px-3 py-2 text-sm"><option value="">Todos los medios</option><option value="EFECTIVO">Efectivo</option><option value="TRANSFERENCIA">Transferencia</option><option value="CHEQUE">Cheque</option></select><select aria-label="Filtrar cuenta" value={cuentaFilter} onChange={e => setCuentaFilter(e.target.value)} className="rounded-lg border px-3 py-2 text-sm"><option value="">Caja y banco</option><option value="CAJA">Caja</option><option value="BANCO">Banco</option></select><select aria-label="Filtrar estado" value={estadoFilter} onChange={e => setEstadoFilter(e.target.value)} className="rounded-lg border px-3 py-2 text-sm"><option value="">Todos</option><option value="VIGENTE">Vigentes</option><option value="ANULADO">Anulados</option></select></div>
            <details className="rounded-xl border border-gray-200 bg-white"><summary className="cursor-pointer px-4 py-3 text-sm font-bold text-gray-800">Personas y período</summary><div className="grid gap-3 border-t border-gray-200 p-4 md:grid-cols-2 xl:grid-cols-4"><AutocompleteSelector<Persona> label="Propietario" placeholder="Buscar propietario..." value={selectedOwner} onSearch={personasService.search} onSelect={person => { setSelectedOwner(person); setPropietarioId(person ? String(person.id) : ''); }} renderItem={person => person.nombreCompleto} renderSelection={person => person.nombreCompleto} idField="id" /><AutocompleteSelector<Persona> label="Inquilino" placeholder="Buscar inquilino..." value={selectedTenant} onSearch={personasService.search} onSelect={person => { setSelectedTenant(person); setInquilinoId(person ? String(person.id) : ''); }} renderItem={person => person.nombreCompleto} renderSelection={person => person.nombreCompleto} idField="id" /><label className="text-sm font-semibold text-gray-800">Desde<input type="date" value={desdeFilter} onChange={event => setDesdeFilter(event.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-gray-300 px-3" /></label><label className="text-sm font-semibold text-gray-800">Hasta<input type="date" value={hastaFilter} onChange={event => setHastaFilter(event.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-gray-300 px-3" /></label></div></details>
            <ActiveFilterChips filters={activeFilters} onClearAll={clearFilters} />

            {loadError && (
                <div role="alert" className="flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900 sm:flex-row sm:items-center sm:justify-between">
                    <p><span className="font-bold">No se pudo cargar el historial de pagos.</span> {loadError}</p>
                    <button type="button" onClick={() => void refreshData(currentPage, debouncedSearch)} className="min-h-9 shrink-0 rounded-lg border border-red-300 bg-white px-3 py-1.5 font-bold text-red-800 hover:bg-red-100">Reintentar</button>
                </div>
            )}

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="divide-y divide-gray-100 2xl:hidden">
                    {isLoading ? (
                        <div className="px-4 py-12 text-center text-sm text-content-muted">
                            <div className="flex justify-center items-center gap-2">
                                <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                                Cargando pagos...
                            </div>
                        </div>
                    ) : loadError ? (
                        <div className="px-4 py-12 text-center text-sm text-red-800">No fue posible obtener los pagos. Revisá el aviso e intentá nuevamente.</div>
                    ) : pagos.length === 0 ? (
                        <div className="px-4 py-12 text-center">
                            <DocumentTextIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                            <p className="text-content-muted text-sm">No se encontraron pagos con los filtros actuales.</p>
                        </div>
                    ) : (
                        pagos.map((pago: any) => (
                            <article key={pago.id} className={`p-4 ${pago.anuladoEn ? "bg-gray-50" : ""}`}>
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="text-xs font-black uppercase tracking-wider text-gray-600">
                                            {formatDate(pago.fechaPago)} · {pago.metodoPago}
                                        </p>
                                        <h3 className="mt-1 text-sm font-black leading-snug text-gray-900">
                                            {formatAddress(pago.liquidacion?.contrato?.propiedad)}
                                        </h3>
                                        <p className="mt-1 text-xs text-content-muted">
                                            Liq. #{pago.liquidacion?.id} · {formatPeriod(pago.liquidacion?.periodo)}
                                        </p>
                                    </div>
                                    <div className="flex shrink-0 items-start gap-1">
                                        <span className={`pt-2 text-sm font-black font-mono ${pago.anuladoEn ? "text-content-muted line-through" : "text-green-700"}`}>
                                            {pago.anuladoEn
                                              ? formatCurrency(pago.monto, pago.moneda || pago.liquidacion?.moneda || "ARS")
                                              : formatSignedCurrency(pago.monto, pago.moneda || pago.liquidacion?.moneda || "ARS", true)}
                                        </span>
                                        {canVoid && !pago.anuladoEn && (
                                            <Menu as="div" className="relative">
                                                <MenuButton aria-label={`Acciones del pago del ${formatDate(pago.fechaPago)}`} className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100 hover:text-gray-900">
                                                    <EllipsisVerticalIcon className="h-5 w-5" aria-hidden="true" />
                                                </MenuButton>
                                                <Transition as={Fragment} enter="transition ease-out duration-100" enterFrom="scale-95 opacity-0" enterTo="scale-100 opacity-100" leave="transition ease-in duration-75" leaveFrom="scale-100 opacity-100" leaveTo="scale-95 opacity-0">
                                                    <MenuItems anchor="bottom end" className="z-50 mt-1 w-48 origin-top-right rounded-xl border border-gray-200 bg-white p-1 shadow-xl focus:outline-none">
                                                        <MenuItem>
                                                            <button type="button" onClick={() => setSelectedPayment(pago)} className="flex min-h-11 w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-bold text-status-warning data-focus:bg-amber-50">
                                                                <NoSymbolIcon className="h-4 w-4" aria-hidden="true" /> Anular pago
                                                            </button>
                                                        </MenuItem>
                                                    </MenuItems>
                                                </Transition>
                                            </Menu>
                                        )}
                                    </div>
                                </div>
                                {pago.anuladoEn && (
                                    <div className="mt-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                                        <p className="font-black uppercase tracking-wider">Pago anulado</p>
                                        <p className="mt-1">{pago.motivoAnulacion}</p>
                                        <p className="mt-1 text-amber-700">Por {pago.anuladoPor?.nombreCompleto || "Sistema"} · {formatDateTime(pago.anuladoEn)}</p>
                                    </div>
                                )}
                                <div className="mt-3 rounded-xl bg-gray-50 p-3 text-xs text-gray-600">
                                    <p><span className="font-bold text-gray-600 uppercase">Inquilino:</span> {pago.liquidacion?.contrato?.inquilinos.find((i: any) => i.esPrincipal)?.persona.nombreCompleto || 'N/A'}</p>
                                    <p className="mt-1"><span className="font-bold text-gray-600 uppercase">Registró:</span> {pago.creadoPor?.nombreCompleto || pago.auditLogs?.[0]?.usuario?.nombreCompleto || 'Sistema'}</p>
                                </div>
                            </article>
                        ))
                    )}
                </div>
                <div className="hidden overflow-x-auto 2xl:block">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50/50 whitespace-nowrap">
                            <tr>
                                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-content-muted uppercase tracking-wider">Fecha / Método</th>
                                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-content-muted uppercase tracking-wider">Propiedad / Contrato</th>
                                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-content-muted uppercase tracking-wider">Inquilino</th>
                                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-content-muted uppercase tracking-wider">Monto</th>
                                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-content-muted uppercase tracking-wider">Período Liq.</th>
                                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-content-muted uppercase tracking-wider">Auditoría</th>
                                <th scope="col" className="sticky right-0 z-20 bg-gray-50 px-6 py-4 text-right text-xs font-semibold text-content-muted uppercase tracking-wider shadow-[-8px_0_12px_-12px_rgba(15,23,42,0.65)]">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-sm text-content-muted">
                                        <div className="flex justify-center items-center gap-2">
                                            <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                                            Cargando pagos...
                                        </div>
                                    </td>
                                </tr>
                            ) : loadError ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-sm text-red-800">No fue posible obtener los pagos. Revisá el aviso e intentá nuevamente.</td>
                                </tr>
                            ) : pagos.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center">
                                        <DocumentTextIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                                        <p className="text-content-muted text-sm">No se encontraron pagos con los filtros actuales.</p>
                                    </td>
                                </tr>
                            ) : (
                                pagos.map((pago: any) => (
                                    <tr key={pago.id} className={`transition-colors hover:bg-gray-50/50 ${pago.anuladoEn ? "bg-gray-50" : ""}`}>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-medium text-gray-900">
                                                    {formatDate(pago.fechaPago)}
                                                </span>
                                                <span className="text-xs text-content-muted mt-1">
                                                    {pago.metodoPago}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-gray-900">
                                                {formatAddress(pago.liquidacion?.contrato?.propiedad)}
                                            </div>
                                            <div className="text-xs text-content-muted mt-1">
                                                Liq. #{pago.liquidacion?.id}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-900">
                                                {pago.liquidacion?.contrato?.inquilinos.find((i: any) => i.esPrincipal)?.persona.nombreCompleto || 'N/A'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className={`text-sm font-bold whitespace-nowrap ${pago.anuladoEn ? "text-content-muted line-through" : "text-green-700"}`}>
	                                                {pago.anuladoEn
	                                                  ? formatCurrency(pago.monto, pago.moneda || pago.liquidacion?.moneda || "ARS")
	                                                  : formatSignedCurrency(pago.monto, pago.moneda || pago.liquidacion?.moneda || "ARS", true)}
                                            </div>
                                            {pago.anuladoEn && <span className="mt-1 inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-xs font-black uppercase text-amber-800">Anulado</span>}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-content-muted">
                                                {formatPeriod(pago.liquidacion?.periodo)}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-gray-900">
                                                {pago.creadoPor?.nombreCompleto || pago.auditLogs?.[0]?.usuario?.nombreCompleto || 'Sistema'}
                                            </div>
                                            <div className="text-xs text-content-muted mt-1">
                                                {pago.auditLogs?.[0]
                                                    ? formatDateTime(pago.auditLogs[0].fechaCreacion)
                                                    : formatDateTime(pago.fechaCreacion)}
                                            </div>
                                            {pago.anuladoEn && <div className="mt-1 max-w-xs text-xs text-amber-800" title={pago.motivoAnulacion || ""}>{pago.motivoAnulacion}</div>}
                                        </td>
                                        <td className={`sticky right-0 z-10 px-6 py-4 text-right shadow-[-8px_0_12px_-12px_rgba(15,23,42,0.65)] ${pago.anuladoEn ? "bg-gray-50" : "bg-white"}`}>
                                            {canVoid && !pago.anuladoEn && (
                                                <button type="button" onClick={() => setSelectedPayment(pago)} data-danger-trigger="true" className="destructive-action inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-bold transition-colors">
                                                    <NoSymbolIcon className="h-4 w-4" /> Anular
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {!isLoading && totalPages > 1 && (
                    <div className="bg-white px-4 py-3 border-t border-gray-200 flex items-center justify-between sm:px-6">
                        <div className="flex flex-1 items-center justify-between gap-3">
                            <div>
                                <p className="hidden text-sm text-gray-700 sm:block">
                                    Mostrando <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> a <span className="font-medium">{Math.min(currentPage * itemsPerPage, totalItems)}</span> de <span className="font-medium">{totalItems}</span> resultados
                                </p>
                                <p className="text-xs text-content-muted sm:hidden">Pág. {currentPage} / {totalPages}</p>
                            </div>
                            <div>
                                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                                    <button
                                        onClick={() => handlePageChange(currentPage - 1)}
                                        disabled={currentPage === 1}
                                        className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-content-muted hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <span className="sr-only">Anterior</span>
                                        <ChevronLeftIcon className="h-5 w-5" aria-hidden="true" />
                                    </button>
                                    <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                                        Pág. {currentPage} / {totalPages}
                                    </span>
                                    <button
                                        onClick={() => handlePageChange(currentPage + 1)}
                                        disabled={currentPage === totalPages}
                                        className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-content-muted hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <span className="sr-only">Siguiente</span>
                                        <ChevronRightIcon className="h-5 w-5" aria-hidden="true" />
                                    </button>
                                </nav>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <ReversalModal
                isOpen={Boolean(selectedPayment)}
                title="Anular pago"
                description={selectedPayment ? `Se revertirá ${formatCurrency(selectedPayment.monto, selectedPayment.moneda)} y se recalculará la deuda de la liquidación #${selectedPayment.liquidacionId}.` : ""}
                onClose={() => setSelectedPayment(null)}
                onConfirm={handleVoid}
            />
        </div>
    );
}
