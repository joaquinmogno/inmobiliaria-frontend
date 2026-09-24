import { XMarkIcon } from '@heroicons/react/24/outline';

export type ActiveFilterChip = {
  key: string;
  label: string;
  onRemove: () => void;
};

interface Props {
  filters: ActiveFilterChip[];
  onClearAll?: () => void;
}

/** Makes the state represented by the URL explicit and removable one filter at a time. */
export default function ActiveFilterChips({ filters, onClearAll }: Props) {
  if (!filters.length) return null;

  return <div className="flex flex-wrap items-center gap-2" aria-label="Filtros activos">
    <span className="text-xs font-bold uppercase tracking-wide text-gray-600">Vista actual:</span>
    {filters.map(filter => <button
      key={filter.key}
      type="button"
      onClick={filter.onRemove}
      className="inline-flex min-h-9 items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50 px-3 text-xs font-bold text-indigo-900 hover:bg-indigo-100"
      aria-label={`Quitar filtro ${filter.label}`}
    >
      {filter.label}<XMarkIcon className="h-4 w-4" aria-hidden="true" />
    </button>)}
    {filters.length > 1 && onClearAll && <button type="button" onClick={onClearAll} className="min-h-9 rounded-full px-3 text-xs font-bold text-gray-700 hover:bg-gray-100">Quitar filtros</button>}
  </div>;
}
