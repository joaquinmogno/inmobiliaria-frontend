import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { liquidacionesService, type Liquidacion, type TipoMovimiento } from '../../services/liquidaciones.service';
import { pagosService, type DeudaResumen, type MetodoPago } from '../../services/pagos.service';

export const useLiquidationDetailController = (id?: string) => {
    const navigate = useNavigate();
    const liquidationId = Number(id);
    const [liquidacion, setLiquidacion] = useState<Liquidacion | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingAudit, setIsLoadingAudit] = useState(false);
    const [deudaResumen, setDeudaResumen] = useState<DeudaResumen | null>(null);
    const [isMovimientoModalOpen, setIsMovimientoModalOpen] = useState(false);
    const [isLiquidarModalOpen, setIsLiquidarModalOpen] = useState(false);
    const [movimientoAEliminar, setMovimientoAEliminar] = useState<number | null>(null);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [isOwnerPaymentModalOpen, setIsOwnerPaymentModalOpen] = useState(false);
    const [ownerPaymentToReverse, setOwnerPaymentToReverse] = useState<number | null>(null);
    const [isHonorariosModalOpen, setIsHonorariosModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isAdjustmentModalOpen, setIsAdjustmentModalOpen] = useState(false);
    const [creditToApply, setCreditToApply] = useState<{ id: number; saldo: number } | null>(null);
    const [tenantPaymentToReverse, setTenantPaymentToReverse] = useState<number | null>(null);

    const loadLiquidation = useCallback(async () => {
        if (!id || !Number.isInteger(liquidationId)) return;
        setIsLoading(true);
        try {
            const data = await liquidacionesService.getById(liquidationId);
            setLiquidacion(data);
            if (data.contratoId) {
                setDeudaResumen(await pagosService.getDeudaPorContrato(data.contratoId, data.id));
            }
        } catch {
            toast.error('Error al cargar la liquidación');
            navigate('/liquidaciones');
        } finally {
            setIsLoading(false);
        }
    }, [id, liquidationId, navigate]);

    useEffect(() => { void loadLiquidation(); }, [loadLiquidation]);

    const loadAuditPage = async (page: number) => {
        if (!id) return;
        setIsLoadingAudit(true);
        try {
            const data = await liquidacionesService.getById(liquidationId, page);
            setLiquidacion(current => current ? { ...current, auditLogs: data.auditLogs, auditMeta: data.auditMeta } : data);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'No se pudo cargar la auditoría');
        } finally {
            setIsLoadingAudit(false);
        }
    };

    const handleAddMovimiento = async (movement: { tipo: TipoMovimiento; concepto: string; monto: number; observaciones?: string }) => {
        try {
            setLiquidacion(await liquidacionesService.addMovimiento(liquidationId, {
                ...movement,
                expectedVersion: liquidacion?.version
            }));
            toast.success('Movimiento agregado');
            setIsMovimientoModalOpen(false);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Error al agregar movimiento');
        }
    };

    const handleDeleteMovimiento = async (movementId: number) => {
        try {
            setLiquidacion(await liquidacionesService.deleteMovimiento(movementId));
            toast.success('Movimiento eliminado');
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Error al eliminar movimiento');
        }
    };

    const handleConfirmar = async () => {
        try {
            const confirmed = await liquidacionesService.confirmar(liquidationId, liquidacion?.version);
            // La confirmación devuelve el resumen operativo, pero no necesita
            // volver a descargar el contrato, auditoría ni datos auxiliares que
            // ya están en pantalla. Así no se reemplaza el detalle por una
            // respuesta parcial ni aparece un saldo transitorio de $0.
            setLiquidacion(current => current ? { ...current, ...confirmed } : confirmed);
            toast.success('Liquidación confirmada y pasada a pendiente de pago');
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Error al confirmar liquidación');
        }
    };

    const handleSavePayment = async (payment: { monto: number; fechaPago: string; metodoPago: MetodoPago; observaciones?: string }) => {
        if (!liquidacion?.contratoId) return;
        try {
            await pagosService.registrarPago({
                contratoId: liquidacion.contratoId,
                liquidacionId: liquidacion.id,
                expectedLiquidationVersion: liquidacion.version,
                ...payment
            });
            toast.success('Pago registrado correctamente');
            setIsPaymentModalOpen(false);
            await loadLiquidation();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Error al registrar el pago');
        }
    };

    const handleUpdateHonorarios = async (data: { montoHonorarios: number; porcentajeHonorarios?: number }) => {
        try {
            setLiquidacion(await liquidacionesService.updateHonorarios(liquidationId, {
                ...data,
                expectedVersion: liquidacion?.version
            }));
            toast.success('Honorarios actualizados');
            setIsHonorariosModalOpen(false);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Error al actualizar honorarios');
        }
    };
    const handleCreateAdjustment = async (data: {
        tipo: 'CREDITO' | 'DEBITO'; concepto: string; motivo: string;
        montoInquilino: number; montoPropietario: number;
        destinoCredito?: 'DEVOLUCION' | 'SALDO_A_FAVOR' | 'COMPENSACION';
        liquidacionDestinoId?: number; fechaDevolucion?: string;
        metodoDevolucion?: MetodoPago; observacionesDevolucion?: string;
    }) => {
        try { await liquidacionesService.crearAjuste(liquidationId, data); toast.success('Ajuste emitido y registrado'); setIsAdjustmentModalOpen(false); await loadLiquidation(); }
        catch (error) { toast.error(error instanceof Error ? error.message : 'No se pudo emitir el ajuste'); }
    };

    const handleApplyTenantCredit = async (data: { creditId: number; liquidacionDestinoId: number; monto: number }) => {
        try {
            await liquidacionesService.aplicarCreditoInquilino(data.creditId, { liquidacionDestinoId: data.liquidacionDestinoId, monto: data.monto });
            toast.success('Saldo a favor aplicado correctamente');
            setCreditToApply(null);
            await loadLiquidation();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'No se pudo aplicar el saldo a favor');
        }
    };

    const handleSaveOwnerPayment = async (payment: { monto: number; fechaPago: string; metodoPago: string; propietarioId: number; comprobante?: string; observaciones?: string; motivoAdelanto?: string }) => {
        if (!liquidacion) return;
        try {
            await liquidacionesService.pagarPropietario(liquidacion.id, { ...payment, expectedVersion: liquidacion.version });
            toast.success('Pago a propietario registrado correctamente');
            setIsOwnerPaymentModalOpen(false);
            await loadLiquidation();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Error al registrar el pago al propietario');
        }
    };

    const handleReverseOwnerPayment = async (motivo: string) => {
        if (!liquidacion || !ownerPaymentToReverse) return;
        try {
            await liquidacionesService.anularPagoPropietario(liquidacion.id, ownerPaymentToReverse, motivo);
            toast.success('Pago al propietario anulado y saldo restituido');
            setOwnerPaymentToReverse(null);
            await loadLiquidation();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'No se pudo anular el pago al propietario');
        }
    };

    const handleDelete = async () => {
        try {
            await liquidacionesService.delete(liquidationId);
            toast.success('Borrador eliminado');
            navigate('/liquidaciones');
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'No se pudo eliminar el borrador');
        }
    };

    const handleReverseTenantPayment = async (motivo: string) => {
        if (!tenantPaymentToReverse) return;
        try {
            await pagosService.anular(tenantPaymentToReverse, motivo);
            toast.success('Cobro anulado y caja actualizada');
            setTenantPaymentToReverse(null);
            await loadLiquidation();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'No se pudo anular el cobro');
        }
    };

    return {
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
        handleSavePayment, handleUpdateHonorarios, handleCreateAdjustment, handleApplyTenantCredit, handleSaveOwnerPayment, handleReverseOwnerPayment, handleReverseTenantPayment, handleDelete,
        goToList: () => navigate('/liquidaciones')
    };
};
