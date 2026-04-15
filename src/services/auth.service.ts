import api from './api';

export interface User {
    id: number;
    email: string;
    fullName: string;
    role: string;
    inmobiliaria: {
        id: number;
        nombre: string;
    };
}

interface LoginResponse {
    token: string;
    user: User;
}

export const authService = {
    login: async (email: string, password: string): Promise<LoginResponse> => {
        const response = await api.post<LoginResponse>('/auth/login', { email, password });
        if (response.token) {
            localStorage.setItem('token', response.token);
            localStorage.setItem('user', JSON.stringify(response.user));
            localStorage.setItem('loginTimestamp', Date.now().toString());
        }
        return response;
    },

    changePassword: async (currentPassword: string, newPassword: string) => {
        return api.post('/auth/change-password', { currentPassword, newPassword });
    },

    logout: () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('loginTimestamp');
    },

    getCurrentUser: (): User | null => {
        const userStr = localStorage.getItem('user');
        return userStr ? JSON.parse(userStr) : null;
    },

    isAuthenticated: (): boolean => {
        const token = localStorage.getItem('token');
        const timestamp = localStorage.getItem('loginTimestamp');

        if (!token || !timestamp) return false;

        const eightHoursInMs = 8 * 60 * 60 * 1000;
        const isExpired = Date.now() - parseInt(timestamp) > eightHoursInMs;

        if (isExpired) {
            authService.logout();
            return false;
        }

        return true;
    }
};
