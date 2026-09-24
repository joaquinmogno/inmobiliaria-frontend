import api from './api';
import type { PaginatedResponse } from './api';

export type TipoPropiedad = 'DEPARTAMENTO' | 'CASA' | 'LOCAL' | 'OTRO';
export type EstadoPropiedad = 'DISPONIBLE' | 'ALQUILADO' | 'INACTIVO';

export interface Property {
    id: number;
    version: number;
    direccion: string;
    piso: string | null;
    departamento: string | null;
    tipo: TipoPropiedad;
    estado: EstadoPropiedad;
    observaciones: string | null;
    servicios: string | null;
    llaves: string | null;
    partidaInmobiliaria: string | null;
    matricula: string | null;
    superficieM2: string | number | null;
}

export interface PropertyPersonRelation {
    esPrincipal: boolean;
    persona: { id: number; nombreCompleto: string; telefono: string | null };
}

export interface PropertyContractSummary {
    id: number;
    fechaInicio: string;
    fechaFin: string;
    estado: 'PROGRAMADO' | 'ACTIVO' | 'FINALIZADO' | 'RESCINDIDO';
    propietarios: PropertyPersonRelation[];
    inquilinos: PropertyPersonRelation[];
}

export interface PropertyAttachment {
    id: number;
    rutaArchivo: string;
    nombreArchivo: string;
    tipo: 'FOTO' | 'DOCUMENTO';
    fechaCreacion: string;
    creadoPor: { id: number; nombreCompleto: string } | null;
}

export interface DeletedPropertyAttachment extends PropertyAttachment {
    eliminadoEn: string;
    eliminadoPor: { id: number; nombreCompleto: string } | null;
}

export interface PropertyNote {
    id: number;
    contenido: string;
    fechaCreacion: string;
    creadoPor: { id: number; nombreCompleto: string } | null;
}

export interface PropertyDetails extends Property {
    adjuntos: PropertyAttachment[];
    notas: PropertyNote[];
    contratos: PropertyContractSummary[];
    contratoVigente: PropertyContractSummary | null;
    contratoProgramado: PropertyContractSummary | null;
    titularesRegistrados: PropertyPersonRelation[];
    titularesFuenteContratoId: number | null;
    ocupantesActuales: PropertyPersonRelation[];
}

export type PropertyInput = Omit<Property, 'id' | 'version' | 'superficieM2'> & {
    superficieM2: number | null;
};

export const propertiesService = {
    getAll: async (options: { search?: string; tipo?: TipoPropiedad; estado?: EstadoPropiedad; page?: number; limit?: number; signal?: AbortSignal } = {}) => {
        const params: Record<string, string> = { page: String(options.page ?? 1), limit: String(options.limit ?? 25) };
        if (options.search) params.search = options.search;
        if (options.tipo) params.tipo = options.tipo;
        if (options.estado) params.estado = options.estado;
        return api.get<PaginatedResponse<Property>>('/propiedades', { params, signal: options.signal });
    },

    search: async (search = '', page = 1) => propertiesService.getAll({ search, page, limit: 25 }),

    getById: async (id: number) => {
        return api.get<PropertyDetails>(`/propiedades/${id}`);
    },

    create: async (data: PropertyInput) => {
        return api.post<Property>('/propiedades', data);
    },

    update: async (id: number, data: Partial<Property>) => {
        return api.put<Property>(`/propiedades/${id}`, data);
    },

    delete: async (id: number) => {
        await api.delete(`/propiedades/${id}`);
    },

    addNote: async (id: number, contenido: string) => {
        return api.post<PropertyNote>(`/propiedades/${id}/notas`, { contenido });
    },

    addAttachment: async (id: number, file: File, tipo: 'FOTO' | 'DOCUMENTO', nombreArchivo?: string) => {
        const data = new FormData();
        data.append('archivo', file);
        data.append('tipo', tipo);
        if (nombreArchivo) data.append('nombreArchivo', nombreArchivo);
        return api.post<PropertyAttachment>(`/propiedades/${id}/adjuntos`, data);
    },

    deleteAttachment: async (id: number, attachmentId: number) => {
        return api.delete(`/propiedades/${id}/adjuntos/${attachmentId}`);
    },

    getAttachmentTrash: async (id: number) => {
        const response = await api.get<{ data: DeletedPropertyAttachment[] }>(`/propiedades/${id}/adjuntos/papelera`);
        return response.data;
    },

    restoreAttachment: async (id: number, attachmentId: number) => {
        return api.post<PropertyAttachment>(`/propiedades/${id}/adjuntos/${attachmentId}/restaurar`);
    },

    purgeAttachment: async (id: number, attachmentId: number) => {
        return api.delete(`/propiedades/${id}/adjuntos/${attachmentId}/permanente`);
    }
};
