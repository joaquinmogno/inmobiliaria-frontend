import { useState } from "react";
import { useParams } from "react-router-dom";
import { toast } from "react-hot-toast";
import { liquidacionesService } from "../services/liquidaciones.service";
import {
    ChevronLeftIcon,
    PlusIcon,
    TrashIcon,
    PrinterIcon,
    CheckIcon,
    CalendarIcon,
    UserIcon,
    HomeIcon,
    BanknotesIcon,
    DocumentChartBarIcon,
    BuildingOfficeIcon,
    CurrencyDollarIcon,
    PencilSquareIcon,
    BriefcaseIcon,
    TagIcon,
    HomeModernIcon,
    ArrowRightCircleIcon
} from "@heroicons/react/24/outline";
import MovimientoModal from "../components/MovimientoModal";
import ConfirmationModal from "../components/ConfirmationModal";
import PaymentModal from "../components/PaymentModal";
import HonorariosModal from "../components/HonorariosModal";
import OwnerPaymentModal from "../components/OwnerPaymentModal";
import ReversalModal from "../components/ReversalModal";
import LiquidationAdjustmentModal from "../components/LiquidationAdjustmentModal";
import TenantCreditApplicationModal from "../components/TenantCreditApplicationModal";
import { useAuth } from "../context/AuthContext";
import { hasPermission } from "../utils/permissions";
import AuditTrail from "../components/AuditTrail";
import { formatCurrency as formatMoney } from "../utils/currency";
import { formatDate, formatDateTime, formatMonthYear } from "../utils/date";
import {
    getLiquidationStatusLabel,
    getOwnerNetAmount,
    getTenantPaidTotal,
    getTenantRemainingBalance,
    isLiquidationEditable,
    LIQUIDATION_STEPS
} from "../features/liquidations/liquidation-detail.model";
import { useLiquidationDetailController } from "../features/liquidations/useLiquidationDetailController";

const ownerMovementStatus = {
    VIGENTE: { label: 'Vigente', className: 'bg-emerald-100 text-emerald-800' },
    REVERTIDO: { label: 'Revertido', className: 'bg-amber-100 text-amber-800' },
    ANULADO: { label: 'Anulado', className: 'bg-red-100 text-red-800' },
    REVERSION: { label: 'Reversión', className: 'bg-indigo-100 text-indigo-800' }
} as const;

export default function LiquidacionDetalle() {
    const { user } = useAuth();
    const canEditLiquidations = hasPermission(user, "liquidaciones.editar");
    const canConfirmLiquidations = hasPermission(user, "liquidaciones.confirmar");
    const canPayOwners = hasPermission(user, "liquidaciones.pagar_propietario");
    const canAdvanceOwnerFunds = hasPermission(user, "liquidaciones.adelantar_propietario");
    const canAdjustLiquidations = hasPermission(user, "liquidaciones.ajustar");
    const canReverseOwnerPayments = hasPermission(user, "liquidaciones.anular_pago_propietario");
    const canDeleteLiquidations = hasPermission(user, "liquidaciones.eliminar");
    const canCreatePayments = hasPermission(user, "pagos.crear");
    const canReverseTenantPayments = hasPermission(user, "pagos.eliminar");
    const { id } = useParams<{ id: string }>();
    const [ownerPaymentTab, setOwnerPaymentTab] = useState<'RESUMEN' | 'MOVIMIENTOS'>('RESUMEN');
    const {
        liquidacion, isLoading, isLoadingAudit, deudaResumen,
        isMovimientoModalOpen, setIsMovimientoModalOpen,
        isLiquidarModalOpen, setIsLiquidarModalOpen,
        movimientoAEliminar, setMovimientoAEliminar,
        isPaymentModalOpen, setIsPaymentModalOpen,
        isOwnerPaymentModalOpen, setIsOwnerPaymentModalOpen,
        ownerPaymentToReverse, setOwnerPaymentToReverse,
        isHonorariosModalOpen, setIsHonorariosModalOpen,
        isDeleteModalOpen, setIsDeleteModalOpen,
        isAdjustmentModalOpen, setIsAdjustmentModalOpen,
        creditToApply, setCreditToApply,
        tenantPaymentToReverse, setTenantPaymentToReverse,
        loadAuditPage, handleAddMovimiento, handleDeleteMovimiento, handleConfirmar,
        handleSavePayment, handleUpdateHonorarios, handleCreateAdjustment, handleApplyTenantCredit, handleSaveOwnerPayment, handleReverseOwnerPayment, handleReverseTenantPayment, handleDelete, goToList
    } = useLiquidationDetailController(id);

    const formatCurrency = (monto: number) => formatMoney(monto, liquidacion?.moneda || "ARS");

    const formatPeriod = (dateStr: string) => {
        return formatMonthYear(dateStr);
    };

    if (isLoading) return (
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
            <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-content-muted font-medium">Cargando detalle de liquidación...</p>
        </div>
    );

    if (!liquidacion) return (
        <div className="text-center py-20">
            <div className="bg-red-50 text-status-danger p-4 rounded-xl inline-block mb-4">
                <DocumentChartBarIcon className="w-12 h-12" />
            </div>
            <h3 className="text-xl font-bold text-gray-900">No se encontró la liquidación</h3>
            <button
                onClick={goToList}
                className="mt-4 text-indigo-600 font-bold hover:underline"
            >
                Volver a la lista
            </button>
        </div>
    );

    const ingresos = liquidacion.movimientos?.filter(m => m.tipo === 'INGRESO') || [];
    const descuentos = liquidacion.movimientos?.filter(m => m.tipo === 'DESCUENTO') || [];
    const ownerPaymentHistory = liquidacion.historialPagosPropietario || [];
    const ownerPaid = Number(liquidacion.resumenOperativo?.pagadoPropietario ?? liquidacion.montoPagadoPropietario ?? 0);
    const ownerTotal = Number(liquidacion.montoPropietario || 0);
    const ownerRemaining = Math.max(0, ownerTotal - ownerPaid);

    // Los importes quedan congelados al confirmar; luego sólo avanza el flujo de cobro/pago.
    const esEditable = isLiquidationEditable(liquidacion.estado);
    const currentStepIndex = LIQUIDATION_STEPS.findIndex(step => step.id === liquidacion.estado);

    return (
        <div className="max-w-5xl mx-auto space-y-8 pb-32">
            {/* Top Navigation & Actions */}
            <div className="flex flex-col items-stretch justify-between gap-4 print:hidden lg:flex-row lg:items-center">
                <button
                    onClick={goToList}
                    className="group flex self-start items-center gap-2 rounded-xl py-2 pr-4 font-medium text-content-muted transition-all hover:text-gray-900"
                >
                    <div className="bg-white p-2 rounded-lg border border-gray-200 group-hover:border-gray-300 shadow-sm transition-all">
                        <ChevronLeftIcon className="w-4 h-4" />
                    </div>
                    Volver
                </button>
                <div data-testid="liquidation-primary-actions" className="grid min-w-0 grid-cols-1 gap-2 min-[480px]:grid-cols-2 lg:ml-auto lg:flex lg:flex-wrap lg:items-center lg:justify-end lg:gap-3">
                    {canConfirmLiquidations && liquidacion.estado === 'BORRADOR' && (
                        <button
                            onClick={() => setIsLiquidarModalOpen(true)}
                            className="flex min-h-11 items-center justify-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-xl hover:bg-indigo-700 transition-all shadow-md shadow-indigo-100 font-bold text-sm cursor-pointer"
                        >
                            <CheckIcon className="w-5 h-5" />
                            Confirmar liquidación
                        </button>
                    )}
                    {canCreatePayments && liquidacion.estado === 'CONFIRMADA' && liquidacion.estadoCobroInquilino !== 'COBRADO' && (
                        <button
                            onClick={() => setIsPaymentModalOpen(true)}
                            className="flex min-h-11 items-center justify-center gap-2 bg-status-success text-white px-4 py-2.5 rounded-xl hover:bg-status-success-strong transition-all shadow-md shadow-green-100 font-bold text-sm cursor-pointer"
                        >
                            <BanknotesIcon className="w-5 h-5" />
                            Registrar pago del inquilino
                        </button>
                    )}
                    {canAdjustLiquidations && liquidacion.estado === 'CONFIRMADA' && <button onClick={() => setIsAdjustmentModalOpen(true)} className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-indigo-200 bg-white px-4 py-2.5 text-sm font-bold text-indigo-700 hover:bg-indigo-50">Emitir ajuste</button>}
                    {canPayOwners && liquidacion.estado === 'CONFIRMADA' && liquidacion.estadoPagoPropietario !== 'PAGADO' && (
                        <button
                            onClick={() => setIsOwnerPaymentModalOpen(true)}
                            className="flex min-h-11 items-center justify-center gap-2 bg-orange-600 text-white px-4 py-2.5 rounded-xl hover:bg-orange-700 transition-all shadow-md shadow-orange-100 font-bold text-sm cursor-pointer"
                        >
                            <BuildingOfficeIcon className="w-5 h-5" />
                            Pagar a {liquidacion.propietarioNombre || liquidacion.propietarioPago?.nombreCompleto || liquidacion.contrato?.propietarios.find(owner => owner.esPrincipal)?.persona.nombreCompleto || 'propietario'}
                        </button>
                    )}
                    {canReverseOwnerPayments && ownerPaymentHistory.some(movement => movement.tipo === 'PAGO' && movement.estado === 'VIGENTE') && (
                        <button
                            onClick={() => setOwnerPaymentToReverse(ownerPaymentHistory.find(movement => movement.tipo === 'PAGO' && movement.estado === 'VIGENTE')?.pagoPropietarioId || null)}
                            className="flex min-h-11 items-center justify-center rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-bold text-red-700 transition-all hover:bg-red-50"
                        >
                            Anular pago al propietario
                        </button>
                    )}
                    <button
                        onClick={() => void liquidacionesService.downloadPdf(Number(id)).catch(error => toast.error(error instanceof Error ? error.message : 'No se pudo abrir el PDF'))}
                        className="flex min-h-11 items-center justify-center gap-2 bg-white text-gray-700 border border-gray-200 px-4 py-2.5 rounded-xl hover:bg-gray-50 transition-all font-bold text-sm cursor-pointer"
                        title="Comprobante para el inquilino"
                    >
                        <PrinterIcon className="w-5 h-5" />
                        Comprobante original
                    </button>
                    <button
                        onClick={() => void liquidacionesService.downloadPdfPropietario(Number(id)).catch(error => toast.error(error instanceof Error ? error.message : 'No se pudo abrir el PDF'))}
                        className="flex min-h-11 items-center justify-center gap-2 bg-white text-gray-700 border border-gray-200 px-4 py-2.5 rounded-xl hover:bg-gray-50 transition-all font-bold text-sm cursor-pointer"
                        title="Liquidación para el propietario con honorarios"
                    >
                        <DocumentChartBarIcon className="w-5 h-5" />
                        Liquidación original
                    </button>
                </div>
            </div>

            {liquidacion.comprobantes && liquidacion.comprobantes.length > 0 && (
                <section data-testid="liquidation-vouchers" className="rounded-3xl border border-indigo-100 bg-indigo-50/40 p-5 shadow-sm sm:p-6" aria-labelledby="liquidation-vouchers-title">
                    <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start">
                        <div>
                            <h2 id="liquidation-vouchers-title" className="text-base font-black text-indigo-950">Comprobantes emitidos</h2>
                            <p className="mt-1 text-sm text-indigo-800">Cada versión conserva el contrato, las personas y los importes tal como estaban al emitirse.</p>
                        </div>
                        <span className="self-start rounded-full bg-white px-3 py-1 text-xs font-bold text-indigo-700 shadow-sm">{liquidacion.comprobantes.length} versión{liquidacion.comprobantes.length === 1 ? '' : 'es'}</span>
                    </div>
                    <div className="mt-4 space-y-3">
                        {liquidacion.comprobantes.map(comprobante => {
                            const tieneAjustes = comprobante.ajustes.length > 0;
                            return (
                                <article key={comprobante.id} className="rounded-2xl border border-indigo-100 bg-white p-4">
                                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                        <div className="min-w-0">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <h3 className="font-black text-gray-900">Versión {comprobante.version}</h3>
                                                <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${tieneAjustes ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
                                                    {tieneAjustes ? `Corregida · ${comprobante.ajustes.length} ajuste${comprobante.ajustes.length === 1 ? '' : 's'}` : 'Original confirmada'}
                                                </span>
                                            </div>
                                            <p className="mt-1 text-xs text-content-muted">Emitida el {formatDateTime(comprobante.fechaEmision)} por {comprobante.creadoPor.nombreCompleto}</p>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2 sm:flex">
                                            <button onClick={() => void liquidacionesService.downloadPdf(Number(id), comprobante.version).catch(error => toast.error(error instanceof Error ? error.message : 'No se pudo abrir el PDF'))} className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50">Inquilino</button>
                                            <button onClick={() => void liquidacionesService.downloadPdfPropietario(Number(id), comprobante.version).catch(error => toast.error(error instanceof Error ? error.message : 'No se pudo abrir el PDF'))} className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50">Propietario</button>
                                        </div>
                                    </div>
                                    <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                                        <p className="rounded-lg bg-gray-50 px-3 py-2 text-gray-700">Inquilino: <span className="font-bold">{formatMoney(comprobante.importeOriginal, comprobante.moneda)}</span>{tieneAjustes && <> → <span className="font-bold text-indigo-700">{formatMoney(comprobante.importeCorregido, comprobante.moneda)}</span></>}</p>
                                        <p className="rounded-lg bg-gray-50 px-3 py-2 text-gray-700">Propietario: <span className="font-bold">{formatMoney(comprobante.importePropietarioOriginal, comprobante.moneda)}</span>{tieneAjustes && <> → <span className="font-bold text-indigo-700">{formatMoney(comprobante.importePropietarioCorregido, comprobante.moneda)}</span></>}</p>
                                    </div>
                                    {tieneAjustes && (
                                        <ul className="mt-3 space-y-2 border-t border-gray-100 pt-3">
                                            {comprobante.ajustes.map(ajuste => (
                                                <li key={ajuste.id} className="text-sm text-gray-700">
                                                    <span className="font-bold">{ajuste.tipo === 'CREDITO' ? 'Nota de crédito' : 'Nota de débito'} #{ajuste.id}: {ajuste.concepto}.</span>{' '}
                                                    {ajuste.motivo} · Emitida por {ajuste.creadoPor.nombreCompleto}.
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </article>
                            );
                        })}
                    </div>
                </section>
            )}

            {/* Stepper Progress */}
            <section data-testid="liquidation-lifecycle" aria-labelledby="liquidation-lifecycle-title" className="relative overflow-hidden rounded-3xl border border-gray-200 bg-white p-5 shadow-sm sm:p-8">
                <h2 id="liquidation-lifecycle-title" className="text-xs font-black uppercase tracking-widest text-gray-600">Estado de la liquidación</h2>
                <div className="mt-4 grid gap-3 md:grid-cols-3" aria-label="Saldos operativos independientes">
                    <div className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-4"><p className="text-xs font-black uppercase tracking-wide text-indigo-700">Cobro inquilino · {liquidacion.estadoCobroInquilino.toLowerCase()}</p><p className="mt-1 font-black text-gray-950">Cobrado {formatCurrency(Number(liquidacion.resumenOperativo?.cobradoInquilino || 0))}</p><p className="text-sm text-gray-700">Saldo {formatCurrency(Number(liquidacion.resumenOperativo?.saldoInquilino || 0))}</p></div>
                    <div className="rounded-2xl border border-orange-100 bg-orange-50/60 p-4"><p className="text-xs font-black uppercase tracking-wide text-orange-800">Pago propietario · {liquidacion.estadoPagoPropietario.toLowerCase()}</p><p className="mt-1 font-black text-gray-950">Entregado {formatCurrency(ownerPaid)}</p><p className="text-sm text-gray-700">Saldo {formatCurrency(ownerRemaining)}</p></div>
                    <div className="rounded-2xl border border-rose-100 bg-rose-50/60 p-4"><p className="text-xs font-black uppercase tracking-wide text-rose-800">Capital propio expuesto</p><p className="mt-1 font-black text-rose-900">{formatCurrency(Number(liquidacion.resumenOperativo?.capitalPropioExpuesto || 0))}</p><p className="text-sm text-gray-700">Adelanto aún a recuperar</p></div>
                </div>
                <div className="mt-2 md:hidden">
                    <div className="mt-2 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                            <p className="break-words text-lg font-black text-indigo-700">{LIQUIDATION_STEPS[currentStepIndex]?.label || getLiquidationStatusLabel(liquidacion.estado)}</p>
                            <p className="text-sm text-content-muted">{LIQUIDATION_STEPS[currentStepIndex]?.description || "Seguimiento de liquidación"}</p>
                        </div>
                        <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-black text-indigo-700">
                            {Math.max(currentStepIndex + 1, 1)} / {LIQUIDATION_STEPS.length}
                        </span>
                    </div>
                </div>
                <ol className="relative z-10 mt-5 hidden items-start justify-between md:flex">
                    {LIQUIDATION_STEPS.map((step, idx) => {
                        const isCompleted = idx < currentStepIndex;
                        const isCurrent = idx === currentStepIndex;
                        const isLast = idx === LIQUIDATION_STEPS.length - 1;

                        return (
                            <li key={step.id} aria-current={isCurrent ? 'step' : undefined} className={`relative flex min-w-0 flex-1 flex-col items-center ${!isLast ? 'after:content-[""] after:w-full after:h-0.5 after:absolute after:top-5 after:left-[50%] after:z-[-1]' : ''} ${idx < currentStepIndex ? 'after:bg-indigo-500' : 'after:bg-gray-100'}`}>
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-500 mb-3 bg-white ${isCompleted ? 'bg-indigo-600 border-indigo-600 text-white' : isCurrent ? 'border-indigo-600 text-indigo-600' : 'border-gray-200 text-gray-300'}`}>
                                    {isCompleted ? <CheckIcon className="w-6 h-6 font-bold" /> : <span className="font-black">{idx + 1}</span>}
                                </div>
                                <div className="text-center">
                                    <p className={`px-1 text-xs font-black uppercase leading-4 tracking-wider ${isCurrent ? 'text-indigo-600' : isCompleted ? 'text-gray-900' : 'text-gray-600'}`}>{step.label}</p>
                                    <p className="mt-1 hidden px-2 text-xs font-medium leading-4 text-gray-600 lg:block">{step.description}</p>
                                </div>
                            </li>
                        );
                    })}
                </ol>
            </section>

            {/* Historical Debt Alert */}
            {deudaResumen && deudaResumen.totalDeuda > 0 && (
                <aside data-testid="historical-debt" aria-labelledby="historical-debt-title" className="flex items-start gap-4 rounded-3xl border border-amber-200 bg-amber-50 p-6 animate-in fade-in slide-in-from-top-4 duration-500">
                    <div className="bg-amber-100 p-2 rounded-xl text-status-warning">
                        <BanknotesIcon className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 id="historical-debt-title" className="text-sm font-black uppercase tracking-tight text-amber-900">Deuda de períodos anteriores</h2>
	                        <p className="mt-1 break-words text-sm font-medium text-amber-700">No corresponde a esta liquidación: el contrato acumula <span className="font-black underline">{formatMoney(deudaResumen.totalDeuda, deudaResumen.moneda || liquidacion.moneda)}</span> de períodos anteriores.</p>
                    </div>
                </aside>
            )}

            {/* Document Header Section */}
            <section data-testid="liquidation-document" className="relative min-w-0 overflow-hidden rounded-[2rem] border border-gray-100 bg-white shadow-xl shadow-gray-200/50">
                <div className="p-8 sm:p-12 relative">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 mb-8 sm:mb-12">
                        <div className="min-w-0 space-y-2">
                            <h1 className="break-words text-3xl font-black capitalize tracking-tight text-gray-900 sm:text-4xl">
                                Liquidación {formatPeriod(liquidacion.periodo)}
                            </h1>
                            <p className="text-content-muted font-medium">Comprobante de movimientos mensuales del contrato</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        {/* CARD: TOTAL INQUILINO */}
                        <div data-testid="liquidation-summary-card" className="group relative min-w-0 overflow-hidden rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
                            <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                                <UserIcon className="w-16 h-16 text-gray-900" />
                            </div>
                            <p className="text-content-muted text-xs font-black uppercase tracking-[0.2em] mb-1">Total Inquilino</p>
                            <p data-testid="liquidation-summary-amount" className="relative z-10 break-words text-2xl font-black tracking-tight text-gray-900 [overflow-wrap:anywhere] sm:text-3xl">{formatCurrency(Number(liquidacion.netoACobrar))}</p>
                            <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between items-center">
                                <span className="text-xs font-black text-gray-600 uppercase tracking-widest">Lo que paga el inquilino</span>
                                <div className="bg-gray-100 p-1 rounded-lg">
                                    <BanknotesIcon className="w-4 h-4 text-content-muted" />
                                </div>
                            </div>
                        </div>

                        {/* CARD: HONORARIOS INMOBILIARIA */}
                        <div data-testid="liquidation-summary-card" className="group relative min-w-0 overflow-hidden rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
                            <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                                <BriefcaseIcon className="w-16 h-16 text-indigo-600" />
                            </div>
                            <p className="text-status-accent text-xs font-black uppercase tracking-[0.2em] mb-1">Honorarios Inmob.</p>
                            <p data-testid="liquidation-summary-amount" className="relative z-10 break-words text-2xl font-black tracking-tight text-indigo-600 [overflow-wrap:anywhere] sm:text-3xl">
                                {formatCurrency(Number(liquidacion.montoHonorarios || 0))}
                            </p>
                            <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between items-center">
                                <span className="text-xs font-black text-status-accent uppercase tracking-widest">
                                    {liquidacion.porcentajeHonorarios ? `${liquidacion.porcentajeHonorarios}%` : 'Monto fijo'} · paga {liquidacion.pagaHonorarios === 'PROPIETARIO' ? 'propietario' : 'inquilino'}
                                </span>
                                <div className="bg-indigo-50 p-1 rounded-lg">
                                    <TagIcon className="w-4 h-4 text-indigo-500" />
                                </div>
                            </div>
                        </div>

                        {/* CARD: NETO PROPIETARIO */}
                        <div data-testid="liquidation-summary-card" className="group relative min-w-0 overflow-hidden rounded-3xl bg-indigo-600 p-6 shadow-xl shadow-indigo-100">
                            <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity text-white">
                                <HomeModernIcon className="w-16 h-16" />
                            </div>
                            <p className="text-indigo-100 text-xs font-black uppercase tracking-[0.2em] mb-1">Neto Propietario</p>
                            <p data-testid="liquidation-summary-amount" className="relative z-10 break-words text-2xl font-black tracking-tight text-white [overflow-wrap:anywhere] sm:text-3xl">
                                {formatCurrency(getOwnerNetAmount(liquidacion))}
                            </p>
                            <div className="mt-4 pt-4 border-t border-white/10 flex justify-between items-center">
                                <span className="min-w-0 break-words text-xs font-black text-on-accent-muted uppercase tracking-widest">
                                    Recibe {liquidacion.propietarioNombre || liquidacion.propietarioPago?.nombreCompleto || liquidacion.contrato?.propietarios.find(owner => owner.esPrincipal)?.persona.nombreCompleto || 'propietario principal'}
                                </span>
                                <div className="bg-white/10 p-1 rounded-lg">
                                    <ArrowRightCircleIcon className="w-4 h-4 text-white" />
                                </div>
                            </div>
                        </div>
                    </div>

                    <dl className="mb-8 grid grid-cols-1 gap-3 rounded-2xl border border-gray-200 bg-gray-50 p-4 sm:grid-cols-3">
                        <div><dt className="text-xs font-bold uppercase tracking-wide text-gray-600">Alquiler del período</dt><dd className="mt-1 text-base font-black text-gray-950">{formatCurrency(Number(liquidacion.montoAlquilerBase))}</dd></div>
                        <div><dt className="text-xs font-bold uppercase tracking-wide text-gray-600">Otros conceptos netos</dt><dd className="mt-1 text-base font-black text-gray-950">{formatCurrency(Number(liquidacion.netoACobrar) - Number(liquidacion.montoAlquilerBase) - (liquidacion.pagaHonorarios === 'INQUILINO' ? Number(liquidacion.montoHonorarios) : 0))}</dd></div>
                        <div><dt className="text-xs font-bold uppercase tracking-wide text-gray-600">Total que retiene la inmobiliaria</dt><dd className="mt-1 text-base font-black text-indigo-800">{formatCurrency(Number(liquidacion.netoACobrar) - Number(liquidacion.montoPropietario))}</dd></div>
                    </dl>

                    <div className="grid min-w-0 grid-cols-1 gap-8 sm:grid-cols-2 xl:grid-cols-4">
                        <div className="min-w-0 space-y-4">
                            <div className="flex items-center gap-2 text-indigo-600 font-black text-xs uppercase tracking-widest">
                                <HomeIcon className="w-4 h-4" />
                                Inmueble
                            </div>
                            <div>
                                <p data-testid="liquidation-fact-value" className="break-words text-lg font-bold leading-tight text-gray-900 [overflow-wrap:anywhere]">
                                    {liquidacion.propiedadDireccion || liquidacion.contrato?.propiedad.direccion}
                                </p>
                                <p className="text-content-muted font-medium">
                                    {liquidacion.contrato?.propiedad.piso} {liquidacion.contrato?.propiedad.departamento}
                                </p>
                            </div>
                        </div>

                        <div className="min-w-0 space-y-4">
                            <div className="flex items-center gap-2 text-indigo-600 font-black text-xs uppercase tracking-widest">
                                <UserIcon className="w-4 h-4" />
                                Inquilino
                            </div>
                            <div>
                                <p data-testid="liquidation-fact-value" className="break-words text-lg font-bold text-gray-900 [overflow-wrap:anywhere]">
                                    {liquidacion.inquilinoNombre || liquidacion.contrato?.inquilinos.find((i: any) => i.esPrincipal)?.persona.nombreCompleto || '-'}
                                </p>
                                <p className="text-content-muted font-medium italic">Responsable de pago</p>
                            </div>
                        </div>

                        <div className="min-w-0 space-y-4">
                            <div className="flex items-center gap-2 text-indigo-600 font-black text-xs uppercase tracking-widest font-mono">
                                <CalendarIcon className="w-4 h-4" />
                                Fecha de Emisión
                            </div>
                            <div>
                                <p data-testid="liquidation-fact-value" className="break-words text-lg font-bold text-gray-900 [overflow-wrap:anywhere]">
                                    {formatDateTime(liquidacion.fechaCreacion)}
                                </p>
                                <p className="text-content-muted font-medium">Vence {formatDate(liquidacion.fechaVencimiento)} · N° {liquidacion.id.toString().padStart(6, '0')}</p>
                            </div>
                        </div>

                        <div className="min-w-0 space-y-4">
                            <div className="flex items-center justify-between gap-2 text-indigo-600 font-black text-xs uppercase tracking-widest font-mono">
                                <div className="flex items-center gap-2">
                                    <CurrencyDollarIcon className="w-4 h-4" />
                                    Honorarios Inmob.
                                </div>
                                {esEditable && canEditLiquidations && (
                                    <button 
                                        onClick={() => setIsHonorariosModalOpen(true)}
                                        className="text-status-accent hover:text-indigo-600 transition-colors p-1 rounded-lg hover:bg-indigo-50 cursor-pointer"
                                        title="Editar honorarios"
                                    >
                                        <PencilSquareIcon className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                            <div>
                                <p data-testid="liquidation-fact-value" className="break-words text-lg font-bold text-teal-700 [overflow-wrap:anywhere]">
                                    {formatCurrency(Number(liquidacion.montoHonorarios || 0))}
                                </p>
                                <p className="text-status-teal font-medium">
                                    {liquidacion.porcentajeHonorarios ? `${liquidacion.porcentajeHonorarios}% sobre alquiler` : 'Monto fijo'} · paga {liquidacion.pagaHonorarios === 'PROPIETARIO' ? 'propietario' : 'inquilino'}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section className="rounded-3xl border border-orange-100 bg-orange-50/40 p-5 shadow-sm sm:p-6" aria-labelledby="owner-payment-history-title">
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                    <div>
                        <h2 id="owner-payment-history-title" className="text-lg font-black text-orange-950">Pagos al propietario</h2>
                        <p className="mt-1 text-sm text-orange-900">Seguimiento de cada entrega y de su saldo pendiente.</p>
                    </div>
                    <span className="self-start rounded-full bg-white px-3 py-1 text-xs font-bold text-orange-800 shadow-sm">
                        {ownerPaymentHistory.length} movimiento{ownerPaymentHistory.length === 1 ? '' : 's'}
                    </span>
                </div>

                <div className="mt-4 flex w-full gap-1 rounded-xl bg-orange-100/70 p-1 sm:w-fit" role="tablist" aria-label="Pagos al propietario">
                    <button
                        type="button"
                        role="tab"
                        aria-selected={ownerPaymentTab === 'RESUMEN'}
                        onClick={() => setOwnerPaymentTab('RESUMEN')}
                        className={`min-h-10 rounded-lg px-3 text-sm font-bold transition ${ownerPaymentTab === 'RESUMEN' ? 'bg-white text-orange-950 shadow-sm' : 'text-orange-800 hover:bg-white/60'}`}
                    >
                        Resumen
                    </button>
                    <button
                        type="button"
                        role="tab"
                        aria-selected={ownerPaymentTab === 'MOVIMIENTOS'}
                        onClick={() => setOwnerPaymentTab('MOVIMIENTOS')}
                        className={`min-h-10 rounded-lg px-3 text-sm font-bold transition ${ownerPaymentTab === 'MOVIMIENTOS' ? 'bg-white text-orange-950 shadow-sm' : 'text-orange-800 hover:bg-white/60'}`}
                    >
                        Movimientos al propietario
                    </button>
                </div>

                {ownerPaymentTab === 'RESUMEN' ? (
                    <div role="tabpanel" className="mt-4 grid gap-3 sm:grid-cols-3">
                        <div className="rounded-2xl border border-orange-100 bg-white p-4">
                            <p className="text-xs font-black uppercase tracking-wide text-gray-600">Neto a entregar</p>
                            <p className="mt-1 text-lg font-black text-gray-950">{formatCurrency(ownerTotal)}</p>
                        </div>
                        <div className="rounded-2xl border border-orange-100 bg-white p-4">
                            <p className="text-xs font-black uppercase tracking-wide text-gray-600">Entregado acumulado</p>
                            <p className="mt-1 text-lg font-black text-orange-700">{formatCurrency(ownerPaid)}</p>
                        </div>
                        <div className="rounded-2xl border border-orange-100 bg-white p-4">
                            <p className="text-xs font-black uppercase tracking-wide text-gray-600">Saldo pendiente</p>
                            <p className={`mt-1 text-lg font-black ${ownerRemaining > 0 ? 'text-status-danger' : 'text-status-success'}`}>{formatCurrency(ownerRemaining)}</p>
                        </div>
                    </div>
                ) : (
                    <div role="tabpanel" className="mt-4">
                        {ownerPaymentHistory.length === 0 ? (
                            <div className="rounded-2xl border border-dashed border-orange-200 bg-white p-6 text-center text-sm text-gray-700">
                                Todavía no hay entregas ni reversiones al propietario para esta liquidación.
                            </div>
                        ) : (
                            <>
                                <div className="space-y-3 lg:hidden">
                                    {ownerPaymentHistory.map(movement => {
                                        const status = ownerMovementStatus[movement.estado];
                                        const isReversal = movement.tipo === 'REVERSION';
                                        return (
                                            <article key={movement.id} className="rounded-2xl border border-orange-100 bg-white p-4">
                                                <div className="flex items-start justify-between gap-3">
                                                    <div>
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <p className="font-black text-gray-950">{isReversal ? 'Reversión de pago' : 'Pago al propietario'}</p>
                                                            <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${status.className}`}>{status.label}</span>
                                                        </div>
                                                        <p className="mt-1 text-xs text-gray-600">{formatDate(movement.fecha)} · {movement.metodoPago} · {movement.cuenta}</p>
                                                    </div>
                                                    <p className={`shrink-0 font-black ${isReversal ? 'text-status-success' : 'text-orange-700'}`}>{isReversal ? '+' : '-'}{formatCurrency(movement.monto)}</p>
                                                </div>
                                                <dl className="mt-3 grid grid-cols-2 gap-2 rounded-xl bg-orange-50/60 p-3 text-xs">
                                                    <div><dt className="font-bold text-gray-600">Comprobante</dt><dd className="mt-0.5 font-black text-gray-900">{movement.comprobante}</dd></div>
                                                    <div><dt className="font-bold text-gray-600">Saldo posterior</dt><dd className="mt-0.5 font-black text-gray-900">{formatCurrency(movement.saldoPosterior)}</dd></div>
                                                </dl>
                                                <p className="mt-3 text-sm text-gray-700">{movement.observaciones || 'Sin observaciones'} · Registró {movement.creadoPor?.nombreCompleto || 'Sistema'}</p>
                                                {movement.reversionDeId && <p className="mt-2 text-xs font-semibold text-indigo-700">Revierte el asiento #{movement.reversionDeId}.</p>}
                                                {movement.reversionId && <p className="mt-2 text-xs font-semibold text-amber-800">Revertido por el asiento #{movement.reversionId}.</p>}
                                                {movement.montoAdelantoPropio > 0 && <p className="mt-2 text-xs font-semibold text-rose-800">Adelanto propio: {formatCurrency(movement.montoAdelantoPropio)}{movement.motivoAdelanto ? ` · ${movement.motivoAdelanto}` : ''}</p>}
                                                {movement.motivoAnulacion && <p className="mt-2 text-xs text-red-700">Motivo de anulación: {movement.motivoAnulacion}</p>}
                                                {canReverseOwnerPayments && movement.tipo === 'PAGO' && movement.estado === 'VIGENTE' && <button type="button" data-danger-trigger="true" onClick={() => setOwnerPaymentToReverse(movement.pagoPropietarioId)} className="mt-3 min-h-10 rounded-xl border border-red-300 px-3 text-xs font-bold text-red-800">Anular esta entrega</button>}
                                            </article>
                                        );
                                    })}
                                </div>
                                <div className="hidden overflow-x-auto rounded-2xl border border-orange-100 bg-white lg:block">
                                    <table className="w-full min-w-[66rem]">
                                        <thead>
                                            <tr className="border-b border-orange-100 bg-orange-50/70">
                                                <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-wide text-gray-600">Fecha</th>
                                                <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-wide text-gray-600">Operación</th>
                                                <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-wide text-gray-600">Medio / cuenta</th>
                                                <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-wide text-gray-600">Comprobante</th>
                                                <th className="px-4 py-3 text-left text-xs font-black uppercase tracking-wide text-gray-600">Registró / vínculo</th>
                                                <th className="px-4 py-3 text-right text-xs font-black uppercase tracking-wide text-gray-600">Importe</th>
                                                <th className="px-4 py-3 text-right text-xs font-black uppercase tracking-wide text-gray-600">Saldo dueño</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-orange-50">
                                            {ownerPaymentHistory.map(movement => {
                                                const status = ownerMovementStatus[movement.estado];
                                                const isReversal = movement.tipo === 'REVERSION';
                                                return (
                                                    <tr key={movement.id} className="align-top hover:bg-orange-50/30">
                                                        <td className="whitespace-nowrap px-4 py-4 text-sm font-bold text-gray-900">{formatDate(movement.fecha)}</td>
                                                        <td className="px-4 py-4"><p className="text-sm font-bold text-gray-900">{isReversal ? 'Reversión' : 'Pago'}</p><span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-bold ${status.className}`}>{status.label}</span></td>
                                                        <td className="px-4 py-4 text-sm text-gray-700"><p className="font-semibold">{movement.metodoPago}</p><p className="text-xs text-gray-600">{movement.cuenta}</p></td>
                                                        <td className="px-4 py-4 text-sm font-bold text-indigo-700">{movement.comprobante}</td>
                                                        <td className="max-w-64 px-4 py-4 text-sm text-gray-700"><p>{movement.creadoPor?.nombreCompleto || 'Sistema'}</p><p className="mt-1 text-xs text-gray-600">{movement.reversionDeId ? `Revierte asiento #${movement.reversionDeId}` : movement.reversionId ? `Revertido por asiento #${movement.reversionId}` : movement.observaciones || 'Sin observaciones'}</p>{movement.montoAdelantoPropio > 0 && <p className="mt-1 text-xs font-bold text-rose-800">Adelanto {formatCurrency(movement.montoAdelantoPropio)}</p>}{canReverseOwnerPayments && movement.tipo === 'PAGO' && movement.estado === 'VIGENTE' && <button type="button" data-danger-trigger="true" onClick={() => setOwnerPaymentToReverse(movement.pagoPropietarioId)} className="mt-2 rounded-lg border border-red-300 px-2 py-1 text-xs font-bold text-red-800">Anular</button>}</td>
                                                        <td className={`whitespace-nowrap px-4 py-4 text-right font-mono text-sm font-black ${isReversal ? 'text-status-success' : 'text-orange-700'}`}>{isReversal ? '+' : '-'}{formatCurrency(movement.monto)}</td>
                                                        <td className="whitespace-nowrap px-4 py-4 text-right font-mono text-sm font-black text-gray-900">{formatCurrency(movement.saldoPosterior)}</td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </>
                        )}
                    </div>
                )}
            </section>

            {/* Los conceptos avanzados quedan disponibles sin dominar el flujo principal. */}
            <details open={esEditable} className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
                <summary className="flex min-h-11 cursor-pointer items-center text-base font-black text-gray-900">Conceptos y cálculo detallado</summary>
                <div className="mt-5 grid grid-cols-1 gap-8 lg:grid-cols-2">
                {/* Ingresos Column */}
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight flex items-center gap-2">
                            <div className="w-1.5 h-6 bg-green-500 rounded-full" />
                            Ingresos
                        </h3>
                        {esEditable && canEditLiquidations && (
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setIsMovimientoModalOpen(true)}
                                    className="flex h-11 w-11 items-center justify-center bg-indigo-50 text-indigo-700 rounded-xl hover:bg-indigo-100 transition-all cursor-pointer"
                                    title="Agregar Movimiento"
                                >
                                    <PlusIcon className="w-5 h-5" />
                                </button>
                            </div>
                        )}
                    </div>
                    <div className="space-y-2 lg:hidden">
                        {ingresos.map(m => <article key={m.id} className="rounded-2xl border border-gray-200 p-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="break-words text-sm font-bold text-gray-900">{m.concepto}</p>{m.observaciones && <p className="mt-1 break-words text-xs text-gray-700">{m.observaciones}</p>}</div><p className="shrink-0 text-sm font-black text-gray-950">{formatCurrency(m.monto)}</p></div>{esEditable && canEditLiquidations && <button type="button" onClick={() => setMovimientoAEliminar(m.id)} data-danger-trigger="true" className="mt-3 min-h-11 rounded-xl border border-red-300 px-3 text-sm font-bold text-red-800">Eliminar concepto</button>}</article>)}
                        {ingresos.length === 0 && <p className="rounded-2xl border border-gray-200 p-4 text-sm text-gray-700">No hay ingresos registrados.</p>}
                    </div>
                    <div className="hidden overflow-x-auto rounded-3xl border border-gray-100 bg-white shadow-sm lg:block">
                        <table className="w-full min-w-[32rem]">
                            <thead>
                                <tr className="bg-gray-50/50 border-b border-gray-100">
                                    <th className="text-left py-4 px-6 text-xs font-black text-gray-600 uppercase tracking-widest">Concepto</th>
                                    <th className="text-right py-4 px-6 text-xs font-black text-gray-600 uppercase tracking-widest">Monto</th>
                                    {esEditable && canEditLiquidations && <th className="w-10"><span className="sr-only">Acciones</span></th>}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {ingresos.map(m => (
                                    <tr key={m.id} className="group transition-colors hover:bg-green-50/30">
                                        <td className="py-4 px-6">
                                            <p className="break-words text-sm font-bold text-gray-900 [overflow-wrap:anywhere]">{m.concepto}</p>
                                            {m.observaciones && <p className="mt-0.5 break-words text-xs text-gray-600 [overflow-wrap:anywhere]">{m.observaciones}</p>}
                                        </td>
                                        <td className="py-4 px-6 text-right font-mono font-black text-gray-900 text-sm">
                                            {formatCurrency(m.monto)}
                                        </td>
                                        {esEditable && canEditLiquidations && (
                                            <td className="pr-6">
                                                <button
                                                    onClick={() => setMovimientoAEliminar(m.id)}
                                                    data-danger-trigger="true"
                                                    className="destructive-icon-action flex h-11 w-11 items-center justify-center rounded-lg transition-colors sm:opacity-70 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
                                                    aria-label="Eliminar movimiento"
                                                >
                                                    <TrashIcon className="w-4 h-4" />
                                                </button>
                                            </td>
                                        )}
                                    </tr>
                                ))}
                                {ingresos.length === 0 && (
                                    <tr>
                                        <td colSpan={3} className="py-12 text-center text-sm text-gray-600 italic">No hay ingresos registrados</td>
                                    </tr>
                                )}
                            </tbody>
                            <tfoot className="bg-green-50/50">
                                <tr>
                                    <td className="py-4 px-6 text-xs font-black text-green-800 uppercase tracking-widest">Subtotal Ingresos</td>
                                    <td className="py-4 px-6 text-right font-black text-green-800 text-base">{formatCurrency(Number(liquidacion.totalIngresos))}</td>
                                    {esEditable && canEditLiquidations && <td></td>}
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>

                {/* Descuentos Column */}
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight flex items-center gap-2">
                            <div className="w-1.5 h-6 bg-red-500 rounded-full" />
                            Egresos / Descuentos
                        </h3>
                    </div>
                    <div className="space-y-2 lg:hidden">
                        {descuentos.map(m => <article key={m.id} className="rounded-2xl border border-gray-200 p-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="break-words text-sm font-bold text-gray-900">{m.concepto}</p>{m.observaciones && <p className="mt-1 break-words text-xs text-gray-700">{m.observaciones}</p>}</div><p className="shrink-0 text-sm font-black text-red-800">({formatCurrency(m.monto)})</p></div>{esEditable && canEditLiquidations && <button type="button" onClick={() => setMovimientoAEliminar(m.id)} data-danger-trigger="true" className="mt-3 min-h-11 rounded-xl border border-red-300 px-3 text-sm font-bold text-red-800">Eliminar concepto</button>}</article>)}
                        {descuentos.length === 0 && <p className="rounded-2xl border border-gray-200 p-4 text-sm text-gray-700">No hay descuentos registrados.</p>}
                    </div>
                    <div className="hidden overflow-x-auto rounded-3xl border border-gray-100 bg-white shadow-sm lg:block">
                        <table className="w-full min-w-[32rem]">
                            <thead>
                                <tr className="bg-gray-50/50 border-b border-gray-100">
                                    <th className="text-left py-4 px-6 text-xs font-black text-gray-600 uppercase tracking-widest">Concepto</th>
                                    <th className="text-right py-4 px-6 text-xs font-black text-gray-600 uppercase tracking-widest">Monto</th>
                                    {esEditable && canEditLiquidations && <th className="w-10"><span className="sr-only">Acciones</span></th>}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {descuentos.map(m => (
                                    <tr key={m.id} className="group transition-colors hover:bg-red-50/30">
                                        <td className="py-4 px-6">
                                            <p className="break-words text-sm font-bold text-gray-900 [overflow-wrap:anywhere]">{m.concepto}</p>
                                            {m.observaciones && <p className="mt-0.5 break-words text-xs text-gray-600 [overflow-wrap:anywhere]">{m.observaciones}</p>}
                                        </td>
                                        <td className="py-4 px-6 text-right font-mono font-black text-status-danger text-sm">
                                            ({formatCurrency(m.monto)})
                                        </td>
                                        {esEditable && canEditLiquidations && (
                                            <td className="pr-6">
                                                <button
                                                    onClick={() => setMovimientoAEliminar(m.id)}
                                                    data-danger-trigger="true"
                                                    className="destructive-icon-action flex h-11 w-11 items-center justify-center rounded-lg transition-colors sm:opacity-70 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
                                                    aria-label="Eliminar movimiento"
                                                >
                                                    <TrashIcon className="w-4 h-4" />
                                                </button>
                                            </td>
                                        )}
                                    </tr>
                                ))}
                                {descuentos.length === 0 && (
                                    <tr>
                                        <td colSpan={3} className="py-12 text-center text-sm text-gray-600 italic">No hay descuentos registrados</td>
                                    </tr>
                                )}
                            </tbody>
                            <tfoot className="bg-red-50/50">
                                <tr>
                                    <td className="py-4 px-6 text-xs font-black text-red-800 uppercase tracking-widest">Subtotal Descuentos</td>
                                    <td className="py-4 px-6 text-right font-black text-red-800 text-base">({formatCurrency(Number(liquidacion.totalDescuentos))})</td>
                                    {esEditable && canEditLiquidations && <td></td>}
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>
                </div>
            </details>

            {/* Payments Section */}
            {(liquidacion.pagos?.length || 0) > 0 && (
                <div className="space-y-4">
                    <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight flex items-center gap-2">
                        <div className="w-1.5 h-6 bg-indigo-500 rounded-full" />
                        Pagos Registrados
                    </h3>
                    <div className="space-y-2 lg:hidden">
                        {liquidacion.pagos?.map(p => <article key={p.id} className="rounded-2xl border border-gray-200 bg-white p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-bold text-gray-950">{formatDate(p.fechaPago)} · {p.metodoPago.toLocaleLowerCase()}</p><p className="mt-1 break-words text-sm text-gray-700">{p.observaciones || 'Sin observaciones'} · registró {p.creadoPor?.nombreCompleto || 'Sistema'}</p></div><p className="shrink-0 font-black text-green-800">{formatCurrency(Number(p.monto))}</p></div>{canReverseTenantPayments && liquidacion.estado === 'CONFIRMADA' && <button type="button" data-danger-trigger="true" onClick={() => setTenantPaymentToReverse(p.id)} className="mt-3 min-h-11 rounded-xl border border-red-300 px-3 text-sm font-bold text-red-800">Anular cobro</button>}</article>)}
                    </div>
                    <div className="hidden overflow-x-auto rounded-3xl border border-gray-100 bg-white shadow-sm lg:block">
                        <table className="w-full min-w-[48rem]">
                            <thead>
                                <tr className="bg-gray-50/50 border-b border-gray-100">
                                    <th className="text-left py-4 px-6 text-xs font-black text-gray-600 uppercase tracking-widest">Fecha</th>
                                    <th className="text-left py-4 px-6 text-xs font-black text-gray-600 uppercase tracking-widest">Método</th>
                                    <th className="text-left py-4 px-6 text-xs font-black text-gray-600 uppercase tracking-widest">Detalle</th>
                                    <th className="text-left py-4 px-6 text-xs font-black text-gray-600 uppercase tracking-widest">Registró</th>
                                    <th className="text-right py-4 px-6 text-xs font-black text-gray-600 uppercase tracking-widest">Monto</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {liquidacion.pagos?.map(p => (
                                    <tr key={p.id} className="transition-colors hover:bg-indigo-50/20">
                                        <td className="py-4 px-6 text-sm font-bold text-gray-900">
                                            {formatDate(p.fechaPago)}
                                        </td>
                                        <td className="py-4 px-6">
                                            <span className="bg-indigo-50 text-indigo-700 px-2 py-1 rounded text-xs font-black tracking-widest uppercase">
                                                {p.metodoPago}
                                            </span>
                                        </td>
                                        <td className="break-words py-4 px-6 text-sm font-medium text-content-muted [overflow-wrap:anywhere]">
                                            {p.observaciones || "-"}
                                            {canReverseTenantPayments && liquidacion.estado === 'CONFIRMADA' && <button type="button" data-danger-trigger="true" onClick={() => setTenantPaymentToReverse(p.id)} className="mt-2 block rounded-lg border border-red-300 px-3 py-2 text-xs font-bold text-red-800 hover:bg-red-50">Anular cobro</button>}
                                        </td>
                                        <td className="break-words py-4 px-6 text-sm font-medium text-content-muted [overflow-wrap:anywhere]">
                                            {p.creadoPor?.nombreCompleto || "Sistema"}
                                        </td>
                                        <td className="py-4 px-6 text-right font-mono font-black text-status-success text-sm">
                                            {formatCurrency(Number(p.monto))}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot className="bg-indigo-50/30">
                                <tr>
                                    <td colSpan={4} className="py-4 px-6 text-xs font-black text-indigo-800 uppercase tracking-widest">Total Percibido</td>
                                    <td className="py-4 px-6 text-right font-black text-indigo-800 text-base">
                                        {formatCurrency(getTenantPaidTotal(liquidacion))}
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>

                    {/* Remaining Liquidation Debt */}
                    {liquidacion.estado === 'CONFIRMADA' && liquidacion.estadoCobroInquilino !== 'COBRADO' && (
                        <div className="flex justify-end pr-6">
                            <div className="text-right">
                                <p className="text-xs font-black text-gray-600 uppercase tracking-widest mb-1">Saldo Remanente Inquilino</p>
                                <p className="break-words text-xl font-black text-status-danger [overflow-wrap:anywhere]">
                                    {formatCurrency(getTenantRemainingBalance(liquidacion))}
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {((liquidacion.ajustes?.length || 0) > 0 || (liquidacion.aplicacionesCredito?.length || 0) > 0) && (
                <section className="space-y-3 rounded-3xl border border-indigo-100 bg-indigo-50/40 p-5 print:hidden">
                    <div>
                        <h3 className="text-lg font-black text-indigo-950">Ajustes y saldos a favor</h3>
                        <p className="text-sm text-indigo-800">Las correcciones conservan el importe, motivo y destino del excedente.</p>
                    </div>
                    <div className="space-y-3">
                        {liquidacion.ajustes?.map(adjustment => {
                            const credit = adjustment.creditoInquilino;
                            return (
                                <article key={adjustment.id} className="rounded-2xl border border-indigo-100 bg-white p-4">
                                    <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start">
                                        <div>
                                            <p className="font-black text-gray-950">{adjustment.tipo === 'CREDITO' ? 'Nota de crédito' : 'Nota de débito'} #{adjustment.id} · {adjustment.concepto}</p>
                                            <p className="mt-1 text-sm text-gray-700">{adjustment.motivo}</p>
                                            <p className="mt-1 text-xs font-semibold text-gray-600">{formatDate(adjustment.fechaCreacion)} · {adjustment.creadoPor.nombreCompleto}</p>
                                        </div>
                                        <p className={adjustment.tipo === 'CREDITO' ? 'font-black text-status-success' : 'font-black text-status-danger'}>{adjustment.tipo === 'CREDITO' ? '-' : '+'}{formatCurrency(Number(adjustment.monto))}</p>
                                    </div>
                                    {credit && (
                                        <div className="mt-3 rounded-xl bg-indigo-50 p-3 text-sm text-indigo-950">
                                            {credit.estado === 'DEVUELTO' && <p><span className="font-black">Devuelto:</span> {formatCurrency(Number(credit.montoOriginal))}{credit.movimientoDevolucion ? ` por ${credit.movimientoDevolucion.metodoPago}` : ''}.</p>}
                                            {credit.estado === 'APLICADO' && <p><span className="font-black">Compensado totalmente:</span> {formatCurrency(Number(credit.montoOriginal))}.</p>}
                                            {credit.estado === 'DISPONIBLE' && <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><p><span className="font-black">Saldo a favor disponible:</span> {formatCurrency(Number(credit.saldoPendiente))}.</p>{canAdjustLiquidations && <button type="button" onClick={() => setCreditToApply({ id: credit.id, saldo: Number(credit.saldoPendiente) })} className="rounded-lg border border-indigo-300 bg-white px-3 py-2 text-xs font-bold text-indigo-800 hover:bg-indigo-100">Aplicar a otra liquidación</button>}</div>}
                                            {credit.aplicaciones.length > 0 && <p className="mt-2 text-xs text-indigo-800">Aplicaciones: {credit.aplicaciones.map(application => `${formatCurrency(Number(application.monto))} a ${formatPeriod(application.liquidacion.periodo)}`).join(' · ')}</p>}
                                        </div>
                                    )}
                                </article>
                            );
                        })}
                        {liquidacion.aplicacionesCredito?.map(application => (
                            <article key={`credit-application-${application.id}`} className="rounded-2xl border border-indigo-100 bg-white p-4">
                                <p className="font-black text-gray-950">Saldo a favor aplicado · Crédito #{application.creditoInquilinoId}</p>
                                <p className="mt-1 text-sm text-gray-700">Compensación proveniente de la nota de crédito #{application.creditoInquilino.ajusteLiquidacion.id}: {application.creditoInquilino.ajusteLiquidacion.concepto}.</p>
                                <p className="mt-2 font-black text-status-success">-{formatCurrency(Number(application.monto))}</p>
                            </article>
                        ))}
                    </div>
                </section>
            )}

            {/* Audit Section */}
            <div className="space-y-4 print:hidden">
                <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight flex items-center gap-2">
                    <div className="w-1.5 h-6 bg-gray-500 rounded-full" />
                    Auditoría
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                        <p className="text-xs font-black uppercase tracking-wider text-gray-600">Creada por</p>
                        <p className="break-words text-sm font-semibold text-gray-800 [overflow-wrap:anywhere]">{liquidacion.creadoPor?.nombreCompleto || "Sin dato"}</p>
                    </div>
                    <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                        <p className="text-xs font-black uppercase tracking-wider text-gray-600">Cerrada por</p>
                        <p className="break-words text-sm font-semibold text-gray-800 [overflow-wrap:anywhere]">{liquidacion.cerradoPor?.nombreCompleto || "Todavía no cerrada"}</p>
                    </div>
                    <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                        <p className="text-xs font-black uppercase tracking-wider text-gray-600">Confirmada por</p>
                        <p className="break-words text-sm font-semibold text-gray-800 [overflow-wrap:anywhere]">{liquidacion.confirmadoPor?.nombreCompleto || "Todavía no confirmada"}</p>
                        {liquidacion.fechaConfirmacion && <p className="mt-1 text-xs text-gray-600">{formatDateTime(liquidacion.fechaConfirmacion)}</p>}
                    </div>
                </div>
                <AuditTrail
                    logs={liquidacion.auditLogs}
                    meta={liquidacion.auditMeta}
                    loading={isLoadingAudit}
                    onPageChange={loadAuditPage}
                    emptyText="Esta liquidación todavía no tiene eventos de auditoría."
                />
            </div>

            {canDeleteLiquidations && liquidacion.estado === 'BORRADOR' && (
                <details className="print:hidden rounded-2xl border border-gray-200 bg-white">
                    <summary className="flex min-h-11 cursor-pointer items-center px-4 text-sm font-bold text-gray-700">Acciones de administración</summary>
                    <div className="border-t border-gray-200 p-4">
                        <p className="text-sm text-gray-700">Si este borrador fue creado por error, podés eliminarlo. Las cuotas vinculadas volverán a quedar disponibles.</p>
                        <button type="button" data-danger-trigger="true" onClick={() => setIsDeleteModalOpen(true)} className="mt-3 min-h-11 rounded-xl border border-red-300 px-4 text-sm font-bold text-red-800 hover:bg-red-50">Eliminar borrador</button>
                    </div>
                </details>
            )}

            {/* Final Summary Card for Print */}
            <div className="hidden print:block bg-gray-50 p-8 rounded-3xl border-2 border-dashed border-gray-200 mt-12">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h4 className="text-sm font-black text-gray-600 uppercase tracking-widest mb-1">Resumen Final</h4>
                        <p className="text-gray-600 text-sm font-medium">Esta liquidación contempla todos los conceptos del período {formatPeriod(liquidacion.periodo)}</p>
                    </div>
                    <div className="text-right flex items-center gap-8 border-t sm:border-t-0 sm:border-l border-gray-200 sm:pl-8 pt-4 sm:pt-0 w-full sm:w-auto">
                        <div>
                            <p className="text-xs font-black text-gray-600 uppercase tracking-widest mb-1">A cobrar al inquilino</p>
                            <p className="text-2xl font-black text-gray-900">{formatCurrency(Number(liquidacion.netoACobrar))}</p>
                        </div>
                        <div>
                            <p className="text-xs font-black text-gray-600 uppercase tracking-widest mb-1">Neto Dueño (con Hon. Inmob.)</p>
                            <p className="text-2xl font-black text-indigo-600">{formatCurrency(getOwnerNetAmount(liquidacion))}</p>
                        </div>
                    </div>
                </div>
            </div>

            <MovimientoModal
                isOpen={isMovimientoModalOpen}
                onClose={() => setIsMovimientoModalOpen(false)}
                onSave={handleAddMovimiento}
                moneda={liquidacion.moneda}
            />

            <ConfirmationModal
                isOpen={isLiquidarModalOpen}
                onClose={() => setIsLiquidarModalOpen(false)}
                onConfirm={handleConfirmar}
                title="Confirmar liquidación"
                message="¿Confirmás esta liquidación? Pasará a pendiente de pago y sus importes ya no podrán editarse."
                confirmText="Confirmar"
                type="info"
            />

            <ConfirmationModal
                isOpen={movimientoAEliminar !== null}
                onClose={() => setMovimientoAEliminar(null)}
                onConfirm={() => movimientoAEliminar !== null && void handleDeleteMovimiento(movimientoAEliminar)}
                title="Eliminar movimiento"
                message="¿Confirmás la eliminación de este movimiento? Los totales de la liquidación se recalcularán."
                confirmText="Eliminar"
                type="danger"
            />

            <PaymentModal
                isOpen={isPaymentModalOpen}
                onClose={() => setIsPaymentModalOpen(false)}
	                onSave={handleSavePayment}
	                suggestedAmount={getTenantRemainingBalance(liquidacion)}
	                moneda={liquidacion.moneda}
	                targetLabel={`la liquidación de ${formatPeriod(liquidacion.periodo)}`}
	                otherDebtAmount={deudaResumen?.totalDeuda || 0}
	            />

            <HonorariosModal
                isOpen={isHonorariosModalOpen}
                onClose={() => setIsHonorariosModalOpen(false)}
                onSave={handleUpdateHonorarios}
                currentMonto={Number(liquidacion.montoHonorarios || 0)}
                currentPorcentaje={liquidacion.porcentajeHonorarios ? Number(liquidacion.porcentajeHonorarios) : null}
                moneda={liquidacion.moneda}
            />

            <OwnerPaymentModal
                isOpen={isOwnerPaymentModalOpen}
                onClose={() => setIsOwnerPaymentModalOpen(false)}
	                onSave={handleSaveOwnerPayment}
                suggestedAmount={ownerRemaining}
	                moneda={liquidacion.moneda}
	                owner={liquidacion.propietarioPago || liquidacion.contrato?.propietarios.find(owner => owner.esPrincipal)?.persona || null}
	                disponibleCobrado={Math.max(0, Number(liquidacion.resumenOperativo?.cobradoInquilino || 0) - ownerPaid)}
	                capitalPropioExpuesto={Number(liquidacion.resumenOperativo?.capitalPropioExpuesto || 0)}
	                puedeAdelantar={canAdvanceOwnerFunds}
	            />
            <ReversalModal
                isOpen={ownerPaymentToReverse !== null}
                title="Anular pago al propietario"
                description="Se registrará un ingreso de reversión y la liquidación volverá a quedar pendiente de pago al propietario. La operación original seguirá visible en auditoría."
                onClose={() => setOwnerPaymentToReverse(null)}
                onConfirm={handleReverseOwnerPayment}
            />
            <LiquidationAdjustmentModal
                isOpen={isAdjustmentModalOpen}
                onClose={() => setIsAdjustmentModalOpen(false)}
                onSave={handleCreateAdjustment}
                moneda={liquidacion.moneda}
                tenantTotal={Number(liquidacion.netoACobrar)}
                tenantPaid={getTenantPaidTotal(liquidacion)}
                debtTargets={deudaResumen?.detalle || []}
            />
            <TenantCreditApplicationModal
                isOpen={creditToApply !== null}
                onClose={() => setCreditToApply(null)}
                onApply={handleApplyTenantCredit}
                creditId={creditToApply?.id || null}
                saldo={creditToApply?.saldo || 0}
                moneda={liquidacion.moneda}
                debtTargets={deudaResumen?.detalle || []}
            />
            <ReversalModal
                isOpen={tenantPaymentToReverse !== null}
                title="Anular cobro del inquilino"
                description="Se creará un asiento inverso en la misma cuenta y la deuda de esta liquidación se recalculará. El cobro original seguirá visible en auditoría."
                onClose={() => setTenantPaymentToReverse(null)}
                onConfirm={handleReverseTenantPayment}
            />
            <ConfirmationModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleDelete}
                title="Eliminar borrador"
                message="Esta acción elimina el borrador y libera las cuotas asociadas. Las liquidaciones confirmadas nunca pueden eliminarse."
                confirmText="Eliminar borrador"
                type="danger"
            />
        </div>
    );
}
