import { useState, useEffect } from "react";
import { cajachicaService, type MovimientoCaja, type CajaChicaResponse } from "../services/cajachica.service";
import {
    MagnifyingGlassIcon,
    PlusIcon,
    CurrencyDollarIcon,
    BuildingLibraryIcon,
    BanknotesIcon,
    HomeIcon,
    UserGroupIcon,
    ChartBarIcon,
    ReceiptPercentIcon
} from "@heroicons/react/24/outline";

const formatCurrency = (n: number) =>
    new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n);

export default function CajaChica() {
    const [movimientos, setMovimientos] = useState<MovimientoCaja[]>([]);
    const [meta, setMeta] = useState<CajaChicaResponse['meta'] | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [tipoFilter, setTipoFilter] = useState("");
    const [cuentaFilter, setCuentaFilter] = useState("");
    // Default a mes actual
    const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
    const [isLoading, setIsLoading] = useState(true);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState({
        tipo: 'INGRESO',
        concepto: '',
        monto: '',
        fecha: new Date().toISOString().slice(0, 10),
        metodoPago: 'EFECTIVO',
        cuenta: 'CAJA',
        observaciones: ''
    });

    const itemsPerPage = 20;

    useEffect(() => {
        const timer = setTimeout(() => { setDebouncedSearch(searchTerm); }, 300);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    useEffect(() => {
        refreshData(currentPage, debouncedSearch, tipoFilter, cuentaFilter, selectedMonth, selectedYear);
    }, [currentPage, debouncedSearch, tipoFilter, cuentaFilter, selectedMonth, selectedYear]);

    // Auto-asignar cuenta según método de pago en el formulario manual
    useEffect(() => {
        setFormData(prev => ({
            ...prev,
            cuenta: prev.metodoPago === 'EFECTIVO' ? 'CAJA' : 'BANCO'
        }));
    }, [formData.metodoPago]);

    const refreshData = async (page: number, search: string, tipo: string, cuenta: string, mes?: number, anio?: number) => {
        setIsLoading(true);
        try {
            const response = await cajachicaService.getAll(
                page, 
                itemsPerPage, 
                tipo || undefined, 
                cuenta || undefined, 
                search || undefined,
                mes,
                anio
            );
            setMovimientos(response.data);
            setMeta(response.meta);
        } catch (error) {
            console.error("Error loading caja chica:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await cajachicaService.create({
                ...formData,
                tipo: formData.tipo as 'INGRESO' | 'EGRESO',
                cuenta: formData.cuenta as 'CAJA' | 'BANCO',
                monto: Number(formData.monto)
            });
            setIsModalOpen(false);
            refreshData(1, debouncedSearch, tipoFilter, cuentaFilter, selectedMonth, selectedYear);
            setFormData({
                tipo: 'INGRESO',
                concepto: '',
                monto: '',
                fecha: new Date().toISOString().slice(0, 10),
                metodoPago: 'EFECTIVO',
                cuenta: 'CAJA',
                observaciones: ''
            });
        } catch (error) {
            console.error("Error al guardar movimiento:", error);
            alert("Error al guardar el movimiento");
        }
    };

    return (
        <div className="max-w-7xl mx-auto space-y-6 pb-20">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Gestión Financiera</h1>
                    <p className="text-sm text-gray-500">Control unificado de ingresos, egresos y rentabilidad</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="hidden lg:flex items-center gap-4 bg-white px-4 py-2 rounded-xl shadow-sm border border-gray-100">
                         <div className="flex items-center gap-2">
                             <div className="w-2 h-2 rounded-full bg-amber-400"></div>
                             <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">Efectivo:</span>
                             <span className="text-xs font-bold text-gray-900">{formatCurrency(meta?.balanceCaja || 0)}</span>
                         </div>
                         <div className="w-px h-4 bg-gray-100"></div>
                         <div className="flex items-center gap-2">
                             <div className="w-2 h-2 rounded-full bg-blue-400"></div>
                             <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">Banco:</span>
                             <span className="text-xs font-bold text-gray-900">{formatCurrency(meta?.balanceBanco || 0)}</span>
                         </div>
                         <div className="w-px h-4 bg-gray-100"></div>
                         <div className="flex items-center gap-2">
                             <div className="w-2 h-2 rounded-full bg-red-400 animate-pulse"></div>
                             <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">Plata Ajena:</span>
                             <span className="text-xs font-bold text-red-600">{formatCurrency(meta?.fondosEnCustodia || 0)}</span>
                         </div>
                    </div>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl shadow-sm transition-colors cursor-pointer"
                    >
                        <PlusIcon className="w-5 h-5" />
                        Nuevo Movimiento
                    </button>
                </div>
            </div>

            {/* KPIs Principales */}
            {meta && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                    {/* Cobrado Inquilinos */}
                    <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 transition-all hover:shadow-md">
                        <div className="flex items-center justify-between mb-3">
                            <div className="bg-green-50 p-2 rounded-xl">
                                <UserGroupIcon className="w-5 h-5 text-green-600" />
                            </div>
                            <span className="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full uppercase tracking-widest">Ingresos</span>
                        </div>
                        <p className="text-xs font-medium text-gray-500 mb-1">Cobrado Inquilinos</p>
                        <p className="text-xl font-black text-gray-900">
                            {formatCurrency(meta.totalCobrado)}
                        </p>
                    </div>

                    {/* Pagado Propietarios */}
                    <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 transition-all hover:shadow-md">
                        <div className="flex items-center justify-between mb-3">
                            <div className="bg-red-50 p-2 rounded-xl">
                                <HomeIcon className="w-5 h-5 text-red-600" />
                            </div>
                            <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full uppercase tracking-widest">Salidas</span>
                        </div>
                        <p className="text-xs font-medium text-gray-500 mb-1">Pagado Propietarios</p>
                        <p className="text-xl font-black text-gray-900">
                            {formatCurrency(meta.totalPagadoPropietarios)}
                        </p>
                    </div>

                    {/* Ganancia Bruta */}
                    <div className="bg-indigo-600 p-5 rounded-2xl shadow-lg border border-indigo-700 transition-all hover:-translate-y-1">
                        <div className="flex items-center justify-between mb-3">
                            <div className="bg-white/20 p-2 rounded-xl">
                                <ChartBarIcon className="w-5 h-5 text-white" />
                            </div>
                            <span className="text-[10px] font-bold text-white bg-white/20 px-2 py-0.5 rounded-full uppercase tracking-widest">Inmobiliaria</span>
                        </div>
                        <p className="text-xs font-medium text-indigo-100 mb-1">Ganancia Bruta (Comisiones)</p>
                        <p className="text-xl font-black text-white">
                            {formatCurrency(meta.gananciaBruta)}
                        </p>
                    </div>

                    {/* Gastos del Negocio */}
                    <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 transition-all hover:shadow-md">
                        <div className="flex items-center justify-between mb-3">
                            <div className="bg-amber-50 p-2 rounded-xl">
                                <ReceiptPercentIcon className="w-5 h-5 text-amber-600" />
                            </div>
                            <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full uppercase tracking-widest">Gastos</span>
                        </div>
                        <p className="text-xs font-medium text-gray-500 mb-1">Gastos Operativos</p>
                        <p className="text-xl font-black text-gray-900">
                            {formatCurrency(meta.gastosGenerales)}
                        </p>
                    </div>

                    {/* Resultado Neto */}
                    <div className="bg-gray-900 p-5 rounded-2xl shadow-lg border border-gray-800 transition-all hover:bg-gray-800">
                        <div className="flex items-center justify-between mb-3">
                            <div className="bg-green-500/20 p-2 rounded-xl">
                                <CurrencyDollarIcon className="w-5 h-5 text-green-400" />
                            </div>
                            <span className="text-[10px] font-bold text-green-400 bg-green-500/10 px-2 py-0.5 rounded-full uppercase tracking-widest">Neto Real</span>
                        </div>
                        <p className="text-xs font-medium text-gray-400 mb-1">Resultado Final</p>
                        <p className="text-xl font-black text-white">
                            {formatCurrency(meta.resultadoNeto)}
                        </p>
                    </div>
                </div>
            )}

            {/* Mobile Account Summary */}
            <div className="lg:hidden grid grid-cols-2 gap-3">
                <div className="bg-white p-3 rounded-xl border border-amber-100 flex items-center gap-3">
                    <BanknotesIcon className="w-5 h-5 text-amber-500" />
                    <div>
                        <p className="text-[10px] text-gray-400 font-bold uppercase">Efectivo</p>
                        <p className="text-sm font-bold">{formatCurrency(meta?.balanceCaja || 0)}</p>
                    </div>
                </div>
                <div className="bg-white p-3 rounded-xl border border-blue-100 flex items-center gap-3">
                    <BuildingLibraryIcon className="w-5 h-5 text-blue-500" />
                    <div>
                        <p className="text-[10px] text-gray-400 font-bold uppercase">Banco</p>
                        <p className="text-sm font-bold">{formatCurrency(meta?.balanceBanco || 0)}</p>
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-red-100 flex items-center gap-3 col-span-2">
                    <div className="w-2 h-2 rounded-full bg-red-400 animate-pulse"></div>
                    <div>
                        <p className="text-[10px] text-gray-400 font-bold uppercase">Plata Ajena (Custodia)</p>
                        <p className="text-sm font-bold text-red-600">{formatCurrency(meta?.fondosEnCustodia || 0)}</p>
                    </div>
                </div>
            </div>
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-wrap items-center gap-3">
                {/* Período */}
                <div className="flex items-center gap-2 mr-2 bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-100">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Período:</span>
                    <select
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(Number(e.target.value))}
                        className="bg-transparent border-none text-sm font-bold text-gray-700 focus:ring-0 cursor-pointer p-0"
                    >
                        {["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"].map((m, i) => (
                            <option key={i+1} value={i+1}>{m}</option>
                        ))}
                    </select>
                    <select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(Number(e.target.value))}
                        className="bg-transparent border-none text-sm font-bold text-gray-700 focus:ring-0 cursor-pointer p-0"
                    >
                        {[2024, 2025, 2026, 2027].map(y => (
                            <option key={y} value={y}>{y}</option>
                        ))}
                    </select>
                </div>

                <div className="relative flex-1 min-w-[200px]">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <MagnifyingGlassIcon className="w-5 h-5 text-gray-400" />
                    </div>
                    <input
                        type="text"
                        placeholder="Buscar concepto..."
                        className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <select
                    value={tipoFilter}
                    onChange={(e) => setTipoFilter(e.target.value)}
                    className="block w-full sm:w-40 px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm cursor-pointer"
                >
                    <option value="">Todos los tipos</option>
                    <option value="INGRESO">Ingresos</option>
                    <option value="EGRESO">Egresos</option>
                </select>
                <select
                    value={cuentaFilter}
                    onChange={(e) => setCuentaFilter(e.target.value)}
                    className="block w-full sm:w-40 px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm cursor-pointer"
                >
                    <option value="">Efectivo + Banco</option>
                    <option value="CAJA">Solo Efectivo</option>
                    <option value="BANCO">Solo Banco</option>
                </select>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden min-h-[300px]">
                <table className="min-w-full divide-y divide-gray-100">
                    <thead className="bg-gray-50/50">
                        <tr>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Fecha</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Concepto</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Tipo</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Cuenta</th>
                            <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Monto</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Creado por</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {isLoading ? (
                            <tr><td colSpan={6} className="px-6 py-12 text-center text-sm text-gray-400 animate-pulse">Cargando movimientos...</td></tr>
                        ) : movimientos.length === 0 ? (
                            <tr><td colSpan={6} className="px-6 py-12 text-center text-sm text-gray-500">No hay registros que coincidan con los filtros.</td></tr>
                        ) : (
                            movimientos.map((mov) => (
                                <tr key={mov.id} className="hover:bg-gray-50/50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-medium">
                                        {new Date(mov.fecha + 'T00:00:00').toLocaleDateString('es-AR')}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm font-semibold text-gray-900">{mov.concepto}</div>
                                        {mov.observaciones && <div className="text-xs text-gray-400 mt-0.5">{mov.observaciones}</div>}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2.5 py-1 text-[10px] font-black rounded-full uppercase tracking-widest ${mov.tipo === 'INGRESO' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                            {mov.tipo === 'INGRESO' ? 'Ingreso' : 'Egreso'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2.5 py-1 text-[10px] font-black rounded-full uppercase tracking-widest ${mov.cuenta === 'BANCO' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'}`}>
                                            {mov.cuenta === 'BANCO' ? '🏦 Banco' : '💵 Caja'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right">
                                        <span className={`text-sm font-bold font-mono ${mov.tipo === 'INGRESO' ? 'text-green-600' : 'text-red-600'}`}>
                                            {mov.tipo === 'INGRESO' ? '+' : '-'} {formatCurrency(Number(mov.monto))}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {mov.creadoPor?.nombreCompleto || 'Sistema'}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
                {meta && meta.totalPages > 1 && (
                    <div className="bg-gray-50 px-6 py-3 border-t border-gray-100 flex justify-between items-center">
                        <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="text-sm text-indigo-600 disabled:opacity-40 font-medium cursor-pointer">Anterior</button>
                        <span className="text-sm text-gray-500">Pág {currentPage} de {meta.totalPages} · {meta.total} registros</span>
                        <button onClick={() => setCurrentPage(p => Math.min(meta.totalPages, p + 1))} disabled={currentPage === meta.totalPages} className="text-sm text-indigo-600 disabled:opacity-40 font-medium cursor-pointer">Siguiente</button>
                    </div>
                )}
            </div>

            {/* Modal de Nuevo Movimiento */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                            <h3 className="text-lg font-bold text-gray-900">Nuevo Movimiento Manual</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 cursor-pointer">✕</button>
                        </div>
                        <form onSubmit={handleCreate} className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Tipo *</label>
                                    <select required className="w-full border border-gray-300 rounded-lg py-2 px-3 text-sm focus:ring-indigo-500 focus:border-indigo-500" value={formData.tipo} onChange={e => setFormData({ ...formData, tipo: e.target.value })}>
                                        <option value="INGRESO">Ingreso</option>
                                        <option value="EGRESO">Egreso</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Fecha *</label>
                                    <input type="date" required className="w-full border border-gray-300 rounded-lg py-2 px-3 text-sm focus:ring-indigo-500 focus:border-indigo-500" value={formData.fecha} onChange={e => setFormData({ ...formData, fecha: e.target.value })} />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Concepto *</label>
                                <input type="text" required placeholder="Ej. Pago de Luz" className="w-full border border-gray-300 rounded-lg py-2 px-3 text-sm focus:ring-indigo-500 focus:border-indigo-500" value={formData.concepto} onChange={e => setFormData({ ...formData, concepto: e.target.value })} />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Monto *</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <span className="text-gray-500 text-sm">$</span>
                                    </div>
                                    <input type="number" required min="0" step="0.01" className="w-full pl-7 border border-gray-300 rounded-lg py-2 px-3 text-sm focus:ring-indigo-500 focus:border-indigo-500" value={formData.monto} onChange={e => setFormData({ ...formData, monto: e.target.value })} />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Método de Pago *</label>
                                    <select required className="w-full border border-gray-300 rounded-lg py-2 px-3 text-sm focus:ring-indigo-500 focus:border-indigo-500" value={formData.metodoPago} onChange={e => setFormData({ ...formData, metodoPago: e.target.value })}>
                                        <option value="EFECTIVO">Efectivo</option>
                                        <option value="TRANSFERENCIA">Transferencia</option>
                                        <option value="CHEQUE">Cheque</option>
                                        <option value="OTROS">Otros</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Cuenta *</label>
                                    <select required className="w-full border border-gray-300 rounded-lg py-2 px-3 text-sm focus:ring-indigo-500 focus:border-indigo-500" value={formData.cuenta} onChange={e => setFormData({ ...formData, cuenta: e.target.value })}>
                                        <option value="CAJA">💵 Caja (Efectivo)</option>
                                        <option value="BANCO">🏦 Banco / Transf.</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Observaciones</label>
                                <textarea rows={2} className="w-full border border-gray-300 rounded-lg py-2 px-3 text-sm focus:ring-indigo-500 focus:border-indigo-500" value={formData.observaciones} onChange={e => setFormData({ ...formData, observaciones: e.target.value })} />
                            </div>

                            <div className="pt-2 flex justify-end gap-3">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 cursor-pointer">Cancelar</button>
                                <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-xl hover:bg-indigo-700 cursor-pointer">Guardar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
