import { InboxIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';

interface Props {
  filtered: boolean;
  title: string;
  description: string;
  onClear: () => void;
  action?: { label: string; onClick: () => void };
}

export default function EmptyState({ filtered, title, description, onClear, action }: Props) {
  const Icon = filtered ? MagnifyingGlassIcon : InboxIcon;
  return <div className="px-4 py-10 text-center">
    <Icon className="mx-auto mb-3 h-9 w-9 text-slate-400" aria-hidden="true" />
    <p className="font-semibold text-slate-800">{filtered ? 'No hay resultados con estos filtros' : title}</p>
    <p className="mx-auto mt-2 max-w-md text-sm text-slate-600">{filtered ? 'Probá otra búsqueda o limpiá los filtros para ver los registros disponibles.' : description}</p>
    {filtered ? <button type="button" onClick={onClear} className="ui-button ui-button-secondary mt-4">Limpiar filtros</button>
      : action && <button type="button" onClick={action.onClick} className="ui-button ui-button-primary mt-4">{action.label}</button>}
  </div>;
}
