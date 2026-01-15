import api from './api';

export interface Contract {
    id: number;
    fechaInicio: string;
    fechaFin: string;
    fechaActualizacion: string;
    fechaProximaActualizacion: string | null;
    estado: 'ACTIVO' | 'PAPELERA' | 'FINALIZADO';
    rutaPdf: string | null;
    observaciones: string | null;
    propiedad: {
        id: number;
        direccion: string;
        piso: string | null;
        departamento: string | null;
    };
    propietario: {
        id: number;
        nombreCompleto: string;
        telefono: string;
    };
    inquilino: {
        id: number;
        nombreCompleto: string;
        telefono: string;
    };
    adjuntos?: {
        id: number;
        rutaArchivo: string;
        nombreArchivo: string | null;
    }[];
}

export const getDaysLeft = (dateString: string) => {
    const today = new Date();
    const targetDate = new Date(dateString);
    const diffTime = targetDate.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};


export const contractsService = {
    getAll: async () => {
        return api.get<Contract[]>('/contratos');
    },

    create: async (formData: FormData) => {
        return api.post<Contract>('/contratos', formData);
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
    }
};

