import { useState } from 'react';
import { ArrowPathIcon } from '@heroicons/react/24/outline';
import AppSelect from '../components/AppSelect';
import { useAuth } from '../context/AuthContext';
import AuditLogSettings from '../features/settings/AuditLogSettings';
import BackupSettings from '../features/settings/BackupSettings';
import InstallationProfileSettings from '../features/settings/InstallationProfileSettings';

type ConfigTab = 'profile' | 'backups' | 'audit';

const ADMIN_TABS: Array<{ id: ConfigTab; label: string }> = [
    { id: 'profile', label: 'Inmobiliaria' },
    { id: 'backups', label: 'Backups' },
    { id: 'audit', label: 'Auditoría' }
];

export default function Configuracion() {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<ConfigTab>('profile');
    const [refreshToken, setRefreshToken] = useState(0);
    const availableTabs = user?.tipo === 'ADMIN' ? ADMIN_TABS : [];

    return (
        <div className="mx-auto w-full max-w-6xl animate-in space-y-8 fade-in duration-500">
            <header className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900">Configuración del Sistema</h1>
                    <p className="mt-1 text-gray-600">Gestión de respaldos y seguridad de datos.</p>
                </div>
                <button
                    onClick={() => setRefreshToken(current => current + 1)}
                    className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
                >
                    <ArrowPathIcon className="mr-2 h-4 w-4" />
                    Refrescar datos
                </button>
            </header>

            <label className="sr-only" htmlFor="configuration-section">Sección de configuración</label>
            <AppSelect
                id="configuration-section"
                ariaLabel="Sección de configuración"
                value={activeTab}
                onChange={value => setActiveTab(value as ConfigTab)}
                options={availableTabs.map(tab => ({ value: tab.id, label: tab.label }))}
                className="min-[390px]:hidden"
            />
            <nav className="hidden gap-1 overflow-x-auto rounded-lg border border-gray-200 bg-white p-1 min-[390px]:flex" aria-label="Secciones de configuración">
                {availableTabs.map(tab => (
                    <button
                        key={tab.id}
                        type="button"
                        onClick={() => setActiveTab(tab.id)}
                        aria-current={activeTab === tab.id ? 'page' : undefined}
                        className={`min-h-11 whitespace-nowrap rounded-md px-4 text-sm font-semibold ${activeTab === tab.id ? 'bg-indigo-600 text-white' : 'text-gray-700 hover:bg-gray-100'}`}
                    >
                        {tab.label}
                    </button>
                ))}
            </nav>

            {activeTab === 'profile' && <InstallationProfileSettings refreshToken={refreshToken} />}
            {activeTab === 'backups' && <BackupSettings refreshToken={refreshToken} />}
            {activeTab === 'audit' && <AuditLogSettings refreshToken={refreshToken} />}
        </div>
    );
}
