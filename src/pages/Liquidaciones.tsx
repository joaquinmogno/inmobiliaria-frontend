import { useState, useEffect, Fragment } from "react";
import { useNavigate } from "react-router-dom";
import { Menu, MenuButton, MenuItem, MenuItems, Transition } from "@headlessui/react";
import { liquidacionesService, type Liquidacion } from "../services/liquidaciones.service";
import { contractsService, type Contract } from "../services/contracts.service";
import {
    PlusIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
    EyeIcon,
    TrashIcon,
    EllipsisVerticalIcon,
    HomeIcon,
    BanknotesIcon
} from "@heroicons/react/24/outline";
import { toast } from "react-hot-toast";
import ConfirmationModal from "../components/ConfirmationModal";
import NewLiquidationModal from "../components/NewLiquidationModal";
import OwnerPaymentModal from "../components/OwnerPaymentModal";
import { useAuth } from "../context/AuthContext";
import { hasPermission } from "../utils/permissions";
import { formatCurrency } from "../utils/currency";
import FilterBar, { persistFilter, readPersistedFilter } from "../components/FilterBar";

export default function Liquidaciones() {
    const { user } = useAuth();
    const canCreate = hasPermission(user, "liquidaciones.crear");
    const canEdit = hasPermission(user, "liquidaciones.editar");
    const canDelete = hasPermission(user, "liquidaciones.eliminar");
    const [liquidaciones, setLiquidaciones] = useState<Liquidacion[]>([]);
    const [contracts, setContracts] = useState<Contract[]>([]);
    const [searchTerm, setSearchTerm] = useState(() => readPersistedFilter("liquidaciones"));
    const [debouncedSearch, setDebouncedSearch] = useState(() => readPersistedFilter("liquidaciones"));
    const [filterEstado, setFilterEstado] = useState<string>("");
    const [filterPeriodo, setFilterPeriodo] = useState<string>("");
    const [filterPropietarioId, setFilterPropietarioId] = useState<string>("");
    const [filterSoloDeuda, setFilterSoloDeuda] = useState<boolean>(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const [periodOptions, setPeriodOptions] = useState<string[]>([]);
    const [uniquePropietarios, setUniquePropietarios] = useState<Array<{ id: number; nombreCompleto: string }>>([]);
    const [isLoading, setIsLoading] = useState(true);
    const navigate = useNavigate();

    const [isNewModalOpen, setIsNewModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isOwnerPaymentModalOpen, setIsOwnerPaymentModalOpen] = useState(false);
    const [liqToDelete, setLiqToDelete] = useState<number | null>(null);
    const [selectedLiq, setSelectedLiq] = useState<Liquidacion | null>(null);
    const [suggestedPaymentAmount, setSuggestedPaymentAmount] = useState<number>(0);

    const itemsPerPage = 10;

    useEffect(() => {
        persistFilter("liquidaciones", searchTerm);
        const timer = setTimeout(() => {
            setDebouncedSearch(searchTerm);
        }, 300);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    useEffect(() => {
        refreshData(currentPage, debouncedSearch);
    }, [currentPage, debouncedSearch, filterEstado, filterPeriodo, filterPropietarioId, filterSoloDeuda]);

    useEffect(() => {
        setCurrentPage(1);
    }, [debouncedSearch]);

    useEffect(() => {
        loadContracts();
        liquidacionesService.getFilters().then(filters => {
            setPeriodOptions(filters.periodos);
            setUniquePropietarios(filters.propietarios);
        }).catch(() => toast.error("No se pudieron cargar los filtros"));
    }, []);

    const refreshData = async (page: number = 1, searchQuery: string = "") => {
        setIsLoading(true);
        try {
            const response = await liquidacionesService.getAll(undefined, page, itemsPerPage, searchQuery, {
                estado: filterEstado, periodo: filterPeriodo, propietarioId: filterPropietarioId, soloDeuda: filterSoloDeuda
            });
            const data = Array.isArray(response) ? response : response.data;
            const meta = Array.isArray(response) ? undefined : response.meta;
            setLiquidaciones(data || []);
            setTotalPages(meta?.totalPages || 1);
            setTotalItems(meta?.total || data?.length || 0);
        } catch (error) {
            console.error("Error loading liquidaciones:", error);
            toast.error("Error al cargar las liquidaciones");
            setLiquidaciones([]);
            setTotalPages(1);
            setTotalItems(0);
        } finally {
            setIsLoading(false);
        }
    };

    const loadContracts = async () => {
        try {
            const response = await contractsService.getAll({ limit: 100, status: 'ACTIVO' });
            setContracts(response.data);
        } catch (error) {
            console.error("Error loading contracts:", error);
            toast.error("No se pudieron cargar los contratos para la liquidación");
        }
    };

    const filteredLiquidaciones = liquidaciones;

    function formatFullAddress(prop: any) {
        if (!prop) return "";
        return `${prop.direccion}${prop.piso ? ` ${prop.piso}` : ""}${prop.departamento ? prop.departamento : ""}`;
    }

    function formatPeriodShort(dateStr: string) {
        const date = new Date(dateStr);
        const month = date.toLocaleDateString("es-AR", { month: "short", timeZone: "UTC" });
        const year = date.toLocaleDateString("es-AR", { year: "numeric", timeZone: "UTC" });
        return `${month.charAt(0).toUpperCase()}${month.slice(1)} ${year}`;
    }

    const currentItems = filteredLiquidaciones;

    function formatPeriod(dateStr: string) {
        const date = new Date(dateStr);
        return date.toLocaleDateString("es-AR", { month: "long", year: "numeric", timeZone: "UTC" });
    }

    const handleCreateLiquidation = async (contratoId: number, periodo: string, montoHonorarios?: number, porcentajeHonorarios?: number, cuotasIds?: number[]) => {
        try {
            const newLiq = await liquidacionesService.create(contratoId, periodo, montoHonorarios, porcentajeHonorarios, cuotasIds);
            toast.success("Liquidación creada");
            navigate(`/liquidaciones/${newLiq.id}`);
        } catch (error: any) {
            toast.error(error.message || "Error al crear liquidación");
        }
    };

    const handleDelete = (id: number) => {
        setLiqToDelete(id);
        setIsDeleteModalOpen(true);
    };

    const handleOpenOwnerPayment = (liq: Liquidacion) => {
        const movsInmo = liq.movimientos?.filter((m: any) => m.esParaInmobiliaria).reduce((acc: number, m: any) => acc + Number(m.monto), 0) || 0;
        setSelectedLiq(liq);
        setSuggestedPaymentAmount(Number(liq.netoACobrar) - Number(liq.montoHonorarios || 0) - movsInmo);
        setIsOwnerPaymentModalOpen(true);
    };

    const handleSaveOwnerPayment = async (p: { fechaPago: string, metodoPago: string, observaciones?: string }) => {
        if (!selectedLiq) return;
        try {
            await liquidacionesService.pagarPropietario(selectedLiq.id, p);
            toast.success("Pago a propietario registrado exitosamente");
            setIsOwnerPaymentModalOpen(false);
            refreshData(currentPage, debouncedSearch);
        } catch (error: any) {
            toast.error(error.message || "Error al registrar el pago al propietario");
        }
    };

    const confirmDelete = async () => {
        if (liqToDelete) {
            try {
                await liquidacionesService.delete(liqToDelete);
                toast.success("Liquidación eliminada");
                refreshData(currentPage, debouncedSearch);
            } catch (error) {
                toast.error("Error al eliminar la liquidación");
            } finally {
                setIsDeleteModalOpen(false);
                setLiqToDelete(null);
            }
        }
    };

    const getStatusBadge = (estado: string) => {
        switch (estado) {
            case 'BORRADOR':
                return <span className="bg-gray-50 text-gray-600 px-2 py-0.5 rounded-lg text-xs font-black border border-gray-200 uppercase tracking-widest">Borrador</span>;
            case 'PENDIENTE_PAGO':
                return <span className="bg-yellow-50 text-yellow-700 px-2 py-0.5 rounded-lg text-xs font-black border border-yellow-200 uppercase tracking-widest">Pendiente</span>;
            case 'PAGADA_POR_INQUILINO':
                return <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-lg text-xs font-black border border-blue-200 uppercase tracking-widest">Pagada Inquilino</span>;
            case 'LIQUIDADA':
                return <span className="bg-green-50 text-green-700 px-2 py-0.5 rounded-lg text-xs font-black border border-green-200 uppercase tracking-widest">Finalizada</span>;
            default:
                return <span className="text-gray-500 font-medium">{estado}</span>;
        }
    };

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Liquidaciones</h1>
                    <p className="text-sm text-gray-500">Administra los saldos mensuales y conceptos de tus contratos activos</p>
                </div>
                {canCreate && <button
                    onClick={() => setIsNewModalOpen(true)}
                    className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-xl hover:bg-indigo-700 transition-all shadow-md shadow-indigo-100 font-bold text-sm cursor-pointer"
                >
                    <PlusIcon className="w-5 h-5" />
                    Nueva Liquidación
                </button>}
            </div>

            <FilterBar query={searchTerm} onQueryChange={setSearchTerm} resultCount={filteredLiquidaciones.length} placeholder="Propiedad, inquilino o propietario..." onClear={() => { setSearchTerm(""); setFilterPeriodo(""); setFilterPropietarioId(""); setFilterEstado(""); setFilterSoloDeuda(false); }}>
                    <div className="flex flex-wrap gap-2">
                        <select
                            aria-label="Período"
                            value={filterPeriodo}
                            onChange={(e) => {
                                setFilterPeriodo(e.target.value);
                                setCurrentPage(1);
                            }}
                            className="block min-h-11 w-full md:w-44 pl-3 pr-10 py-2 text-sm border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 rounded-xl cursor-pointer bg-white"
                        >
                            <option value="">Todos los periodos</option>
                            {periodOptions.map(periodo => (
                                <option key={periodo} value={periodo}>
                                    {formatPeriod(periodo)}
                                </option>
                            ))}
                        </select>
                        <select
                            aria-label="Propietario"
                            value={filterPropietarioId}
                            onChange={(e) => {
                                setFilterPropietarioId(e.target.value);
                                setCurrentPage(1);
                            }}
                            className="block min-h-11 w-full md:w-44 pl-3 pr-10 py-2 text-sm border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 rounded-xl cursor-pointer bg-white"
                        >
                            <option value="">Todos los dueños</option>
                            {uniquePropietarios.map(prop => prop && (
                                <option key={prop.id} value={prop.id}>
                                    {prop.nombreCompleto}
                                </option>
                            ))}
                        </select>
                        <select
                            aria-label="Estado"
                            value={filterEstado}
                            onChange={(e) => {
                                setFilterEstado(e.target.value);
                                setCurrentPage(1);
                            }}
                            className="block min-h-11 w-full md:w-40 pl-3 pr-10 py-2 text-sm border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 rounded-xl cursor-pointer bg-white"
                        >
                            <option value="">Todos los estados</option>
                            <option value="BORRADOR">Borrador</option>
                            <option value="PENDIENTE_PAGO">Pendiente</option>
                            <option value="PAGADA_POR_INQUILINO">Pagada (Inquilino)</option>
                            <option value="LIQUIDADA">Finalizada</option>
                        </select>
                    </div>
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => {
                            setFilterSoloDeuda(!filterSoloDeuda);
                            setCurrentPage(1);
                        }}
                        className={`flex min-h-11 items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all border ${
                            filterSoloDeuda 
                            ? 'bg-red-50 text-red-700 border-red-200 ring-2 ring-red-100' 
                            : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                        }`}
                    >
                        <div className={`w-2 h-2 rounded-full ${filterSoloDeuda ? 'bg-red-500 pulse' : 'bg-gray-300'}`} />
                        Solo con deuda
                    </button>
                </div>
            </FilterBar>

            {/* Contenedor Principal Tablas/Tarjetas */}
            <div className="md:bg-white md:rounded-2xl md:shadow-sm md:border md:border-gray-100 min-h-[500px] flex flex-col">
                {/* VISTA DESKTOP */}
                <div className="hidden md:block overflow-x-auto flex-1 rounded-t-2xl">
                    <table className="min-w-full divide-y divide-gray-100">
                        <thead className="bg-gray-50/50">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-black text-gray-600 uppercase tracking-[0.2em]">Propiedad</th>
                                <th className="px-6 py-4 text-left text-xs font-black text-gray-600 uppercase tracking-[0.2em]">Periodo</th>
                                <th className="px-6 py-4 text-left text-xs font-black text-gray-600 uppercase tracking-[0.2em]">Inquilino</th>
                                <th className="px-6 py-4 text-right text-xs font-black text-gray-600 uppercase tracking-[0.2em]">Total Inquilino</th>
                                <th className="px-6 py-4 text-right text-xs font-black text-gray-600 uppercase tracking-[0.2em]">Pagado</th>
                                <th className="px-6 py-4 text-right text-xs font-black text-gray-600 uppercase tracking-[0.2em]">Deuda</th>
                                <th className="px-6 py-4 text-center text-xs font-black text-gray-600 uppercase tracking-[0.2em]">Estado</th>
                                <th className="relative px-6 py-4"><span className="sr-only">Acciones</span></th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-50">
                            {!isLoading && currentItems.map((liq) => {
                                const totalPagado = liq.pagos?.reduce((acc, p) => acc + Number(p.monto), 0) || 0;
                                const deuda = Number(liq.netoACobrar) - totalPagado;
                                
                                return (
                                    <tr key={liq.id} className="hover:bg-indigo-50/30 transition-colors group">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">
                                                    {formatFullAddress(liq.contrato?.propiedad)}
                                                </span>
                                                <span className="text-xs text-gray-600 font-medium uppercase">
                                                    DUEÑO: {liq.contrato?.propietarios.find((p: any) => p.esPrincipal)?.persona.nombreCompleto || '-'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="text-sm font-medium text-gray-600">
                                                {formatPeriodShort(liq.periodo)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex flex-col">
                                                <span className="text-sm text-gray-700 font-medium">{liq.contrato?.inquilinos.find((i: any) => i.esPrincipal)?.persona.nombreCompleto || '-'}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right">
                                            <span className="text-sm font-bold text-gray-900">
	                                                {formatCurrency(liq.netoACobrar, liq.moneda)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right">
                                            <span className="text-sm font-medium text-green-600">
	                                                {formatCurrency(totalPagado, liq.moneda)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right">
                                            <span className={`text-sm font-black ${deuda > 0 ? 'text-red-600' : 'text-gray-600 font-medium'}`}>
	                                                {deuda > 0 ? formatCurrency(deuda, liq.moneda) : '-'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-center">
                                            <div className="flex flex-col items-center gap-1">
                                                {getStatusBadge(liq.estado)}
                                                {liq.estado === 'PENDIENTE_PAGO' && totalPagado > 0 && Number(liq.netoACobrar) - totalPagado > 0 && (
                                                    <span className="text-xs font-bold text-orange-600 uppercase tracking-tight">Pago Parcial</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <Menu as="div" className="relative inline-block text-left">
                                                <MenuButton className="text-gray-600 hover:text-indigo-600 p-1.5 rounded-xl hover:bg-white transition-all cursor-pointer">
                                                    <EllipsisVerticalIcon className="w-5 h-5" />
                                                </MenuButton>
                                                <Transition
                                                    as={Fragment}
                                                    enter="transition ease-out duration-100"
                                                    enterFrom="transform opacity-0 scale-95"
                                                    enterTo="transform opacity-100 scale-100"
                                                    leave="transition ease-in duration-75"
                                                    leaveFrom="transform opacity-100 scale-100"
                                                    leaveTo="transform opacity-0 scale-95"
                                                >
                                                    <MenuItems className="absolute right-0 z-50 mt-2 w-52 origin-top-right rounded-xl shadow-xl bg-white ring-1 ring-black/5 focus:outline-none divide-y divide-gray-50 overflow-hidden border border-gray-100">
                                                        <div className="py-1">
                                                            <MenuItem>
                                                                {({ focus }) => (
                                                                    <button
                                                                        onClick={() => navigate(`/liquidaciones/${liq.id}`)}
                                                                        className={`${focus ? 'bg-indigo-50 text-indigo-700' : 'text-gray-700'} group flex w-full items-center gap-2 px-4 py-2.5 text-sm transition-colors`}
                                                                    >
                                                                        <EyeIcon className="w-4 h-4 text-indigo-500" />
                                                                        Ver detalle
                                                                    </button>
                                                                )}
                                                            </MenuItem>
                                                        </div>
                                                        <div className="py-1">
                                                            {canEdit && liq.estado === 'PAGADA_POR_INQUILINO' && (
                                                                <MenuItem>
                                                                    {({ focus }) => (
                                                                        <button
                                                                            onClick={() => handleOpenOwnerPayment(liq)}
                                                                            className={`${focus ? 'bg-orange-50 text-orange-700' : 'text-orange-700'} group flex w-full items-center gap-2 px-4 py-2.5 text-sm transition-colors`}
                                                                        >
                                                                            <BanknotesIcon className="w-4 h-4 text-orange-500" />
                                                                            Pagar a Propietario
                                                                        </button>
                                                                    )}
                                                                </MenuItem>
                                                            )}
                                                            {canDelete && liq.estado === 'BORRADOR' && (
                                                                <MenuItem>
                                                                    {({ focus }) => (
                                                                        <button
                                                                            onClick={() => handleDelete(liq.id)}
                                                                            className={`${focus ? 'bg-red-50 text-red-700' : 'text-red-600'} group flex w-full items-center gap-2 px-4 py-2.5 text-sm transition-colors`}
                                                                        >
                                                                            <TrashIcon className="w-4 h-4 text-red-500" />
                                                                            Eliminar
                                                                        </button>
                                                                    )}
                                                                </MenuItem>
                                                            )}
                                                        </div>
                                                    </MenuItems>
                                                </Transition>
                                            </Menu>
                                        </td>
                                    </tr>
                                );
                            })}

                            {isLoading && (
                                <tr>
                                    <td colSpan={8} className="px-6 py-12 text-center">
                                        <div className="flex flex-col items-center gap-2">
                                            <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                                            <span className="text-sm font-medium text-gray-500">Cargando liquidaciones...</span>
                                        </div>
                                    </td>
                                </tr>
                            )}

                            {!isLoading && currentItems.length === 0 && (
                                <tr>
                                    <td colSpan={8} className="px-6 py-16 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="bg-gray-50 p-4 rounded-full">
                                                <HomeIcon className="w-10 h-10 text-gray-300" />
                                            </div>
                                            <div>
                                                <p className="text-gray-900 font-bold">No se encontraron liquidaciones</p>
                                                <p className="text-gray-500 text-sm">Cambia los términos de búsqueda o crea una nueva.</p>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* VISTA MOBILE */}
                <div className="md:hidden flex-1 space-y-4">
                    {!isLoading && currentItems.map((liq) => {
                        const totalPagado = liq.pagos?.reduce((acc, p) => acc + Number(p.monto), 0) || 0;
                        const deuda = Number(liq.netoACobrar) - totalPagado;
                        const movsInmo = liq.movimientos?.filter((m: any) => m.esParaInmobiliaria).reduce((acc: number, m: any) => acc + Number(m.monto), 0) || 0;
                        const netoAPagar = Number(liq.netoACobrar) - Number(liq.montoHonorarios || 0) - movsInmo;

                        return (
                            <div key={liq.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col gap-3">
                                <div className="flex justify-between items-start">
                                    <div className="flex flex-col">
                                        <span className="font-bold text-gray-900 leading-tight">
                                            {formatFullAddress(liq.contrato?.propiedad)}
                                        </span>
                                        <span className="text-xs text-indigo-600 font-extrabold uppercase mt-0.5">
                                            {formatPeriod(liq.periodo)}
                                        </span>
                                    </div>
                                    <div className="flex flex-col items-end gap-1">
                                        {getStatusBadge(liq.estado)}
                                        {liq.estado === 'PENDIENTE_PAGO' && totalPagado > 0 && deuda > 0 && (
                                            <span className="text-xs font-bold text-orange-600 uppercase tracking-tight">Pago Parcial</span>
                                        )}
                                    </div>
                                </div>
                                
                                <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 flex flex-col gap-2">
                                    <div className="flex justify-between items-center bg-white p-2 border border-gray-100 rounded-lg">
                                        <div className="flex flex-col">
                                            <span className="text-xs uppercase font-bold text-gray-600">Inquilino (A Cobrar)</span>
                                            <span className="font-semibold text-gray-700 text-sm">{liq.contrato?.inquilinos.find((i: any) => i.esPrincipal)?.persona.nombreCompleto || '-'}</span>
                                        </div>
                                        <div className="flex flex-col items-end">
	                                            <span className="text-sm font-black text-gray-900">{formatCurrency(liq.netoACobrar, liq.moneda)}</span>
                                            <span className={`text-xs font-bold ${deuda > 0 ? 'text-red-600' : 'text-green-600'}`}>
	                                                {deuda > 0 ? `DEBE: ${formatCurrency(deuda, liq.moneda)}` : 'PAGADO'}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-center bg-white p-2 border border-blue-50 rounded-lg">
                                        <div className="flex flex-col">
                                            <span className="text-xs uppercase font-bold text-gray-600">Dueño (A Transferir)</span>
                                            <span className="font-semibold text-gray-700 text-sm">{liq.contrato?.propietarios.find((p: any) => p.esPrincipal)?.persona.nombreCompleto || '-'}</span>
                                        </div>
                                        <div className="flex flex-col items-end">
	                                            <span className="text-xs font-black text-blue-800">{formatCurrency(netoAPagar, liq.moneda)}</span>
                                        </div>
                                    </div>
                                </div>
                                
                                <Menu as="div" className="relative w-full">
                                    <MenuButton className="mt-1 w-full flex items-center justify-center gap-2 border border-gray-200 text-gray-600 rounded-xl py-2.5 text-sm font-bold hover:bg-gray-50 transition-colors cursor-pointer">
                                        <EllipsisVerticalIcon className="w-5 h-5 text-gray-600" /> Opciones Avanzadas
                                    </MenuButton>
                                    <Transition
                                        as={Fragment}
                                        enter="transition ease-out duration-100"
                                        enterFrom="transform opacity-0 scale-95"
                                        enterTo="transform opacity-100 scale-100"
                                        leave="transition ease-in duration-75"
                                        leaveFrom="transform opacity-100 scale-100"
                                        leaveTo="transform opacity-0 scale-95"
                                    >
                                        <MenuItems className="absolute right-0 z-50 bottom-full mb-2 w-full origin-bottom rounded-2xl bg-white shadow-2xl ring-1 ring-black/5 focus:outline-none divide-y divide-gray-50 overflow-hidden border border-gray-100">
                                            <div className="py-1">
                                                <MenuItem>
                                                    {({ focus }) => (
                                                        <button
                                                            onClick={() => navigate(`/liquidaciones/${liq.id}`)}
                                                            className={`${focus ? 'bg-indigo-50 text-indigo-700' : 'text-gray-700'} group flex w-full items-center gap-3 px-4 py-4 text-sm font-bold transition-colors`}
                                                        >
                                                            <EyeIcon className="w-6 h-6 text-indigo-500" />
                                                            Ver detalle y pagos
                                                        </button>
                                                    )}
                                                </MenuItem>
                                                {canEdit && liq.estado === 'PAGADA_POR_INQUILINO' && (
                                                    <MenuItem>
                                                        {({ focus }) => (
                                                            <button
                                                                onClick={() => handleOpenOwnerPayment(liq)}
                                                                className={`${focus ? 'bg-orange-50 text-orange-700' : 'text-orange-700'} group flex w-full items-center gap-3 px-4 py-4 text-sm font-bold transition-colors`}
                                                            >
                                                                <BanknotesIcon className="w-6 h-6 text-orange-500" />
                                                                Entregar a Propietario
                                                            </button>
                                                        )}
                                                    </MenuItem>
                                                )}
                                                {canDelete && liq.estado === 'BORRADOR' && (
                                                    <MenuItem>
                                                        {({ focus }) => (
                                                            <button
                                                                onClick={() => handleDelete(liq.id)}
                                                                className={`${focus ? 'bg-red-50 text-red-700' : 'text-red-700'} group flex w-full items-center gap-3 px-4 py-4 text-sm font-bold transition-colors`}
                                                            >
                                                                <TrashIcon className="w-6 h-6 text-red-500" />
                                                                Eliminar borrador
                                                            </button>
                                                        )}
                                                    </MenuItem>
                                                )}
                                            </div>
                                        </MenuItems>
                                    </Transition>
                                </Menu>
                            </div>
                        );
                    })}

                    {isLoading && (
                        <div className="flex flex-col items-center justify-center py-12 gap-2">
                            <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                            <span className="text-sm font-medium text-gray-500">Cargando liquidaciones...</span>
                        </div>
                    )}

                    {!isLoading && currentItems.length === 0 && (
                        <div className="bg-white p-8 rounded-xl border border-gray-100 text-center flex flex-col items-center gap-3 shadow-sm">
                            <div className="bg-gray-50 p-4 rounded-full">
                                <HomeIcon className="w-8 h-8 text-gray-300" />
                            </div>
                            <p className="text-gray-900 font-bold">No se encontraron liquidaciones</p>
                        </div>
                    )}
                </div>

                {/* Pagination Footer */}
                {totalPages > 1 && (
                    <div className="bg-gray-50/50 px-6 py-4 border-t border-gray-100 flex items-center justify-between">
                        <div className="flex-1 flex justify-between sm:hidden">
                            <button
                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                disabled={currentPage === 1}
                                className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-xl text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                            >
                                Anterior
                            </button>
                            <button
                                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                disabled={currentPage === totalPages}
                                className="ml-3 px-4 py-2 border border-gray-300 text-sm font-medium rounded-xl text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                            >
                                Siguiente
                            </button>
                        </div>
                        <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                            <div>
                                <p className="text-sm text-gray-600">
                                    Mostrando pág. <span className="font-bold text-gray-900">{currentPage}</span> de <span className="font-bold text-gray-900">{totalPages}</span> - Total <span className="font-bold text-gray-900">{totalItems}</span> registros guardados
                                </p>
                            </div>
                            <nav className="flex items-center gap-1">
                                <button
                                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                    disabled={currentPage === 1}
                                    className="flex h-11 w-11 items-center justify-center border border-gray-200 rounded-xl bg-white text-gray-600 hover:bg-indigo-50 hover:text-indigo-700 transition-all disabled:opacity-30 disabled:hover:bg-white disabled:hover:text-gray-500 cursor-pointer"
                                >
                                    <ChevronLeftIcon className="h-5 w-5" />
                                </button>
                                <div className="px-4 py-2 text-sm font-bold text-indigo-600 bg-indigo-50 rounded-xl">
                                    {currentPage} / {totalPages}
                                </div>
                                <button
                                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                    disabled={currentPage === totalPages}
                                    className="flex h-11 w-11 items-center justify-center border border-gray-200 rounded-xl bg-white text-gray-600 hover:bg-indigo-50 hover:text-indigo-700 transition-all disabled:opacity-30 disabled:hover:bg-white disabled:hover:text-gray-500 cursor-pointer"
                                >
                                    <ChevronRightIcon className="h-5 w-5" />
                                </button>
                            </nav>
                        </div>
                    </div>
                )}
            </div>

            <NewLiquidationModal
                isOpen={isNewModalOpen}
                onClose={() => setIsNewModalOpen(false)}
                onSave={handleCreateLiquidation}
                contracts={contracts}
            />

            <ConfirmationModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={confirmDelete}
                title="Eliminar Liquidación"
                message="¿Estás seguro de que deseas eliminar esta liquidación? Esta acción no se puede deshacer."
                confirmText="Eliminar"
                type="danger"
            />


            <OwnerPaymentModal
                isOpen={isOwnerPaymentModalOpen}
                onClose={() => setIsOwnerPaymentModalOpen(false)}
	                onSave={handleSaveOwnerPayment}
	                suggestedAmount={suggestedPaymentAmount}
	                moneda={selectedLiq?.moneda || "ARS"}
	            />
        </div>
    );
}
