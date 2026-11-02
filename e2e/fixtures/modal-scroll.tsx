import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider, useAuth } from '../../src/context/AuthContext';
import MovimientoModal from '../../src/components/MovimientoModal';
import UpdateContractModal from '../../src/components/UpdateContractModal';
import NewPlanCuotasModal from '../../src/components/NewPlanCuotasModal';
import HonorariosModal from '../../src/components/HonorariosModal';
import ReversalModal from '../../src/components/ReversalModal';
import PlanLifecycleModal from '../../src/components/PlanLifecycleModal';
import LiquidationAdjustmentModal from '../../src/components/LiquidationAdjustmentModal';
import LiquidationContractModal from '../../src/components/LiquidationContractModal';
import ExceptionReviewDialog from '../../src/features/liquidations/ExceptionReviewDialog';
import PersonDetailsModal from '../../src/components/PersonDetailsModal';
import TenantCreditApplicationModal from '../../src/components/TenantCreditApplicationModal';
import ConfirmationModal from '../../src/components/ConfirmationModal';
import ReauthenticationDialog from '../../src/components/ReauthenticationDialog';
import PaymentModal from '../../src/components/PaymentModal';
import OwnerPaymentModal from '../../src/components/OwnerPaymentModal';
import NewContractModal from '../../src/components/NewContractModal';
import ContractDetailsModal from '../../src/components/ContractDetailsModal';
import NewLiquidationModal from '../../src/components/NewLiquidationModal';
import RoleEditorDialog from '../../src/components/RoleEditorDialog';
import InternalMovementModal from '../../src/features/internal-control/InternalMovementModal';
import { InternalCancelModal, InternalReceiptsModal } from '../../src/features/internal-control/InternalRecordDialogs';
import LiquidationTermsModal from '../../src/features/liquidations/LiquidationTermsModal';
import LiquidationNoteModal from '../../src/features/liquidations/LiquidationNoteModal';
import UserProfileModal from '../../src/components/UserProfileModal';
import Usuarios from '../../src/pages/Usuarios';
import Personas from '../../src/pages/Personas';
import CajaChica from '../../src/pages/CajaChica';
import OperationalAlertsPanel from '../../src/components/OperationalAlertsPanel';
import type { Contract } from '../../src/services/contracts.service';
import type { Liquidacion } from '../../src/services/liquidaciones.service';
import type { Persona } from '../../src/services/personas.service';
import type { InternalMovement } from '../../src/services/control-interno.service';
import '../../src/index.css';

export const sampleContract = {
    id: 1, version: 1, estado: 'ACTIVO', contratoAnteriorId: null, historialRenovaciones: [],
    fechaInicio: '2026-01-01', fechaFin: '2027-12-31', fechaProximaActualizacion: '2026-10-01',
    frecuenciaActualizacionMeses: 3, montoAlquiler: 500000, montoHonorarios: 25000, porcentajeHonorarios: 5,
    moneda: 'ARS', diaVencimiento: 10, pagaHonorarios: 'PROPIETARIO', administrado: true, requiereActualizacion: true,
    modalidadCobroInquilino: 'EFECTIVO', modalidadPagoPropietario: 'EFECTIVO', serviciosGastos: [],
    observaciones: 'Observaciones de prueba. '.repeat(60),
    propiedad: { id: 1, direccion: 'Inmueble de prueba', piso: '3', departamento: 'B' },
    propietarios: [{ id: 1, esPrincipal: true, persona: { id: 1, nombreCompleto: 'Propietario de prueba', telefono: null } }],
    inquilinos: [{ id: 2, esPrincipal: true, persona: { id: 2, nombreCompleto: 'Inquilino de prueba', telefono: null } }],
    adjuntos: [], actualizaciones: [], auditLogs: []
} as unknown as Contract;

const sampleLiquidation = {
    id: 1, version: 1, contratoId: 1, contrato: sampleContract, periodo: '2026-10-01', moneda: 'ARS',
    montoAlquilerBase: 500000, porcentajeHonorarios: 5, montoHonorarios: 25000, montoPropietario: 475000,
    pagaHonorarios: 'PROPIETARIO'
} as Liquidacion;
const sampleMovement = {
    id: 1, version: 1, fecha: '2026-10-01', tipo: 'GASTO', detalle: 'Gasto de prueba', monto: '12345.50', moneda: 'ARS',
    categoria: 'Servicios', metodoPago: null, observaciones: 'Observaciones', anuladoEn: null,
    fechaCreacion: '2026-10-01T12:00:00Z', creadoPor: { id: 1, nombreCompleto: 'Usuario de prueba' },
    adjuntos: Array.from({ length: 12 }, (_, index) => ({ id: index + 1, nombreArchivo: `comprobante-${index + 1}.pdf`, tamano: 1024, fechaCreacion: '2026-10-01T12:00:00Z', creadoPor: { id: 1, nombreCompleto: 'Usuario de prueba' } }))
} as InternalMovement;
const noop = () => {};
const done = async () => {};

function Harness() {
    const { loading } = useAuth();
    const [open, setOpen] = useState(true);
    const close = () => setOpen(false);
    const common = { isOpen: open, onClose: close, onSave: noop };
    if (loading) return <p>Cargando prueba…</p>;
    if (!open) return <p data-testid="modal-closed">Ventana cerrada</p>;
    const modal = new URLSearchParams(location.search).get('modal');
    switch (modal) {
        case 'movement': return <MovimientoModal {...common} />;
        case 'liquidation-note': return <LiquidationNoteModal confirmed onClose={close} onSave={async () => true} />;
        case 'update': return <UpdateContractModal {...common} contract={sampleContract} onUpdate={noop} />;
        case 'installments': return <NewPlanCuotasModal {...common} contratoId={1} onSuccess={noop} />;
        case 'fees': return <HonorariosModal {...common} currentMonto={25000} currentPorcentaje={5} />;
        case 'reversal': return <ReversalModal {...common} title="Anular movimiento" description={'Motivo y consecuencias de la anulación. '.repeat(12)} onConfirm={done} />;
        case 'lifecycle': return <PlanLifecycleModal {...common} plan={{ id: 1, concepto: 'Acuerdo de prueba', montoTotal: 50000, cuotas: [] } as any} action="REPROGRAMAR" onConfirm={done} />;
        case 'adjustment': return <LiquidationAdjustmentModal {...common} moneda="ARS" tenantTotal={500000} tenantPaid={500000} debtTargets={[]} />;
        case 'liquidation-contract': return <LiquidationContractModal contractId={1} onClose={close} />;
        case 'exception': return <ExceptionReviewDialog row={{ contratoId: 1, propiedad: sampleContract.propiedad, problemas: Array.from({ length: 12 }, (_, index) => ({ codigo: String(index), mensaje: `Observación de prueba ${index}`, accion: 'REVISAR_CONTRATO' })), cuotasVencidas: [] } as any} busy={false} canCreate onClose={close} onGenerate={done} onDismiss={done} />;
        case 'person-details': return <PersonDetailsModal {...common} person={{ id: 1, nombreCompleto: 'Persona de prueba', estado: 'ACTIVO', roles: [] } as unknown as Persona} canEdit onEdit={noop} />;
        case 'tenant-credit': return <TenantCreditApplicationModal {...common} onApply={noop} creditId={1} saldo={10000} moneda="ARS" debtTargets={[]} />;
        case 'confirmation': return <ConfirmationModal {...common} title="Confirmar operación" message={'Descripción de la operación. '.repeat(35)} onConfirm={noop} />;
        case 'reauthentication': return <><button onClick={() => window.dispatchEvent(new Event('reauthentication-required'))}>Abrir popup</button><ReauthenticationDialog /></>;
        case 'tenant-payment': return <PaymentModal {...common} suggestedAmount={500000} installments={Array.from({ length: 8 }, (_, index) => ({ id: index + 1, numeroCuota: index + 1, concepto: `Cuota ${index + 1}`, saldo: 1000, total: 1000 }))} />;
        case 'owner-payment': return <OwnerPaymentModal {...common} owner={{ id: 1, nombreCompleto: 'Propietario de prueba' }} suggestedAmount={475000} disponibleCobrado={475000} />;
        case 'new-contract': return <NewContractModal {...common} />;
        case 'contract-details': return <ContractDetailsModal {...common} contract={sampleContract} onDelete={noop} />;
        case 'new-liquidation': return <NewLiquidationModal {...common} contracts={[sampleContract]} />;
        case 'role': return <RoleEditorDialog open editingRole={null} form={{ nombre: '', descripcion: '', permisos: [] }} groups={Array.from({ length: 12 }, (_, index) => ({ title: `Módulo ${index + 1}`, permissions: [] }))} error="" submitting={false} onClose={close} onFormChange={noop} onTogglePermission={noop} onSetGroupPermissions={noop} onSubmit={noop} />;
        case 'internal-movement': return <InternalMovementModal record={null} period="2026-10" options={{ categorias: [], mediosPago: [], usuarios: [] }} close={close} saved={noop} />;
        case 'internal-receipts': return <InternalReceiptsModal record={sampleMovement} canEdit close={close} changed={noop} />;
        case 'internal-cancel': return <InternalCancelModal record={sampleMovement} close={close} changed={noop} />;
        case 'rent': case 'terms-fees': return <LiquidationTermsModal mode={modal === 'rent' ? 'ALQUILER' : 'HONORARIOS'} liquidacion={sampleLiquidation} canEditContracts onClose={close} onSaveRent={async () => true} onSaveFees={async () => true} />;
        case 'profile': return <UserProfileModal isOpen onClose={close} user={{ email: 'admin@test.local' }} />;
        case 'user-create': case 'user-reset': return <Usuarios />;
        case 'person-create': return <Personas />;
        case 'cash-create': case 'cash-transfer': case 'cash-receipts': return <CajaChica />;
        case 'operational-alert': return <OperationalAlertsPanel />;
        default: return <p>Ventana desconocida</p>;
    }
}

createRoot(document.getElementById('root')!).render(<BrowserRouter><AuthProvider><Harness /></AuthProvider></BrowserRouter>);
