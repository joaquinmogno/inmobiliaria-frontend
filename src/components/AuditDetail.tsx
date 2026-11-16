import { formatDate, formatDateTime, formatMonthYear } from '../utils/date';

const fieldLabel = (field: string) => ({ fecha: 'Fecha', fechaPago: 'Fecha de pago', fechaVencimiento: 'Vencimiento', fechaCreacion: 'Fecha de carga', monto: 'Importe', moneda: 'Moneda', motivo: 'Motivo', detalle: 'Detalle', observaciones: 'Observaciones' }[field]
  || field.replace(/([a-z])([A-Z])/g, '$1 $2').replaceAll('_', ' '));

const civilDateFields = new Set(['fecha', 'fechaPago', 'fechaInicio', 'fechaFin', 'fechaVencimiento', 'fechaVigencia', 'fechaRescision', 'fechaEntregaLlaves', 'fechaDocumento', 'fechaProximaActualizacion', 'fechaProximaAnterior', 'fechaProximaNueva', 'proximaRevision']);

function valueLabel(value: unknown, field = ''): string {
  if (value === null || value === undefined || value === '') return 'Sin dato';
  if (typeof value === 'boolean') return value ? 'Sí' : 'No';
  if (typeof value === 'object') return JSON.stringify(value);
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}(?:$|T)/.test(value)) {
    if (field === 'periodo') return formatMonthYear(value);
    if (civilDateFields.has(field)) return formatDate(value);
  }
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return formatDate(value);
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(value)) return `${formatDateTime(value)} (Buenos Aires)`;
  return String(value);
}

export default function AuditDetail({ detail }: { detail?: string | null }) {
  if (!detail) return <span>Sin detalle adicional</span>;
  let parsed: unknown;
  try { parsed = JSON.parse(detail); } catch { return <span className="[overflow-wrap:anywhere]">{detail}</span>; }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return <span className="[overflow-wrap:anywhere]">{valueLabel(parsed)}</span>;
  return <div className="min-w-0 space-y-2 [overflow-wrap:anywhere]">
    <dl className="space-y-2">{Object.entries(parsed).map(([field, value]) => {
      const change = value && typeof value === 'object' && 'anterior' in value && 'nuevo' in value ? value : null;
      return <div key={field}><dt className="font-semibold capitalize">{fieldLabel(field)}</dt><dd>{change ? <><span className="block">Antes: {valueLabel(change.anterior, field)}</span><span className="block">Después: {valueLabel(change.nuevo, field)}</span></> : valueLabel(value, field)}</dd></div>;
    })}</dl>
    <details><summary className="min-h-11 cursor-pointer py-3 text-xs font-semibold">Ver datos originales</summary><pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-lg bg-gray-50 p-3 text-xs">{JSON.stringify(parsed, null, 2)}</pre></details>
  </div>;
}
