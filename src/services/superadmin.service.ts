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

export const superadminService = {
    getMetrics: async (): Promise<SuperAdminMetrics> => {
        return await api.get('/superadmin/metrics');
    },
    
    getInmobiliarias: async (): Promise<InmobiliariaClient[]> => {
        return await api.get('/superadmin/inmobiliarias');
    },

    createInmobiliaria: async (data: { nombre: string, direccion?: string, emailAdmin: string, passwordAdmin: string, nombreCompletoAdmin: string }) => {
        return await api.post('/superadmin/inmobiliarias', data);
    },

    toggleStatus: async (id: number, activa: boolean) => {
        return await api.patch(`/superadmin/inmobiliarias/${id}/status`, { activa });
    }
};
