import api from './api';

export type EstadoContrato = 'ACTIVO' | 'PAPELERA' | 'FINALIZADO' | 'RESCINDIDO';
export type PagadorHonorarios = 'INQUILINO' | 'PROPIETARIO';

export interface ContractUpdateHistory {
    id: number;
    fechaActualizacion: string;
    montoAnterior: number;
    montoNuevo: number;
    fechaProximaAnterior: string | null;
    fechaProximaNueva: string;
    observaciones: string | null;
    usuario?: {
        nombreCompleto: string;
    };
}

export interface Contract {
    id: number;
    fechaInicio: string;
    fechaFin: string;
    fechaProximaActualizacion: string | null;
    estado: EstadoContrato;
    administrado: boolean;
    rutaPdf: string | null;
    observaciones: string | null;
    montoAlquiler: number;
    montoHonorarios: number;
    porcentajeHonorarios: number | null;
    pagaHonorarios: PagadorHonorarios;
    diaVencimiento: number;
    porcentajeActualizacion: number | null;
    tipoAjuste: string | null;
    propiedad: {
        id: number;
        direccion: string;
        piso: string | null;
        departamento: string | null;
    };
    propietarios: {
        id: number;
        persona: {
            id: number;
            nombreCompleto: string;
            telefono: string | null;
        };
        esPrincipal: boolean;
    }[];
    inquilinos: {
        id: number;
        persona: {
            id: number;
            nombreCompleto: string;
            telefono: string | null;
        };
        esPrincipal: boolean;
    }[];
    adjuntos?: {
        id: number;
        rutaArchivo: string;
        nombreArchivo: string | null;
    }[];
    actualizaciones?: ContractUpdateHistory[];
}

export const getDaysLeft = (dateString: string) => {
    const today = new Date();
    const targetDate = new Date(dateString);
    const diffTime = targetDate.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};


export const contractsService = {
    getAll: async (search?: string) => {
        return api.get<Contract[]>('/contratos', { params: search ? { search } : undefined });
    },

    create: async (data: FormData) => {
        return api.post<Contract>('/contratos', data);
    },

    update: async (id: number, data: FormData) => {
        return api.put<Contract>(`/contratos/${id}`, data);
    },

    getById: async (id: number) => {
        return api.get<Contract>(`/contratos/${id}`);
    },

    delete: async (id: number) => {
        return api.delete(`/contratos/${id}`);
    },

    addAttachment: async (contractId: number, file: File, fileName?: string) => {
        const formData = new FormData();
        formData.append('archivo', file);
        if (fileName) {
            formData.append('nombreArchivo', fileName);
        }
        return api.post(`/contratos/${contractId}/adjuntos`, formData);
    },

    restore: async (id: number) => {
        return api.post(`/contratos/${id}/restaurar`);
    },

    permanentlyDelete: async (id: number) => {
        return api.delete(`/contratos/${id}/permanente`);
    },

    updateStatus: async (id: number, estado: EstadoContrato) => {
        return api.patch(`/contratos/${id}/estado`, { estado });
    },
    actualizarMonto: async (id: number, data: { montoNuevo: number; fechaProximaNueva: string; observaciones?: string }) => {
        return api.post<Contract>(`/contratos/${id}/actualizar`, data);
    },
    getAlertas: async () => {
        return api.get<Contract[]>('/contratos/alertas');
    }
};
