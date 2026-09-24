import api from './api';
import { type User } from './auth.service';

export type UserType = 'ADMIN' | 'USUARIO';

export interface CreateUserData {
    email: string;
    password: string;
    nombreCompleto: string;
    tipo: UserType;
    rolId?: number | null;
}

export interface UpdateUserData {
    email?: string;
    nombreCompleto?: string;
    tipo?: UserType;
    rolId?: number | null;
    activo?: boolean;
}

export interface PaginatedUsers {
    data: User[];
    meta: { total: number; page: number; limit: number; totalPages: number };
}

export const usersService = {
    getAll: (page = 1, limit = 25, search = ''): Promise<PaginatedUsers> =>
        api.get('/usuarios', { params: { page: String(page), limit: String(limit), ...(search ? { search } : {}) } }),
    getOptions: (): Promise<User[]> => api.get('/usuarios/opciones'),
    create: (data: CreateUserData): Promise<User> => api.post('/usuarios', data),
    update: (id: number, data: UpdateUserData): Promise<User> => api.put(`/usuarios/${id}`, data),
    disable: (id: number): Promise<void> => api.delete(`/usuarios/${id}`),
    resetPassword: (userId: number, newPassword: string): Promise<{ message: string }> =>
        api.post(`/auth/reset-password/${userId}`, { newPassword })
};
