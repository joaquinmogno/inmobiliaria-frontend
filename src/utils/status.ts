const STATUS_LABELS: Record<string, string> = {
  ACTIVO: 'Activo',
  ALQUILADO: 'En alquiler',
  BORRADOR: 'Borrador',
  CONFIRMADA: 'Confirmada',
  CANCELADO: 'Cancelado',
  ANULADA: 'Anulada',
  DISPONIBLE: 'Disponible',
  FALLIDO: 'Fallido',
  FINALIZADO: 'Finalizado',
  INACTIVO: 'Inactivo',
  LIQUIDADA: 'Finalizada',
  PAGADA_POR_INQUILINO: 'Cobrada al inquilino',
  PAPELERA: 'En papelera',
  PENDIENTE_PAGO: 'Pendiente de cobro',
  PROGRAMADO: 'Programado',
  RESCINDIDO: 'Rescindido',
};

const PROPERTY_TYPE_LABELS: Record<string, string> = {
  CASA: 'Casa',
  DEPARTAMENTO: 'Departamento',
  LOCAL: 'Local',
};

const humanizeCode = (value: string) => value
  .toLocaleLowerCase('es-AR')
  .replace(/_/g, ' ')
  .replace(/^./, letter => letter.toLocaleUpperCase('es-AR'));

export function getStatusLabel(status: string | null | undefined) {
  if (!status) return 'Sin estado';
  return STATUS_LABELS[status] || humanizeCode(status);
}

export function getPropertyTypeLabel(type: string | null | undefined) {
  if (!type) return 'Sin tipo';
  return PROPERTY_TYPE_LABELS[type] || humanizeCode(type);
}
