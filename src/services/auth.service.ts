import api from './api';

export interface User {
    id: number;
    email: string;
    fullName: string;
    nombreCompleto?: string;
    role: string;
    rol?: string;
    permissions?: string[];
    inheritedPermissions?: string[];
    directPermissions?: string[];
    deniedPermissions?: string[];
    mustChangePassword?: boolean;
    csrfToken?: string;
    inmobiliaria: {
        id: number;
        nombre: string;
    };
}

interface LoginResponse {
    csrfToken: string;
    expiresAt: string;
    user: User;
}

export const authService = {
    login: async (email: string, password: string): Promise<LoginResponse> => {
        const response = await api.post<LoginResponse>('/auth/login', { email, password });
        if (response.user) {
            localStorage.setItem('user', JSON.stringify(response.user));
            localStorage.setItem('loginTimestamp', Date.now().toString());
        }
        return response;
    },

    loginWithGoogle: async (idToken: string, currentPassword?: string): Promise<LoginResponse> => {
        const response = await api.post<LoginResponse>('/auth/google', { idToken, currentPassword });
        if (response.user) {
            localStorage.setItem('user', JSON.stringify(response.user));
            localStorage.setItem('loginTimestamp', Date.now().toString());
        }
        return response;
    },

    changePassword: async (currentPassword: string, newPassword: string) => {
        return api.post('/auth/change-password', { currentPassword, newPassword });
    },

    completePasswordReset: async (token: string, newPassword: string) => {
        return api.post<{ message: string }>('/auth/complete-password-reset', { token, newPassword });
    },

    me: async (): Promise<User> => {
        return api.get<User>('/auth/me');
    },

    logout: () => {
        localStorage.removeItem('user');
        localStorage.removeItem('loginTimestamp');
    },

    logoutRemote: async () => {
        try {
            await api.post('/auth/logout');
        } catch {
            // Local cleanup must happen even if the server session already expired.
        }
        authService.logout();
    },

    getCurrentUser: (): User | null => {
        const userStr = localStorage.getItem('user');
        return userStr ? JSON.parse(userStr) : null;
    },

    isAuthenticated: (): boolean => {
        const timestamp = localStorage.getItem('loginTimestamp');

        if (!timestamp) return false;

        const eightHoursInMs = 8 * 60 * 60 * 1000;
        const isExpired = Date.now() - parseInt(timestamp) > eightHoursInMs;

        if (isExpired) {
            authService.logout();
            return false;
        }

        return true;
    }
};
