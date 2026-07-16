import { formatDate } from "../utils/date";
import { Fragment, useState, useEffect } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { liquidacionesService, type Liquidacion } from "../services/liquidaciones.service";
import {
    XMarkIcon,
    DocumentTextIcon,
    CalendarIcon,
    UserIcon,
    HomeIcon,
    PhoneIcon,
    TrashIcon,
    ArrowPathIcon
} from "@heroicons/react/24/outline";
import { planesCuotasService, type PlanCuotas } from "../services/planes-cuotas.service";
import NewPlanCuotasModal from "./NewPlanCuotasModal";
import { toast } from "react-hot-toast";
import { contractsService, type Contract } from "../services/contracts.service";
import { openAuthenticatedFile } from "../services/api";
import WhatsAppLink from "./WhatsAppLink";
import { BanknotesIcon as BanknotesIconSolid } from "@heroicons/react/20/solid";
import AuditTrail from "./AuditTrail";
import { useAuth } from "../context/AuthContext";
import { hasPermission } from "../utils/permissions";
import { formatCurrency } from "../utils/currency";
import { getDocumentActionLabel, getDocumentTypeLabel, isWordDocument } from "../utils/documentFiles";
import { requestConfirmation } from "../services/confirmation";

export interface ContractDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    contract: Contract | null;
    onDelete: (id: number) => void;
}

export default function ContractDetailsModal({
    isOpen,
    onClose,
    contract: initialContract,
    onDelete,
}: ContractDetailsModalProps) {
    const { user } = useAuth();
    const canDeleteContracts = hasPermission(user, "contratos.eliminar");
    const canViewFiles = hasPermission(user, "contratos.archivos.ver");
    const canEditLiquidations = hasPermission(user, "liquidaciones.editar");
    const [currentContract, setCurrentContract] = useState<Contract | null>(initialContract);

    const handleOpenDocument = async (path: string | null) => {
        if (path) {
            try {
                const action = await openAuthenticatedFile(path);
                if (action === 'downloaded' && isWordDocument(path)) {
                    toast.success("El documento Word se descargó correctamente");
                }
            } catch (error) {
                toast.error("No se pudo abrir el archivo");
            }
        } else {
            toast.error("Este documento no tiene un archivo asociado.");
        }
    };

    const [activeTab, setActiveTab] = useState<'general' | 'financial' | 'cuotas' | 'audit'>('general');
    const [liquidaciones, setLiquidaciones] = useState<Liquidacion[]>([]);
    const [planesCuotas, setPlanesCuotas] = useState<PlanCuotas[]>([]);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);
    const [isLoadingCuotas, setIsLoadingCuotas] = useState(false);
    const [isNewPlanModalOpen, setIsNewPlanModalOpen] = useState(false);

    useEffect(() => {
        if (!isOpen || !initialContract) {
            setCurrentContract(initialContract);
            return;
        }

        let cancelled = false;
        setCurrentContract(initialContract);
        contractsService.getById(initialContract.id)
            .then((detailedContract) => {
                if (!cancelled) setCurrentContract(detailedContract);
            })
            .catch((error) => console.error("Error loading contract details", error));

        return () => {
            cancelled = true;
        };
    }, [isOpen, initialContract?.id]);

    useEffect(() => {
        if (isOpen && currentContract) {
            if (activeTab === 'financial') loadFinancialHistory();
            if (activeTab === 'cuotas') loadPlanesCuotas();
        }
    }, [isOpen, activeTab, currentContract]);

    const contract = currentContract;
    if (!contract) return null;

    const loadPlanesCuotas = async () => {
        if (!contract) return;
        setIsLoadingCuotas(true);
        try {
            const data = await planesCuotasService.getByContrato(contract.id);
            setPlanesCuotas(data);
        } catch (error) {
            console.error("Error loading cuotas", error);
        } finally {
            setIsLoadingCuotas(false);
        }
    };

    const loadFinancialHistory = async () => {
        if (!contract) return;
        setIsLoadingHistory(true);
        try {
            const response = await liquidacionesService.getAll(contract.id);
            // Extraer el array de datos de la respuesta paginada
            const liquidacionesData = response.data || [];
            // Ordenar por período descendente
            const sorted = [...liquidacionesData].sort((a, b) => new Date(b.periodo).getTime() - new Date(a.periodo).getTime());
            setLiquidaciones(sorted);
        } catch (error) {
            console.error("Error loading history", error);
        } finally {
            setIsLoadingHistory(false);
        }
    };

    const getStatusBadge = (estado: string) => {
        switch (estado) {
            case 'BORRADOR': return <span className="bg-gray-50 text-gray-500 px-2 py-0.5 rounded text-xs font-black border border-gray-200 uppercase tracking-widest">Borrador</span>;
            case 'PENDIENTE_PAGO': return <span className="bg-yellow-50 text-yellow-700 px-2 py-0.5 rounded text-xs font-black border border-yellow-200 uppercase tracking-widest">Pendiente</span>;
            case 'PAGADA_POR_INQUILINO': return <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-xs font-black border border-blue-200 uppercase tracking-widest">Cobrada</span>;
            case 'LIQUIDADA': return <span className="bg-green-50 text-green-700 px-2 py-0.5 rounded text-xs font-black border border-green-200 uppercase tracking-widest">Finalizada</span>;
            default: return <span className="text-gray-600 text-xs font-bold uppercase tracking-widest">{estado}</span>;
        }
    };

    const handleDeletePlan = async (id: number) => {
        if (!canEditLiquidations) return;
        if (!await requestConfirmation({ title: "Eliminar plan de cuotas", message: "Solo puede eliminarse si no tiene cuotas liquidadas. Esta acción no se puede deshacer.", confirmText: "Eliminar" })) return;
        try {
            await planesCuotasService.delete(id);
            toast.success("Plan eliminado");
            loadPlanesCuotas();
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Error al eliminar plan");
        }
    };

	    const formatMoney = (amount: number, moneda = contract.moneda) => formatCurrency(amount, moneda);

    return (
        <>
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-50" onClose={onClose}>
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" />
                </Transition.Child>

                <div className="fixed inset-0 overflow-hidden">
                    <div className="flex min-h-full items-end justify-center text-center sm:items-center sm:p-4">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 scale-95"
                            enterTo="opacity-100 scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 scale-100"
                            leaveTo="opacity-0 scale-95"
                        >
                            <Dialog.Panel className="flex max-h-[100dvh] w-full max-w-2xl transform flex-col overflow-hidden rounded-t-2xl bg-white text-left align-middle shadow-xl transition-all sm:max-h-[90dvh] sm:rounded-2xl">
                                <div className="shrink-0 flex justify-between items-center border-b border-gray-100 p-4 sm:p-6">
                                    <Dialog.Title
                                        as="h3"
                                        className="text-xl font-bold leading-6 text-gray-900 flex items-center gap-2"
                                    >
                                        Detalles del Contrato
                                        <span className={`text-xs uppercase px-2 py-0.5 rounded border ${contract.administrado ? 'bg-green-50 text-green-700 border-green-100' : 'bg-amber-50 text-amber-700 border-amber-100'}`}>
                                            {contract.administrado ? 'Administrado' : 'Gestión Única'}
                                        </span>
                                    </Dialog.Title>
                                   <button
                                        onClick={onClose}
                                        className="text-gray-600 hover:text-gray-500 transition-colors focus:outline-none"
                                    >
                                        <XMarkIcon className="w-6 h-6" />
                                    </button>
                                </div>

                                <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
                                {/* Tabs Navigation */}
                                <div className="mb-6 flex gap-2 overflow-x-auto border-b border-gray-100 pb-1">
                                    <button
                                        onClick={() => setActiveTab('general')}
                                        className={`shrink-0 pb-3 px-3 text-sm font-medium transition-colors relative ${activeTab === 'general' ? 'text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
                                    >
                                        General
                                        {activeTab === 'general' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-600 rounded-t-full" />}
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('financial')}
                                        className={`shrink-0 pb-3 px-3 text-sm font-medium transition-colors relative ${activeTab === 'financial' ? 'text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
                                    >
                                        Historial Financiero
                                        {activeTab === 'financial' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-600 rounded-t-full" />}
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('cuotas')}
                                        className={`shrink-0 pb-3 px-3 text-sm font-medium transition-colors relative ${activeTab === 'cuotas' ? 'text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
                                    >
                                        Planes
                                        {activeTab === 'cuotas' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-600 rounded-t-full" />}
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('audit')}
                                        className={`shrink-0 pb-3 px-3 text-sm font-medium transition-colors relative ${activeTab === 'audit' ? 'text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
                                    >
                                        Auditoría
                                        {activeTab === 'audit' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-600 rounded-t-full" />}
                                    </button>
                                </div>

                                {activeTab === 'general' ? (
                                    <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-300">

                                        <div className="space-y-6">
                                            {/* Inmueble */}
                                            <div className="flex gap-4">
                                                <div className="bg-indigo-50 p-3 rounded-xl h-fit">
                                                    <HomeIcon className="w-6 h-6 text-indigo-600" />
                                                </div>
                                                <div>
                                                    <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-1">
                                                        Inmueble
                                                    </h4>
                                                    <p className="text-lg text-gray-700 font-medium">
                                                        {contract.propiedad.direccion}
                                                    </p>
                                                    {(contract.propiedad.piso ||
                                                        contract.propiedad.departamento) && (
                                                            <p className="text-sm text-gray-500">
                                                                {contract.propiedad.piso &&
                                                                    `Piso ${contract.propiedad.piso}`}{" "}
                                                                {contract.propiedad.departamento &&
                                                                    `Depto ${contract.propiedad.departamento}`}
                                                            </p>
                                                        )}
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                {/* Propietarios */}
                                                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 flex flex-col gap-3">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <UserIcon className="w-5 h-5 text-indigo-600" />
                                                        <h4 className="text-sm font-bold text-indigo-900 uppercase tracking-wide">
                                                            Propietarios
                                                        </h4>
                                                    </div>
                                                    {contract.propietarios.map((p, idx) => (
                                                        <div key={p.id} className={`${idx > 0 ? 'pt-3 border-t border-gray-200' : ''}`}>
                                                            <div className="flex justify-between items-start">
                                                                <p className="text-base font-semibold text-gray-900">
                                                                    {p.persona.nombreCompleto}
                                                                </p>
                                                                {p.esPrincipal && (
                                                                    <span className="text-xs font-bold text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded">PRINCIPAL</span>
                                                                )}
                                                            </div>
                                                            <div className="mt-1 flex items-center gap-2 text-sm text-gray-600">
                                                                <PhoneIcon className="w-4 h-4" />
                                                                 <WhatsAppLink phone={p.persona.telefono || ""} />
                                                           </div>
                                                        </div>
                                                    ))}
                                                </div>

                                                {/* Inquilinos */}
                                                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 flex flex-col gap-3">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <UserIcon className="w-5 h-5 text-indigo-600" />
                                                        <h4 className="text-sm font-bold text-indigo-900 uppercase tracking-wide">
                                                            Inquilinos
                                                        </h4>
                                                    </div>
                                                    {contract.inquilinos.map((i, idx) => (
                                                        <div key={i.id} className={`${idx > 0 ? 'pt-3 border-t border-gray-200' : ''}`}>
                                                            <div className="flex justify-between items-start">
                                                                <p className="text-base font-semibold text-gray-900">
                                                                    {i.persona.nombreCompleto}
                                                                </p>
                                                                {i.esPrincipal && (
                                                                    <span className="text-xs font-bold text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded">PRINCIPAL</span>
                                                                )}
                                                            </div>
                                                            <div className="mt-1 flex items-center gap-2 text-sm text-gray-600">
                                                                <PhoneIcon className="w-4 h-4" />
                                                                 <WhatsAppLink phone={i.persona.telefono || ""} />
                                                           </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Fechas */}
                                            <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100">
                                                <div className="flex items-center gap-2 mb-4">
                                                    <CalendarIcon className="w-5 h-5 text-indigo-600" />
                                                    <h4 className="text-sm font-bold text-indigo-900 uppercase tracking-wide">
                                                        Vigencia y Fechas
                                                    </h4>
                                                </div>
                                                <div className="grid grid-cols-3 gap-4">
                                                    <div>
                                                        <p className="text-xs text-gray-500 mb-1">Inicio</p>
                                                        <p className="text-sm font-bold text-gray-900">
                                                            {formatDate(contract.fechaInicio)}
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs text-gray-500 mb-1">Fin</p>
                                                        <p className="text-sm font-bold text-gray-900">
                                                            {formatDate(contract.fechaFin)}
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs text-gray-500 mb-1">Actualización</p>
                                                        <p className={`text-sm font-bold ${contract.requiereActualizacion ? 'text-indigo-600' : 'text-gray-500'}`}>
                                                            {contract.requiereActualizacion
                                                                ? formatDate(contract.fechaProximaActualizacion || "")
                                                                : "No programada"}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Información Económica */}
                                            <div className="bg-green-50/50 p-4 rounded-xl border border-green-100">
                                                <div className="flex items-center gap-2 mb-4">
                                                    <DocumentTextIcon className="w-5 h-5 text-green-600" />
                                                    <h4 className="text-sm font-bold text-green-900 uppercase tracking-wide">
                                                        Condiciones Económicas
                                                    </h4>
                                                </div>
                                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                                    <div>
                                                        <p className="text-xs text-gray-500 mb-1">Alquiler</p>
                                                        <p className="text-base font-bold text-gray-900">
	                                                            {formatMoney(Number(contract.montoAlquiler))}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Historial de Actualizaciones */}
                                            {contract.actualizaciones && contract.actualizaciones.length > 0 && (
                                                <div className="bg-amber-50/50 p-4 rounded-xl border border-amber-100">
                                                    <div className="flex items-center gap-2 mb-4">
                                                        <ArrowPathIcon className="w-5 h-5 text-amber-600" />
                                                        <h4 className="text-sm font-bold text-amber-900 uppercase tracking-wide">
                                                            Historial de Actualizaciones
                                                        </h4>
                                                    </div>
                                                    <div className="space-y-3">
                                                        {contract.actualizaciones.map((actualizacion) => (
                                                            <div key={actualizacion.id} className="bg-white p-3 rounded-lg border border-amber-100 shadow-sm">
                                                                <div className="flex justify-between items-start mb-2">
                                                                    <p className="text-xs font-bold text-amber-500 uppercase">
                                                                        {formatDate(actualizacion.fechaActualizacion)}
                                                                    </p>
                                                                    <span className="text-xs font-bold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded uppercase font-display">
                                                                        Por: {actualizacion.usuario?.nombreCompleto || 'Sistema'}
                                                                    </span>
                                                                </div>
                                                                <div className="grid grid-cols-2 gap-4 text-sm">
                                                                    <div>
                                                                        <p className="text-xs text-gray-600 font-bold uppercase mb-0.5 font-display">Monto Alquiler</p>
                                                                        <p className="font-bold text-gray-800 flex items-center gap-1.5">
	                                                                            <span className="text-gray-600 font-medium">{formatMoney(Number(actualizacion.montoAnterior), actualizacion.moneda || contract.moneda)}</span>
	                                                                            <span className="text-amber-500">→</span>
	                                                                            <span className="text-indigo-600 font-black tracking-tight">{formatMoney(Number(actualizacion.montoNuevo), actualizacion.moneda || contract.moneda)}</span>
                                                                        </p>
                                                                    </div>
                                                                    <div>
                                                                        <p className="text-xs text-gray-600 font-bold uppercase mb-0.5 font-display">Próxima Actualización</p>
                                                                        <p className="font-bold text-gray-800 flex items-center gap-1.5">
                                                                            <span className="text-gray-600 font-medium">{formatDate(actualizacion.fechaProximaAnterior || "")}</span>
                                                                            <span className="text-amber-500">→</span>
                                                                            <span className="text-indigo-600 font-black tracking-tight">{formatDate(actualizacion.fechaProximaNueva)}</span>
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                                {actualizacion.observaciones && (
                                                                    <div className="mt-2 text-xs text-gray-600 italic bg-gray-50/50 p-2 rounded border-l-2 border-amber-300">
                                                                        "{actualizacion.observaciones}"
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Documentos */}
                                            {canViewFiles && (
                                            <div className="space-y-3">
                                                <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wide">
                                                    Documentación
                                                </h4>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                    <div className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg">
                                                        <div className="flex items-center gap-2">
                                                            <DocumentTextIcon className={`w-5 h-5 ${isWordDocument(contract.rutaArchivoContrato) ? 'text-blue-600' : 'text-indigo-500'}`} />
                                                            <span className="text-sm font-medium text-gray-700">Contrato Principal</span>
                                                            <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs font-bold text-gray-600">
                                                                {getDocumentTypeLabel(contract.rutaArchivoContrato)}
                                                            </span>
                                                        </div>
                                                        <button
                                                            onClick={() => handleOpenDocument(contract.rutaArchivoContrato)}
                                                            className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors"
                                                        >
                                                            {getDocumentActionLabel(contract.rutaArchivoContrato)}
                                                        </button>
                                                    </div>

                                                    {contract.adjuntos?.map((adjunto) => (
                                                        <div key={adjunto.id} className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg">
                                                            <div className="flex items-center gap-2">
                                                                <DocumentTextIcon className={`w-5 h-5 ${isWordDocument(adjunto.nombreArchivo || adjunto.rutaArchivo) ? 'text-blue-600' : 'text-gray-600'}`} />
                                                                <span className="text-sm font-medium text-gray-700 truncate max-w-[120px]">
                                                                    {adjunto.nombreArchivo || 'Adjunto'}
                                                                </span>
                                                                <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs font-bold text-gray-600">
                                                                    {getDocumentTypeLabel(adjunto.nombreArchivo || adjunto.rutaArchivo)}
                                                                </span>
                                                            </div>
                                                            <button
                                                                onClick={() => handleOpenDocument(adjunto.rutaArchivo)}
                                                                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors"
                                                            >
                                                                {getDocumentActionLabel(adjunto.nombreArchivo || adjunto.rutaArchivo)}
                                                            </button>
                                                        </div>
                                                    ))}
	                                                </div>
	                                            </div>
                                            )}

	                                            {/* Observaciones */}
                                            {contract.observaciones && (
                                                <div>
                                                    <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wide mb-2">
                                                        Observaciones
                                                    </h4>
                                                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                                                        <p className="text-sm text-gray-600 italic">
                                                            "{contract.observaciones}"
                                                        </p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ) : activeTab === 'financial' ? (
                                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                                        {isLoadingHistory ? (
                                            <div className="flex flex-col items-center justify-center py-12">
                                                <ArrowPathIcon className="w-8 h-8 text-indigo-500 animate-spin mb-2" />
                                                <p className="text-sm text-gray-500">Cargando historial...</p>
                                            </div>
                                        ) : liquidaciones.length > 0 ? (
                                            <div className="space-y-4">
                                                {liquidaciones.map(liq => (
                                                    <div key={liq.id} className="border border-gray-100 rounded-xl p-4 hover:bg-gray-50/50 transition-colors">
                                                        <div className="flex justify-between items-start mb-3">
                                                            <div>
                                                                <p className="font-bold text-gray-900 capitalize">
                                                                    {new Date(liq.periodo).toLocaleDateString("es-AR", { month: "long", year: "numeric", timeZone: "UTC" })}
                                                                </p>
                                                                <p className="text-xs text-gray-500 mt-0.5">Liquidación #{liq.id}</p>
                                                            </div>
                                                            {getStatusBadge(liq.estado)}
                                                        </div>

                                                        <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                                                            <div>
                                                                <p className="text-xs text-gray-500">Neto a Cobrar</p>
                                                                <p className="font-bold text-gray-900">{formatMoney(Number(liq.netoACobrar), liq.moneda)}</p>
                                                            </div>
                                                            <div className="text-right">
                                                                <p className="text-xs text-gray-500">Pagado</p>
                                                                <p className="font-bold text-green-600">
                                                                    {formatMoney(liq.pagos?.reduce((sum, p) => sum + Number(p.monto), 0) || 0, liq.moneda)}
                                                                </p>
                                                            </div>
                                                        </div>

                                                        {liq.pagos && liq.pagos.length > 0 && (
                                                            <div className="bg-gray-50 rounded-lg p-2.5 space-y-2">
                                                                <p className="text-xs uppercase font-bold text-gray-600 tracking-wider">Detalle de Pagos</p>
                                                                {liq.pagos.map(pago => (
                                                                    <div key={pago.id} className="flex justify-between items-center text-xs">
                                                                        <div className="flex items-center gap-2">
                                                                            <span className="text-gray-600">{new Date(pago.fechaPago).toLocaleDateString("es-AR")}</span>
                                                                            <span className="bg-white border border-gray-200 px-1.5 py-0.5 rounded text-xs font-medium text-gray-500">{pago.metodoPago}</span>
                                                                        </div>
                                                                        <span className="font-bold text-gray-700">{formatMoney(Number(pago.monto), pago.moneda || liq.moneda)}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                                                <BanknotesIconSolid className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                                                <h3 className="text-sm font-medium text-gray-900">Sin historial financiero</h3>
                                                <p className="text-xs text-gray-500 mt-1">Este contrato aún no tiene liquidaciones generadas.</p>
                                            </div>
                                        )}
                                    </div>
                                ) : activeTab === 'cuotas' ? (
                                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                                        <div className="flex justify-between items-center mb-4">
                                            <h4 className="text-sm font-bold text-gray-900 uppercase tracking-widest">Planes Activos</h4>
                                            {canEditLiquidations && (
                                                <button
                                                    onClick={() => setIsNewPlanModalOpen(true)}
                                                    className="text-xs font-bold bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 transition-all flex items-center gap-1.5"
                                                >
                                                    + Nuevo Plan
                                                </button>
                                            )}
                                        </div>

                                        {isLoadingCuotas ? (
                                            <div className="flex justify-center py-12">
                                                <ArrowPathIcon className="w-8 h-8 text-indigo-500 animate-spin" />
                                            </div>
                                        ) : planesCuotas.length > 0 ? (
                                            <div className="space-y-4">
                                                {planesCuotas.map(plan => (
                                                    <div key={plan.id} className="bg-gray-50/50 rounded-xl border border-gray-100 p-4">
                                                        <div className="flex justify-between items-start mb-3">
                                                            <div>
                                                                <h5 className="font-bold text-gray-900">{plan.concepto}</h5>
                                                                <p className="text-xs text-gray-500 uppercase tracking-widest">
                                                                    ID Plan: #{plan.id} • {plan.tipoMovimiento === 'INGRESO' ? 'Paga Inquilino' : 'Descuento Dueño'}
                                                                    {plan.tipoMovimiento === 'INGRESO' && (
                                                                        <span className={`ml-2 px-1.5 py-0.5 rounded text-[8px] font-bold uppercase ${plan.esParaInmobiliaria ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                                                                            {plan.esParaInmobiliaria ? 'Para Inmobiliaria' : 'Para Propietario'}
                                                                        </span>
                                                                    )}
                                                                </p>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-sm font-black text-gray-900">{formatMoney(Number(plan.montoTotal), plan.moneda)}</span>
                                                                {canEditLiquidations && (
                                                                    <button
                                                                        onClick={() => handleDeletePlan(plan.id)}
                                                                        className="text-gray-600 hover:text-red-500 transition-colors"
                                                                        title="Eliminar"
                                                                    >
                                                                        <TrashIcon className="w-4 h-4" />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* Cuotas list */}
                                                        <div className="bg-white rounded-lg border border-gray-100 divide-y divide-gray-50">
                                                            {plan.cuotas?.map(cuota => (
                                                                <div key={cuota.id} className="p-2 flex justify-between items-center px-4">
                                                                    <div className="flex items-center gap-3">
                                                                        <span className="text-xs font-bold text-gray-600">#{cuota.numeroCuota}</span>
                                                                        <span className="text-sm text-gray-700 font-medium">{formatMoney(Number(cuota.monto), cuota.moneda || plan.moneda)}</span>
                                                                    </div>
                                                                    <div className="flex items-center gap-3">
                                                                        {cuota.liquidacion ? (
                                                                            <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded cursor-help" title={`En liquidación ${cuota.liquidacion.id}`}>
                                                                                En Liq. {new Date(cuota.liquidacion.periodo).toLocaleDateString("es-AR", { month: "short", year: "2-digit", timeZone: "UTC" }).replace('.', '')}
                                                                            </span>
                                                                        ) : (
                                                                            <span className="text-xs font-bold text-gray-600 bg-gray-100 px-2 py-0.5 rounded uppercase">Pendiente</span>
                                                                        )}
                                                                        {cuota.estado === 'PAGADA' ? (
                                                                            <span className="bg-green-50 text-green-700 text-xs font-bold px-1.5 py-0.5 rounded">PAGADA</span>
                                                                        ) : null}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                                                <BanknotesIconSolid className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                                                <h3 className="text-sm font-medium text-gray-900">No hay planes de cuotas</h3>
                                                <p className="text-xs text-gray-500 mt-1">Carga préstamos o acuerdos para que se cobren en las liquidaciones.</p>
                                            </div>
                                        )}
                                    </div>
                                ) : activeTab === 'audit' ? (
                                    <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                                                <p className="text-xs font-bold uppercase tracking-wider text-gray-600">Creado por</p>
                                                <p className="text-sm font-semibold text-gray-800">{contract.creadoPor?.nombreCompleto || "Sin dato"}</p>
	                                            </div>
	                                            <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                                                <p className="text-xs font-bold uppercase tracking-wider text-gray-600">Última modificación</p>
                                                <p className="text-sm font-semibold text-gray-800">{contract.actualizadoPor?.nombreCompleto || "Sin dato"}</p>
                                            </div>
                                        </div>
                                        <AuditTrail logs={contract.auditLogs} emptyText="Este contrato todavía no tiene eventos de auditoría." />
                                    </div>
                                ) : null}

                                <div className="mt-8 flex flex-col gap-3 pt-6 border-t border-gray-100 sm:flex-row sm:items-center sm:justify-between">
                                    {canDeleteContracts ? (
                                        <button
                                            onClick={() => onDelete(contract.id)}
                                            className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-red-50 px-4 text-sm font-medium text-red-600 hover:text-red-800 transition-colors sm:bg-transparent"
                                        >
                                            <TrashIcon className="w-5 h-5" />
                                            Mover a papelera
                                        </button>
                                    ) : <span />}
                                    <button
                                        type="button"
                                        className="min-h-11 px-6 py-2 text-sm font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-all shadow-md shadow-indigo-100"
                                        onClick={onClose}
                                    >
                                        Cerrar
                                    </button>
                                </div>
                                </div>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition >
        {canEditLiquidations && (
            <NewPlanCuotasModal
                isOpen={isNewPlanModalOpen}
                onClose={() => setIsNewPlanModalOpen(false)}
                contratoId={contract.id}
                onSuccess={loadPlanesCuotas}
                moneda={contract.moneda}
            />
        )}
        </>
    );
}

