import api from './api';

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

    downloadBackup: async (type: 'db' | 'uploads', filename: string) => {
        const token = localStorage.getItem('token');
        const envUrl = import.meta.env.VITE_API_URL;
        const baseUrl = envUrl ? (envUrl.endsWith('/api') ? envUrl : `${envUrl}/api`) : 'http://localhost:3000/api';
        const response = await fetch(`${baseUrl}/backups/download/${type}/${filename}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) throw new Error('Error al descargar el archivo');

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
    }
};
