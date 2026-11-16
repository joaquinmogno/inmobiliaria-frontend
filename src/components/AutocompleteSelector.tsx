import { useState, useEffect, useId, useRef } from "react";
import { MagnifyingGlassIcon, XMarkIcon, CheckIcon } from "@heroicons/react/24/outline";

type SearchPage<T> = {
    data: T[];
    meta: { page: number; totalPages: number };
};

interface AutocompleteSelectorProps<T> {
    label: string;
    placeholder: string;
    onSearch: (query: string, page?: number) => Promise<T[] | SearchPage<T>>;
    onSelect: (item: T | null) => void;
    renderItem: (item: T) => string;
    renderSelection: (item: T) => string;
    idField: keyof T;
    value?: T | null;
    disabled?: boolean;
}

export default function AutocompleteSelector<T>({
    label,
    placeholder,
    onSearch,
    onSelect,
    renderItem,
    renderSelection,
    idField,
    value = null,
    disabled = false,
}: AutocompleteSelectorProps<T>) {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<T[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [searchError, setSearchError] = useState(false);
    const [activeIndex, setActiveIndex] = useState(-1);
    const [currentPage, setCurrentPage] = useState(1);
    const [hasMore, setHasMore] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const listId = useId();
    const inputRef = useRef<HTMLInputElement>(null);
    const clearRef = useRef<HTMLButtonElement>(null);
    const focusSelection = useRef(false);
    const searchSequence = useRef(0);

    useEffect(() => {
        if (value && focusSelection.current) {
            clearRef.current?.focus();
            focusSelection.current = false;
        }
    }, [value]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            if (query.length > 1 && isOpen) {
                performSearch(query);
            } else {
                setResults([]);
                setLoading(false);
                setSearchError(false);
            }
        }, 300);

        return () => { clearTimeout(delayDebounceFn); searchSequence.current++; };
    }, [query, isOpen]);

    const performSearch = async (q: string, page = 1, append = false) => {
        const sequence = ++searchSequence.current;
        setLoading(true);
        setSearchError(false);
        try {
            const response = await onSearch(q, page);
            if (sequence !== searchSequence.current) return;
            const data = Array.isArray(response) ? response : response.data;
            setResults(current => append
                ? [...current, ...data.filter(item => !current.some(existing => existing[idField] === item[idField]))]
                : data
            );
            setCurrentPage(Array.isArray(response) ? 1 : response.meta.page);
            setHasMore(!Array.isArray(response) && response.meta.page < response.meta.totalPages);
            setActiveIndex(data.length ? 0 : -1);
        } catch (error) {
            if (sequence !== searchSequence.current) return;
            setResults([]);
            setActiveIndex(-1);
            setHasMore(false);
            setSearchError(true);
            console.error("Error searching:", error);
        } finally {
            if (sequence === searchSequence.current) setLoading(false);
        }
    };

    const handleSelect = (item: T) => {
        focusSelection.current = true;
        onSelect(item);
        setIsOpen(false);
        setQuery("");
    };

    const handleClear = () => {
        onSelect(null);
        setQuery("");
        requestAnimationFrame(() => inputRef.current?.focus());
    };

    const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === "Escape") { setIsOpen(false); setActiveIndex(-1); return; }
        if (event.key === "ArrowDown") {
            event.preventDefault(); setIsOpen(true);
            setActiveIndex(current => Math.min(current + 1, results.length - 1));
        } else if (event.key === "ArrowUp") {
            event.preventDefault(); setActiveIndex(current => Math.max(current - 1, 0));
        } else if (event.key === "Enter" && isOpen && activeIndex >= 0 && results[activeIndex]) {
            event.preventDefault(); handleSelect(results[activeIndex]);
        }
    };

    return (
        <div className="relative min-w-0" ref={dropdownRef}>
            <label htmlFor={`${listId}-input`} className="block text-sm font-semibold text-gray-700 mb-1">
                {label}
            </label>

            {value ? (
                <div className="ui-field flex items-center justify-between py-0 pr-0">
                    <div className="flex items-center gap-2 overflow-hidden">
                        <CheckIcon className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                        <span className="font-semibold text-indigo-900 truncate">
                            {renderSelection(value)}
                        </span>
                    </div>
                    <button
                        type="button"
                        ref={clearRef}
                        disabled={disabled}
                        onClick={handleClear}
                        className="flex h-11 w-11 shrink-0 items-center justify-center text-indigo-600 hover:text-indigo-800 transition-colors"
                        aria-label={`Quitar ${label}`}
                    >
                        <XMarkIcon className="w-4 h-4" />
                    </button>
                </div>
            ) : (
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <MagnifyingGlassIcon className={`w-4 h-4 ${loading ? 'animate-pulse text-indigo-500' : 'text-gray-600'}`} />
                    </div>
                    <input
                        id={`${listId}-input`}
                        ref={inputRef}
                        type="text"
                        role="combobox"
                        aria-autocomplete="list"
                        aria-expanded={isOpen && query.length > 1 && !searchError}
                        aria-controls={isOpen && query.length > 1 && !searchError ? listId : undefined}
                        aria-activedescendant={isOpen && query.length > 1 && !loading && !searchError && results[activeIndex] ? `${listId}-${activeIndex}` : undefined}
                        className="ui-field pl-9"
                        placeholder={placeholder}
                        value={query}
                        disabled={disabled}
                        onChange={(e) => {
                            setQuery(e.target.value);
                            setIsOpen(true);
                        }}
                        onFocus={() => setIsOpen(true)}
                        onKeyDown={handleKeyDown}
                    />
                </div>
            )}

            {isOpen && query.length > 1 && !value && searchError && <div role="alert" className="mt-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">No se pudo completar la búsqueda. Intentá nuevamente.<button type="button" onClick={() => void performSearch(query)} className="ui-button ui-button-secondary mt-2">Reintentar búsqueda</button></div>}
            {isOpen && query.length > 1 && !value && !searchError && (
                <div id={listId} role="listbox" aria-label={`Resultados para ${label}`} className="absolute z-50 mt-1 w-full rounded-md bg-white shadow-lg border border-gray-200 py-1 max-h-60 overflow-auto">
                    {loading ? (
                        <div className="px-4 py-2 text-xs text-content-muted italic">Buscando...</div>
                    ) : results.length > 0 ? (
                        results.map((item, index) => (
                            <button
                                key={String(item[idField])}
                                id={`${listId}-${index}`}
                                role="option"
                                aria-selected={index === activeIndex}
                                type="button"
                                className={`min-h-11 w-full text-left px-4 py-2 text-sm [overflow-wrap:anywhere] transition-colors ${index === activeIndex ? "bg-indigo-50 text-indigo-900" : "hover:bg-indigo-50 hover:text-indigo-900"}`}
                                onMouseEnter={() => setActiveIndex(index)}
                                onClick={() => handleSelect(item)}
                            >
                                {renderItem(item)}
                            </button>
                        ))
                    ) : (
                        <div className="px-4 py-2 text-xs text-content-muted italic">No se encontraron resultados. Continuar con carga manual.</div>
                    )}
                    {hasMore && !loading && <button type="button" onClick={() => void performSearch(query, currentPage + 1, true)} className="min-h-11 w-full border-t border-gray-100 px-4 py-2 text-left text-xs font-bold text-indigo-700 hover:bg-indigo-50">Ver más resultados</button>}
                </div>
            )}
            <span className="sr-only" role="status">{isOpen && query.length > 1 && !value && !searchError ? loading ? 'Buscando…' : `${results.length} resultados encontrados` : ""}</span>
        </div>
    );
}
