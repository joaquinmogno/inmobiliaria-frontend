import api, { apiBaseUrl, getFilenameFromDisposition, openAuthenticatedPdf, type PaginationMeta } from './api';
import type { Moneda } from '../utils/currency';

export interface InternalAttachment {
    id: number;
    nombreArchivo: string;
    tipoContenido: string;
    tamano: number;
    fechaCreacion: string;
    creadoPor: { id: number; nombreCompleto: string };
}
export interface InternalMovement {
    id: number;
    version: number;
    fecha: string;
    tipo: 'INGRESO' | 'GASTO';
    detalle: string;
    monto: number | string;
    moneda: Moneda;
    categoria: string | null;
    metodoPago: string | null;
    observaciones: string | null;
    fechaCreacion: string;
    fechaActualizacion: string;
    anuladoEn: string | null;
    motivoAnulacion: string | null;
    creadoPor: { id: number; nombreCompleto: string };
    actualizadoPor: { id: number; nombreCompleto: string } | null;
    anuladoPor: { id: number; nombreCompleto: string } | null;
    adjuntos: InternalAttachment[];
}
export interface InternalFilters {
    periodo: string;
    search?: string;
    tipo?: string;
    moneda?: string;
    categoria?: string;
    metodoPago?: string;
    creadoPorId?: string;
    estado?: 'VIGENTES' | 'ANULADOS' | 'TODOS';
}
export interface InternalOptions { categorias: string[]; mediosPago: string[]; usuarios: Array<{ id: number; nombreCompleto: string }> }
export interface InternalList {
    data: InternalMovement[];
    meta: PaginationMeta;
    periodo: string;
    resumen: Array<{ moneda: Moneda; ingresos: number; gastos: number; diferencia: number }>;
}
export interface InternalMovementInput {
    fecha: string;
    tipo: InternalMovement['tipo'];
    detalle: string;
    monto: string;
    moneda: Moneda;
    categoria?: string;
    metodoPago?: string;
    observaciones?: string;
}

export const internalQueryString = (filters: InternalFilters) => new URLSearchParams(Object.entries(filters).filter(([, value]) => value !== undefined && value !== '') as Array<[string, string]>).toString();
const binaryResponse = async (endpoint: string) => {
    const response = await fetch(`${apiBaseUrl}${endpoint}`, { credentials: 'include', cache: 'no-store' });
    if (response.status === 401) { localStorage.removeItem('user'); window.dispatchEvent(new Event('logout')); }
    if (!response.ok) { const error = await response.json().catch(() => ({})); throw new Error(error.message || 'No se pudo descargar el archivo'); }
    return response;
};
const downloadResponse = async (response: Response, fallbackName: string) => {
    const url = URL.createObjectURL(await response.blob());
    const link = document.createElement('a');
    link.href = url;
    link.download = getFilenameFromDisposition(response.headers.get('Content-Disposition')) || fallbackName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 60000);
};

export const controlInternoService = {
    list: (filters: InternalFilters, page: number) => api.get<InternalList>('/control-interno', { params: { ...filters, page, limit: 25 } }),
    options: () => api.get<InternalOptions>('/control-interno/opciones'),
    create: (data: InternalMovementInput, files: File[]) => {
        const form = new FormData();
        Object.entries(data).forEach(([key, value]) => { if (value !== undefined) form.append(key, value); });
        files.forEach(file => form.append('comprobantes', file));
        return api.post<InternalMovement>('/control-interno', form);
    },
    update: (id: number, version: number, data: InternalMovementInput) => api.put<InternalMovement>(`/control-interno/${id}`, { ...data, version }),
    attach: (record: InternalMovement, files: File[]) => {
        const form = new FormData();
        form.append('version', String(record.version));
        files.forEach(file => form.append('comprobantes', file));
        return api.post<InternalMovement>(`/control-interno/${record.id}/adjuntos`, form);
    },
    cancel: (record: InternalMovement, motivo: string) => api.post<InternalMovement>(`/control-interno/${record.id}/anular`, { version: record.version, motivo }),
    export: async (format: 'excel' | 'pdf', filters: InternalFilters) => {
        const response = await binaryResponse(`/control-interno/reportes/${format}?${internalQueryString(filters)}`);
        await downloadResponse(response, `control-interno-${filters.periodo}.${format === 'excel' ? 'xlsx' : 'pdf'}`);
    },
    printPdf: (filters: InternalFilters) => openAuthenticatedPdf(`/control-interno/reportes/pdf?${internalQueryString(filters)}`),
    openAttachment: async (attachment: InternalAttachment, download = false) => {
        const tab = download ? null : window.open('', '_blank');
        try {
            const response = await binaryResponse(`/control-interno/adjuntos/${attachment.id}/archivo${download ? '?descargar=1' : ''}`);
            if (download) { await downloadResponse(response, attachment.nombreArchivo); return; }
            const blob = URL.createObjectURL(await response.blob());
            if (tab) tab.location.href = blob;
            else window.open(blob, '_blank', 'noopener,noreferrer');
            window.setTimeout(() => URL.revokeObjectURL(blob), 60000);
        } catch (error) { tab?.close(); throw error; }
    }
};
