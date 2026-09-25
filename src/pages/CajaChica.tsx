import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { cajachicaService, type MovimientoCaja, type CajaChicaSummary, type CierreCaja, type CuentaCaja } from "../services/cajachica.service";
import NumericInput from "../components/NumericInput";
import { useAuth } from "../context/AuthContext";
import { hasPermission } from "../utils/permissions";
import {
    PlusIcon,
    CurrencyDollarIcon,
    BuildingLibraryIcon,
    BanknotesIcon,
    HomeIcon,
    UserGroupIcon,
    ChartBarIcon,
    ReceiptPercentIcon,
    NoSymbolIcon
} from "@heroicons/react/24/outline";
import { formatCurrency, formatSignedCurrency, type Moneda } from "../utils/currency";
import FilterBar, { persistFilter, readPersistedFilter } from "../components/FilterBar";
import FormError, { useFormError } from "../components/FormError";
import AppSelect from "../components/AppSelect";
import { PAYMENT_METHOD_OPTIONS } from "../services/pagos.service";
import ReversalModal from "../components/ReversalModal";
import { toast } from "react-hot-toast";
import { currentMonthInput, formatDate, todayDateInput } from "../utils/date";
import ActiveFilterChips from "../components/ActiveFilterChips";

const parsePeriod = (value: string | null) => {
    const match = value?.match(/^(\d{4})-(0[1-9]|1[0-2])$/);
    return match ? { year: Number(match[1]), month: Number(match[2]) } : null;
};

const CASH_CLOSING_TARGETS: Array<{ cuenta: CuentaCaja; moneda: Moneda; label: string }> = [
    { cuenta: 'CAJA', moneda: 'ARS', label: 'Caja ARS' },
    { cuenta: 'BANCO', moneda: 'ARS', label: 'Banco ARS' },
    { cuenta: 'CAJA', moneda: 'USD', label: 'Caja USD' },
    { cuenta: 'BANCO', moneda: 'USD', label: 'Banco USD' }
];

export default function CajaChica() {
    const { error: formError, setError: setFormError, reportError, formRef } = useFormError();
    const { user } = useAuth();
    const canCreate = hasPermission(user, "caja_chica.crear");
    const canVoid = hasPermission(user, "caja_chica.eliminar");
    const canCloseCash = hasPermission(user, "caja_chica.cerrar");
    const canReopenCash = hasPermission(user, "caja_chica.reabrir");
    const [searchParams, setSearchParams] = useSearchParams();
    const urlPeriod = parsePeriod(searchParams.get('periodo'));
    const [movimientos, setMovimientos] = useState<MovimientoCaja[]>([]);
    const [meta, setMeta] = useState<CajaChicaSummary | null>(null);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [searchTerm, setSearchTerm] = useState(() => searchParams.get('q') ?? readPersistedFilter("caja-chica"));
    const [debouncedSearch, setDebouncedSearch] = useState(() => searchParams.get('q') ?? readPersistedFilter("caja-chica"));
    const [currentPage, setCurrentPage] = useState(1);
    const [tipoFilter, setTipoFilter] = useState(() => searchParams.get('tipo') === 'INGRESO' || searchParams.get('tipo') === 'EGRESO' ? searchParams.get('tipo')! : "");
    const [cuentaFilter, setCuentaFilter] = useState(() => searchParams.get('cuenta') === 'CAJA' || searchParams.get('cuenta') === 'BANCO' ? searchParams.get('cuenta')! : "");
    // Default a mes actual
    const [initialYear, initialMonth] = currentMonthInput().split("-").map(Number);
    const [selectedMonth, setSelectedMonth] = useState<number>(urlPeriod?.month ?? initialMonth);
    const [selectedYear, setSelectedYear] = useState<number>(urlPeriod?.year ?? initialYear);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedMovement, setSelectedMovement] = useState<MovimientoCaja | null>(null);
    const [cierres, setCierres] = useState<CierreCaja[]>([]);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState({
        tipo: 'INGRESO',
        concepto: '',
        monto: '',
        moneda: 'ARS' as Moneda,
        fecha: todayDateInput(),
        metodoPago: 'EFECTIVO',
        cuenta: 'CAJA',
        observaciones: ''
    });

    const itemsPerPage = 20;

    useEffect(() => {
        persistFilter("caja-chica", searchTerm);
        const timer = setTimeout(() => { setDebouncedSearch(searchTerm); }, 300);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    useEffect(() => {
        const nextSearch = searchParams.get('q');
        const nextTipo = searchParams.get('tipo');
        const nextCuenta = searchParams.get('cuenta');
        const nextPeriod = parsePeriod(searchParams.get('periodo'));
        if (nextSearch !== null && nextSearch !== searchTerm) {
            setSearchTerm(nextSearch);
            setDebouncedSearch(nextSearch);
        }
        setTipoFilter(nextTipo === 'INGRESO' || nextTipo === 'EGRESO' ? nextTipo : '');
        setCuentaFilter(nextCuenta === 'CAJA' || nextCuenta === 'BANCO' ? nextCuenta : '');
        if (nextPeriod) {
            setSelectedMonth(nextPeriod.month);
            setSelectedYear(nextPeriod.year);
        }
    }, [searchParams]);

    useEffect(() => {
        const period = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;
        setSearchParams(current => {
            const next = new URLSearchParams(current);
            const values = { q: searchTerm.trim(), tipo: tipoFilter, cuenta: cuentaFilter, periodo: period };
            Object.entries(values).forEach(([key, value]) => value ? next.set(key, value) : next.delete(key));
            return next;
        }, { replace: true });
    }, [searchTerm, tipoFilter, cuentaFilter, selectedMonth, selectedYear, setSearchParams]);

    useEffect(() => {
        refreshData(currentPage, debouncedSearch, tipoFilter, cuentaFilter, selectedMonth, selectedYear);
    }, [currentPage, debouncedSearch, tipoFilter, cuentaFilter, selectedMonth, selectedYear]);

    useEffect(() => {
        cajachicaService.getSummary(selectedMonth, selectedYear).then(setMeta).catch(error => {
            console.error("Error loading caja summary:", error);
        });
    }, [selectedMonth, selectedYear]);

    const refreshClosures = async () => {
        try {
            setCierres(await cajachicaService.getCierres());
        } catch (error) {
            console.error("Error loading cash closings:", error);
        }
    };

    useEffect(() => { void refreshClosures(); }, []);

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
            setTotal(response.meta.total);
            setTotalPages(response.meta.totalPages);
        } catch (error) {
            console.error("Error loading caja chica:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const formatMovementDate = (dateStr?: string | null) => {
        return dateStr ? formatDate(dateStr) : "N/A";
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError("");
        try {
            await cajachicaService.create({
                ...formData,
                tipo: formData.tipo as 'INGRESO' | 'EGRESO',
	                cuenta: formData.cuenta as 'CAJA' | 'BANCO',
	                moneda: formData.moneda as Moneda,
	                monto: Number(formData.monto)
            });
            setIsModalOpen(false);
            refreshData(1, debouncedSearch, tipoFilter, cuentaFilter, selectedMonth, selectedYear);
            cajachicaService.getSummary(selectedMonth, selectedYear).then(setMeta);
            setFormData({
	                tipo: 'INGRESO',
	                concepto: '',
	                monto: '',
	                moneda: 'ARS',
	                fecha: todayDateInput(),
                metodoPago: 'EFECTIVO',
                cuenta: 'CAJA',
                observaciones: ''
            });
        } catch (error) {
            console.error("Error al guardar movimiento:", error);
            reportError(error, "No se pudo guardar el movimiento");
        }
    };

    const isManualReversible = (movement: MovimientoCaja) => (
        !movement.anuladoEn &&
        !movement.reversionDeId &&
        !movement.pagoId &&
        !movement.pagoSueldoId &&
        !movement.ajustePagoSueldoDe &&
        !movement.liquidacionId &&
        !movement.contratoId
    );

    const handleVoid = async (motivo: string) => {
        if (!selectedMovement) return;
        await cajachicaService.anular(selectedMovement.id, motivo);
        toast.success("Movimiento anulado y contrapartida registrada");
        await Promise.all([
            refreshData(currentPage, debouncedSearch, tipoFilter, cuentaFilter, selectedMonth, selectedYear),
            cajachicaService.getSummary(selectedMonth, selectedYear).then(setMeta)
        ]);
    };
    const getCashClosing = (target: { cuenta: CuentaCaja; moneda: Moneda }) => cierres.find(cierre => (
        cierre.periodo.slice(0, 10) === selectedPeriod
        && cierre.cuenta === target.cuenta
        && cierre.moneda === target.moneda
    ));

    const getLedgerBalance = (target: { cuenta: CuentaCaja; moneda: Moneda }) => (
        meta?.saldoAlCierre?.[target.moneda]?.cuentas[target.cuenta].saldo ?? 0
    );

    const handleClosePeriod = async (target: { cuenta: CuentaCaja; moneda: Moneda; label: string }) => {
        const closing = getCashClosing(target);
        if (closing?.estado === 'CERRADO') {
            toast.error(`${target.label} ya está cerrado. Reabrilo con autorización antes de volver a cerrarlo.`);
            return;
        }
        const saldoSistema = getLedgerBalance(target);
        const saldo = window.prompt(`Saldo contado/declarado para ${target.label} al cierre de ${meta?.hasta || `${selectedYear}-${String(selectedMonth).padStart(2, "0")}`} (el período quedará bloqueado):`, String(saldoSistema));
        if (saldo === null) return;
        const saldoDeclarado = Number(saldo);
        if (!Number.isFinite(saldoDeclarado)) {
            toast.error('Indicá un saldo numérico válido.');
            return;
        }
        const motivo = saldoDeclarado === Number(saldoSistema) ? undefined : window.prompt('Motivo de la diferencia:') || undefined;
        try {
            await cajachicaService.cerrarPeriodo({ periodo: selectedPeriod, cuenta: target.cuenta, moneda: target.moneda, saldoDeclarado, motivoDiferencia: motivo });
            await refreshClosures();
            toast.success(`${target.label} cerrado para el período seleccionado`);
        }
        catch (error) { toast.error(error instanceof Error ? error.message : 'No se pudo cerrar la caja'); }
    };

    const handleReopenPeriod = async (target: { cuenta: CuentaCaja; moneda: Moneda; label: string }, closing: CierreCaja) => {
        if (closing.estado !== 'CERRADO') return;
        const motivo = window.prompt(`Motivo para reabrir ${target.label} de ${selectedPeriod.slice(0, 7)}. Esta acción quedará auditada:`);
        if (motivo === null) return;
        if (motivo.trim().length < 5) {
            toast.error('Indicá un motivo de al menos 5 caracteres para reabrir el período.');
            return;
        }
        try {
            await cajachicaService.reabrirPeriodo(closing.id, motivo.trim());
            await refreshClosures();
            toast.success(`${target.label} reabierto. Podés registrar la corrección y cerrarlo nuevamente.`);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'No se pudo reabrir la caja');
        }
    };

    const selectedPeriod = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`;

    return (
        <div className="max-w-7xl mx-auto space-y-6 pb-20">
            {/* Header */}
            <div className="flex flex-col items-stretch justify-between gap-4 xl:flex-row xl:items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Gestión Financiera</h1>
                    <p className="text-sm text-content-muted">Caja por fecha real de movimiento. Los saldos se muestran al cierre del período elegido.</p>
                </div>
                <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:flex-wrap sm:items-center xl:flex-nowrap">
                    <div className="hidden lg:flex items-center gap-4 bg-white px-4 py-2 rounded-xl shadow-sm border border-gray-100">
                         <div className="flex items-center gap-2">
                             <div className="w-2 h-2 rounded-full bg-amber-400"></div>
                             <span className="text-xs font-bold text-gray-600 uppercase tracking-tight">Efectivo al cierre:</span>
                             <span className="text-xs font-bold text-gray-900">{formatCurrency(meta?.balanceCaja || 0)}</span>
                         </div>
                         <div className="w-px h-4 bg-gray-100"></div>
                         <div className="flex items-center gap-2">
                             <div className="w-2 h-2 rounded-full bg-blue-400"></div>
                             <span className="text-xs font-bold text-gray-600 uppercase tracking-tight">Banco al cierre:</span>
                             <span className="text-xs font-bold text-gray-900">{formatCurrency(meta?.balanceBanco || 0)}</span>
                         </div>
                         <div className="w-px h-4 bg-gray-100"></div>
                         <div className="flex items-center gap-2">
                             <div className="w-2 h-2 rounded-full bg-red-400 animate-pulse"></div>
                             <span className="text-xs font-bold text-gray-600">Cobros menos pagos a dueños del mes:</span>
                             <span className="text-xs font-bold text-status-danger">{formatCurrency(meta?.fondosEnCustodia || 0)}</span>
                         </div>
                    </div>
                    {canCreate && <button
                        onClick={() => setIsModalOpen(true)}
                        className="inline-flex min-h-11 w-full items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl shadow-sm transition-colors cursor-pointer sm:w-auto"
                    >
                        <PlusIcon className="w-5 h-5" />
                        Nuevo Movimiento
                    </button>}
                </div>
            </div>

            <section aria-labelledby="cash-closing-title" className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h2 id="cash-closing-title" className="text-base font-black text-gray-950">Cierres por cuenta y moneda</h2>
                        <p className="mt-1 text-sm text-gray-600">Cada conciliación bloquea únicamente los movimientos de esa cuenta, moneda y período.</p>
                    </div>
                    <p className="text-xs font-bold text-gray-600">Período {selectedPeriod.slice(0, 7)}</p>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    {CASH_CLOSING_TARGETS.map(target => {
                        const closing = getCashClosing(target);
                        const isClosed = closing?.estado === 'CERRADO';
                        const stateLabel = isClosed ? 'Cerrado' : closing?.estado === 'REABIERTO' ? 'Reabierto' : 'Abierto';
                        const stateTone = isClosed
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                            : closing?.estado === 'REABIERTO'
                                ? 'border-amber-200 bg-amber-50 text-amber-950'
                                : 'border-gray-200 bg-gray-50 text-gray-800';
                        const saldoSistema = getLedgerBalance(target);
                        return <article key={`${target.cuenta}-${target.moneda}`} className={`rounded-xl border p-4 ${stateTone}`}>
                            <div className="flex items-start justify-between gap-2">
                                <div>
                                    <h3 className="font-black">{target.label}</h3>
                                    <p className="mt-1 text-xs font-bold uppercase tracking-wide">{stateLabel}</p>
                                </div>
                                {isClosed ? <span className="rounded-full bg-white/70 px-2 py-1 text-[10px] font-black uppercase">Bloqueado</span> : <span className="rounded-full bg-white/70 px-2 py-1 text-[10px] font-black uppercase">Operable</span>}
                            </div>
                            <p className="mt-4 text-xs font-bold uppercase tracking-wide">Saldo de sistema</p>
                            <p className="mt-1 text-lg font-black">{formatCurrency(Number(saldoSistema), target.moneda)}</p>
                            {closing && <>
                                <p className="mt-3 text-xs">Declarado {formatCurrency(Number(closing.saldoDeclarado), target.moneda)} · diferencia {formatCurrency(Number(closing.diferencia), target.moneda)}</p>
                                <p className="mt-1 text-xs">V{closing.version} · {formatDate(closing.cerradoEn)} · {closing.cerradoPor.nombreCompleto}</p>
                                {closing.estado === 'REABIERTO' && <p className="mt-1 text-xs font-semibold">Reabierto: {closing.motivoReapertura || 'sin motivo informado'}</p>}
                            </>}
                            <div className="mt-4 flex flex-wrap gap-2">
                                {canCloseCash && !isClosed && <button type="button" onClick={() => void handleClosePeriod(target)} className="min-h-10 rounded-lg border border-indigo-300 bg-white px-3 text-xs font-black text-indigo-800 hover:bg-indigo-50">Cerrar</button>}
                                {canReopenCash && isClosed && closing && <button type="button" onClick={() => void handleReopenPeriod(target, closing)} className="min-h-10 rounded-lg border border-amber-300 bg-white px-3 text-xs font-black text-amber-900 hover:bg-amber-100">Reabrir</button>}
                                {closing && <details className="relative text-xs text-gray-800"><summary className="flex min-h-10 cursor-pointer items-center rounded-lg border border-gray-300 bg-white px-3 font-bold hover:bg-gray-50">Historial ({closing.eventos.length})</summary><ol className="absolute right-0 z-20 mt-1 w-72 space-y-1 rounded-lg border border-gray-200 bg-white p-3 shadow-lg">{closing.eventos.map(evento => <li key={evento.id}><span className="font-bold">V{evento.version} · {evento.tipo === 'CIERRE' ? 'Cierre' : 'Reapertura'}</span> · {formatDate(evento.fechaCreacion)} · {evento.usuario.nombreCompleto}{evento.motivo ? ` · ${evento.motivo}` : ''}</li>)}</ol></details>}
                            </div>
                        </article>;
                    })}
                </div>
            </section>

            {/* KPIs Principales */}
            {meta && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                    {/* Cobrado Inquilinos */}
                    <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 transition-all hover:shadow-md">
                        <div className="flex items-center justify-between mb-3">
                            <div className="bg-green-50 p-2 rounded-xl">
                                <UserGroupIcon className="w-5 h-5 text-status-success" />
                            </div>
                            <span className="text-xs font-bold text-green-700 bg-green-50 px-2 py-0.5 rounded-full">Caja del período</span>
                        </div>
                        <p className="text-xs font-medium text-content-muted mb-1">Cobrado a inquilinos</p>
                        <p className="text-xl font-black text-gray-900">
                            {formatCurrency(meta.totalCobrado)}
                        </p>
                    </div>

                    {/* Pagado Propietarios */}
                    <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 transition-all hover:shadow-md">
                        <div className="flex items-center justify-between mb-3">
                            <div className="bg-red-50 p-2 rounded-xl">
                                <HomeIcon className="w-5 h-5 text-status-danger" />
                            </div>
                            <span className="text-xs font-bold text-status-danger bg-red-50 px-2 py-0.5 rounded-full uppercase tracking-widest">Salidas</span>
                        </div>
                        <p className="text-xs font-medium text-content-muted mb-1">Pagado Propietarios</p>
                        <p className="text-xl font-black text-gray-900">
                            {formatCurrency(meta.totalPagadoPropietarios)}
                        </p>
                    </div>

                    {/* Ganancia Bruta */}
                    <div className="bg-indigo-700 p-5 rounded-2xl shadow-lg border border-indigo-800 transition-all hover:-translate-y-1">
                        <div className="flex items-center justify-between mb-3">
                            <div className="bg-white/20 p-2 rounded-xl">
                                <ChartBarIcon className="w-5 h-5 text-white" />
                            </div>
                            <span className="text-xs font-bold text-white bg-white/20 px-2 py-0.5 rounded-full uppercase tracking-widest">Inmobiliaria</span>
                        </div>
                        <p className="mb-1 text-xs font-medium text-indigo-100">Otros ingresos de caja</p>
                        <p className="text-xl font-black text-white">
                            {formatCurrency(meta.gananciaBruta)}
                        </p>
                    </div>

                    {/* Gastos del Negocio */}
                    <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 transition-all hover:shadow-md">
                        <div className="flex items-center justify-between mb-3">
                            <div className="bg-amber-50 p-2 rounded-xl">
                                <ReceiptPercentIcon className="w-5 h-5 text-status-warning" />
                            </div>
                            <span className="text-xs font-bold text-status-warning bg-amber-50 px-2 py-0.5 rounded-full uppercase tracking-widest">Gastos</span>
                        </div>
                        <p className="text-xs font-medium text-content-muted mb-1">Otros egresos y sueldos</p>
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
                            <span className="rounded-full bg-white/15 px-2 py-0.5 text-xs font-bold text-white">Al cierre del período</span>
                        </div>
                        <p className="text-xs font-medium text-content-on-dark-muted mb-1">Saldo total de caja</p>
                        <p className="text-xl font-black text-white">
                            {formatCurrency(meta.balanceGeneral)}
                        </p>
                    </div>
                </div>
	            )}

	            {meta && (
	                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
	                    {(["ARS", "USD"] as Moneda[]).map(moneda => {
	                        const totals = meta.totalesPorMoneda?.[moneda] || {
	                            totalIngresos: moneda === "ARS" ? meta.totalIngresosARS : meta.totalIngresosUSD,
	                            totalEgresos: moneda === "ARS" ? meta.totalEgresosARS : meta.totalEgresosUSD,
	                            balance: moneda === "ARS" ? meta.balanceARS : meta.balanceUSD,
	                        };

	                        return (
	                            <section key={moneda} className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
	                                <div className="flex items-center justify-between mb-3">
	                                    <h2 className="text-xs font-black uppercase tracking-widest text-content-muted">{moneda}</h2>
	                                    <span className="text-xs font-bold text-gray-600">Saldo al cierre</span>
	                                </div>
	                                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-2 2xl:grid-cols-3">
	                                    <div>
	                                        <p className="text-xs font-bold text-green-700">Ingresos del período</p>
	                                        <p className="text-sm font-black text-gray-900">{formatCurrency(totals.totalIngresos, moneda)}</p>
	                                    </div>
	                                    <div>
	                                        <p className="text-xs font-bold uppercase text-status-danger">Egresos del período</p>
	                                        <p className="text-sm font-black text-gray-900">{formatCurrency(totals.totalEgresos, moneda)}</p>
	                                    </div>
	                                    <div>
	                                        <p className="text-xs font-bold uppercase text-indigo-600">Balance</p>
	                                        <p className="text-sm font-black text-gray-900">{formatCurrency(totals.balance, moneda)}</p>
	                                    </div>
	                                </div>
	                            </section>
	                        );
	                    })}
	                </div>
	            )}

	            {/* Mobile Account Summary */}
            <div className="lg:hidden grid grid-cols-1 min-[380px]:grid-cols-2 gap-3">
                <div className="bg-white p-3 rounded-xl border border-amber-100 flex items-center gap-3">
                    <BanknotesIcon className="w-5 h-5 text-status-warning" />
                    <div>
                        <p className="text-xs text-gray-600 font-bold uppercase">Efectivo al cierre</p>
                        <p className="text-sm font-bold">{formatCurrency(meta?.balanceCaja || 0)}</p>
                    </div>
                </div>
                <div className="bg-white p-3 rounded-xl border border-blue-100 flex items-center gap-3">
                    <BuildingLibraryIcon className="w-5 h-5 text-blue-500" />
                    <div>
                        <p className="text-xs text-gray-600 font-bold uppercase">Banco al cierre</p>
                        <p className="text-sm font-bold">{formatCurrency(meta?.balanceBanco || 0)}</p>
                    </div>
                </div>
                <div className="bg-white p-3 rounded-xl border border-red-100 flex items-center gap-3 min-[380px]:col-span-2">
                    <div className="w-2 h-2 rounded-full bg-red-400 animate-pulse"></div>
                    <div>
                        <p className="text-xs font-bold text-gray-600">Cobros menos pagos a dueños del mes</p>
                        <p className="text-sm font-bold text-status-danger">{formatCurrency(meta?.fondosEnCustodia || 0)}</p>
                    </div>
                </div>
            </div>

            <FilterBar query={searchTerm} onQueryChange={setSearchTerm} resultCount={total} placeholder="Buscar concepto..." onClear={() => { const [year, month] = currentMonthInput().split('-').map(Number); setSearchTerm(""); setTipoFilter(""); setCuentaFilter(""); setSelectedYear(year); setSelectedMonth(month); }}>
                {/* Período */}
                <div className="flex items-center gap-2 mr-2 bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-100">
                    <span className="text-xs font-black text-gray-600 uppercase tracking-widest">Período:</span>
                    <AppSelect
                        ariaLabel="Mes"
                        value={String(selectedMonth)}
                        onChange={(value) => setSelectedMonth(Number(value))}
                        options={["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"].map((label, index) => ({ value: String(index + 1), label }))}
                        className="w-24"
                        buttonClassName="border-transparent bg-transparent px-2 shadow-none"
                    />
                    <AppSelect
                        ariaLabel="Año"
                        value={String(selectedYear)}
                        onChange={(value) => setSelectedYear(Number(value))}
                        options={[2024, 2025, 2026, 2027].map(year => ({ value: String(year), label: String(year) }))}
                        className="w-28"
                        buttonClassName="border-transparent bg-transparent px-2 shadow-none"
                    />
                </div>

                <AppSelect
                    ariaLabel="Tipo de movimiento"
                    value={tipoFilter}
                    onChange={setTipoFilter}
                    options={[
                        { value: "", label: "Todos los tipos" },
                        { value: "INGRESO", label: "Entradas" },
                        { value: "EGRESO", label: "Egresos" }
                    ]}
                    className="w-full sm:w-44"
                />
                <AppSelect
                    ariaLabel="Cuenta"
                    value={cuentaFilter}
                    onChange={setCuentaFilter}
                    options={[
                        { value: "", label: "Efectivo + Banco" },
                        { value: "CAJA", label: "Solo efectivo" },
                        { value: "BANCO", label: "Solo banco" }
                    ]}
                    className="w-full sm:w-44"
                />
            </FilterBar>
            <ActiveFilterChips filters={[
                ...(searchTerm ? [{ key: 'q', label: `Búsqueda: ${searchTerm}`, onRemove: () => setSearchTerm('') }] : []),
                ...(tipoFilter ? [{ key: 'tipo', label: `Tipo: ${tipoFilter === 'INGRESO' ? 'Ingresos' : 'Egresos'}`, onRemove: () => setTipoFilter('') }] : []),
                ...(cuentaFilter ? [{ key: 'cuenta', label: `Cuenta: ${cuentaFilter === 'CAJA' ? 'Caja' : 'Banco'}`, onRemove: () => setCuentaFilter('') }] : []),
                ...(`${selectedYear}-${String(selectedMonth).padStart(2, '0')}` !== currentMonthInput() ? [{ key: 'periodo', label: `Período: ${String(selectedMonth).padStart(2, '0')}/${selectedYear}`, onRemove: () => { const [year, month] = currentMonthInput().split('-').map(Number); setSelectedYear(year); setSelectedMonth(month); } }] : [])
            ]} onClearAll={() => { const [year, month] = currentMonthInput().split('-').map(Number); setSearchTerm(''); setTipoFilter(''); setCuentaFilter(''); setSelectedYear(year); setSelectedMonth(month); }} />

            {/* Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden min-h-[300px]">
                <div className="divide-y divide-gray-100 2xl:hidden">
                    {isLoading ? (
                        <div className="px-4 py-12 text-center text-sm text-gray-600 animate-pulse">Cargando movimientos...</div>
                    ) : movimientos.length === 0 ? (
                        <div className="px-4 py-12 text-center text-sm text-content-muted">No hay registros que coincidan con los filtros.</div>
                    ) : (
                        movimientos.map((mov) => (
                            <article key={mov.id} className={`p-4 ${mov.anuladoEn ? "bg-gray-50" : ""}`}>
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="text-xs font-black uppercase tracking-wider text-gray-600">{formatMovementDate(mov.fecha)}</p>
                                        <h3 className="mt-1 text-sm font-black leading-snug text-gray-900">{mov.concepto}</h3>
                                        {mov.observaciones && <p className="mt-1 text-xs text-content-muted">{mov.observaciones}</p>}
                                    </div>
                                    <span className={`shrink-0 text-sm font-black font-mono ${mov.tipo === 'INGRESO' ? 'text-status-success' : 'text-status-danger'}`}>
                                        {formatSignedCurrency(mov.tipo === 'INGRESO' ? Math.abs(Number(mov.monto)) : -Math.abs(Number(mov.monto)), mov.moneda, true)}
                                    </span>
                                </div>
                                <div className="mt-3 flex flex-wrap items-center gap-2">
                                    <span className={`px-2.5 py-1 text-xs font-black rounded-full uppercase tracking-widest ${mov.tipo === 'INGRESO' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                        {mov.tipo === 'INGRESO' ? 'Ingreso' : 'Egreso'}
                                    </span>
                                    <span className={`px-2.5 py-1 text-xs font-black rounded-full uppercase tracking-widest ${mov.cuenta === 'BANCO' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'}`}>
                                        {mov.cuenta === 'BANCO' ? 'Banco' : 'Caja'}
                                    </span>
                                    <span className="text-xs font-medium text-content-muted">{mov.creadoPor?.nombreCompleto || 'Sistema'}</span>
                                </div>
                                {mov.anuladoEn && (
                                    <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                                        <p className="font-black uppercase tracking-wider">Movimiento anulado</p>
                                        <p className="mt-1">{mov.motivoAnulacion}</p>
                                        <p className="mt-1 text-amber-700">Por {mov.anuladoPor?.nombreCompleto || "Sistema"}</p>
                                    </div>
                                )}
                                {mov.reversionDeId && <p className="mt-2 text-xs font-bold text-indigo-700">Asiento inverso del movimiento #{mov.reversionDeId}</p>}
                                {canVoid && isManualReversible(mov) && (
                                    <button type="button" onClick={() => setSelectedMovement(mov)} data-danger-trigger="true" className="destructive-action mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-bold transition-colors">
                                        <NoSymbolIcon className="h-4 w-4" /> Anular movimiento
                                    </button>
                                )}
                            </article>
                        ))
                    )}
                </div>
                <div className="hidden overflow-x-auto 2xl:block">
                <table className="min-w-full divide-y divide-gray-100">
                    <thead className="bg-gray-50/50">
                        <tr>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-content-muted uppercase tracking-wider">Fecha</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-content-muted uppercase tracking-wider">Concepto</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-content-muted uppercase tracking-wider">Tipo</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-content-muted uppercase tracking-wider">Cuenta</th>
                            <th className="px-6 py-4 text-right text-xs font-semibold text-content-muted uppercase tracking-wider">Monto</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-content-muted uppercase tracking-wider">Creado por</th>
                            <th className="sticky right-0 z-20 bg-gray-50 px-6 py-4 text-right text-xs font-semibold text-content-muted uppercase tracking-wider shadow-[-8px_0_12px_-12px_rgba(15,23,42,0.65)]">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {isLoading ? (
                            <tr><td colSpan={7} className="px-6 py-12 text-center text-sm text-gray-600 animate-pulse">Cargando movimientos...</td></tr>
                        ) : movimientos.length === 0 ? (
                            <tr><td colSpan={7} className="px-6 py-12 text-center text-sm text-content-muted">No hay registros que coincidan con los filtros.</td></tr>
                        ) : (
                            movimientos.map((mov) => (
                                <tr key={mov.id} className={`transition-colors hover:bg-gray-50/50 ${mov.anuladoEn ? "bg-gray-50" : ""}`}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-medium">
                                        {formatMovementDate(mov.fecha)}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm font-semibold text-gray-900">{mov.concepto}</div>
                                        {mov.observaciones && <div className="text-xs text-gray-600 mt-0.5">{mov.observaciones}</div>}
                                        {mov.anuladoEn && <div className="mt-1 text-xs font-bold text-amber-800">Anulado: {mov.motivoAnulacion}</div>}
                                        {mov.reversionDeId && <div className="mt-1 text-xs font-bold text-indigo-700">Reversión de #{mov.reversionDeId}</div>}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2.5 py-1 text-xs font-black rounded-full uppercase tracking-widest ${mov.tipo === 'INGRESO' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                            {mov.tipo === 'INGRESO' ? 'Ingreso' : 'Egreso'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2.5 py-1 text-xs font-black rounded-full uppercase tracking-widest ${mov.cuenta === 'BANCO' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'}`}>
                                            {mov.cuenta === 'BANCO' ? '🏦 Banco' : '💵 Caja'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right">
                                        <span className={`text-sm font-bold font-mono ${mov.tipo === 'INGRESO' ? 'text-status-success' : 'text-status-danger'}`}>
	                                            {formatSignedCurrency(mov.tipo === 'INGRESO' ? Math.abs(Number(mov.monto)) : -Math.abs(Number(mov.monto)), mov.moneda, true)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-content-muted">
                                        {mov.creadoPor?.nombreCompleto || 'Sistema'}
                                    </td>
                                    <td className={`sticky right-0 z-10 px-6 py-4 text-right shadow-[-8px_0_12px_-12px_rgba(15,23,42,0.65)] ${mov.anuladoEn ? "bg-gray-50" : "bg-white"}`}>
                                        {canVoid && isManualReversible(mov) && (
                                            <button type="button" onClick={() => setSelectedMovement(mov)} data-danger-trigger="true" className="destructive-action inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-bold transition-colors">
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
                {totalPages > 1 && (
                    <div className="bg-gray-50 px-4 sm:px-6 py-3 border-t border-gray-100 flex justify-between items-center gap-3">
                        <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="text-sm text-indigo-600 disabled:opacity-40 font-medium cursor-pointer">Anterior</button>
                        <span className="text-center text-xs sm:text-sm text-content-muted">Pág {currentPage} de {totalPages} · {total} registros</span>
                        <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="text-sm text-indigo-600 disabled:opacity-40 font-medium cursor-pointer">Siguiente</button>
                    </div>
                )}
            </div>

            {/* Modal de Nuevo Movimiento */}
            {isModalOpen && canCreate && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end justify-center sm:items-center sm:p-4">
                    <div className="flex max-h-[100dvh] w-full max-w-md flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl sm:max-h-[90dvh] sm:rounded-2xl">
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                            <h3 className="text-lg font-bold text-gray-900">Nuevo Movimiento Manual</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-600 hover:text-gray-600 cursor-pointer">✕</button>
                        </div>
                        <form ref={formRef} onSubmit={handleCreate} className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
                            <FormError message={formError} />
                            <div className="grid grid-cols-1 min-[380px]:grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="cash-movement-type" className="block text-sm font-medium text-gray-700 mb-1">Tipo *</label>
                                    <AppSelect id="cash-movement-type" required ariaLabel="Tipo de movimiento" value={formData.tipo} onChange={value => setFormData({ ...formData, tipo: value })} options={[{ value: "INGRESO", label: "Ingreso" }, { value: "EGRESO", label: "Egreso" }]} />
                                </div>
                                <div>
                                    <label htmlFor="cash-movement-date" className="block text-sm font-medium text-gray-700 mb-1">Fecha *</label>
                                    <input id="cash-movement-date" type="date" required max={todayDateInput()} className="w-full border border-gray-300 rounded-lg py-2 px-3 text-sm focus:ring-indigo-500 focus:border-indigo-500" value={formData.fecha} onChange={e => setFormData({ ...formData, fecha: e.target.value })} />
                                </div>
                            </div>

                            <div>
                                <label htmlFor="cash-movement-concept" className="block text-sm font-medium text-gray-700 mb-1">Concepto *</label>
                                <input id="cash-movement-concept" type="text" required placeholder="Ej. Pago de Luz" className="w-full border border-gray-300 rounded-lg py-2 px-3 text-sm focus:ring-indigo-500 focus:border-indigo-500" value={formData.concepto} onChange={e => setFormData({ ...formData, concepto: e.target.value })} />
                            </div>

	                            <div className="grid grid-cols-[130px_1fr] gap-3">
	                                <div>
	                                    <label htmlFor="cash-movement-currency" className="block text-sm font-medium text-gray-700 mb-1">Moneda *</label>
	                                    <AppSelect id="cash-movement-currency" required ariaLabel="Moneda" value={formData.moneda} onChange={value => setFormData({ ...formData, moneda: value as Moneda })} options={[{ value: "ARS", label: "ARS — Pesos" }, { value: "USD", label: "USD — Dólares" }]} />
	                                </div>
	                                <div>
	                                <label htmlFor="cash-movement-amount" className="block text-sm font-medium text-gray-700 mb-1">Monto *</label>
	                                <NumericInput
	                                    id="cash-movement-amount"
	                                    required
                                    min="0"
                                    className="w-full border border-gray-300 rounded-lg py-2 px-3 text-sm focus:ring-indigo-500 focus:border-indigo-500"
                                    value={formData.monto}
                                    onChange={(val) => setFormData({ ...formData, monto: val.toString() })}
	                                    icon={<span className="text-content-muted text-sm">{formData.moneda === "USD" ? "US$" : "$"}</span>}
	                                />
	                                </div>
	                            </div>

                            <div className="grid grid-cols-1 min-[380px]:grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="cash-movement-payment-method" className="block text-sm font-medium text-gray-700 mb-1">Método de Pago *</label>
                                    <AppSelect id="cash-movement-payment-method" required ariaLabel="Método de pago" value={formData.metodoPago} onChange={value => setFormData({ ...formData, metodoPago: value })} options={PAYMENT_METHOD_OPTIONS} />
                                </div>
                                <div>
                                    <label htmlFor="cash-movement-account" className="block text-sm font-medium text-gray-700 mb-1">Cuenta *</label>
                                    <AppSelect id="cash-movement-account" required ariaLabel="Cuenta" value={formData.cuenta} onChange={value => setFormData({ ...formData, cuenta: value })} options={[{ value: "CAJA", label: "Caja (efectivo)" }, { value: "BANCO", label: "Banco / transferencia" }]} />
                                </div>
                            </div>

                            <div>
                                <label htmlFor="cash-movement-observations" className="block text-sm font-medium text-gray-700 mb-1">Observaciones</label>
                                <textarea id="cash-movement-observations" rows={2} className="w-full border border-gray-300 rounded-lg py-2 px-3 text-sm focus:ring-indigo-500 focus:border-indigo-500" value={formData.observaciones} onChange={e => setFormData({ ...formData, observaciones: e.target.value })} />
                            </div>

                            <div className="sticky bottom-0 -mx-5 -mb-5 flex justify-end gap-3 border-t border-gray-100 bg-white p-5 sm:-mx-6 sm:-mb-6 sm:p-6">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="min-h-11 flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 cursor-pointer">Cancelar</button>
                                <button type="submit" className="min-h-11 flex-1 px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-xl hover:bg-indigo-700 cursor-pointer">Guardar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <ReversalModal
                isOpen={Boolean(selectedMovement)}
                title="Anular movimiento de caja"
                description={selectedMovement ? `Se registrará la contrapartida de ${formatCurrency(Number(selectedMovement.monto), selectedMovement.moneda)} en ${selectedMovement.cuenta === "BANCO" ? "banco" : "caja"}.` : ""}
                onClose={() => setSelectedMovement(null)}
                onConfirm={handleVoid}
            />
        </div>
    );
}
