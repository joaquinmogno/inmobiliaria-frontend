import { useState, type ReactNode } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";

interface PaginatedListProps<T> {
    title: string;
    items: T[];
    renderItem: (item: T) => ReactNode;
    itemsPerPage?: number;
    badgeColor?: "red" | "orange" | "indigo" | "green" | "blue";
    emptyState: ReactNode;
}

export default function PaginatedList<T>({
    title,
    items,
    renderItem,
    itemsPerPage = 5,
    badgeColor = "indigo",
    emptyState,
}: PaginatedListProps<T>) {
    const [currentPage, setCurrentPage] = useState(1);

    const totalPages = Math.ceil(items.length / itemsPerPage);
    const currentItems = items.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    const badgeColors = {
        red: "bg-red-100 text-red-700",
        orange: "bg-orange-100 text-orange-700",
        indigo: "bg-indigo-100 text-indigo-700",
        green: "bg-green-100 text-green-700",
        blue: "bg-blue-100 text-blue-700",
    };

    return (
        <section>
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-gray-900">{title}</h2>
                    {items.length > 0 && (
                        <span
                            className={`${badgeColors[badgeColor]} px-2 py-0.5 rounded-full text-xs font-semibold`}
                        >
                            {items.length}
                        </span>
                    )}
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">
                            {currentPage} de {totalPages}
                        </span>
                        <div className="flex gap-1">
                            <button
                                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="p-1 rounded-md hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent transition-colors cursor-pointer disabled:cursor-not-allowed"
                            >
                                <ChevronLeftIcon className="w-4 h-4 text-gray-600" />
                            </button>
                            <button
                                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="p-1 rounded-md hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent transition-colors cursor-pointer disabled:cursor-not-allowed"
                            >
                                <ChevronRightIcon className="w-4 h-4 text-gray-600" />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <div className="space-y-3">
                {currentItems.length > 0 ? (
                    currentItems.map((item, index) => (
                        <div key={index}>{renderItem(item)}</div>
                    ))
                ) : (
                    emptyState
                )}
            </div>
        </section>
    );
}
