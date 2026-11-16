import type { EstadoLiquidacion, EstadoCobroInquilino, EstadoPagoPropietario } from '../../services/liquidaciones.service';
import { formatDateTime } from '../../utils/date';
import { getLiquidationStatusLabel } from './liquidation-detail.model';

interface Props {
  documentState?: EstadoLiquidacion | null;
  tenantState?: EstadoCobroInquilino | null;
  ownerState?: EstadoPagoPropietario | null;
  closedAt?: string | null;
  closedById?: number | null;
  className?: string;
}

const paymentLabels = { PENDIENTE: 'Pendiente', PARCIAL: 'Parcial', COBRADO: 'Cobrado', PAGADO: 'Pagado', NO_APLICA: 'Sin saldo' };

export default function LiquidationStates({ documentState, tenantState, ownerState, closedAt, closedById, className = '' }: Props) {
  const notStarted = documentState === null || documentState === 'BORRADOR';
  const closure = closedAt || closedById ? `Registrado${closedAt ? ` · ${formatDateTime(closedAt)}` : ''}`
    : documentState === null ? 'No aplica'
    : closedAt === undefined && closedById === undefined ? 'No informado' : 'Sin registro';
  const states = [
    ['Documento', documentState === null ? 'Sin emitir' : documentState ? getLiquidationStatusLabel(documentState) : 'No informado'],
    ['Cobro inquilino', notStarted ? 'No iniciado' : tenantState ? paymentLabels[tenantState] : 'No informado'],
    ['Pago propietario', notStarted ? 'No iniciado' : ownerState ? paymentLabels[ownerState] : 'No informado'],
    ['Cierre administrativo', closure],
  ];
  return <span data-testid="liquidation-states" className={`flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-700 ${className}`}>
    {states.map(([label, value]) => <span key={label}><span className="font-semibold">{label}:</span> {value}</span>)}
  </span>;
}
