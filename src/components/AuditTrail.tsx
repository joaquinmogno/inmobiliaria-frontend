import { ClockIcon } from "@heroicons/react/24/outline";

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

export default function AuditTrail({ logs = [], emptyText = "Todavía no hay eventos de auditoría." }: AuditTrailProps) {
    if (logs.length === 0) {
        return (
            <div className="text-center py-8 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                <ClockIcon className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">{emptyText}</p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {logs.map((log) => (
                <div key={log.id} className="rounded-xl border border-gray-100 bg-white p-3 shadow-sm">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                        <p className="text-xs font-black uppercase tracking-wider text-indigo-700">
                            {formatAction(log.accion)}
                        </p>
                        <p className="text-xs text-gray-500">
                            {new Date(log.fechaCreacion).toLocaleString("es-AR")}
                        </p>
                    </div>
                    <p className="mt-1 text-sm text-gray-700">
                        {formatDetail(log.detalle) || "Sin detalle adicional"}
                    </p>
                    <p className="mt-2 text-[11px] font-semibold text-gray-500">
                        Por: {log.usuario?.nombreCompleto || "Sistema"}
                    </p>
                </div>
            ))}
        </div>
    );
}
