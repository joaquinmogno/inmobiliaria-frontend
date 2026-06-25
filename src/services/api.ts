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

const getCookie = (name: string) => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return decodeURIComponent(parts.pop()!.split(';').shift() || '');
    return '';
};

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
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
        const details = formatErrorDetails(errorData);
        const requestIdSuffix = errorData.requestId ? ` [ref: ${errorData.requestId}]` : "";
        const message = (details || errorData.message || `HTTP error! status: ${response.status}`) + requestIdSuffix;

        if (response.status === 403) {
            window.dispatchEvent(new CustomEvent('permission-denied', {
                detail: message || "No tenés permiso para realizar esta acción"
            }));
        }

        throw new Error(message);
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

export const openAuthenticatedFile = async (path: string | null) => {
    if (!path) return;

    const fileWindow = window.open('', '_blank');
    const response = await fetch(getFileUrl(path), { credentials: 'include' });

    if (!response.ok) {
        fileWindow?.close();
        throw new Error('No se pudo abrir el archivo');
    }

    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    if (fileWindow) {
        fileWindow.location.href = blobUrl;
    } else {
        window.open(blobUrl, '_blank');
    }
};

export default api;

