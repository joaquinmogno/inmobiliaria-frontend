import { useState, useEffect } from "react";
import { pagosService, type Pago } from "../services/pagos.service";
import { ChevronLeftIcon, ChevronRightIcon, DocumentTextIcon } from "@heroicons/react/24/outline";
import { formatCurrency } from "../utils/currency";
import FilterBar, { persistFilter, readPersistedFilter } from "../components/FilterBar";

export default function HistorialPagos() {
    const [pagos, setPagos] = useState<Pago[]>([]);
    const [searchTerm, setSearchTerm] = useState(() => readPersistedFilter("pagos"));
    const [debouncedSearch, setDebouncedSearch] = useState(() => readPersistedFilter("pagos"));
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const [isLoading, setIsLoading] = useState(true);

    const itemsPerPage = 15;

    useEffect(() => {
        persistFilter("pagos", searchTerm);
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

    const refreshData = async (page: number = 1, searchQuery: string = "") => {
        setIsLoading(true);
        try {
            const response = await pagosService.getAll(page, itemsPerPage, searchQuery);
            setPagos(response.data);
            setTotalPages(response.meta.totalPages);
            setTotalItems(response.meta.total);
        } catch (error) {
            console.error("Error loading pagos:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handlePageChange = (newPage: number) => {
        if (newPage >= 1 && newPage <= totalPages) {
            setCurrentPage(newPage);
        }
    };

    const formatAddress = (propiedad: any) => {
        if (!propiedad) return "N/A";
        let addr = propiedad.direccion;
        if (propiedad.piso) addr += ` - Piso ${propiedad.piso}`;
        if (propiedad.departamento) addr += ` Dpto ${propiedad.departamento}`;
        return addr;
    };

    const formatPeriod = (dateStr?: string | null) => {
        if (!dateStr) return "N/A";
        const period = new Date(dateStr).toLocaleDateString("es-AR", {
            month: "long",
            year: "numeric",
            timeZone: "UTC",
        });
        return `${period.charAt(0).toUpperCase()}${period.slice(1)}`;
    };

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Historial Global de Pagos</h1>
                    <p className="text-sm text-gray-500">Registro histórico de todos los cobros recibidos</p>
                </div>
            </div>

            <FilterBar query={searchTerm} onQueryChange={setSearchTerm} onClear={() => setSearchTerm("")} resultCount={totalItems} placeholder="Buscar por propiedad, inquilino u observaciones..." />

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="md:hidden divide-y divide-gray-100">
                    {isLoading ? (
                        <div className="px-4 py-12 text-center text-sm text-gray-500">
                            <div className="flex justify-center items-center gap-2">
                                <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                                Cargando pagos...
                            </div>
                        </div>
                    ) : pagos.length === 0 ? (
                        <div className="px-4 py-12 text-center">
                            <DocumentTextIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                            <p className="text-gray-500 text-sm">No se encontraron pagos con los filtros actuales.</p>
                        </div>
                    ) : (
                        pagos.map((pago: any) => (
                            <article key={pago.id} className="p-4">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="text-xs font-black uppercase tracking-wider text-gray-600">
                                            {new Date(pago.fechaPago).toLocaleDateString("es-AR", {
                                                day: "2-digit",
                                                month: "2-digit",
                                                year: "numeric",
                                                timeZone: "UTC",
                                            })} · {pago.metodoPago}
                                        </p>
                                        <h3 className="mt-1 text-sm font-black leading-snug text-gray-900">
                                            {formatAddress(pago.liquidacion?.contrato?.propiedad)}
                                        </h3>
                                        <p className="mt-1 text-xs text-gray-500">
                                            Liq. #{pago.liquidacion?.id} · {formatPeriod(pago.liquidacion?.periodo)}
                                        </p>
                                    </div>
                                    <span className="shrink-0 text-sm font-black font-mono text-green-700">
                                        + {formatCurrency(pago.monto, pago.moneda || pago.liquidacion?.moneda || "ARS")}
                                    </span>
                                </div>
                                <div className="mt-3 rounded-xl bg-gray-50 p-3 text-xs text-gray-600">
                                    <p><span className="font-bold text-gray-600 uppercase">Inquilino:</span> {pago.liquidacion?.contrato?.inquilinos.find((i: any) => i.esPrincipal)?.persona.nombreCompleto || 'N/A'}</p>
                                    <p className="mt-1"><span className="font-bold text-gray-600 uppercase">Registró:</span> {pago.creadoPor?.nombreCompleto || pago.auditLogs?.[0]?.usuario?.nombreCompleto || 'Sistema'}</p>
                                </div>
                            </article>
                        ))
                    )}
                </div>
                <div className="hidden overflow-x-auto md:block">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50/50 whitespace-nowrap">
                            <tr>
                                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Fecha / Método</th>
                                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Propiedad / Contrato</th>
                                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Inquilino</th>
                                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Monto</th>
                                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Período Liq.</th>
                                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Auditoría</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-sm text-gray-500">
                                        <div className="flex justify-center items-center gap-2">
                                            <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                                            Cargando pagos...
                                        </div>
                                    </td>
                                </tr>
                            ) : pagos.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center">
                                        <DocumentTextIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                                        <p className="text-gray-500 text-sm">No se encontraron pagos con los filtros actuales.</p>
                                    </td>
                                </tr>
                            ) : (
                                pagos.map((pago: any) => (
                                    <tr key={pago.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-medium text-gray-900">
                                                    {new Date(pago.fechaPago).toLocaleDateString('es-AR')}
                                                </span>
                                                <span className="text-xs text-gray-500 mt-1">
                                                    {pago.metodoPago}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-gray-900">
                                                {formatAddress(pago.liquidacion?.contrato?.propiedad)}
                                            </div>
                                            <div className="text-xs text-gray-500 mt-1">
                                                Liq. #{pago.liquidacion?.id}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-900">
                                                {pago.liquidacion?.contrato?.inquilinos.find((i: any) => i.esPrincipal)?.persona.nombreCompleto || 'N/A'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-bold text-green-700 whitespace-nowrap">
	                                                + {formatCurrency(pago.monto, pago.moneda || pago.liquidacion?.moneda || "ARS")}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-500">
                                                {formatPeriod(pago.liquidacion?.periodo)}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-gray-900">
                                                {pago.creadoPor?.nombreCompleto || pago.auditLogs?.[0]?.usuario?.nombreCompleto || 'Sistema'}
                                            </div>
                                            <div className="text-xs text-gray-500 mt-1">
                                                {pago.auditLogs?.[0]
                                                    ? new Date(pago.auditLogs[0].fechaCreacion).toLocaleString('es-AR')
                                                    : new Date(pago.fechaCreacion).toLocaleString('es-AR')}
                                            </div>
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
                                <p className="text-xs text-gray-500 sm:hidden">Pág. {currentPage} / {totalPages}</p>
                            </div>
                            <div>
                                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                                    <button
                                        onClick={() => handlePageChange(currentPage - 1)}
                                        disabled={currentPage === 1}
                                        className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
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
                                        className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
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
        </div>
    );
}
