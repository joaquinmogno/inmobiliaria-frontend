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
  toolbar?: ReactNode;
  collapsibleOnMobile?: boolean;
  collapsibleOnDesktop?: boolean;
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

export default function FilterBar({ query, onQueryChange, onClear, resultCount, resultCountLabel, placeholder = "Buscar...", children, filters, toolbar, collapsibleOnMobile = false, collapsibleOnDesktop = false, activeFilterCount = 0, searchLabel = 'Buscar', searchMaxLength, context }: Props) {
  const [expanded, setExpanded] = useState(false);
  const filtersId = useId();
  const hasFilters = Boolean(query) || Boolean(children) || Boolean(filters);
  const search = <label className="relative block min-w-0 flex-1 sm:flex-[1_1_20rem]"><span className="sr-only">{searchLabel}</span><MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-600" /><input type="search" maxLength={searchMaxLength} value={query} onChange={event => onQueryChange(event.target.value)} placeholder={placeholder} className="ui-field pl-10" /></label>;
  const clear = <button type="button" onClick={onClear} className="ui-button ui-button-ghost"><XMarkIcon className="h-5 w-5" aria-hidden="true" />Limpiar todo</button>;
  return <section className="ui-panel p-3" aria-label="Filtros del listado">
    {(collapsibleOnMobile || collapsibleOnDesktop) ? <>
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        {search}
        {toolbar}
        <button type="button" aria-expanded={expanded} aria-controls={filtersId} onClick={() => setExpanded(value => !value)} className={`ui-button ui-button-secondary ${collapsibleOnDesktop ? "" : "md:hidden"}`}>
          <AdjustmentsHorizontalIcon className="h-5 w-5" aria-hidden="true" />Filtros{activeFilterCount > 0 && ` · ${activeFilterCount} ${activeFilterCount === 1 ? 'activo' : 'activos'}`}<ChevronDownIcon className={`ml-auto h-4 w-4 transition-transform ${expanded ? 'rotate-180' : ''}`} aria-hidden="true" />
        </button>
        {(query || activeFilterCount > 0) && <div className="hidden md:block">{clear}</div>}
      </div>
      <div id={filtersId} className={`${expanded ? 'block' : 'hidden'} space-y-3 border-t border-slate-100 pt-3 mt-3 ${collapsibleOnDesktop ? '' : 'md:block'}`}>
        {filters}{children}
        {(query || activeFilterCount > 0) && <div className="md:hidden">{clear}</div>}
      </div>
    </> : <>
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
      {search}
      {toolbar}
      {children && <div className="flex min-w-0 flex-wrap items-center gap-2">{children}</div>}
      {hasFilters && clear}
    </div>
    {filters && <div className="mt-3 space-y-3 border-t border-slate-100 pt-3">{filters}</div>}
    </>}
    {(context || resultCount !== undefined) && <div className="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-sm text-gray-600">
      {context && <p>{context}</p>}
      {resultCount !== undefined && <p aria-live="polite">{resultCount} {resultCount === 1 ? (resultCountLabel?.singular || "resultado") : (resultCountLabel?.plural || "resultados")}</p>}
    </div>}
  </section>;
}
