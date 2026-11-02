import { useState } from 'react';
import { ArrowPathIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../context/AuthContext';
import AuditLogSettings from '../features/settings/AuditLogSettings';
import BackupSettings from '../features/settings/BackupSettings';
import InstallationProfileSettings from '../features/settings/InstallationProfileSettings';
import BankAccountsSettings from '../features/settings/BankAccountsSettings';

type ConfigTab = 'profile' | 'bank-accounts' | 'backups' | 'audit';

const ADMIN_TABS: Array<{ id: ConfigTab; label: string }> = [
    { id: 'profile', label: 'Inmobiliaria' },
    { id: 'bank-accounts', label: 'Cuentas bancarias' },
    { id: 'backups', label: 'Backups' },
    { id: 'audit', label: 'Auditoría' }
];

export default function Configuracion() {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<ConfigTab>('profile');
    const [refreshToken, setRefreshToken] = useState(0);
    const availableTabs = user?.tipo === 'ADMIN' ? ADMIN_TABS : [];

    return (
        <div className="mx-auto w-full max-w-6xl space-y-6">
            <header className="ui-page-header">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">Configuración del Sistema</h1>
                    <p className="mt-1 text-sm text-gray-600 sm:text-base">Gestión de respaldos y seguridad de datos.</p>
                </div>
                <button
                    onClick={() => setRefreshToken(current => current + 1)}
                    className="ui-button ui-button-secondary"
                >
                    <ArrowPathIcon className="h-4 w-4" />
                    Refrescar datos
                </button>
            </header>

            <nav className="grid grid-cols-2 gap-1 rounded-lg border border-gray-200 bg-white p-1 sm:flex sm:flex-wrap" aria-label="Secciones de configuración">
                {availableTabs.map(tab => (
                    <button
                        key={tab.id}
                        type="button"
                        onClick={() => setActiveTab(tab.id)}
                        aria-current={activeTab === tab.id ? 'page' : undefined}
                        aria-controls="configuration-content"
                        className={`min-h-11 min-w-0 rounded-md px-3 py-2 text-sm font-semibold transition-colors sm:px-4 ${activeTab === tab.id ? 'bg-indigo-600 text-white' : 'text-gray-700 hover:bg-gray-100'}`}
                    >
                        {tab.label}
                    </button>
                ))}
            </nav>

            <div id="configuration-content" key={activeTab} className="ui-content-enter">
                {activeTab === 'profile' && <InstallationProfileSettings refreshToken={refreshToken} />}
                {activeTab === 'bank-accounts' && <BankAccountsSettings refreshToken={refreshToken} />}
                {activeTab === 'backups' && <BackupSettings refreshToken={refreshToken} />}
                {activeTab === 'audit' && <AuditLogSettings refreshToken={refreshToken} />}
            </div>
        </div>
    );
}
