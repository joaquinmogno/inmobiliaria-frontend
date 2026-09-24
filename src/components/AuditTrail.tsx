import { ChevronLeftIcon, ChevronRightIcon, ClockIcon } from "@heroicons/react/24/outline";
import { formatDateTime } from "../utils/date";
import type { PaginationMeta } from "../services/api";

export interface AuditLogItem {
    id: number;
    accion: string;
    entidad: string;
    entidadId: number | null;
    detalle: string | null;
    fechaCreacion: string;
    usuario?: {
        nombreCompleto: string;
        email?: string;
    } | null;
}

interface AuditTrailProps {
    logs?: AuditLogItem[];
    emptyText?: string;
    meta?: PaginationMeta;
    loading?: boolean;
    onPageChange?: (page: number) => void;
}

function formatAction(action: string) {
    return action.replaceAll("_", " ").toLowerCase();
}

function formatDetail(detail: string | null) {
    if (!detail) return null;

    try {
        const parsed = JSON.parse(detail);
        if (typeof parsed !== "object" || parsed === null) return detail;

        return Object.entries(parsed).map(([field, value]: [string, any]) => {
            if (!value || typeof value !== "object" || !("anterior" in value) || !("nuevo" in value)) {
                return `${field}: ${String(value)}`;
            }
            const previous = value.anterior ?? "-";
            const next = value.nuevo ?? "-";
            return `${field}: ${String(previous)} -> ${String(next)}`;
        }).join(" · ");
    } catch {
        return detail;
    }
}

export default function AuditTrail({ logs = [], emptyText = "Todavía no hay eventos de auditoría.", meta, loading = false, onPageChange }: AuditTrailProps) {
    if (logs.length === 0) {
        return (
            <div className="text-center py-8 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                <ClockIcon className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-content-muted">{emptyText}</p>
            </div>
        );
    }

    return (
        <div className={`space-y-3 ${loading ? "opacity-60" : ""}`} aria-busy={loading}>
            {logs.map((log) => (
                <div key={log.id} className="rounded-xl border border-gray-100 bg-white p-3 shadow-sm">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                        <p className="text-xs font-black uppercase tracking-wider text-indigo-700">
                            {formatAction(log.accion)}
                        </p>
                        <p className="text-xs text-content-muted">
                            {formatDateTime(log.fechaCreacion)}
                        </p>
                    </div>
                    <p className="mt-1 text-sm text-gray-700">
                        {formatDetail(log.detalle) || "Sin detalle adicional"}
                    </p>
                    <p className="mt-2 text-xs font-semibold text-content-muted">
                        Por: {log.usuario?.nombreCompleto || "Sistema"}
                    </p>
                </div>
            ))}
            {meta && meta.totalPages > 1 && onPageChange && (
                <div className="flex items-center justify-between gap-3 border-t border-gray-100 pt-3">
                    <button
                        type="button"
                        disabled={loading || meta.page <= 1}
                        onClick={() => onPageChange(meta.page - 1)}
                        className="inline-flex min-h-11 items-center gap-1 rounded-lg border border-gray-200 px-3 text-sm font-semibold text-gray-700 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                        <ChevronLeftIcon className="h-4 w-4" /> Anterior
                    </button>
                    <span className="text-xs font-semibold text-content-muted">
                        Página {meta.page} de {meta.totalPages} · {meta.total} eventos
                    </span>
                    <button
                        type="button"
                        disabled={loading || meta.page >= meta.totalPages}
                        onClick={() => onPageChange(meta.page + 1)}
                        className="inline-flex min-h-11 items-center gap-1 rounded-lg border border-gray-200 px-3 text-sm font-semibold text-gray-700 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                        Siguiente <ChevronRightIcon className="h-4 w-4" />
                    </button>
                </div>
            )}
        </div>
    );
}
