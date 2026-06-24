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
