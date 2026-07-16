import api from './api';
import { type User } from './auth.service';
import { type PermissionKey } from '../utils/permissions';

export type UserRole = 'OWNER' | 'JEFE' | 'ADMIN' | 'AGENTE';

export interface Permission {
    id: number;
    clave: PermissionKey;
    descripcion: string;
}

export interface CreateUserData {
    email: string;
    password?: string;
    nombreCompleto: string;
    rol: UserRole;
    permissions?: PermissionKey[];
    deniedPermissions?: PermissionKey[];
}

export interface PaginatedUsers {
    data: User[];
    meta: { total: number; page: number; limit: number; totalPages: number };
}

export const usersService = {
    getAll: async (page = 1, limit = 25, search = ''): Promise<PaginatedUsers> => {
        return api.get<PaginatedUsers>('/usuarios', { params: { page: String(page), limit: String(limit), ...(search ? { search } : {}) } });
    },

    getOptions: async (): Promise<User[]> => api.get<User[]>('/usuarios/opciones'),

    create: async (data: CreateUserData): Promise<User> => {
        return api.post<User>('/usuarios', data);
    },

    update: async (id: number, data: Partial<CreateUserData>): Promise<User> => {
        return api.put<User>(`/usuarios/${id}`, data);
    },

    delete: async (id: number): Promise<void> => {
        return api.delete<void>(`/usuarios/${id}`);
    },

    resetPassword: async (userId: number): Promise<{ message: string; resetToken: string }> => {
        return api.post<{ message: string; resetToken: string }>(`/auth/reset-password/${userId}`);
    },

    getPermissionsCatalog: async (): Promise<Permission[]> => {
        return api.get<Permission[]>('/usuarios/permisos/catalogo');
    },

    updatePermissions: async (userId: number, permissions: PermissionKey[], deniedPermissions: PermissionKey[] = []) => {
        return api.put<{
            id: number;
            permissions: string[];
            inheritedPermissions: string[];
            directPermissions: string[];
            deniedPermissions: string[];
        }>(
            `/usuarios/${userId}/permisos`,
            { permissions, deniedPermissions }
        );
    }
};
