const envUrl = import.meta.env.VITE_API_URL;
const BASE_URL = envUrl 
    ? (envUrl.endsWith('/api') ? envUrl : `${envUrl}/api`) 
    : 'http://localhost:3000/api';

interface RequestOptions extends RequestInit {
    params?: Record<string, string>;
}

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const { params, ...init } = options;

    let url = `${BASE_URL}${endpoint}`;
    if (params) {
        const searchParams = new URLSearchParams(params);
        url += `?${searchParams.toString()}`;
    }

    const token = localStorage.getItem('token');
    const headers = new Headers(init.headers);

    if (token) {
        headers.set('Authorization', `Bearer ${token}`);
    }

    // Default to JSON if not FormData
    if (!(init.body instanceof FormData) && !headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
    }

    const response = await fetch(url, {
        ...init,
        headers,
    });

    if (response.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.dispatchEvent(new Event('logout'));
        throw new Error('Sesión expirada. Por favor, vuelva a ingresar.');
    }

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.details || errorData.message || `HTTP error! status: ${response.status}`);
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
    const token = localStorage.getItem('token');
    const response = await fetch(getFileUrl(path), {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined
    });

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

