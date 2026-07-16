import { useState, useEffect, useId, useRef } from "react";
import { MagnifyingGlassIcon, XMarkIcon, CheckIcon } from "@heroicons/react/24/outline";

interface AutocompleteSelectorProps<T> {
    label: string;
    placeholder: string;
    onSearch: (query: string) => Promise<T[]>;
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
    const [activeIndex, setActiveIndex] = useState(-1);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const listId = useId();

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
            }
        }, 300);

        return () => clearTimeout(delayDebounceFn);
    }, [query, isOpen]);

    const performSearch = async (q: string) => {
        setLoading(true);
        try {
            const data = await onSearch(q);
            setResults(data);
            setActiveIndex(data.length ? 0 : -1);
        } catch (error) {
            console.error("Error searching:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSelect = (item: T) => {
        onSelect(item);
        setIsOpen(false);
        setQuery("");
    };

    const handleClear = () => {
        onSelect(null);
        setQuery("");
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
        <div className="relative" ref={dropdownRef}>
            <label className="block text-xs font-medium text-gray-700 mb-1">
                {label}
            </label>

            {value ? (
                <div className="flex items-center justify-between w-full rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm shadow-sm">
                    <div className="flex items-center gap-2 overflow-hidden">
                        <CheckIcon className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                        <span className="font-semibold text-indigo-900 truncate">
                            {renderSelection(value)}
                        </span>
                    </div>
                    <button
                        type="button"
                        onClick={handleClear}
                        className="flex h-11 w-11 items-center justify-center text-indigo-600 hover:text-indigo-800 transition-colors"
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
                        type="text"
                        role="combobox"
                        aria-autocomplete="list"
                        aria-expanded={isOpen && query.length > 1}
                        aria-controls={listId}
                        aria-activedescendant={activeIndex >= 0 ? `${listId}-${activeIndex}` : undefined}
                        className={`w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-2 pl-9 pr-3 ${disabled ? 'opacity-50 cursor-not-allowed bg-gray-50' : ''}`}
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

            {isOpen && query.length > 1 && !value && (
                <div id={listId} role="listbox" aria-label={`Resultados para ${label}`} className="absolute z-50 mt-1 w-full rounded-md bg-white shadow-lg border border-gray-200 py-1 max-h-60 overflow-auto">
                    {loading ? (
                        <div className="px-4 py-2 text-xs text-gray-500 italic">Buscando...</div>
                    ) : results.length > 0 ? (
                        results.map((item, index) => (
                            <button
                                key={String(item[idField])}
                                id={`${listId}-${index}`}
                                role="option"
                                aria-selected={index === activeIndex}
                                type="button"
                                className={`min-h-11 w-full text-left px-4 py-2 text-sm transition-colors ${index === activeIndex ? "bg-indigo-50 text-indigo-900" : "hover:bg-indigo-50 hover:text-indigo-900"}`}
                                onMouseEnter={() => setActiveIndex(index)}
                                onClick={() => handleSelect(item)}
                            >
                                {renderItem(item)}
                            </button>
                        ))
                    ) : (
                        <div className="px-4 py-2 text-xs text-gray-500 italic">No se encontraron resultados. Continuar con carga manual.</div>
                    )}
                </div>
            )}
            <span className="sr-only" aria-live="polite">{!loading && query.length > 1 ? `${results.length} resultados encontrados` : ""}</span>
        </div>
    );
}
