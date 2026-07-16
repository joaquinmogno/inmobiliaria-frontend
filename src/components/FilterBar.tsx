import { MagnifyingGlassIcon, XMarkIcon } from "@heroicons/react/24/outline";
import type { ReactNode } from "react";

interface Props {
  query: string;
  onQueryChange: (value: string) => void;
  onClear: () => void;
  resultCount?: number;
  placeholder?: string;
  children?: ReactNode;
}

export function readPersistedFilter(key: string, fallback = "") {
  return sessionStorage.getItem(`filters:${key}`) ?? fallback;
}

export function persistFilter(key: string, value: string) {
  if (value) sessionStorage.setItem(`filters:${key}`, value);
  else sessionStorage.removeItem(`filters:${key}`);
}

export default function FilterBar({ query, onQueryChange, onClear, resultCount, placeholder = "Buscar...", children }: Props) {
  const hasFilters = Boolean(query) || Boolean(children);
  return <section className="rounded-lg border border-gray-200 bg-white p-4" aria-label="Filtros del listado">
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
      <label className="relative min-w-0 flex-1"><span className="sr-only">Buscar</span><MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-600" /><input type="search" value={query} onChange={event => onQueryChange(event.target.value)} placeholder={placeholder} className="min-h-11 w-full rounded-lg border border-gray-300 py-2 pl-10 pr-3 text-sm focus:border-indigo-500 focus:ring-indigo-500" /></label>
      {children && <div className="flex flex-wrap items-center gap-3">{children}</div>}
      {hasFilters && <button type="button" onClick={onClear} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-3 text-sm font-semibold text-gray-700 hover:bg-gray-100"><XMarkIcon className="h-5 w-5" />Limpiar todo</button>}
    </div>
    {resultCount !== undefined && <p className="mt-3 text-sm text-gray-600" aria-live="polite">{resultCount} {resultCount === 1 ? "resultado" : "resultados"}</p>}
  </section>;
}
