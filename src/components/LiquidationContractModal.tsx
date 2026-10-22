import { useEffect, useState } from 'react';
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import { contractsService, type Contract } from '../services/contracts.service';
import { openAuthenticatedFile } from '../services/api';
import { getDocumentActionLabel } from '../utils/documentFiles';
import { formatCurrency } from '../utils/currency';
import { formatDate } from '../utils/date';
import { useAuth } from '../context/AuthContext';
import { hasPermission } from '../utils/permissions';

type Props = { contractId: number | null; onClose: () => void };

export default function LiquidationContractModal({ contractId, onClose }: Props) {
    const { user } = useAuth();
    const canViewFiles = hasPermission(user, 'contratos.archivos.ver');
    const [selectedId, setSelectedId] = useState<number | null>(contractId);
    const [contract, setContract] = useState<Contract | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => { setSelectedId(contractId); setContract(null); setError(''); }, [contractId]);
    useEffect(() => {
        if (!selectedId || !contractId) return;
        let active = true;
        setLoading(true); setError('');
        contractsService.getById(selectedId)
            .then(value => { if (active) setContract(value); })
            .catch(err => { if (active) setError(err instanceof Error ? err.message : 'No se pudo abrir el contrato'); })
            .finally(() => { if (active) setLoading(false); });
        return () => { active = false; };
    }, [selectedId, contractId]);

    const openDocument = async (path: string) => {
        try { await openAuthenticatedFile(path); }
        catch (err) { setError(err instanceof Error ? err.message : 'No se pudo abrir el documento'); }
    };

    return <Dialog open={contractId !== null} onClose={onClose} className="relative z-50">
        <div className="fixed inset-0 bg-gray-950/55" aria-hidden="true" />
        <div className="fixed inset-0 overflow-y-auto p-4 sm:p-8">
            <div className="flex min-h-full items-center justify-center">
                <DialogPanel className="w-full max-w-3xl space-y-5 rounded-2xl bg-white p-5 shadow-xl sm:p-7">
                    <div className="flex items-start justify-between gap-4">
                        <div><DialogTitle className="text-xl font-bold text-gray-950">Ver contrato de la liquidación</DialogTitle>
                            <p className="mt-1 text-sm text-gray-600">Contrato #{contractId} · se abre el documento asociado a este período, aunque luego haya una renovación u otro inquilino.</p></div>
                        <button type="button" onClick={onClose} className="rounded-lg border px-3 py-2 text-sm font-semibold">Cerrar</button>
                    </div>
                    {loading && <p className="text-sm text-gray-600">Cargando contrato…</p>}
                    {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
                    {!loading && contract && <>
                        <div className="grid gap-3 rounded-xl bg-indigo-50 p-4 text-sm sm:grid-cols-2">
                            <p><strong>Inmueble:</strong> {contract.propiedad.direccion}{contract.propiedad.piso ? ` · Piso ${contract.propiedad.piso}` : ''}{contract.propiedad.departamento ? ` · ${contract.propiedad.departamento}` : ''}</p>
                            <p><strong>Contrato:</strong> #{contract.id}{contract.id === contractId ? ' · corresponde a esta liquidación' : ''}</p>
                            <p><strong>Inquilino:</strong> {contract.inquilinos.map(item => item.persona.nombreCompleto).join(', ')}</p>
                            <p><strong>Propietario:</strong> {contract.propietarios.map(item => item.persona.nombreCompleto).join(', ')}</p>
                            <p><strong>Inicio:</strong> {formatDate(contract.fechaInicio)}</p>
                            <p><strong>Fin:</strong> {formatDate(contract.fechaFin)}</p>
                            <p><strong>Alquiler registrado:</strong> {formatCurrency(Number(contract.montoAlquiler), contract.moneda)}</p>
                            <p><strong>Próxima actualización:</strong> {contract.requiereActualizacion ? formatDate(contract.fechaProximaActualizacion) : 'No programada'}</p>
                            <p><strong>Frecuencia:</strong> {contract.requiereActualizacion ? (contract.frecuenciaActualizacionMeses ? `Cada ${contract.frecuenciaActualizacionMeses} meses` : 'Pendiente de configurar') : 'No aplica'}</p>
                            <p><strong>Condición de actualización:</strong> {contract.requiereActualizacion ? (contract.tipoAjuste || 'Actualización manual') : 'Sin actualización programada'}</p>
                        </div>
                        <p className="text-xs text-gray-600">El alquiler registrado es el valor actual del contrato; el comprobante de cada mes conserva el importe aplicado en ese período.</p>
                        {canViewFiles && (contract.rutaArchivoContrato ? <button type="button" onClick={() => void openDocument(contract.rutaArchivoContrato!)} className="rounded-lg bg-indigo-700 px-4 py-2 text-sm font-bold text-white">{getDocumentActionLabel(contract.rutaArchivoContrato)} contrato completo</button> : <p className="text-sm text-gray-600">No hay un documento de contrato cargado.</p>)}
                        {(contract.historialRenovaciones || []).length > 1 && <section>
                            <h3 className="font-bold text-gray-900">Contrato vigente e historial de renovaciones</h3>
                            <div className="mt-2 space-y-2">{contract.historialRenovaciones?.map(item => <button key={item.id} type="button" onClick={() => { setSelectedId(item.id); setContract(null); }} disabled={loading || item.id === contract.id} className="flex w-full flex-wrap justify-between gap-2 rounded-lg border border-gray-200 p-3 text-left text-sm hover:bg-gray-50 disabled:bg-indigo-50">
                                <span><strong>Contrato #{item.id}</strong>{item.id === contractId ? ' · de esta liquidación' : ''} · {item.inquilinoPrincipal || 'Sin inquilino principal'}</span>
                                <span>{formatDate(item.fechaInicio)}–{formatDate(item.fechaFin)} · {item.estado}</span>
                            </button>)}</div>
                        </section>}
                    </>}
                </DialogPanel>
            </div>
        </div>
    </Dialog>;
}
