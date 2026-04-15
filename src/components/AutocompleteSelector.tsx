import { useState, useEffect, useRef } from "react";
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
    const dropdownRef = useRef<HTMLDivElement>(null);

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
                        className="text-indigo-400 hover:text-indigo-600 transition-colors"
                    >
                        <XMarkIcon className="w-4 h-4" />
                    </button>
                </div>
            ) : (
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <MagnifyingGlassIcon className={`w-4 h-4 ${loading ? 'animate-pulse text-indigo-500' : 'text-gray-400'}`} />
                    </div>
                    <input
                        type="text"
                        className={`w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-2 pl-9 pr-3 ${disabled ? 'opacity-50 cursor-not-allowed bg-gray-50' : ''}`}
                        placeholder={placeholder}
                        value={query}
                        disabled={disabled}
                        onChange={(e) => {
                            setQuery(e.target.value);
                            setIsOpen(true);
                        }}
                        onFocus={() => setIsOpen(true)}
                    />
                </div>
            )}

            {isOpen && query.length > 1 && !value && (
                <div className="absolute z-50 mt-1 w-full rounded-md bg-white shadow-lg border border-gray-200 py-1 max-h-60 overflow-auto">
                    {loading ? (
                        <div className="px-4 py-2 text-xs text-gray-500 italic">Buscando...</div>
                    ) : results.length > 0 ? (
                        results.map((item) => (
                            <button
                                key={String(item[idField])}
                                type="button"
                                className="w-full text-left px-4 py-2 text-sm hover:bg-indigo-50 hover:text-indigo-900 transition-colors"
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
        </div>
    );
}
