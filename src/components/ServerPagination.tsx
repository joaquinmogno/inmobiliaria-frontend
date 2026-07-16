import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";

interface ServerPaginationProps {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  currentCount: number;
  onPageChange: (page: number) => void;
}

export default function ServerPagination({ page, totalPages, total, pageSize, currentCount, onPageChange }: ServerPaginationProps) {
  if (totalPages <= 1) return null;

  const first = (page - 1) * pageSize + 1;
  const last = first + currentCount - 1;

  return (
    <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3">
      <p className="text-sm text-gray-600">Mostrando {first} a {last} de {total}</p>
      <div className="flex items-center gap-2">
        <button type="button" aria-label="Página anterior" onClick={() => onPageChange(page - 1)} disabled={page <= 1} className="flex h-11 w-11 items-center justify-center text-gray-600 disabled:opacity-30">
          <ChevronLeftIcon className="h-5 w-5" />
        </button>
        <span className="text-sm text-gray-700">Página {page} de {totalPages}</span>
        <button type="button" aria-label="Página siguiente" onClick={() => onPageChange(page + 1)} disabled={page >= totalPages} className="flex h-11 w-11 items-center justify-center text-gray-600 disabled:opacity-30">
          <ChevronRightIcon className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
