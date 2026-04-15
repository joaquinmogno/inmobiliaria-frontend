import api from './api';
import { type User } from './auth.service';

export interface CreateUserData {
    email: string;
    password?: string;
    nombreCompleto: string;
    rol: 'ADMIN' | 'AGENTE';
}

export const usersService = {
    getAll: async (): Promise<User[]> => {
        return api.get<User[]>('/usuarios');
    },

    create: async (data: CreateUserData): Promise<User> => {
        return api.post<User>('/usuarios', data);
    },

    update: async (id: number, data: Partial<CreateUserData>): Promise<User> => {
        return api.put<User>(`/usuarios/${id}`, data);
    },

    delete: async (id: number): Promise<void> => {
        return api.delete<void>(`/usuarios/${id}`);
    },

    resetPassword: async (userId: number, newPassword: string): Promise<{ message: string }> => {
        return api.post<{ message: string }>(`/auth/reset-password/${userId}`, { newPassword });
    }
};
