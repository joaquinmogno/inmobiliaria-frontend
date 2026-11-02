import { ChevronDownIcon, MagnifyingGlassIcon, AdjustmentsHorizontalIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { useId, useState, type ReactNode } from "react";

interface Props {
  query: string;
  onQueryChange: (value: string) => void;
  onClear: () => void;
  resultCount?: number;
  resultCountLabel?: { singular: string; plural: string };
  placeholder?: string;
  children?: ReactNode;
  filters?: ReactNode;
  collapsibleOnMobile?: boolean;
  activeFilterCount?: number;
  searchLabel?: string;
  searchMaxLength?: number;
  context?: ReactNode;
}

export function readPersistedFilter(key: string, fallback = "") {
  return sessionStorage.getItem(`filters:${key}`) ?? fallback;
}

export function persistFilter(key: string, value: string) {
  if (value) sessionStorage.setItem(`filters:${key}`, value);
  else sessionStorage.removeItem(`filters:${key}`);
}

export default function FilterBar({ query, onQueryChange, onClear, resultCount, resultCountLabel, placeholder = "Buscar...", children, filters, collapsibleOnMobile = false, activeFilterCount = 0, searchLabel = 'Buscar', searchMaxLength, context }: Props) {
  const [expanded, setExpanded] = useState(false);
  const filtersId = useId();
  const hasFilters = Boolean(query) || Boolean(children) || Boolean(filters);
  const search = <label className="relative block min-w-0 flex-1"><span className="sr-only">{searchLabel}</span><MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-600" /><input type="search" maxLength={searchMaxLength} value={query} onChange={event => onQueryChange(event.target.value)} placeholder={placeholder} className="ui-field pl-10" /></label>;
  const clear = <button type="button" onClick={onClear} className="ui-button ui-button-ghost"><XMarkIcon className="h-5 w-5" aria-hidden="true" />Limpiar todo</button>;
  return <section className="ui-panel p-4" aria-label="Filtros del listado">
    {collapsibleOnMobile ? <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {search}
        <button type="button" aria-expanded={expanded} aria-controls={filtersId} onClick={() => setExpanded(value => !value)} className="ui-button ui-button-secondary md:hidden">
          <AdjustmentsHorizontalIcon className="h-5 w-5" aria-hidden="true" />Filtros{activeFilterCount > 0 && ` · ${activeFilterCount} ${activeFilterCount === 1 ? 'activo' : 'activos'}`}<ChevronDownIcon className={`ml-auto h-4 w-4 transition-transform ${expanded ? 'rotate-180' : ''}`} aria-hidden="true" />
        </button>
        {(query || activeFilterCount > 0) && <div className="hidden md:block">{clear}</div>}
      </div>
      {context && <p className="mt-3 text-sm text-slate-600">{context}</p>}
      <div id={filtersId} className={`${expanded ? 'block' : 'hidden'} space-y-3 border-t border-slate-100 pt-4 mt-4 md:block`}>
        {filters}{children}
        {(query || activeFilterCount > 0) && <div className="md:hidden">{clear}</div>}
      </div>
    </> : <>
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
      {search}
      {children && <div className="flex flex-wrap items-center gap-3">{children}</div>}
      {hasFilters && clear}
    </div>
    {filters && <div className="mt-4 space-y-3 border-t border-slate-100 pt-4">{filters}</div>}
    </>}
    {resultCount !== undefined && <p className="mt-3 text-sm text-gray-600" aria-live="polite">{resultCount} {resultCount === 1 ? (resultCountLabel?.singular || "resultado") : (resultCountLabel?.plural || "resultados")}</p>}
  </section>;
}
