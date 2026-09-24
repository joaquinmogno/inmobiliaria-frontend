import api from './api';
import { type PermissionKey } from '../utils/permissions';

export interface Permission {
    id: number;
    clave: PermissionKey;
    descripcion: string;
    modulo: string;
    accion: string;
    etiqueta: string;
    grupo: string;
    requiere: PermissionKey[];
    ruta: string;
    control: string;
}

export interface AccessRole {
    id: number;
    version: number;
    nombre: string;
    descripcion?: string | null;
    activo: boolean;
    cantidadUsuarios: number;
    permisos: Permission[];
    fechaCreacion: string;
    fechaActualizacion: string;
}

export interface RoleInput {
    nombre: string;
    descripcion?: string | null;
    permisos: PermissionKey[];
    activo?: boolean;
}

export const rolesService = {
    getAll: (): Promise<AccessRole[]> => api.get('/roles'),
    getPermissionCatalog: (): Promise<Permission[]> => api.get('/roles/catalogo-permisos'),
    create: (data: RoleInput): Promise<AccessRole> => api.post('/roles', data),
    update: (id: number, data: Partial<RoleInput> & { version: number }): Promise<AccessRole> => api.put(`/roles/${id}`, data),
    duplicate: (id: number): Promise<AccessRole> => api.post(`/roles/${id}/duplicar`),
    delete: (id: number): Promise<void> => api.delete(`/roles/${id}`)
};
