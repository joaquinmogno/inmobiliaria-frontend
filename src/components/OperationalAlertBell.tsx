import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react';
import { BellAlertIcon } from '@heroicons/react/24/outline';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { alertasOperativasService, type OperationalAlert } from '../services/alertas-operativas.service';

export default function OperationalAlertBell() {
    const [alerts, setAlerts] = useState<OperationalAlert[]>([]);

    useEffect(() => {
        let active = true;
        const refresh = async () => {
            try {
                const nextAlerts = await alertasOperativasService.getAll();
                if (active) setAlerts(nextAlerts);
            } catch {
                // Un fallo temporal no debe interrumpir el encabezado ni mostrar
                // un aviso intrusivo durante la navegación.
            }
        };
        void refresh();
        const interval = window.setInterval(() => void refresh(), 5 * 60_000);
        return () => {
            active = false;
            window.clearInterval(interval);
        };
    }, []);

    return <Menu as="div" className="relative mr-1">
        <MenuButton aria-label={`${alerts.length} alertas operativas activas`} className="relative inline-flex h-11 w-11 items-center justify-center rounded-lg text-white hover:bg-indigo-700/50">
            <BellAlertIcon className="h-6 w-6" />
            {alerts.length > 0 && <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[11px] font-black text-white ring-2 ring-indigo-700">{alerts.length}</span>}
        </MenuButton>
        <MenuItems anchor="bottom end" className="z-[200] mt-2 w-[min(24rem,calc(100vw-1.5rem))] overflow-hidden rounded-xl border border-gray-100 bg-white p-1 shadow-xl outline-none [--anchor-gap:4px]">
            <div className="border-b border-gray-100 px-3 py-2"><p className="font-bold text-gray-950">Alertas operativas</p><p className="text-xs text-gray-600">Recordatorios activos de la cartera</p></div>
            {alerts.map(alert => <MenuItem key={alert.clave}><Link to={alert.enlace} className="block rounded-lg px-3 py-3 text-sm text-gray-800 data-focus:bg-indigo-50 data-focus:text-indigo-800"><span className="flex items-start justify-between gap-3"><span><span className="block font-bold">{alert.titulo}</span><span className="mt-0.5 block text-xs text-gray-600">{alert.gestion?.responsable ? `Responsable: ${alert.gestion.responsable.nombreCompleto}` : 'Sin responsable asignado'}</span></span><span className={`rounded-full px-2 py-0.5 text-xs font-black ${alert.prioridad === 'ALTA' ? 'bg-red-100 text-red-800' : 'bg-indigo-100 text-indigo-800'}`}>{alert.cantidad}</span></span></Link></MenuItem>)}
            {alerts.length === 0 && <p className="px-3 py-5 text-center text-sm text-gray-600">No hay alertas activas.</p>}
            <MenuItem><Link to="/home#alertas-operativas" className="block rounded-lg border-t border-gray-100 px-3 py-3 text-sm font-bold text-indigo-800 data-focus:bg-indigo-50">Abrir seguimiento y bitácora</Link></MenuItem>
        </MenuItems>
    </Menu>;
}
