import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { liquidacionesService, type Liquidacion } from "../services/liquidaciones.service";
import { contractsService, type Contract } from "../services/contracts.service";
import {
    PlusIcon,
    MagnifyingGlassIcon,
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

export default function Liquidaciones() {
    const [liquidaciones, setLiquidaciones] = useState<Liquidacion[]>([]);
    const [contracts, setContracts] = useState<Contract[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [filterEstado, setFilterEstado] = useState<string>("");
    const [filterPeriodo, setFilterPeriodo] = useState<string>("");
    const [filterPropietarioId, setFilterPropietarioId] = useState<string>("");
    const [filterSoloDeuda, setFilterSoloDeuda] = useState<boolean>(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [activeMenuId, setActiveMenuId] = useState<number | null>(null);
    const [menuPosition, setMenuPosition] = useState({ top: 0, right: 0 });
    const buttonRefs = useRef<Map<number, HTMLButtonElement>>(new Map());
    const navigate = useNavigate();

    const [isNewModalOpen, setIsNewModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isOwnerPaymentModalOpen, setIsOwnerPaymentModalOpen] = useState(false);
    const [liqToDelete, setLiqToDelete] = useState<number | null>(null);
    const [selectedLiq, setSelectedLiq] = useState<Liquidacion | null>(null);
    const [suggestedPaymentAmount, setSuggestedPaymentAmount] = useState<number>(0);

    const itemsPerPage = 10;

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchTerm);
        }, 300);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    useEffect(() => {
        refreshData(currentPage, debouncedSearch);
    }, [currentPage, debouncedSearch]);

    useEffect(() => {
        setCurrentPage(1);
    }, [debouncedSearch]);

    useEffect(() => {
        loadContracts();
    }, []);

    const refreshData = async (page: number = 1, searchQuery: string = "") => {
        setIsLoading(true);
        try {
            const response = await liquidacionesService.getAll(undefined, page, itemsPerPage, searchQuery);
            setLiquidaciones(response.data);
            setTotalPages(response.meta.totalPages);
            setTotalItems(response.meta.total);
        } catch (error) {
            console.error("Error loading liquidaciones:", error);
            toast.error("Error al cargar las liquidaciones");
        } finally {
            setIsLoading(false);
        }
    };

    const loadContracts = async () => {
        try {
            const data = await contractsService.getAll();
            if (Array.isArray(data)) {
                setContracts(data.filter(c => c.estado === 'ACTIVO'));
            } else {
                setContracts([]);
            }
        } catch (error) {
            console.error("Error loading contracts:", error);
            toast.error("No se pudieron cargar los contratos para la liquidación");
        }
    };

    const filteredLiquidaciones = liquidaciones.filter((liq) => {
        const matchesEstado = filterEstado === "" || liq.estado === filterEstado;
        const matchesPeriodo = filterPeriodo === "" || liq.periodo === filterPeriodo;
        const matchesPropietario = filterPropietarioId === "" || liq.contrato?.propietarios.some((p: any) => p.personaId === Number(filterPropietarioId));
        
        const totalPagado = liq.pagos?.reduce((acc, p) => acc + Number(p.monto), 0) || 0;
        const deuda = Number(liq.netoACobrar) - totalPagado;
        const matchesSoloDeuda = !filterSoloDeuda || deuda > 0;

        return matchesEstado && matchesPeriodo && matchesPropietario && matchesSoloDeuda;
    });

    const periodOptions = Array.from(new Set(liquidaciones.map(l => l.periodo))).sort().reverse();
    const uniquePropietarios = Array.from(new Map(
        liquidaciones.flatMap(l => l.contrato?.propietarios.map((p: any) => p.persona) || [])
            .filter(Boolean)
            .map((p: any) => [p.id, p])
    ).values());

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
        setActiveMenuId(null);
    };

    const handleOpenOwnerPayment = (liq: Liquidacion) => {
        setSelectedLiq(liq);
        setSuggestedPaymentAmount(Number(liq.netoACobrar));
        setIsOwnerPaymentModalOpen(true);
        setActiveMenuId(null);
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

    const toggleMenu = useCallback((id: number) => {
        if (activeMenuId === id) {
            setActiveMenuId(null);
            return;
        }
        const btn = buttonRefs.current.get(id);
        if (btn) {
            const rect = btn.getBoundingClientRect();
            setMenuPosition({
                top: rect.bottom + window.scrollY + 4,
                right: window.innerWidth - rect.right,
            });
        }
        setActiveMenuId(id);
    }, [activeMenuId]);

    const getStatusBadge = (estado: string) => {
        switch (estado) {
            case 'BORRADOR':
                return <span className="bg-gray-50 text-gray-600 px-2 py-0.5 rounded-lg text-[10px] font-black border border-gray-200 uppercase tracking-widest">Borrador</span>;
            case 'PENDIENTE_PAGO':
                return <span className="bg-yellow-50 text-yellow-700 px-2 py-0.5 rounded-lg text-[10px] font-black border border-yellow-200 uppercase tracking-widest">Pendiente</span>;
            case 'PAGADA_POR_INQUILINO':
                return <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-lg text-[10px] font-black border border-blue-200 uppercase tracking-widest">Pagada Inquilino</span>;
            case 'LIQUIDADA':
                return <span className="bg-green-50 text-green-700 px-2 py-0.5 rounded-lg text-[10px] font-black border border-green-200 uppercase tracking-widest">Finalizada</span>;
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
                <button
                    onClick={() => setIsNewModalOpen(true)}
                    className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-xl hover:bg-indigo-700 transition-all shadow-md shadow-indigo-100 font-bold text-sm cursor-pointer"
                >
                    <PlusIcon className="w-5 h-5" />
                    Nueva Liquidación
                </button>
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-4">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="relative flex-1">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <MagnifyingGlassIcon className="w-5 h-5 text-gray-400" />
                        </div>
                        <input
                            type="text"
                            placeholder="Propiedad, inquilino o dueño..."
                            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-xl bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 sm:text-sm transition-all"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <select
                            value={filterPeriodo}
                            onChange={(e) => {
                                setFilterPeriodo(e.target.value);
                                setCurrentPage(1);
                            }}
                            className="block w-full md:w-44 pl-3 pr-10 py-2 text-sm border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 rounded-xl cursor-pointer bg-white"
                        >
                            <option value="">Todos los periodos</option>
                            {periodOptions.map(periodo => (
                                <option key={periodo} value={periodo}>
                                    {formatPeriod(periodo)}
                                </option>
                            ))}
                        </select>
                        <select
                            value={filterPropietarioId}
                            onChange={(e) => {
                                setFilterPropietarioId(e.target.value);
                                setCurrentPage(1);
                            }}
                            className="block w-full md:w-44 pl-3 pr-10 py-2 text-sm border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 rounded-xl cursor-pointer bg-white"
                        >
                            <option value="">Todos los dueños</option>
                            {uniquePropietarios.map(prop => prop && (
                                <option key={prop.id} value={prop.id}>
                                    {prop.nombreCompleto}
                                </option>
                            ))}
                        </select>
                        <select
                            value={filterEstado}
                            onChange={(e) => {
                                setFilterEstado(e.target.value);
                                setCurrentPage(1);
                            }}
                            className="block w-full md:w-40 pl-3 pr-10 py-2 text-sm border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 rounded-xl cursor-pointer bg-white"
                        >
                            <option value="">Todos los estados</option>
                            <option value="BORRADOR">Borrador</option>
                            <option value="PENDIENTE_PAGO">Pendiente</option>
                            <option value="PAGADA_POR_INQUILINO">Pagada (Inquilino)</option>
                            <option value="LIQUIDADA">Finalizada</option>
                        </select>
                    </div>
                </div>
                
                <div className="flex items-center gap-4 pt-1">
                    <button
                        onClick={() => {
                            setFilterSoloDeuda(!filterSoloDeuda);
                            setCurrentPage(1);
                        }}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                            filterSoloDeuda 
                            ? 'bg-red-50 text-red-700 border-red-200 ring-2 ring-red-100' 
                            : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                        }`}
                    >
                        <div className={`w-2 h-2 rounded-full ${filterSoloDeuda ? 'bg-red-500 pulse' : 'bg-gray-300'}`} />
                        SOLO CON DEUDA
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 min-h-[500px] flex flex-col">
                <div className="overflow-x-auto flex-1">
                    <table className="min-w-full divide-y divide-gray-100">
                        <thead className="bg-gray-50/50">
                            <tr>
                                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Propiedad</th>
                                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Periodo</th>
                                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Inquilino</th>
                                <th className="px-6 py-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Total Inquilino</th>
                                <th className="px-6 py-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Pagado</th>
                                <th className="px-6 py-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Deuda</th>
                                <th className="px-6 py-4 text-center text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Estado</th>
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
                                                <span className="text-[10px] text-gray-400 font-medium uppercase">
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
                                                ${Number(liq.netoACobrar).toLocaleString('es-AR')}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right">
                                            <span className="text-sm font-medium text-green-600">
                                                ${totalPagado.toLocaleString('es-AR')}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right">
                                            <span className={`text-sm font-black ${deuda > 0 ? 'text-red-600' : 'text-gray-400 font-medium'}`}>
                                                {deuda > 0 ? `$${deuda.toLocaleString('es-AR')}` : '-'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-center">
                                            <div className="flex flex-col items-center gap-1">
                                                {getStatusBadge(liq.estado)}
                                                {liq.estado === 'PENDIENTE_PAGO' && totalPagado > 0 && Number(liq.netoACobrar) - totalPagado > 0 && (
                                                    <span className="text-[9px] font-bold text-orange-600 uppercase tracking-tight">Pago Parcial</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <button
                                                ref={(el) => {
                                                    if (el) buttonRefs.current.set(liq.id, el);
                                                    else buttonRefs.current.delete(liq.id);
                                                }}
                                                onClick={() => toggleMenu(liq.id)}
                                                className="text-gray-400 hover:text-indigo-600 p-1.5 rounded-xl hover:bg-white transition-all cursor-pointer"
                                            >
                                                <EllipsisVerticalIcon className="w-5 h-5" />
                                            </button>
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

                {/* Dropdown portal — rendered outside table to avoid overflow clipping */}
                {activeMenuId !== null && createPortal(
                    <>
                        <div
                            className="fixed inset-0 z-[100]"
                            onClick={() => setActiveMenuId(null)}
                        />
                        <div
                            className="absolute z-[101] w-52 rounded-xl shadow-xl bg-white ring-1 ring-black/5 py-1 overflow-hidden border border-gray-100"
                            style={{ top: menuPosition.top, right: menuPosition.right }}
                        >
                            {(() => {
                                const liq = currentItems.find(l => l.id === activeMenuId);
                                if (!liq) return null;
                                return (
                                    <>
                                        <button
                                            onClick={() => { navigate(`/liquidaciones/${liq.id}`); setActiveMenuId(null); }}
                                            className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-indigo-50 flex items-center gap-2 transition-colors cursor-pointer"
                                        >
                                            <EyeIcon className="w-4 h-4 text-indigo-500" />
                                            Ver detalle
                                        </button>
                                        {liq.estado === 'PAGADA_POR_INQUILINO' && (
                                            <button
                                                onClick={() => handleOpenOwnerPayment(liq)}
                                                className="w-full text-left px-4 py-2.5 text-sm text-orange-700 hover:bg-orange-50 flex items-center gap-2 transition-colors cursor-pointer"
                                            >
                                                <BanknotesIcon className="w-4 h-4 text-orange-500" />
                                                Pagar a Propietario
                                            </button>
                                        )}
                                        {liq.estado === 'BORRADOR' && (
                                            <button
                                                onClick={() => handleDelete(liq.id)}
                                                className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors cursor-pointer"
                                            >
                                                <TrashIcon className="w-4 h-4 text-red-500" />
                                                Eliminar
                                            </button>
                                        )}
                                    </>
                                );
                            })()}
                        </div>
                    </>,
                    document.body
                )}

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
                                    className="p-2 border border-gray-200 rounded-xl bg-white text-gray-500 hover:bg-indigo-50 hover:text-indigo-600 transition-all disabled:opacity-30 disabled:hover:bg-white disabled:hover:text-gray-500 cursor-pointer"
                                >
                                    <ChevronLeftIcon className="h-5 w-5" />
                                </button>
                                <div className="px-4 py-2 text-sm font-bold text-indigo-600 bg-indigo-50 rounded-xl">
                                    {currentPage} / {totalPages}
                                </div>
                                <button
                                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                    disabled={currentPage === totalPages}
                                    className="p-2 border border-gray-200 rounded-xl bg-white text-gray-500 hover:bg-indigo-50 hover:text-indigo-600 transition-all disabled:opacity-30 disabled:hover:bg-white disabled:hover:text-gray-500 cursor-pointer"
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
            />
        </div>
    );
}
