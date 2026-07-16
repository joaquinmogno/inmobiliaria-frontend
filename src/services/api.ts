import { getFilenameFromPath, isWordDocument } from "../utils/documentFiles";
import { requestReauthentication } from "./reauthentication";

const envUrl = import.meta.env.VITE_API_URL;
const BASE_URL = envUrl 
    ? (envUrl.endsWith('/api') ? envUrl : `${envUrl}/api`) 
    : 'http://localhost:3000/api';

const formatErrorDetails = (errorData: any) => {
    if (!errorData) return null;

    if (Array.isArray(errorData.errors)) {
        return errorData.errors
            .map((issue: { field?: string; message?: string }) =>
                issue.field ? `${issue.field}: ${issue.message}` : issue.message
            )
            .filter(Boolean)
            .join(" | ");
    }

    if (typeof errorData.details === 'string') {
        return errorData.details;
    }

    if (Array.isArray(errorData.details)) {
        return errorData.details.join(" | ");
    }

    return null;
};

interface RequestOptions extends RequestInit {
    params?: Record<string, string>;
}

export class ApiError extends Error {
    readonly status: number;
    readonly code?: string;
    constructor(message: string, status: number, code?: string) {
        super(message);
        this.name = "ApiError";
        this.status = status;
        this.code = code;
    }
}

export interface PaginatedResponse<T> {
    data: T[];
    meta: { total: number; page: number; limit: number; totalPages: number; retentionDays?: number };
}

const getCookie = (name: string) => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return decodeURIComponent(parts.pop()!.split(';').shift() || '');
    return '';
};

async function request<T>(endpoint: string, options: RequestOptions = {}, retriedAfterReauth = false): Promise<T> {
    const { params, ...init } = options;

    let url = `${BASE_URL}${endpoint}`;
    if (params) {
        const searchParams = new URLSearchParams(params);
        url += `?${searchParams.toString()}`;
    }

    const headers = new Headers(init.headers);

    const method = (init.method || 'GET').toUpperCase();
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
        const csrfToken = getCookie('pc_csrf');
        if (csrfToken) headers.set('X-CSRF-Token', csrfToken);
    }

    // Default to JSON if not FormData
    if (!(init.body instanceof FormData) && !headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
    }

    const response = await fetch(url, {
        ...init,
        headers,
        credentials: 'include',
        cache: 'no-store',
    });

    if (response.status === 401) {
        localStorage.removeItem('user');
        if (endpoint !== '/auth/logout') {
            window.dispatchEvent(new Event('logout'));
        }
        throw new Error('Sesión expirada. Por favor, vuelva a ingresar.');
    }

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 403 && errorData.code === 'REAUTHENTICATION_REQUIRED' && !retriedAfterReauth) {
            const password = await requestReauthentication();
            if (!password) throw new Error('Operación cancelada');
            const csrfToken = getCookie('pc_csrf');
            const reauthResponse = await fetch(`${BASE_URL}/auth/reauthenticate`, {
                method: 'POST', credentials: 'include', cache: 'no-store',
                headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken },
                body: JSON.stringify({ password })
            });
            if (!reauthResponse.ok) throw new Error('No se pudo confirmar la identidad');
            return request<T>(endpoint, options, true);
        }
        const details = formatErrorDetails(errorData);
        const requestIdSuffix = errorData.requestId ? ` [ref: ${errorData.requestId}]` : "";
        const message = (details || errorData.message || `HTTP error! status: ${response.status}`) + requestIdSuffix;

        if (response.status === 403) {
            window.dispatchEvent(new CustomEvent('permission-denied', {
                detail: message || "No tenés permiso para realizar esta acción"
            }));
        }

        throw new ApiError(message, response.status, errorData.code);
    }

    // Some endpoints might return empty response
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
        return response.json();
    }

    return {} as T;
}

const api = {
    get: <T>(url: string, options?: RequestOptions) => request<T>(url, { ...options, method: 'GET' }),
    post: <T>(url: string, body?: any, options?: RequestOptions) =>
        request<T>(url, { ...options, method: 'POST', body: body instanceof FormData ? body : JSON.stringify(body) }),
    put: <T>(url: string, body?: any, options?: RequestOptions) =>
        request<T>(url, { ...options, method: 'PUT', body: body instanceof FormData ? body : JSON.stringify(body) }),
    patch: <T>(url: string, body?: any, options?: RequestOptions) =>
        request<T>(url, { ...options, method: 'PATCH', body: body instanceof FormData ? body : JSON.stringify(body) }),
    delete: <T>(url: string, options?: RequestOptions) => request<T>(url, { ...options, method: 'DELETE' }),
};

export const getFileUrl = (path: string | null) => {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    return `${BASE_URL}/files/${path}`;
};

const getFilenameFromDisposition = (disposition: string | null) => {
    if (!disposition) return null;
    const match = disposition.match(/filename="([^"]+)"/i) || disposition.match(/filename=([^;]+)/i);
    return match ? match[1].trim() : null;
};

export const openAuthenticatedFile = async (path: string | null): Promise<'opened' | 'downloaded' | undefined> => {
    if (!path) return;

    const fileWindow = window.open('', '_blank');
    const response = await fetch(getFileUrl(path), { credentials: 'include', cache: 'no-store' });

    if (!response.ok) {
        fileWindow?.close();
        throw new Error('No se pudo abrir el archivo');
    }

    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    const contentType = response.headers.get('content-type') || blob.type;

    if (isWordDocument(path, contentType)) {
        fileWindow?.close();
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = getFilenameFromDisposition(response.headers.get('content-disposition')) || getFilenameFromPath(path);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(blobUrl);
        return 'downloaded';
    }

    if (fileWindow) {
        fileWindow.location.href = blobUrl;
    } else {
        window.open(blobUrl, '_blank');
    }
    return 'opened';
};

export default api;

