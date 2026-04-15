import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { liquidacionesService, type Liquidacion, type TipoMovimiento } from "../services/liquidaciones.service";
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
import { toast } from "react-hot-toast";
import MovimientoModal from "../components/MovimientoModal";
import ConfirmationModal from "../components/ConfirmationModal";
import PaymentModal from "../components/PaymentModal";
import HonorariosModal from "../components/HonorariosModal";
import OwnerPaymentModal from "../components/OwnerPaymentModal";
import { pagosService, type DeudaResumen, type MetodoPago } from "../services/pagos.service";

export default function LiquidacionDetalle() {
    const { id } = useParams<{ id: string }>();
    const [liquidacion, setLiquidacion] = useState<Liquidacion | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isMovimientoModalOpen, setIsMovimientoModalOpen] = useState(false);
    const [isLiquidarModalOpen, setIsLiquidarModalOpen] = useState(false);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [isOwnerPaymentModalOpen, setIsOwnerPaymentModalOpen] = useState(false);
    const [isHonorariosModalOpen, setIsHonorariosModalOpen] = useState(false);
    const [deudaResumen, setDeudaResumen] = useState<DeudaResumen | null>(null);
    const navigate = useNavigate();

    useEffect(() => {
        if (id) loadLiquidation();
    }, [id]);

    const loadLiquidation = async () => {
        setIsLoading(true);
        try {
            const data = await liquidacionesService.getById(Number(id));
            setLiquidacion(data);
            if (data.contratoId) {
                const deuda = await pagosService.getDeudaPorContrato(data.contratoId);
                setDeudaResumen(deuda);
            }
        } catch (error) {
            toast.error("Error al cargar la liquidación");
            navigate("/liquidaciones");
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddMovimiento = async (m: { tipo: TipoMovimiento, concepto: string, monto: number, observaciones?: string }) => {
        try {
            const updated = await liquidacionesService.addMovimiento(Number(id), m);
            setLiquidacion(updated);
            toast.success("Movimiento agregado");
            setIsMovimientoModalOpen(false);
        } catch (error: any) {
            toast.error(error.message || "Error al agregar movimiento");
        }
    };

    const handleDeleteMovimiento = async (movimientoId: number) => {
        try {
            const updated = await liquidacionesService.deleteMovimiento(movimientoId);
            setLiquidacion(updated);
            toast.success("Movimiento eliminado");
        } catch (error) {
            toast.error("Error al eliminar movimiento");
        }
    };

    const handleConfirmar = async () => {
        try {
            const updated = await liquidacionesService.confirmar(Number(id));
            setLiquidacion(updated);
            toast.success("Liquidación confirmada y pasada a pendiente de pago");
        } catch (error) {
            toast.error("Error al confirmar liquidación");
        }
    };

    const handleLiquidar = async () => {
        try {
            // Este método ahora se llama internamente desde pagarPropietario en el backend, 
            // pero si existiera una acción manual sería esta.
            // Para ser coherente con el nuevo flujo, la acción de "Pagar a Propietario" 
            // es la que lleva a LIQUIDADA.
            loadLiquidation();
        } catch (error) {
            toast.error("Error al refrescar liquidación");
        }
    };

    const handleSavePayment = async (p: { monto: number, fechaPago: string, metodoPago: MetodoPago, observaciones?: string }) => {
        if (!liquidacion?.contratoId) return;
        try {
            await pagosService.registrarPago({
                contratoId: liquidacion.contratoId,
                ...p
            });
            toast.success("Pago registrado exitosamente");
            setIsPaymentModalOpen(false);
            loadLiquidation(); // Recargamos todo
        } catch (error: any) {
            toast.error(error.message || "Error al registrar el pago");
        }
    };
    
    const handleUpdateHonorarios = async (data: { montoHonorarios: number, porcentajeHonorarios?: number }) => {
        try {
            const updated = await liquidacionesService.updateHonorarios(Number(id), data);
            setLiquidacion(updated);
            toast.success("Honorarios actualizados");
            setIsHonorariosModalOpen(false);
        } catch (error: any) {
            toast.error(error.message || "Error al actualizar honorarios");
        }
    };

    const handleSaveOwnerPayment = async (p: { fechaPago: string, metodoPago: string, observaciones?: string }) => {
        if (!liquidacion) return;
        try {
            await liquidacionesService.pagarPropietario(liquidacion.id, p);
            toast.success("Pago a propietario registrado exitosamente");
            setIsOwnerPaymentModalOpen(false);
            loadLiquidation();
        } catch (error: any) {
            toast.error(error.message || "Error al registrar el pago al propietario");
        }
    };

    const formatCurrency = (monto: number) => {
        return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(monto);
    };

    const formatPeriod = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString("es-AR", { month: "long", year: "numeric", timeZone: "UTC" });
    };

    if (isLoading) return (
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
            <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-gray-500 font-medium">Cargando detalle de liquidación...</p>
        </div>
    );

    if (!liquidacion) return (
        <div className="text-center py-20">
            <div className="bg-red-50 text-red-600 p-4 rounded-xl inline-block mb-4">
                <DocumentChartBarIcon className="w-12 h-12" />
            </div>
            <h3 className="text-xl font-bold text-gray-900">No se encontró la liquidación</h3>
            <button
                onClick={() => navigate("/liquidaciones")}
                className="mt-4 text-indigo-600 font-bold hover:underline"
            >
                Volver a la lista
            </button>
        </div>
    );

    const ingresos = liquidacion.movimientos?.filter(m => m.tipo === 'INGRESO') || [];
    const descuentos = liquidacion.movimientos?.filter(m => m.tipo === 'DESCUENTO') || [];

    // La liquidación es editable en todos los estados excepto LIQUIDADA
    const esEditable = ['BORRADOR', 'PENDIENTE_PAGO', 'PAGADA_POR_INQUILINO'].includes(liquidacion.estado);
    const tienePagos = (liquidacion.pagos?.length || 0) > 0;

    const getStatusStyle = (estado: string) => {
        switch (estado) {
            case 'BORRADOR': return 'bg-gray-50 text-gray-500 border-gray-200';
            case 'PENDIENTE_PAGO': return 'bg-yellow-50 text-yellow-700 border-yellow-200';
            case 'PAGADA_POR_INQUILINO': return 'bg-blue-50 text-blue-700 border-blue-200';
            case 'LIQUIDADA': return 'bg-green-50 text-green-700 border-green-200';
            default: return 'bg-gray-50 text-gray-700 border-gray-200';
        }
    };

    const getStatusLabel = (estado: string) => {
        switch (estado) {
            case 'BORRADOR': return 'Borrador';
            case 'PENDIENTE_PAGO': return 'Pendiente';
            case 'PAGADA_POR_INQUILINO': return 'Pagada Inquilino';
            case 'LIQUIDADA': return 'Finalizada';
            default: return estado;
        }
    };

    const steps = [
        { id: 'BORRADOR', label: 'Borrador', description: 'Edición de conceptos' },
        { id: 'PENDIENTE_PAGO', label: 'Pendiente', description: 'Esperando pago inquilino' },
        { id: 'PAGADA_POR_INQUILINO', label: 'Cobrada', description: 'Dinero en custodia' },
        { id: 'LIQUIDADA', label: 'Finalizada', description: 'Pago a dueño realizado' }
    ];

    const currentStepIndex = steps.findIndex(s => s.id === liquidacion.estado);

    return (
        <div className="max-w-5xl mx-auto space-y-8 pb-32">
            {/* Top Navigation & Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 print:hidden">
                <button
                    onClick={() => navigate("/liquidaciones")}
                    className="group flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-all font-medium py-2 pr-4 rounded-xl"
                >
                    <div className="bg-white p-2 rounded-lg border border-gray-200 group-hover:border-gray-300 shadow-sm transition-all">
                        <ChevronLeftIcon className="w-4 h-4" />
                    </div>
                    Volver
                </button>
                <div className="flex items-center gap-3">
                    {liquidacion.estado === 'BORRADOR' && (
                        <button
                            onClick={handleConfirmar}
                            className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl hover:bg-indigo-700 transition-all shadow-md shadow-indigo-100 font-bold text-sm cursor-pointer"
                        >
                            <CheckIcon className="w-5 h-5" />
                            Confirmar Liquidación
                        </button>
                    )}
                    {liquidacion.estado === 'PENDIENTE_PAGO' && (
                        <button
                            onClick={() => setIsPaymentModalOpen(true)}
                            className="flex items-center gap-2 bg-green-600 text-white px-5 py-2.5 rounded-xl hover:bg-green-700 transition-all shadow-md shadow-green-100 font-bold text-sm cursor-pointer"
                        >
                            <BanknotesIcon className="w-5 h-5" />
                            Registrar Pago Inquilino
                        </button>
                    )}
                    {liquidacion.estado === 'PAGADA_POR_INQUILINO' && (
                        <button
                            onClick={() => setIsOwnerPaymentModalOpen(true)}
                            className="flex items-center gap-2 bg-orange-600 text-white px-5 py-2.5 rounded-xl hover:bg-orange-700 transition-all shadow-md shadow-orange-100 font-bold text-sm cursor-pointer"
                        >
                            <BuildingOfficeIcon className="w-5 h-5" />
                            Pagar a Propietario
                        </button>
                    )}
                    <button
                        onClick={() => liquidacionesService.downloadPdf(Number(id))}
                        className="flex items-center gap-2 bg-white text-gray-700 border border-gray-200 px-5 py-2.5 rounded-xl hover:bg-gray-50 transition-all font-bold text-sm cursor-pointer"
                        title="Comprobante para el inquilino"
                    >
                        <PrinterIcon className="w-5 h-5" />
                        PDF Inquilino
                    </button>
                    <button
                        onClick={() => liquidacionesService.downloadPdfPropietario(Number(id))}
                        className="flex items-center gap-2 bg-white text-gray-700 border border-gray-200 px-5 py-2.5 rounded-xl hover:bg-gray-50 transition-all font-bold text-sm cursor-pointer"
                        title="Liquidación para el propietario con honorarios"
                    >
                        <DocumentChartBarIcon className="w-5 h-5" />
                        PDF Dueño
                    </button>
                </div>
            </div>

            {/* Stepper Progress */}
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 overflow-hidden relative">
                <div className="flex items-center justify-between relative z-10">
                    {steps.map((step, idx) => {
                        const isCompleted = idx < currentStepIndex;
                        const isCurrent = idx === currentStepIndex;
                        const isLast = idx === steps.length - 1;

                        return (
                            <div key={step.id} className={`flex-1 flex flex-col items-center relative ${!isLast ? 'after:content-[""] after:w-full after:h-0.5 after:absolute after:top-5 after:left-[50%] after:z-[-1]' : ''} ${idx < currentStepIndex ? 'after:bg-indigo-500' : 'after:bg-gray-100'}`}>
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-500 mb-3 bg-white ${isCompleted ? 'bg-indigo-600 border-indigo-600 text-white' : isCurrent ? 'border-indigo-600 text-indigo-600' : 'border-gray-200 text-gray-300'}`}>
                                    {isCompleted ? <CheckIcon className="w-6 h-6 font-bold" /> : <span className="font-black">{idx + 1}</span>}
                                </div>
                                <div className="text-center">
                                    <p className={`text-xs font-black uppercase tracking-widest ${isCurrent ? 'text-indigo-600' : isCompleted ? 'text-gray-900' : 'text-gray-400'}`}>{step.label}</p>
                                    <p className="text-[10px] text-gray-400 font-medium mt-1 md:block hidden">{step.description}</p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Historical Debt Alert */}
            {deudaResumen && deudaResumen.totalDeuda > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-3xl p-6 flex items-start gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
                    <div className="bg-amber-100 p-2 rounded-xl text-amber-600">
                        <BanknotesIcon className="w-6 h-6" />
                    </div>
                    <div>
                        <h4 className="text-amber-900 font-black text-sm uppercase tracking-tight">Deuda Pendiente Detectada</h4>
                        <p className="text-amber-700 text-sm font-medium mt-1">Este contrato posee una deuda acumulada de <span className="font-black underline">{formatCurrency(deudaResumen.totalDeuda)}</span> de periodos anteriores.</p>
                    </div>
                </div>
            )}

            {/* Document Header Section */}
            <div className="bg-white rounded-[2rem] shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden relative">
                {/* Decorative background element */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50 rounded-full -mr-32 -mt-32 opacity-50 pointer-events-none" />

                <div className="p-8 sm:p-12 relative">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 mb-12">
                        <div className="space-y-2">
                            <span className={`inline-flex items-center px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest border ${getStatusStyle(liquidacion.estado)}`}>
                                {getStatusLabel(liquidacion.estado)}
                            </span>
                            <h1 className="text-4xl font-black text-gray-900 tracking-tight capitalize">
                                Liquidación {formatPeriod(liquidacion.periodo)}
                            </h1>
                            <p className="text-gray-500 font-medium">Comprobante de movimientos mensuales del contrato</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        {/* CARD: TOTAL INQUILINO */}
                        <div className="bg-white border border-gray-200 p-6 rounded-3xl shadow-sm relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                                <UserIcon className="w-16 h-16 text-gray-900" />
                            </div>
                            <p className="text-gray-500 text-[10px] font-black uppercase tracking-[0.2em] mb-1">Total Inquilino</p>
                            <h2 className="text-3xl font-black tracking-tight text-gray-900">{formatCurrency(Number(liquidacion.netoACobrar))}</h2>
                            <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between items-center">
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Lo que paga el inquilino</span>
                                <div className="bg-gray-100 p-1 rounded-lg">
                                    <BanknotesIcon className="w-4 h-4 text-gray-500" />
                                </div>
                            </div>
                        </div>

                        {/* CARD: HONORARIOS INMOBILIARIA */}
                        <div className="bg-white border border-gray-200 p-6 rounded-3xl shadow-sm relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                                <BriefcaseIcon className="w-16 h-16 text-indigo-600" />
                            </div>
                            <p className="text-indigo-500 text-[10px] font-black uppercase tracking-[0.2em] mb-1">Honorarios Inmob.</p>
                            <h2 className="text-3xl font-black tracking-tight text-indigo-600">
                                {formatCurrency(Number(liquidacion.montoHonorarios || 0))}
                            </h2>
                            <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between items-center">
                                <span className="text-[10px] font-black text-indigo-300 uppercase tracking-widest">
                                    {liquidacion.porcentajeHonorarios ? `${liquidacion.porcentajeHonorarios}% del alquiler` : 'Monto fijo'}
                                </span>
                                <div className="bg-indigo-50 p-1 rounded-lg">
                                    <TagIcon className="w-4 h-4 text-indigo-500" />
                                </div>
                            </div>
                        </div>

                        {/* CARD: NETO PROPIETARIO */}
                        <div className="bg-indigo-600 p-6 rounded-3xl shadow-xl shadow-indigo-100 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity text-white">
                                <HomeModernIcon className="w-16 h-16" />
                            </div>
                            <p className="text-indigo-100 text-[10px] font-black uppercase tracking-[0.2em] mb-1">Neto Propietario</p>
                            <h2 className="text-3xl font-black tracking-tight text-white">
                                {(() => {
                                    const movsInmo = liquidacion.movimientos?.filter(m => m.esParaInmobiliaria)
                                        .reduce((acc, m) => acc + Number(m.monto), 0) || 0;
                                    return formatCurrency(Number(liquidacion.netoACobrar) - Number(liquidacion.montoHonorarios || 0) - movsInmo);
                                })()}
                            </h2>
                            <div className="mt-4 pt-4 border-t border-white/10 flex justify-between items-center">
                                <span className="text-[10px] font-black text-indigo-200 uppercase tracking-widest">Lo que recibe el dueño</span>
                                <div className="bg-white/10 p-1 rounded-lg">
                                    <ArrowRightCircleIcon className="w-4 h-4 text-white" />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 text-indigo-600 font-black text-xs uppercase tracking-widest">
                                <HomeIcon className="w-4 h-4" />
                                Inmueble
                            </div>
                            <div>
                                <h4 className="text-lg font-bold text-gray-900 leading-tight">
                                    {liquidacion.contrato?.propiedad.direccion}
                                </h4>
                                <p className="text-gray-500 font-medium">
                                    {liquidacion.contrato?.propiedad.piso} {liquidacion.contrato?.propiedad.departamento}
                                </p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center gap-2 text-indigo-600 font-black text-xs uppercase tracking-widest">
                                <UserIcon className="w-4 h-4" />
                                Inquilino
                            </div>
                            <div>
                                <h4 className="text-lg font-bold text-gray-900">
                                    {liquidacion.contrato?.inquilinos.find((i: any) => i.esPrincipal)?.persona.nombreCompleto || '-'}
                                </h4>
                                <p className="text-gray-500 font-medium italic">Responsable de pago</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center gap-2 text-indigo-600 font-black text-xs uppercase tracking-widest font-mono">
                                <CalendarIcon className="w-4 h-4" />
                                Fecha de Emisión
                            </div>
                            <div>
                                <h4 className="text-lg font-bold text-gray-900">
                                    {new Date(liquidacion.fechaCreacion).toLocaleDateString("es-AR", { timeZone: 'UTC' })}
                                </h4>
                                <p className="text-gray-500 font-medium">Liquidación N° {liquidacion.id.toString().padStart(6, '0')}</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center justify-between gap-2 text-indigo-600 font-black text-xs uppercase tracking-widest font-mono">
                                <div className="flex items-center gap-2">
                                    <CurrencyDollarIcon className="w-4 h-4" />
                                    Honorarios Inmob.
                                </div>
                                {esEditable && (
                                    <button 
                                        onClick={() => setIsHonorariosModalOpen(true)}
                                        className="text-indigo-400 hover:text-indigo-600 transition-colors p-1 rounded-lg hover:bg-indigo-50 cursor-pointer"
                                        title="Editar Honorarios"
                                    >
                                        <PencilSquareIcon className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                            <div>
                                <h4 className="text-lg font-bold text-teal-700">
                                    {formatCurrency(Number(liquidacion.montoHonorarios || 0))}
                                </h4>
                                <p className="text-teal-600/80 font-medium">
                                    {liquidacion.porcentajeHonorarios ? `${liquidacion.porcentajeHonorarios}% sobre alquiler` : 'Monto fijo'}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Movements Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Ingresos Column */}
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight flex items-center gap-2">
                            <div className="w-1.5 h-6 bg-green-500 rounded-full" />
                            Ingresos
                        </h3>
                        {esEditable && (
                            <div className="flex items-center gap-2">
                                {tienePagos && (
                                    <span className="text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-2 py-1 rounded-lg">
                                        Edición parcial
                                    </span>
                                )}
                                <button
                                    onClick={() => setIsMovimientoModalOpen(true)}
                                    className="p-2 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-100 transition-all cursor-pointer"
                                    title="Agregar Movimiento"
                                >
                                    <PlusIcon className="w-5 h-5" />
                                </button>
                            </div>
                        )}
                    </div>
                    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-gray-50/50 border-b border-gray-100">
                                    <th className="text-left py-4 px-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Concepto</th>
                                    <th className="text-right py-4 px-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Monto</th>
                                    {liquidacion.estado === 'BORRADOR' && <th className="w-10"></th>}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {ingresos.map(m => (
                                    <tr key={m.id} className="group transition-colors hover:bg-green-50/30">
                                        <td className="py-4 px-6">
                                            <p className="text-sm font-bold text-gray-900">{m.concepto}</p>
                                            {m.observaciones && <p className="text-xs text-gray-400 mt-0.5">{m.observaciones}</p>}
                                        </td>
                                        <td className="py-4 px-6 text-right font-mono font-black text-gray-900 text-sm">
                                            {formatCurrency(m.monto)}
                                        </td>
                                        {esEditable && (
                                            <td className="pr-6">
                                                <button
                                                    onClick={() => handleDeleteMovimiento(m.id)}
                                                    className="p-1.5 text-red-300 hover:text-red-500 hover:bg-white rounded-lg transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
                                                >
                                                    <TrashIcon className="w-4 h-4" />
                                                </button>
                                            </td>
                                        )}
                                    </tr>
                                ))}
                                {ingresos.length === 0 && (
                                    <tr>
                                        <td colSpan={3} className="py-12 text-center text-sm text-gray-400 italic">No hay ingresos registrados</td>
                                    </tr>
                                )}
                            </tbody>
                            <tfoot className="bg-green-50/50">
                                <tr>
                                    <td className="py-4 px-6 text-xs font-black text-green-800 uppercase tracking-widest">Subtotal Ingresos</td>
                                    <td className="py-4 px-6 text-right font-black text-green-800 text-base">{formatCurrency(Number(liquidacion.totalIngresos))}</td>
                                    {esEditable && <td></td>}
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
                    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-gray-50/50 border-b border-gray-100">
                                    <th className="text-left py-4 px-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Concepto</th>
                                    <th className="text-right py-4 px-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Monto</th>
                                    {esEditable && <th className="w-10"></th>}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {descuentos.map(m => (
                                    <tr key={m.id} className="group transition-colors hover:bg-red-50/30">
                                        <td className="py-4 px-6">
                                            <p className="text-sm font-bold text-gray-900">{m.concepto}</p>
                                            {m.observaciones && <p className="text-xs text-gray-400 mt-0.5">{m.observaciones}</p>}
                                        </td>
                                        <td className="py-4 px-6 text-right font-mono font-black text-red-600 text-sm">
                                            ({formatCurrency(m.monto)})
                                        </td>
                                        {esEditable && (
                                            <td className="pr-6">
                                                <button
                                                    onClick={() => handleDeleteMovimiento(m.id)}
                                                    className="p-1.5 text-red-300 hover:text-red-500 hover:bg-white rounded-lg transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
                                                >
                                                    <TrashIcon className="w-4 h-4" />
                                                </button>
                                            </td>
                                        )}
                                    </tr>
                                ))}
                                {descuentos.length === 0 && (
                                    <tr>
                                        <td colSpan={3} className="py-12 text-center text-sm text-gray-400 italic">No hay descuentos registrados</td>
                                    </tr>
                                )}
                            </tbody>
                            <tfoot className="bg-red-50/50">
                                <tr>
                                    <td className="py-4 px-6 text-xs font-black text-red-800 uppercase tracking-widest">Subtotal Descuentos</td>
                                    <td className="py-4 px-6 text-right font-black text-red-800 text-base">({formatCurrency(Number(liquidacion.totalDescuentos))})</td>
                                    {esEditable && <td></td>}
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>
            </div>

            {/* Payments Section */}
            {(liquidacion.pagos?.length || 0) > 0 && (
                <div className="space-y-4">
                    <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight flex items-center gap-2">
                        <div className="w-1.5 h-6 bg-indigo-500 rounded-full" />
                        Pagos Registrados
                    </h3>
                    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-gray-50/50 border-b border-gray-100">
                                    <th className="text-left py-4 px-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Fecha</th>
                                    <th className="text-left py-4 px-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Método</th>
                                    <th className="text-left py-4 px-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Detalle</th>
                                    <th className="text-right py-4 px-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Monto</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {liquidacion.pagos?.map(p => (
                                    <tr key={p.id} className="transition-colors hover:bg-indigo-50/20">
                                        <td className="py-4 px-6 text-sm font-bold text-gray-900">
                                            {new Date(p.fechaPago).toLocaleDateString("es-AR", { timeZone: 'UTC' })}
                                        </td>
                                        <td className="py-4 px-6">
                                            <span className="bg-indigo-50 text-indigo-700 px-2 py-1 rounded text-[10px] font-black tracking-widest uppercase">
                                                {p.metodoPago}
                                            </span>
                                        </td>
                                        <td className="py-4 px-6 text-sm text-gray-500 font-medium">
                                            {p.observaciones || "-"}
                                        </td>
                                        <td className="py-4 px-6 text-right font-mono font-black text-green-600 text-sm">
                                            {formatCurrency(Number(p.monto))}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot className="bg-indigo-50/30">
                                <tr>
                                    <td colSpan={3} className="py-4 px-6 text-xs font-black text-indigo-800 uppercase tracking-widest">Total Percibido</td>
                                    <td className="py-4 px-6 text-right font-black text-indigo-800 text-base">
                                        {formatCurrency(liquidacion.pagos?.reduce((acc, p) => acc + Number(p.monto), 0) || 0)}
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>

                    {/* Remaining Liquidation Debt */}
                    {liquidacion.estado === 'PENDIENTE_PAGO' && (
                        <div className="flex justify-end pr-6">
                            <div className="text-right">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Saldo Remanente Inquilino</p>
                                <p className="text-xl font-black text-red-600">
                                    {formatCurrency(Number(liquidacion.netoACobrar) - (liquidacion.pagos?.reduce((acc, p) => acc + Number(p.monto), 0) || 0))}
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Final Summary Card for Print */}
            <div className="hidden print:block bg-gray-50 p-8 rounded-3xl border-2 border-dashed border-gray-200 mt-12">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h4 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-1">Resumen Final</h4>
                        <p className="text-gray-600 text-sm font-medium">Esta liquidación contempla todos los conceptos del período {formatPeriod(liquidacion.periodo)}</p>
                    </div>
                    <div className="text-right flex items-center gap-8 border-t sm:border-t-0 sm:border-l border-gray-200 sm:pl-8 pt-4 sm:pt-0 w-full sm:w-auto">
                        <div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">A cobrar al inquilino</p>
                            <p className="text-2xl font-black text-gray-900">{formatCurrency(Number(liquidacion.netoACobrar))}</p>
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Neto Dueño (con Hon. Inmob.)</p>
                            <p className="text-2xl font-black text-indigo-600">{formatCurrency(Number(liquidacion.netoACobrar) - Number(liquidacion.montoHonorarios || 0))}</p>
                        </div>
                    </div>
                </div>
            </div>

            <MovimientoModal
                isOpen={isMovimientoModalOpen}
                onClose={() => setIsMovimientoModalOpen(false)}
                onSave={handleAddMovimiento}
            />

            <ConfirmationModal
                isOpen={isLiquidarModalOpen}
                onClose={() => setIsLiquidarModalOpen(false)}
                onConfirm={handleLiquidar}
                title="Cerrar Liquidación"
                message="¿Estás seguro de que deseas cerrar esta liquidación? Una vez liquidada, los valores se congelarán para el histórico y no podrán ser editados."
                confirmText="Sellar y Guardar"
                type="info"
            />

            <PaymentModal
                isOpen={isPaymentModalOpen}
                onClose={() => setIsPaymentModalOpen(false)}
                onSave={handleSavePayment}
                suggestedAmount={Number(liquidacion.netoACobrar) - (liquidacion.pagos?.reduce((acc, p) => acc + Number(p.monto), 0) || 0)}
            />

            <HonorariosModal
                isOpen={isHonorariosModalOpen}
                onClose={() => setIsHonorariosModalOpen(false)}
                onSave={handleUpdateHonorarios}
                currentMonto={Number(liquidacion.montoHonorarios || 0)}
                currentPorcentaje={liquidacion.porcentajeHonorarios ? Number(liquidacion.porcentajeHonorarios) : null}
            />

            <OwnerPaymentModal
                isOpen={isOwnerPaymentModalOpen}
                onClose={() => setIsOwnerPaymentModalOpen(false)}
                onSave={handleSaveOwnerPayment}
                suggestedAmount={Number(liquidacion.netoACobrar) - Number(liquidacion.montoHonorarios || 0)}
            />
        </div>
    );
}
