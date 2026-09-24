import { useCallback, useEffect, useState } from 'react';
import {
    ArchiveBoxIcon,
    ArrowDownTrayIcon,
    ArrowPathIcon,
    CloudArrowUpIcon,
    ShieldCheckIcon,
    Square3Stack3DIcon,
    TrashIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { backupsService, type BackupFile } from '../../services/backups.service';
import { requestConfirmation } from '../../services/confirmation';
import { formatDateTime } from '../../utils/date';

const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const base = 1024;
    const units = ['Bytes', 'KB', 'MB', 'GB'];
    const unitIndex = Math.floor(Math.log(bytes) / Math.log(base));
    return `${parseFloat((bytes / Math.pow(base, unitIndex)).toFixed(2))} ${units[unitIndex]}`;
};

export default function BackupSettings({ refreshToken }: { refreshToken: number }) {
    const [backups, setBackups] = useState<BackupFile[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    const loadBackups = useCallback(async () => {
        setLoading(true);
        try {
            setBackups(await backupsService.getAll());
        } catch (error) {
            console.error('Error loading backups:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { void loadBackups(); }, [loadBackups, refreshToken]);

    const createBackup = async (type: 'db' | 'uploads') => {
        setActionLoading(type);
        try {
            if (type === 'db') await backupsService.createDbBackup();
            else await backupsService.createUploadsBackup();
            await loadBackups();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'No se pudo crear el backup');
        } finally {
            setActionLoading(null);
        }
    };

    const deleteBackup = async (file: BackupFile) => {
        const confirmed = await requestConfirmation({
            title: 'Eliminar backup',
            message: `Se eliminará definitivamente ${file.name}. Esta acción no se puede deshacer.`,
            confirmText: 'Eliminar'
        });
        if (!confirmed) return;
        try {
            await backupsService.deleteBackup(file.type, file.name);
            await loadBackups();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'No se pudo eliminar el backup');
        }
    };

    const downloadBackup = async (file: BackupFile) => {
        setActionLoading(`download:${file.name}`);
        try {
            await backupsService.downloadBackup(file.type, file.name);
            toast.success('Backup descargado correctamente');
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'No se pudo descargar el backup');
        } finally {
            setActionLoading(null);
        }
    };

    return (
        <section className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-1">
                <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                    <h2 className="mb-4 flex items-center text-lg font-semibold text-gray-900">
                        <ShieldCheckIcon className="mr-2 h-5 w-5 text-indigo-600" />
                        Acciones de Respaldo
                    </h2>
                    <div className="space-y-4">
                        <button
                            onClick={() => void createBackup('db')}
                            disabled={actionLoading !== null}
                            className="group flex w-full items-center justify-between rounded-xl border border-indigo-100 bg-indigo-50 p-4 text-indigo-700 transition-all hover:bg-indigo-100 disabled:opacity-50"
                        >
                            <span className="flex items-center">
                                <Square3Stack3DIcon className="mr-3 h-6 w-6" />
                                <span className="text-left"><span className="block font-bold">Base de Datos</span><span className="block text-xs opacity-80">{actionLoading === 'db' ? 'Ejecutando respaldo...' : 'Respaldar tablas y registros'}</span></span>
                            </span>
                            {actionLoading === 'db' ? <ArrowPathIcon className="h-5 w-5 animate-spin" /> : <CloudArrowUpIcon className="h-5 w-5" />}
                        </button>
                        <button
                            onClick={() => void createBackup('uploads')}
                            disabled={actionLoading !== null}
                            className="group flex w-full items-center justify-between rounded-xl border border-emerald-100 bg-emerald-50 p-4 text-emerald-700 transition-all hover:bg-emerald-100 disabled:opacity-50"
                        >
                            <span className="flex items-center">
                                <ArchiveBoxIcon className="mr-3 h-6 w-6" />
                                <span className="text-left"><span className="block font-bold">Archivos Subidos</span><span className="block text-xs opacity-80">{actionLoading === 'uploads' ? 'Ejecutando respaldo...' : 'Respaldar carpetas de uploads'}</span></span>
                            </span>
                            {actionLoading === 'uploads' ? <ArrowPathIcon className="h-5 w-5 animate-spin" /> : <CloudArrowUpIcon className="h-5 w-5" />}
                        </button>
                    </div>
                    <div className="mt-8 border-t border-gray-100 pt-6">
                        <div className="rounded-lg border border-amber-100 bg-amber-50 p-3 text-xs leading-relaxed text-amber-700">
                            <strong className="mb-1 block text-sm text-amber-800">Nota sobre seguridad</strong>
                            Los backups se almacenan localmente en el servidor. Recomendamos descargarlos periódicamente a un dispositivo externo.
                        </div>
                    </div>
                </div>
            </div>

            <div className="lg:col-span-2">
                <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
                    <div className="border-b border-gray-100 p-6"><h2 className="text-lg font-semibold text-gray-900">Backups Existentes</h2></div>
                    <div className="overflow-x-auto">
                        <div className="divide-y divide-gray-100 2xl:hidden">
                            {loading ? <div className="p-6 text-content-muted">Cargando backups...</div> : backups.length === 0
                                ? <div className="px-6 py-12 text-center text-content-muted">No hay archivos de backup disponibles.</div>
                                : backups.map(file => (
                                    <article key={file.name} className="p-4">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0"><p className="break-all text-sm font-black text-gray-900">{file.name}</p><p className="mt-1 text-xs text-content-muted">{formatDateTime(file.date)} · {formatSize(file.size)}</p></div>
                                            <span className={`shrink-0 rounded px-2 py-1 text-xs font-bold ${file.type === 'db' ? 'bg-blue-100 text-blue-800' : 'bg-emerald-100 text-emerald-800'}`}>{file.type === 'db' ? 'DB' : 'Archivos'}</span>
                                        </div>
                                        <div className="mt-3 grid grid-cols-2 gap-2">
                                            <button onClick={() => void downloadBackup(file)} disabled={actionLoading === `download:${file.name}`} className="min-h-11 rounded-xl bg-indigo-50 px-3 text-xs font-bold text-indigo-700 disabled:opacity-50">{actionLoading === `download:${file.name}` ? 'Descargando...' : 'Descargar'}</button>
                                            <button onClick={() => void deleteBackup(file)} data-danger-trigger="true" className="destructive-action min-h-11 rounded-xl px-3 text-xs font-bold transition-colors">Eliminar</button>
                                        </div>
                                    </article>
                                ))}
                        </div>
                        <table className="hidden w-full text-left 2xl:table">
                            <thead className="border-b border-gray-100 bg-gray-50 text-xs font-semibold uppercase tracking-wider text-content-muted"><tr><th className="px-6 py-3">Archivo</th><th className="px-6 py-3">Tipo</th><th className="px-6 py-3">Tamaño</th><th className="px-6 py-3">Fecha</th><th className="sticky right-0 z-20 bg-gray-50 px-6 py-3 text-right shadow-[-8px_0_12px_-12px_rgba(15,23,42,0.65)]">Acciones</th></tr></thead>
                            <tbody className="divide-y divide-gray-100 text-sm">
                                {loading ? <tr><td colSpan={5} className="px-6 py-12 text-center text-content-muted">Cargando backups...</td></tr> : backups.length === 0
                                    ? <tr><td colSpan={5} className="px-6 py-12 text-center text-content-muted">No hay archivos de backup disponibles.</td></tr>
                                    : backups.map(file => (
                                        <tr key={file.name} className="transition-colors hover:bg-gray-50">
                                            <td className="max-w-[200px] truncate px-6 py-4 font-medium text-gray-900" title={file.name}>{file.name}</td>
                                            <td className="px-6 py-4"><span className={`rounded px-2 py-0.5 text-xs font-medium ${file.type === 'db' ? 'bg-blue-100 text-blue-800' : 'bg-emerald-100 text-emerald-800'}`}>{file.type === 'db' ? 'Base de Datos' : 'Archivos'}</span></td>
                                            <td className="px-6 py-4 text-content-muted">{formatSize(file.size)}</td>
                                            <td className="whitespace-nowrap px-6 py-4 text-content-muted">{formatDateTime(file.date)}</td>
                                            <td className="sticky right-0 z-10 whitespace-nowrap bg-white px-6 py-4 text-right shadow-[-8px_0_12px_-12px_rgba(15,23,42,0.65)]">
                                                <button onClick={() => void downloadBackup(file)} disabled={actionLoading === `download:${file.name}`} className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-indigo-600 hover:bg-indigo-50 disabled:opacity-50" title="Descargar">{actionLoading === `download:${file.name}` ? <ArrowPathIcon className="h-5 w-5 animate-spin" /> : <ArrowDownTrayIcon className="h-5 w-5" />}</button>
                                                <button onClick={() => void deleteBackup(file)} data-danger-trigger="true" className="destructive-icon-action inline-flex h-11 w-11 items-center justify-center rounded-lg transition-colors" title="Eliminar"><TrashIcon className="h-5 w-5" /></button>
                                            </td>
                                        </tr>
                                    ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </section>
    );
}
