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
        <div className="ui-page">
            <header className="ui-page-header">
                <div>
                    <h1 className="ui-title">Configuración del Sistema</h1>
                </div>
                <button
                    onClick={() => setRefreshToken(current => current + 1)}
                    className="ui-button ui-button-secondary"
                >
                    <ArrowPathIcon className="h-4 w-4" />
                    Refrescar datos
                </button>
            </header>

            <nav className="ui-tabs" aria-label="Secciones de configuración">
                {availableTabs.map(tab => (
                    <button
                        key={tab.id}
                        type="button"
                        onClick={() => setActiveTab(tab.id)}
                        aria-current={activeTab === tab.id ? 'page' : undefined}
                        aria-controls="configuration-content"
                        className={"ui-tab"}
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
