import { useEffect, useState } from "react";
import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-hot-toast";
import { liquidacionesService, settlementStatusLabel, type ContractLiquidationTimeline } from "../services/liquidaciones.service";
import {
    ChevronLeftIcon,
    ChevronDownIcon,
    PlusIcon,
    TrashIcon,
    PrinterIcon,
    CheckIcon,
    BanknotesIcon,
    DocumentChartBarIcon,
    BuildingOfficeIcon
} from "@heroicons/react/24/outline";
import MovimientoModal from "../components/MovimientoModal";
import ConfirmationModal from "../components/ConfirmationModal";
import PaymentModal from "../components/PaymentModal";
import OwnerPaymentModal from "../components/OwnerPaymentModal";
import ReversalModal from "../components/ReversalModal";
import LiquidationAdjustmentModal from "../components/LiquidationAdjustmentModal";
import TenantCreditApplicationModal from "../components/TenantCreditApplicationModal";
import { useAuth } from "../context/AuthContext";
import { hasPermission } from "../utils/permissions";
import AuditTrail from "../components/AuditTrail";
import { formatCurrency as formatMoney, type Moneda } from "../utils/currency";
import { formatDate, formatDateTime, formatMonthYear } from "../utils/date";
import {
    getOwnerNetAmount,
    getTenantPaidTotal,
    getTenantRemainingBalance,
    isLiquidationEditable
} from "../features/liquidations/liquidation-detail.model";
import { useLiquidationDetailController } from "../features/liquidations/useLiquidationDetailController";
import LiquidationContractModal from "../components/LiquidationContractModal";
import LiquidationSummary from "../features/liquidations/LiquidationSummary";
import LiquidationTermsModal from "../features/liquidations/LiquidationTermsModal";

const ownerMovementStatus = {
    VIGENTE: { label: 'Vigente', className: 'bg-emerald-100 text-emerald-800' },
    REVERTIDO: { label: 'Revertido', className: 'bg-amber-100 text-amber-800' },
    ANULADO: { label: 'Anulado', className: 'bg-red-100 text-red-800' },
    REVERSION: { label: 'Reversión', className: 'bg-indigo-100 text-indigo-800' }
} as const;

export default function LiquidacionDetalle() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const canEditLiquidations = hasPermission(user, "liquidaciones.editar");
    const canEditContracts = hasPermission(user, "contratos.editar");
    const canViewContracts = hasPermission(user, "contratos.ver");
    const canRenewContracts = hasPermission(user, "contratos.crear");
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
    const [timeline, setTimeline] = useState<ContractLiquidationTimeline | null>(null);
    const [showContract, setShowContract] = useState(false);
    const [termsMode, setTermsMode] = useState<'ALQUILER' | 'HONORARIOS' | null>(null);
    const {
        liquidacion, isLoading, isLoadingAudit, deudaResumen,
        isMovimientoModalOpen, setIsMovimientoModalOpen,
        confirmError,
        movimientoAEliminar, setMovimientoAEliminar,
        isPaymentModalOpen, setIsPaymentModalOpen,
        isOwnerPaymentModalOpen, setIsOwnerPaymentModalOpen,
        ownerPaymentToReverse, setOwnerPaymentToReverse,
        isDeleteModalOpen, setIsDeleteModalOpen,
        isAdjustmentModalOpen, setIsAdjustmentModalOpen,
        creditToApply, setCreditToApply,
        tenantPaymentToReverse, setTenantPaymentToReverse,
        loadAuditPage, handleAddMovimiento, handleDeleteMovimiento, handleConfirmar,
        handleSavePayment, handleUpdateHonorarios, handleUpdateAlquiler, handleCreateAdjustment, handleApplyTenantCredit, handleSaveOwnerPayment, handleReverseOwnerPayment, handleReverseTenantPayment, handleDelete, goToList
    } = useLiquidationDetailController(id);

    useEffect(() => {
        if (!liquidacion?.contratoId) return;
        let active = true;
        void liquidacionesService.getContractTimeline(liquidacion.contratoId).then(value => { if (active) setTimeline(value); }).catch(() => {});
        return () => { active = false; };
    }, [liquidacion?.contratoId]);

    const formatCurrency = (monto: number, moneda: Moneda = liquidacion?.moneda || "ARS") => formatMoney(monto, moneda);

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
    const currencySummaries = liquidacion.resumenMonedas?.length ? liquidacion.resumenMonedas.filter(summary =>
        summary.moneda === liquidacion.moneda || summary.netoACobrar > 0 || summary.montoPropietario > 0 || summary.cobradoInquilino > 0 || summary.pagadoPropietario > 0
    ) : [{
        moneda: liquidacion.moneda,
        totalIngresos: Number(liquidacion.totalIngresos || 0),
        totalDescuentos: Number(liquidacion.totalDescuentos || 0),
        netoACobrar: Number(liquidacion.netoACobrar || 0),
        montoPropietario: Number(liquidacion.montoPropietario || 0),
        cobradoInquilino: Number(liquidacion.resumenOperativo?.cobradoInquilino ?? getTenantPaidTotal(liquidacion)),
        creditoAplicadoInquilino: Number(liquidacion.resumenOperativo?.creditoAplicadoInquilino || 0),
        saldoInquilino: getTenantRemainingBalance(liquidacion),
        pagadoPropietario: Number(liquidacion.resumenOperativo?.pagadoPropietario ?? liquidacion.montoPagadoPropietario ?? 0),
        saldoPropietario: Math.max(0, Number(liquidacion.montoPropietario || 0) - Number(liquidacion.resumenOperativo?.pagadoPropietario ?? liquidacion.montoPagadoPropietario ?? 0)),
        capitalPropioExpuesto: Number(liquidacion.resumenOperativo?.capitalPropioExpuesto || 0)
    }];
    const contractCurrencySummary = currencySummaries.find(summary => summary.moneda === liquidacion.moneda) || currencySummaries[0];
    const ownerPaid = contractCurrencySummary.pagadoPropietario;
    const ownerTotal = contractCurrencySummary.montoPropietario;
    const ownerRemaining = Math.max(0, ownerTotal - ownerPaid);
    const tenantCollectionPending = ['PENDIENTE', 'PARCIAL'].includes(liquidacion.estadoCobroInquilino);
    const ownerPaymentPending = ['PENDIENTE', 'PARCIAL'].includes(liquidacion.estadoPagoPropietario);
    const earlierPeriods = timeline?.periodos.filter(item => item.periodo < liquidacion.periodo && item.liquidacionId).reverse() || [];
    const finalMonth = Boolean(liquidacion.contrato?.fechaEntregaLlaves && liquidacion.contrato.fechaEntregaLlaves.slice(0, 7) === liquidacion.periodo.slice(0, 7));
    const rentUpdateDue = Boolean(!finalMonth && liquidacion.contrato?.requiereActualizacion
        && liquidacion.contrato.fechaProximaActualizacion
        && liquidacion.contrato.fechaProximaActualizacion.slice(0, 7) <= liquidacion.periodo.slice(0, 7));
    const confirmIssues = [
        !liquidacion.contrato?.inquilinos.find(item => item.esPrincipal) ? 'Falta definir un inquilino principal.' : null,
        !liquidacion.contrato?.propietarios.find(item => item.esPrincipal) ? 'Falta definir un propietario principal.' : null,
        Number(liquidacion.montoAlquilerBase) <= 0 ? 'El alquiler debe ser mayor que cero.' : null,
        !finalMonth && liquidacion.contrato?.requiereActualizacion && !liquidacion.contrato.fechaProximaActualizacion ? 'Falta definir la fecha de próxima actualización del alquiler.' : null,
        finalMonth && !liquidacion.alquilerExcepcional ? 'Revisá y guardá el importe manual de los días hasta la entrega de llaves antes de confirmar.' : null,
        rentUpdateDue ? canEditContracts
            ? 'La actualización del alquiler está pendiente: cargá el nuevo importe y guardalo para los próximos meses antes de confirmar.'
            : 'La actualización del alquiler está pendiente: necesitás que alguien con permiso de edición de contratos cargue el nuevo importe antes de confirmar.' : null,
        Number(liquidacion.netoACobrar) <= 0 ? 'El total a cobrar debe ser mayor que cero.' : null,
        Number(liquidacion.montoPropietario) < 0 ? 'El total del propietario no puede ser negativo.' : null
    ].filter((message): message is string => Boolean(message));

    // Los importes quedan congelados al confirmar; luego sólo avanza el flujo de cobro/pago.
    const esEditable = isLiquidationEditable(liquidacion.estado);

    return (
        <div className="max-w-7xl mx-auto space-y-4 pb-8">
            {/* Top Navigation & Actions */}
            <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
                <button
                    onClick={goToList}
                    className="group flex self-start items-center gap-2 rounded-xl py-2 pr-4 font-medium text-content-muted transition-all hover:text-gray-900"
                >
                    <div className="bg-white p-2 rounded-lg border border-gray-200 group-hover:border-gray-300 shadow-sm transition-all">
                        <ChevronLeftIcon className="w-4 h-4" />
                    </div>
                    Volver
                </button>
                <div data-testid="liquidation-primary-actions" className="flex min-w-0 flex-wrap items-center gap-2 lg:ml-auto lg:justify-end">
                    {canConfirmLiquidations && liquidacion.estado === 'BORRADOR' && (
                        <button
                            onClick={() => void handleConfirmar()}
                            className="flex min-h-11 items-center justify-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-xl hover:bg-indigo-700 transition-all shadow-md shadow-indigo-100 font-bold text-sm cursor-pointer"
                        >
                            <CheckIcon className="w-5 h-5" />
                            Confirmar liquidación
                        </button>
                    )}
                    {liquidacion.estado === 'BORRADOR' && <button type="button" onClick={() => { toast.success('Borrador guardado'); navigate(`/liquidaciones/contrato/${liquidacion.contratoId}?periodo=${liquidacion.periodo.slice(0, 7)}`); }} className="min-h-11 rounded-xl border border-indigo-300 bg-white px-4 text-sm font-bold text-indigo-800">Guardar borrador</button>}
                    {canCreatePayments && liquidacion.estado === 'CONFIRMADA' && tenantCollectionPending && (
                        <button
                            onClick={() => setIsPaymentModalOpen(true)}
                            className="flex min-h-11 items-center justify-center gap-2 bg-status-success text-white px-4 py-2.5 rounded-xl hover:bg-status-success-strong transition-all shadow-md shadow-green-100 font-bold text-sm cursor-pointer"
                        >
                            <BanknotesIcon className="w-5 h-5" />
                            Registrar pago del inquilino
                        </button>
                    )}
                    {canPayOwners && liquidacion.estado === 'CONFIRMADA' && ownerPaymentPending && (
                        <button
                            onClick={() => setIsOwnerPaymentModalOpen(true)}
                            className="flex min-h-11 items-center justify-center gap-2 bg-orange-600 text-white px-4 py-2.5 rounded-xl hover:bg-orange-700 transition-all shadow-md shadow-orange-100 font-bold text-sm cursor-pointer"
                        >
                            <BuildingOfficeIcon className="w-5 h-5" />
                            Pagar a {liquidacion.propietarioNombre || liquidacion.propietarioPago?.nombreCompleto || liquidacion.contrato?.propietarios.find(owner => owner.esPrincipal)?.persona.nombreCompleto || 'propietario'}
                        </button>
                    )}
                    <Menu as="div" className="relative">
                        <MenuButton className="flex min-h-11 items-center gap-2 rounded-xl border border-gray-300 bg-white px-3 text-sm font-bold text-gray-700">Más opciones <ChevronDownIcon className="h-4 w-4" /></MenuButton>
                        <MenuItems className="absolute right-0 z-30 mt-2 grid w-72 max-w-[calc(100vw-2rem)] gap-2 rounded-2xl border border-gray-200 bg-white p-3 shadow-xl focus:outline-none">
                    {canViewContracts && <MenuItem as="button" type="button" onClick={() => setShowContract(true)} className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-indigo-300 bg-white px-4 py-2.5 text-sm font-bold text-indigo-800">VER CONTRATO</MenuItem>}
                    {canRenewContracts && ['FINALIZADO', 'RESCINDIDO'].includes(liquidacion.contrato?.estado || '') && <MenuItem as="button" type="button" onClick={() => navigate('/contratos', { state: { renewContractId: liquidacion.contratoId } })} className="flex min-h-11 items-center justify-center rounded-xl bg-violet-700 px-4 py-2.5 text-sm font-bold text-white">RENOVAR CONTRATO</MenuItem>}
                    {canAdjustLiquidations && liquidacion.estado === 'CONFIRMADA' && <MenuItem as="button" onClick={() => setIsAdjustmentModalOpen(true)} className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-indigo-200 bg-white px-4 py-2.5 text-sm font-bold text-indigo-700 hover:bg-indigo-50">Emitir ajuste</MenuItem>}
                    {canReverseOwnerPayments && ownerPaymentHistory.some(movement => movement.tipo === 'PAGO' && movement.estado === 'VIGENTE') && (
                        <MenuItem as="button"
                            onClick={() => setOwnerPaymentToReverse(ownerPaymentHistory.find(movement => movement.tipo === 'PAGO' && movement.estado === 'VIGENTE')?.pagoPropietarioId || null)}
                            className="flex min-h-11 items-center justify-center rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-bold text-red-700 transition-all hover:bg-red-50"
                        >
                            Anular pago al propietario
                        </MenuItem>
                    )}
                    <MenuItem as="button"
                        onClick={() => void liquidacionesService.downloadPdf(Number(id)).catch(error => toast.error(error instanceof Error ? error.message : 'No se pudo abrir el PDF'))}
                        className="flex min-h-11 items-center justify-center gap-2 bg-white text-gray-700 border border-gray-200 px-4 py-2.5 rounded-xl hover:bg-gray-50 transition-all font-bold text-sm cursor-pointer"
                        title="Comprobante para el inquilino"
                    >
                        <PrinterIcon className="w-5 h-5" />
                        Comprobante original
                    </MenuItem>
                    <MenuItem as="button"
                        onClick={() => void liquidacionesService.downloadPdfPropietario(Number(id)).catch(error => toast.error(error instanceof Error ? error.message : 'No se pudo abrir el PDF'))}
                        className="flex min-h-11 items-center justify-center gap-2 bg-white text-gray-700 border border-gray-200 px-4 py-2.5 rounded-xl hover:bg-gray-50 transition-all font-bold text-sm cursor-pointer"
                        title="Liquidación para el propietario con honorarios"
                    >
                        <DocumentChartBarIcon className="w-5 h-5" />
                        Liquidación original
                    </MenuItem>                        </MenuItems>
                    </Menu>
                </div>
            </div>

            <LiquidationSummary liquidacion={liquidacion} summaries={currencySummaries} canEdit={esEditable && canEditLiquidations} onEditRent={() => setTermsMode('ALQUILER')} onEditFees={() => setTermsMode('HONORARIOS')} />

            {liquidacion.estado === 'BORRADOR' && (confirmIssues.length > 0 || confirmError) && <div role="alert" className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-900"><p className="font-black">Revisá antes de confirmar</p>{confirmIssues.map(message => <p key={message}>• {message}</p>)}{confirmError && <p>• {confirmError}</p>}</div>}

            <section aria-labelledby="liquidation-concepts-title" className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <h2 id="liquidation-concepts-title" className="text-base font-black text-gray-900">Conceptos y cálculo detallado</h2>
                    {esEditable && canEditLiquidations && <button type="button" onClick={() => setIsMovimientoModalOpen(true)} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-indigo-50 px-3 text-sm font-bold text-indigo-700 hover:bg-indigo-100"><PlusIcon className="h-5 w-5" />Agregar movimiento</button>}
                </div>
                <div className="mt-3 grid grid-cols-1 gap-5 lg:grid-cols-2">
                {/* Ingresos Column */}
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight flex items-center gap-2">
                            <div className="w-1.5 h-6 bg-green-500 rounded-full" />
                            Ingresos
                        </h3>

                    </div>
                    <div className="space-y-2 lg:hidden">
                        {ingresos.map(m => <article key={m.id} className="rounded-2xl border border-gray-200 p-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="break-words text-sm font-bold text-gray-900">{m.concepto}</p>{m.observaciones && <p className="mt-1 break-words text-xs text-gray-700">{m.observaciones}</p>}</div><p className="shrink-0 text-sm font-black text-gray-950">{formatCurrency(m.monto, m.moneda)}</p></div>{esEditable && canEditLiquidations && <button type="button" onClick={() => setMovimientoAEliminar(m.id)} data-danger-trigger="true" className="mt-3 min-h-11 rounded-xl border border-red-300 px-3 text-sm font-bold text-red-800">Eliminar concepto</button>}</article>)}
                        {ingresos.length === 0 && <p className="rounded-2xl border border-gray-200 p-4 text-sm text-gray-700">No hay ingresos registrados.</p>}
                    </div>
                    <div className="hidden overflow-x-auto rounded-3xl border border-gray-100 bg-white shadow-sm lg:block">
                        <table className="w-full table-fixed">
                            <thead>
                                <tr className="bg-gray-50/50 border-b border-gray-100">
                                    <th className="text-left py-2 px-3 text-xs font-black text-gray-600 uppercase tracking-widest">Concepto</th>
                                    <th className="text-right py-2 px-3 text-xs font-black text-gray-600 uppercase tracking-widest">Monto</th>
                                    {esEditable && canEditLiquidations && <th className="w-10"><span className="sr-only">Acciones</span></th>}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {ingresos.map(m => (
                                    <tr key={m.id} className="group transition-colors hover:bg-green-50/30">
                                        <td className="py-2 px-3">
                                            <p className="break-words text-sm font-bold text-gray-900 [overflow-wrap:anywhere]">{m.concepto}</p>
                                            {m.observaciones && <p className="mt-0.5 break-words text-xs text-gray-600 [overflow-wrap:anywhere]">{m.observaciones}</p>}
                                        </td>
                                        <td className="py-2 px-3 text-right font-mono font-black text-gray-900 text-sm">
                                            {formatCurrency(m.monto, m.moneda)}
                                        </td>
                                        {esEditable && canEditLiquidations && (
                                            <td className="pr-2">
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
                                        <td colSpan={3} className="py-6 text-center text-sm text-gray-600 italic">No hay ingresos registrados</td>
                                    </tr>
                                )}
                            </tbody>
                            <tfoot className="bg-green-50/50">
                                {currencySummaries.filter(summary => summary.totalIngresos > 0).map(summary => <tr key={summary.moneda}>
                                    <td className="py-2 px-3 text-xs font-black text-green-800 uppercase tracking-widest">Subtotal ingresos · {summary.moneda}</td>
                                    <td className="py-2 px-3 text-right font-black text-green-800 text-base">{formatCurrency(summary.totalIngresos, summary.moneda)}</td>
                                    {esEditable && canEditLiquidations && <td></td>}
                                </tr>)}
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
                        {descuentos.map(m => <article key={m.id} className="rounded-2xl border border-gray-200 p-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="break-words text-sm font-bold text-gray-900">{m.concepto}</p>{m.observaciones && <p className="mt-1 break-words text-xs text-gray-700">{m.observaciones}</p>}</div><p className="shrink-0 text-sm font-black text-red-800">({formatCurrency(m.monto, m.moneda)})</p></div>{esEditable && canEditLiquidations && <button type="button" onClick={() => setMovimientoAEliminar(m.id)} data-danger-trigger="true" className="mt-3 min-h-11 rounded-xl border border-red-300 px-3 text-sm font-bold text-red-800">Eliminar concepto</button>}</article>)}
                        {descuentos.length === 0 && <p className="rounded-2xl border border-gray-200 p-4 text-sm text-gray-700">No hay descuentos registrados.</p>}
                    </div>
                    <div className="hidden overflow-x-auto rounded-3xl border border-gray-100 bg-white shadow-sm lg:block">
                        <table className="w-full table-fixed">
                            <thead>
                                <tr className="bg-gray-50/50 border-b border-gray-100">
                                    <th className="text-left py-2 px-3 text-xs font-black text-gray-600 uppercase tracking-widest">Concepto</th>
                                    <th className="text-right py-2 px-3 text-xs font-black text-gray-600 uppercase tracking-widest">Monto</th>
                                    {esEditable && canEditLiquidations && <th className="w-10"><span className="sr-only">Acciones</span></th>}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {descuentos.map(m => (
                                    <tr key={m.id} className="group transition-colors hover:bg-red-50/30">
                                        <td className="py-2 px-3">
                                            <p className="break-words text-sm font-bold text-gray-900 [overflow-wrap:anywhere]">{m.concepto}</p>
                                            {m.observaciones && <p className="mt-0.5 break-words text-xs text-gray-600 [overflow-wrap:anywhere]">{m.observaciones}</p>}
                                        </td>
                                        <td className="py-2 px-3 text-right font-mono font-black text-status-danger text-sm">
                                            ({formatCurrency(m.monto, m.moneda)})
                                        </td>
                                        {esEditable && canEditLiquidations && (
                                            <td className="pr-2">
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
                                        <td colSpan={3} className="py-6 text-center text-sm text-gray-600 italic">No hay descuentos registrados</td>
                                    </tr>
                                )}
                            </tbody>
                            <tfoot className="bg-red-50/50">
                                {currencySummaries.filter(summary => summary.totalDescuentos > 0).map(summary => <tr key={summary.moneda}>
                                    <td className="py-2 px-3 text-xs font-black text-red-800 uppercase tracking-widest">Subtotal descuentos · {summary.moneda}</td>
                                    <td className="py-2 px-3 text-right font-black text-red-800 text-base">({formatCurrency(summary.totalDescuentos, summary.moneda)})</td>
                                    {esEditable && canEditLiquidations && <td></td>}
                                </tr>)}
                            </tfoot>
                        </table>
                    </div>
                </div>
                </div>
            </section>

            <details className="rounded-2xl border border-indigo-100 bg-white p-4 shadow-sm">
                <summary className="flex min-h-11 cursor-pointer flex-wrap items-center justify-between gap-2 font-black text-gray-950"><span>Cobros de inquilinos</span><span className="text-xs font-semibold text-indigo-800">{settlementStatusLabel(liquidacion.estadoCobroInquilino)} · {liquidacion.pagos?.length || 0} cobros <ChevronDownIcon className="ml-2 inline h-4 w-4" /></span></summary>
            {(liquidacion.pagos?.length || 0) > 0 && (
                <div className="mt-3 space-y-4">
                    <div className="space-y-2 lg:hidden">
                        {liquidacion.pagos?.map(p => <article key={p.id} className="rounded-2xl border border-gray-200 bg-white p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-bold text-gray-950">{formatDate(p.fechaPago)} · {p.metodoPago.toLocaleLowerCase()}</p><p className="mt-1 break-words text-sm text-gray-700">{p.comprobante || p.observaciones || 'Sin referencia'} · {p.movimientoCaja?.cuentaBancaria ? `${p.movimientoCaja.cuentaBancaria.banco} · ${p.movimientoCaja.cuentaBancaria.nombre}` : p.movimientoCaja?.cuenta || 'Caja'} · registró {p.creadoPor?.nombreCompleto || 'Sistema'}</p>{p.imputacionesCuotas?.map(item => <p key={item.cuotaId} className="text-xs text-blue-800">{item.cuota.plan.concepto} · cuota {item.cuota.numeroCuota}: {formatCurrency(Number(item.monto), p.moneda)}</p>)}</div><p className="shrink-0 font-black text-green-800">{formatCurrency(Number(p.monto), p.moneda)}</p></div>{canReverseTenantPayments && liquidacion.estado === 'CONFIRMADA' && <button type="button" data-danger-trigger="true" onClick={() => setTenantPaymentToReverse(p.id)} className="mt-3 min-h-11 rounded-xl border border-red-300 px-3 text-sm font-bold text-red-800">Anular cobro</button>}</article>)}
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
                                            <p>{p.comprobante || p.observaciones || 'Sin referencia'}</p>
                                            <p className="mt-1 text-xs text-gray-600">{p.movimientoCaja?.cuentaBancaria ? `${p.movimientoCaja.cuentaBancaria.banco} · ${p.movimientoCaja.cuentaBancaria.nombre}` : p.movimientoCaja?.cuenta || 'Caja'}</p>
                                            {p.imputacionesCuotas?.map(item => <p key={item.cuotaId} className="mt-1 text-xs text-blue-800">{item.cuota.plan.concepto} · cuota {item.cuota.numeroCuota}: {formatCurrency(Number(item.monto))}</p>)}
                                            {canReverseTenantPayments && liquidacion.estado === 'CONFIRMADA' && <button type="button" data-danger-trigger="true" onClick={() => setTenantPaymentToReverse(p.id)} className="mt-2 block rounded-lg border border-red-300 px-3 py-2 text-xs font-bold text-red-800 hover:bg-red-50">Anular cobro</button>}
                                        </td>
                                        <td className="break-words py-4 px-6 text-sm font-medium text-content-muted [overflow-wrap:anywhere]">
                                            {p.creadoPor?.nombreCompleto || "Sistema"}
                                        </td>
                                        <td className="py-4 px-6 text-right font-mono font-black text-status-success text-sm">
                                            {formatCurrency(Number(p.monto), p.moneda)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot className="bg-indigo-50/30">
                                <tr>
                                    <td colSpan={4} className="py-4 px-6 text-xs font-black text-indigo-800 uppercase tracking-widest">Total Percibido</td>
                                    <td className="py-4 px-6 text-right font-black text-indigo-800 text-base">
                                        {currencySummaries.map(summary => <span key={summary.moneda} className="block">{formatCurrency(summary.cobradoInquilino, summary.moneda)}</span>)}
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>

                    {/* Remaining Liquidation Debt */}
                    {liquidacion.estado === 'CONFIRMADA' && tenantCollectionPending && (
                        <div className="flex justify-end pr-6">
                            <div className="text-right">
                                <p className="text-xs font-black text-gray-600 uppercase tracking-widest mb-1">Saldo Remanente Inquilino</p>
                                <p className="break-words text-xl font-black text-status-danger [overflow-wrap:anywhere]">
                                    {currencySummaries.map(summary => <span key={summary.moneda} className="block">{formatCurrency(summary.saldoInquilino, summary.moneda)}</span>)}
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            )}

                {!(liquidacion.pagos?.length) && <p className="py-3 text-sm text-gray-600">Todavía no hay cobros registrados en esta liquidación.</p>}
            </details>

            <details className="rounded-2xl border border-orange-100 bg-white p-4 shadow-sm" aria-labelledby="owner-payment-history-title">
                <summary className="flex min-h-11 cursor-pointer flex-wrap items-center justify-between gap-2 font-black text-gray-950"><span id="owner-payment-history-title">Pagos al propietario</span><span className="text-xs font-semibold text-orange-800">{settlementStatusLabel(liquidacion.estadoPagoPropietario)} · {ownerPaymentHistory.length} movimientos <ChevronDownIcon className="ml-2 inline h-4 w-4" /></span></summary>
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
                    <div role="tabpanel" className="mt-4 grid gap-3 md:grid-cols-2">
                        {currencySummaries.filter(summary => summary.montoPropietario > 0 || summary.pagadoPropietario > 0).map(summary => (
                            <div key={summary.moneda} className="rounded-2xl border border-orange-100 bg-white p-4">
                                <p className="text-xs font-black uppercase tracking-wide text-orange-800">{summary.moneda} · pagos al propietario</p>
                                <dl className="mt-3 grid grid-cols-3 gap-2 text-sm">
                                    <div><dt className="text-xs font-bold text-gray-600">Neto a entregar</dt><dd className="mt-1 font-black text-gray-950">{formatCurrency(summary.montoPropietario, summary.moneda)}</dd></div>
                                    <div><dt className="text-xs font-bold text-gray-600">Entregado</dt><dd className="mt-1 font-black text-orange-700">{formatCurrency(summary.pagadoPropietario, summary.moneda)}</dd></div>
                                    <div><dt className="text-xs font-bold text-gray-600">Saldo</dt><dd className={`mt-1 font-black ${summary.saldoPropietario > 0 ? 'text-status-danger' : 'text-status-success'}`}>{formatCurrency(summary.saldoPropietario, summary.moneda)}</dd></div>
                                </dl>
                            </div>
                        ))}
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
                                                    <p className={`shrink-0 font-black ${isReversal ? 'text-status-success' : 'text-orange-700'}`}>{isReversal ? '+' : '-'}{formatCurrency(movement.monto, movement.moneda || liquidacion.moneda)}</p>
                                                </div>
                                                <dl className="mt-3 grid grid-cols-2 gap-2 rounded-xl bg-orange-50/60 p-3 text-xs">
                                                    <div><dt className="font-bold text-gray-600">Comprobante</dt><dd className="mt-0.5 font-black text-gray-900">{movement.comprobante}</dd></div>
                                                    <div><dt className="font-bold text-gray-600">Saldo posterior</dt><dd className="mt-0.5 font-black text-gray-900">{formatCurrency(movement.saldoPosterior, movement.moneda || liquidacion.moneda)}</dd></div>
                                                </dl>
                                                <p className="mt-3 text-sm text-gray-700">{movement.observaciones || 'Sin observaciones'} · Registró {movement.creadoPor?.nombreCompleto || 'Sistema'}</p>
                                                {movement.reversionDeId && <p className="mt-2 text-xs font-semibold text-indigo-700">Revierte el asiento #{movement.reversionDeId}.</p>}
                                                {movement.reversionId && <p className="mt-2 text-xs font-semibold text-amber-800">Revertido por el asiento #{movement.reversionId}.</p>}
                                                {movement.montoAdelantoPropio > 0 && <p className="mt-2 text-xs font-semibold text-rose-800">Adelanto propio: {formatCurrency(movement.montoAdelantoPropio, movement.moneda || liquidacion.moneda)}{movement.motivoAdelanto ? ` · ${movement.motivoAdelanto}` : ''}</p>}
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
                                                        <td className="max-w-64 px-4 py-4 text-sm text-gray-700"><p>{movement.creadoPor?.nombreCompleto || 'Sistema'}</p><p className="mt-1 text-xs text-gray-600">{movement.reversionDeId ? `Revierte asiento #${movement.reversionDeId}` : movement.reversionId ? `Revertido por asiento #${movement.reversionId}` : movement.observaciones || 'Sin observaciones'}</p>{movement.montoAdelantoPropio > 0 && <p className="mt-1 text-xs font-bold text-rose-800">Adelanto {formatCurrency(movement.montoAdelantoPropio, movement.moneda || liquidacion.moneda)}</p>}{canReverseOwnerPayments && movement.tipo === 'PAGO' && movement.estado === 'VIGENTE' && <button type="button" data-danger-trigger="true" onClick={() => setOwnerPaymentToReverse(movement.pagoPropietarioId)} className="mt-2 rounded-lg border border-red-300 px-2 py-1 text-xs font-bold text-red-800">Anular</button>}</td>
                                                        <td className={`whitespace-nowrap px-4 py-4 text-right font-mono text-sm font-black ${isReversal ? 'text-status-success' : 'text-orange-700'}`}>{isReversal ? '+' : '-'}{formatCurrency(movement.monto, movement.moneda || liquidacion.moneda)}</td>
                                                        <td className="whitespace-nowrap px-4 py-4 text-right font-mono text-sm font-black text-gray-900">{formatCurrency(movement.saldoPosterior, movement.moneda || liquidacion.moneda)}</td>
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
            </details>

            <details className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                <summary className="flex min-h-11 cursor-pointer items-center justify-between font-black text-gray-950">Datos del contrato y del período <ChevronDownIcon className="h-4 w-4 text-gray-600" /></summary>
                <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
                    <div><dt className="text-xs font-bold text-gray-600">Próxima actualización</dt><dd>{liquidacion.contrato?.requiereActualizacion ? formatDate(liquidacion.contrato.fechaProximaActualizacion) : 'No programada'}</dd></div>
                    <div><dt className="text-xs font-bold text-gray-600">Fin de contrato</dt><dd>{formatDate(liquidacion.contrato?.fechaFin)}</dd></div>
                    <div><dt className="text-xs font-bold text-gray-600">Fecha de emisión</dt><dd>{formatDateTime(liquidacion.fechaCreacion)}</dd></div>
                    <div><dt className="text-xs font-bold text-gray-600">Cobro acordado con inquilino</dt><dd>{liquidacion.contrato?.modalidadCobroInquilino || 'Sin acordar'}{liquidacion.contrato?.cuentaCobroAcordada && ` · ${liquidacion.contrato.cuentaCobroAcordada.banco} · ${liquidacion.contrato.cuentaCobroAcordada.nombre}`}</dd></div>
                    <div><dt className="text-xs font-bold text-gray-600">Pago acordado con propietario</dt><dd>{liquidacion.contrato?.modalidadPagoPropietario || 'Sin acordar'}{liquidacion.propietarioPago?.aliasBancario && ` · ${liquidacion.propietarioPago.aliasBancario}`}</dd></div>
                    <div><dt className="text-xs font-bold text-gray-600">Retiene la inmobiliaria</dt><dd>{currencySummaries.map(summary => <span key={summary.moneda} className="block">{formatCurrency(summary.netoACobrar - summary.montoPropietario, summary.moneda)}</span>)}</dd></div>
                </dl>
                {liquidacion.motivoCambioAlquiler && <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-950"><strong>{liquidacion.alquilerExcepcional ? 'Alquiler excepcional: ' : 'Actualización del alquiler: '}</strong>{liquidacion.motivoCambioAlquiler}</p>}
            </details>

            {liquidacion.cuotas && liquidacion.cuotas.length > 0 && <details className="rounded-2xl border border-blue-200 bg-blue-50 p-4"><summary className="min-h-11 cursor-pointer font-black text-blue-950">Cuotas incorporadas ({liquidacion.cuotas.length})</summary><div className="mt-2 grid gap-2 sm:grid-cols-2">{liquidacion.cuotas.map(cuota => <div key={cuota.id} className="rounded-lg bg-white p-3 text-sm"><p className="font-bold">{cuota.plan.concepto} · cuota {cuota.numeroCuota}/{cuota.plan._count.cuotas}</p><p>{formatCurrency(Number(cuota.monto))} · {cuota.estado.toLowerCase()}</p><p>Saldo propio: {formatCurrency(Math.max(0, Number(cuota.monto) - cuota.imputacionesPago.reduce((sum, item) => sum + Number(item.monto), 0)))}</p></div>)}</div></details>}

            {(liquidacion.contrato?.serviciosGastos || []).length > 0 && (
                <details className="rounded-2xl border border-sky-200 bg-sky-50 px-5 py-4">
                    <summary className="cursor-pointer list-none font-black text-sky-950 marker:hidden">
                        Servicios y gastos acordados <span className="ml-2 text-xs font-medium text-sky-800">Referencia del contrato</span>
                    </summary>
                    <p className="mt-2 text-sm text-sky-900">No modifica esta liquidación: cargá manualmente sólo los importes reales del período.</p>
                    <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {liquidacion.contrato?.serviciosGastos?.map(serviceExpense => (
                            <li key={serviceExpense.id ?? `${serviceExpense.concepto}-${serviceExpense.responsable}`} className="flex items-center justify-between gap-3 rounded-lg bg-white px-3 py-2 text-sm">
                                <span className="font-semibold text-gray-900">{serviceExpense.concepto}</span>
                                <span className={`shrink-0 text-xs font-bold ${serviceExpense.responsable === 'INQUILINO' ? 'text-emerald-700' : 'text-violet-700'}`}>
                                    {serviceExpense.responsable === 'INQUILINO' ? 'Inquilino' : 'Propietario'}
                                </span>
                            </li>
                        ))}
                    </ul>
                </details>
            )}

            {deudaResumen && deudaResumen.totalDeuda > 0 && <section data-testid="historical-debt" className="rounded-2xl border border-amber-200 bg-amber-50 p-4"><h2 className="font-black text-amber-950">Saldo pendiente de otros períodos: {formatMoney(deudaResumen.totalDeuda, deudaResumen.moneda)}</h2><p className="mt-1 text-sm text-amber-900">Se muestra como referencia para decidir cómo cobrarlo. No se agrega dos veces a esta liquidación.</p><div className="mt-3 flex flex-wrap gap-2">{deudaResumen.detalle.map(item => <button key={item.id} type="button" onClick={() => navigate(`/liquidaciones/${item.id}`)} className="rounded-lg border border-amber-300 bg-white px-3 py-2 text-left text-xs font-bold text-amber-950">{formatMonthYear(item.periodo)} · debe {formatMoney(item.deuda, item.moneda)} →</button>)}</div></section>}

            <details className="rounded-2xl border border-indigo-100 bg-white p-4 shadow-sm" aria-label="Historial de este contrato"><summary className="flex min-h-11 cursor-pointer items-center justify-between font-black text-gray-950">Meses anteriores de esta propiedad <ChevronDownIcon className="h-4 w-4 text-gray-600" /></summary><div className="mt-2"><button type="button" onClick={() => navigate(`/liquidaciones/contrato/${liquidacion.contratoId}?periodo=${liquidacion.periodo.slice(0, 7)}`)} className="text-sm font-bold text-indigo-700">Ver todos los meses →</button></div><div className="mt-3 flex gap-2 overflow-x-auto">{earlierPeriods.length ? earlierPeriods.slice(0, 8).map(item => <button key={item.periodo} type="button" onClick={() => navigate(`/liquidaciones/${item.liquidacionId}`)} className="min-w-40 rounded-lg border border-gray-200 p-2 text-left text-xs hover:bg-indigo-50"><span className="block font-bold capitalize">{formatMonthYear(item.periodo)}</span><span className="block">{item.estado === 'EN_MORA' ? 'En mora' : item.estado.toLowerCase().replaceAll('_', ' ')}</span><span className="block">Saldo {formatMoney(item.saldoInquilino, liquidacion.moneda)}</span><span className="block">{item.ajustes.length} ajuste(s) · {item.cuotas.length} cuota(s)</span></button>) : <p className="text-sm text-gray-600">No hay liquidaciones anteriores.</p>}</div></details>

            {liquidacion.comprobantes && liquidacion.comprobantes.length > 0 && (
                <details data-testid="liquidation-vouchers" className="rounded-3xl border border-indigo-100 bg-indigo-50/40 p-4 shadow-sm" aria-labelledby="liquidation-vouchers-title">
                    <summary id="liquidation-vouchers-title" className="flex min-h-11 cursor-pointer items-center justify-between gap-2 font-black text-indigo-950">Comprobantes emitidos <span className="text-xs font-semibold">{liquidacion.comprobantes.length} versiones <ChevronDownIcon className="ml-2 inline h-4 w-4" /></span></summary>
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
                                                    {comprobante.evento === 'AJUSTE' ? `Corregida · ${comprobante.ajustes.length} ajuste${comprobante.ajustes.length === 1 ? '' : 's'}` : comprobante.evento === 'COBRO_INQUILINO' ? 'Cobro registrado' : comprobante.evento === 'PAGO_PROPIETARIO' ? 'Pago al propietario' : comprobante.evento === 'ANULACION_COBRO' ? 'Cobro anulado' : comprobante.evento === 'ANULACION_PAGO_PROPIETARIO' ? 'Entrega anulada' : 'Original confirmada'}
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
                </details>
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
                                        <div className={`text-right ${adjustment.tipo === 'CREDITO' ? 'text-status-success' : 'text-status-danger'}`}>
                                            {Number(adjustment.montoInquilino) > 0 && <p className="font-black">Inquilino {adjustment.tipo === 'CREDITO' ? '−' : '+'}{formatCurrency(Number(adjustment.montoInquilino))}</p>}
                                            {Number(adjustment.montoPropietario) > 0 && <p className="mt-1 font-black">Propietario {adjustment.tipo === 'CREDITO' ? '−' : '+'}{formatCurrency(Number(adjustment.montoPropietario))}</p>}
                                        </div>
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

            <details className="space-y-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm print:hidden">
                <summary className="flex min-h-11 cursor-pointer items-center justify-between font-black text-gray-950">Auditoría <ChevronDownIcon className="h-4 w-4 text-gray-600" /></summary>
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
            </details>

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

            {termsMode && esEditable && canEditLiquidations && <LiquidationTermsModal key={`${termsMode}-${liquidacion.id}`} mode={termsMode} liquidacion={liquidacion} canEditContracts={canEditContracts} onClose={() => setTermsMode(null)} onSaveRent={handleUpdateAlquiler} onSaveFees={handleUpdateHonorarios} />}

            <MovimientoModal
                isOpen={isMovimientoModalOpen}
                onClose={() => setIsMovimientoModalOpen(false)}
                onSave={handleAddMovimiento}
                moneda={liquidacion.moneda}
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
            <LiquidationContractModal contractId={showContract ? liquidacion.contratoId : null} onClose={() => setShowContract(false)} />

            <PaymentModal
                isOpen={isPaymentModalOpen}
                onClose={() => setIsPaymentModalOpen(false)}
	                onSave={handleSavePayment}
	                suggestedAmount={getTenantRemainingBalance(liquidacion)}
	                moneda={liquidacion.moneda}
	                targetLabel={`la liquidación de ${formatPeriod(liquidacion.periodo)}`}
                otherDebtAmount={deudaResumen?.totalDeuda || 0}
                agreedMethod={liquidacion.contrato?.modalidadCobroInquilino || null}
                installments={liquidacion.cuotas?.map(cuota => ({ id: cuota.id, numeroCuota: cuota.numeroCuota, concepto: cuota.plan.concepto, total: Number(cuota.monto), saldo: Math.max(0, Number(cuota.monto) - cuota.imputacionesPago.reduce((sum, item) => sum + Number(item.monto), 0)) })) || []}
                currencyBalances={currencySummaries.map(summary => ({ moneda: summary.moneda, saldo: summary.saldoInquilino }))}
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
	                agreedMethod={liquidacion.contrato?.modalidadPagoPropietario || null}
	                currencyBalances={currencySummaries.map(summary => ({ moneda: summary.moneda, saldo: summary.saldoPropietario, cobrado: summary.cobradoInquilino - summary.pagadoPropietario, capitalPropioExpuesto: summary.capitalPropioExpuesto }))}
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
