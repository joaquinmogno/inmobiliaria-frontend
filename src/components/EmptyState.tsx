import { InboxIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';

interface Props {
  filtered: boolean;
  title: string;
  onClear: () => void;
  action?: { label: string; onClick: () => void };
}

export default function EmptyState({ filtered, title, onClear, action }: Props) {
  const Icon = filtered ? MagnifyingGlassIcon : InboxIcon;
  return <div className="px-4 py-8 text-center" role="status">
    <Icon className="mx-auto mb-3 h-8 w-8 text-slate-400" aria-hidden="true" />
    <p className="font-semibold text-slate-800">{filtered ? 'No hay resultados con estos filtros' : title}</p>
    {filtered ? <button type="button" onClick={onClear} className="ui-button ui-button-secondary mt-4">Limpiar filtros</button>
      : action && <button type="button" onClick={action.onClick} className="ui-button ui-button-primary mt-4">{action.label}</button>}
  </div>;
}
