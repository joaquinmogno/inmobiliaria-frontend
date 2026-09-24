import api from './api';

export type OperationalAlertKey = 'LIQUIDACIONES_VENCIDAS' | 'COBROS_PENDIENTES' | 'PAGOS_PROPIETARIO_PENDIENTES' | 'ADELANTOS_A_RECUPERAR' | 'CONTRATOS_POR_VENCER';
export type AlertManagementStatus = 'PENDIENTE' | 'EN_SEGUIMIENTO' | 'RESUELTA';
export type AlertNotificationChannel = 'INTERNO' | 'EMAIL' | 'WHATSAPP';

export interface AlertResponsible {
    id: number;
    nombreCompleto: string;
    email: string;
}

export interface AlertManagementRecord {
    id: number;
    estado: AlertManagementStatus;
    observacion: string | null;
    canal: AlertNotificationChannel;
    destinatario: string | null;
    fechaCreacion: string;
    usuario: { id: number; nombreCompleto: string };
}

export interface OperationalAlertManagement {
    id: number;
    estado: AlertManagementStatus;
    canal: AlertNotificationChannel;
    destinatario: string | null;
    proximaRevision: string | null;
    resueltaEn: string | null;
    responsable: AlertResponsible | null;
    registros: AlertManagementRecord[];
}

export interface OperationalAlert {
    clave: OperationalAlertKey;
    titulo: string;
    descripcion: string;
    prioridad: 'ALTA' | 'MEDIA';
    enlace: string;
    cantidad: number;
    gestion: OperationalAlertManagement | null;
}

export interface OperationalAlertManagementInput {
    clave: OperationalAlertKey;
    responsableId: number | null;
    estado: AlertManagementStatus;
    observacion?: string;
    canal: AlertNotificationChannel;
    destinatario?: string;
    proximaRevision?: string | null;
}

export const alertasOperativasService = {
    getAll: async () => api.get<OperationalAlert[]>('/alertas-operativas'),
    getResponsibles: async () => api.get<AlertResponsible[]>('/alertas-operativas/responsables'),
    saveManagement: async (data: OperationalAlertManagementInput) => api.post<OperationalAlert>('/alertas-operativas/gestiones', data)
};
