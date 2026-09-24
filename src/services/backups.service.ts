import api, { getFilenameFromDisposition } from './api';
import { requestReauthentication } from './reauthentication';

export interface BackupFile {
    name: string;
    size: number;
    date: string;
    type: 'db' | 'uploads';
}

export const backupsService = {
    getAll: async (): Promise<BackupFile[]> => {
        return await api.get<BackupFile[]>('/backups');
    },

    createDbBackup: async () => {
        return await api.post('/backups/db');
    },

    createUploadsBackup: async () => {
        return await api.post('/backups/uploads');
    },

    deleteBackup: async (type: 'db' | 'uploads', filename: string) => {
        return await api.delete(`/backups/${type}/${filename}`);
    },

    downloadBackup: async (type: 'db' | 'uploads', filename: string, retried = false): Promise<void> => {
        const envUrl = import.meta.env.VITE_API_URL;
        const baseUrl = envUrl ? (envUrl.endsWith('/api') ? envUrl : `${envUrl}/api`) : 'http://localhost:3000/api';
        const response = await fetch(`${baseUrl}/backups/download/${type}/${encodeURIComponent(filename)}`, {
            credentials: 'include',
            cache: 'no-store'
        });

        if (response.status === 403 && !retried) {
            const payload = await response.json().catch(() => ({}));
            if (payload.code === 'REAUTHENTICATION_REQUIRED') {
                const password = await requestReauthentication();
                if (!password) throw new Error('Operación cancelada');
                await api.post('/auth/reauthenticate', { password });
                return backupsService.downloadBackup(type, filename, true);
            }
        }
        if (!response.ok) throw new Error('Error al descargar el archivo');

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = getFilenameFromDisposition(response.headers.get('content-disposition'))
            || filename.replace(/\.enc$/, '');
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.setTimeout(() => window.URL.revokeObjectURL(url), 0);
    }
};
