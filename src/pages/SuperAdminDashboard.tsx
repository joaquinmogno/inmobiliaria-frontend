import { useEffect, useState } from 'react';
import { superadminService } from '../services/superadmin.service';
import type { SuperAdminMetrics, InmobiliariaClient } from '../services/superadmin.service';
import { 
    UsersIcon, 
    HomeModernIcon, 
    DocumentTextIcon, 
    BuildingOfficeIcon,
    PlusIcon,
    ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import NewInmobiliariaModal from '../components/NewInmobiliariaModal';

export default function SuperAdminDashboard() {
    const [metrics, setMetrics] = useState<SuperAdminMetrics | null>(null);
    const [inmobiliarias, setInmobiliarias] = useState<InmobiliariaClient[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const loadData = async () => {
        setLoading(true);
        try {
            const [metricsData, inmobiliariasData] = await Promise.all([
                superadminService.getMetrics(),
                superadminService.getInmobiliarias()
            ]);
            setMetrics(metricsData);
            setInmobiliarias(inmobiliariasData);
        } catch (error) {
            console.error('Error cargando superadmin', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const toggleStatus = async (id: number, currentStatus: boolean, name: string) => {
        const action = currentStatus ? "suspender" : "reactivar";
        if (window.confirm(`¿Estás seguro que deseas ${action} la inmobiliaria "${name}"?`)) {
            try {
                await superadminService.toggleStatus(id, !currentStatus);
                await loadData(); // Reload to reflect changes globally
            } catch {
                alert(`Error al ${action} la inmobiliaria.`);
            }
        }
    };

    if (loading) {
        return <div className="p-8 text-center text-gray-500">Cargando consola SaaS...</div>;
    }

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Consola SaaS</h1>
                    <p className="text-sm text-gray-500 mt-1">Super Administración Global de la Plataforma</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-2 bg-amber-500 text-white px-4 py-2 rounded-lg hover:bg-amber-600 transition-colors shadow-sm font-semibold"
                >
                    <PlusIcon className="w-5 h-5" />
                    Nueva Inmobiliaria
                </button>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
                    <div className="p-3 bg-amber-100 text-amber-600 rounded-lg">
                        <BuildingOfficeIcon className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-500">Total Inmobiliarias</p>
                        <p className="text-2xl font-bold text-gray-900">{metrics?.totalInmobiliarias || 0}</p>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
                    <div className="p-3 bg-blue-100 text-blue-600 rounded-lg">
                        <UsersIcon className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-500">Total Usuarios</p>
                        <p className="text-2xl font-bold text-gray-900">{metrics?.totalUsuarios || 0}</p>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
                    <div className="p-3 bg-indigo-100 text-indigo-600 rounded-lg">
                        <DocumentTextIcon className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-500">Total Contratos</p>
                        <p className="text-2xl font-bold text-gray-900">{metrics?.totalContratos || 0}</p>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
                    <div className="p-3 bg-emerald-100 text-emerald-600 rounded-lg">
                        <HomeModernIcon className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-500">Total Propiedades</p>
                        <p className="text-2xl font-bold text-gray-900">{metrics?.totalPropiedades || 0}</p>
                    </div>
                </div>
            </div>

            {/* Tabla de Clientes */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-100">
                    <h2 className="text-lg font-bold text-gray-900">Listado de Clientes (Inmobiliarias)</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-gray-50/80 text-xs uppercase font-semibold text-gray-500">
                            <tr>
                                <th className="px-6 py-4 border-b border-gray-100">ID</th>
                                <th className="px-6 py-4 border-b border-gray-100">Inmobiliaria</th>
                                <th className="px-6 py-4 border-b border-gray-100">Usuarios</th>
                                <th className="px-6 py-4 border-b border-gray-100">Contratos</th>
                                <th className="px-6 py-4 border-b border-gray-100">Propiedades</th>
                                <th className="px-6 py-4 border-b border-gray-100 text-center">Estado</th>
                                <th className="px-6 py-4 border-b border-gray-100 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {inmobiliarias.map(inmo => (
                                <tr key={inmo.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 text-sm font-medium text-gray-500">#{inmo.id}</td>
                                    <td className="px-6 py-4">
                                        <p className="text-sm font-bold text-gray-900">{inmo.nombre}</p>
                                        <p className="text-xs text-gray-400">Desde {new Date(inmo.fechaCreacion).toLocaleDateString()}</p>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-600">{inmo._count.usuarios}</td>
                                    <td className="px-6 py-4 text-sm text-gray-600">{inmo._count.contratos}</td>
                                    <td className="px-6 py-4 text-sm text-gray-600">{inmo._count.propiedades}</td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${inmo.activa ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                            {inmo.activa ? 'Activa' : 'Suspendida'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button 
                                            onClick={() => toggleStatus(inmo.id, inmo.activa, inmo.nombre)}
                                            className={`text-sm font-semibold px-3 py-1.5 rounded-lg border transition-colors ${inmo.activa 
                                                ? 'text-red-600 border-red-200 hover:bg-red-50' 
                                                : 'text-green-600 border-green-200 hover:bg-green-50'}`}
                                        >
                                            {inmo.activa ? 'Suspender' : 'Reactivar'}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {inmobiliarias.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                                        <ExclamationTriangleIcon className="w-8 h-8 mx-auto text-amber-500 mb-2" />
                                        No hay inmobiliarias registradas en el sistema.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <NewInmobiliariaModal 
                isOpen={isModalOpen} 
                onClose={() => setIsModalOpen(false)} 
                onSuccess={loadData} 
            />
        </div>
    );
}
