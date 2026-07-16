import api from './api';

export interface SuperAdminMetrics {
    totalInmobiliarias: number;
    totalUsuarios: number;
    totalContratos: number;
    totalPropiedades: number;
}

export interface InmobiliariaClient {
    id: number;
    nombre: string;
    activa: boolean;
    fechaCreacion: string;
    direccion: string | null;
    _count: {
        usuarios: number;
        contratos: number;
        propiedades: number;
    }
}

export interface PaginatedInmobiliarias {
    data: InmobiliariaClient[];
    meta: { total: number; page: number; limit: number; totalPages: number };
}

export const superadminService = {
    getMetrics: async (): Promise<SuperAdminMetrics> => {
        return await api.get('/superadmin/metrics');
    },
    
    getInmobiliarias: async (page = 1, limit = 25, search = ''): Promise<PaginatedInmobiliarias> => {
        return await api.get('/superadmin/inmobiliarias', { params: { page: String(page), limit: String(limit), ...(search ? { search } : {}) } });
    },

    createInmobiliaria: async (data: { nombre: string, direccion?: string, emailAdmin: string, passwordAdmin: string, nombreCompletoAdmin: string }) => {
        return await api.post('/superadmin/inmobiliarias', data);
    },

    toggleStatus: async (id: number, activa: boolean) => {
        return await api.patch(`/superadmin/inmobiliarias/${id}/status`, { activa });
    }
};
