import { useState, useEffect } from "react";
import { backupsService, type BackupFile } from "../services/backups.service";
import {
  Square3Stack3DIcon,
  CloudArrowUpIcon,
  ArchiveBoxIcon,
  TrashIcon,
  ArrowDownTrayIcon,
  ArrowPathIcon,
  ShieldCheckIcon,
  BuildingOfficeIcon,
  ListBulletIcon,
} from "@heroicons/react/24/outline";
import { inmobiliariaService, type Inmobiliaria } from "../services/inmobiliaria.service";
import { auditService, type AuditLog } from "../services/audit.service";
import { useAuth } from "../context/AuthContext";

export default function Configuracion() {
  const [backups, setBackups] = useState<BackupFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const { user, updateInmobiliaria } = useAuth();
  const [inmobiliaria, setInmobiliaria] = useState<Partial<Inmobiliaria>>({});
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsTotal, setLogsTotal] = useState(0);
  const [logsPage, setLogsPage] = useState(1);
  const [logsActionFilter, setLogsActionFilter] = useState('');
  const [logsDateFrom, setLogsDateFrom] = useState('');
  const [logsDateTo, setLogsDateTo] = useState('');
  const logsLimit = 15;

  useEffect(() => {
    loadBackups();
    loadInmobiliaria();
    loadLogs();
  }, []);

  const loadInmobiliaria = async () => {
    try {
      const data = await inmobiliariaService.getMe();
      setInmobiliaria(data);
    } catch (error) {
      console.error("Error loading inmobiliaria:", error);
    }
  };

  const loadBackups = async () => {
    setLoading(true);
    try {
      const data = await backupsService.getAll();
      setBackups(data);
    } catch (error) {
      console.error("Error loading backups:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadLogs = async (page = 1) => {
    setLogsLoading(true);
    try {
      const response = await auditService.getLogs({
        page,
        limit: logsLimit,
        accion: logsActionFilter || undefined,
        fechaDesde: logsDateFrom || undefined,
        fechaHasta: logsDateTo || undefined
      });
      setLogs(response.data);
      setLogsTotal(response.total);
      setLogsPage(response.page);
    } catch (error) {
      console.error("Error loading logs:", error);
    } finally {
      setLogsLoading(false);
    }
  };

  const handleNextPage = () => {
    if (logsPage * logsLimit < logsTotal) {
      loadLogs(logsPage + 1);
    }
  };

  const handlePrevPage = () => {
    if (logsPage > 1) {
      loadLogs(logsPage - 1);
    }
  };

  const handleClearFilters = () => {
    setLogsActionFilter('');
    setLogsDateFrom('');
    setLogsDateTo('');
    // Al react setState ser asíncrono, si llamamos loadLogs aquí puede no tomar los valores vacíos,
    // es mejor pasarlos manualmente a una función temporal o forzar un timeout, pero la forma 
    // limpia es que React reaccione, o simplemente:
    setLogsLoading(true);
    auditService.getLogs({ page: 1, limit: logsLimit }).then(res => {
      setLogs(res.data);
      setLogsTotal(res.total);
      setLogsPage(res.page);
      setLogsLoading(false);
    });
  };

  const handleCreateDbBackup = async () => {
    setActionLoading("db");
    try {
      await backupsService.createDbBackup();
      await loadBackups();
    } catch (error: any) {
      alert(error.message || "Error al crear backup de base de datos");
    } finally {
      setActionLoading(null);
    }
  };

  const handleCreateUploadsBackup = async () => {
    setActionLoading("uploads");
    try {
      await backupsService.createUploadsBackup();
      await loadBackups();
    } catch (error: any) {
      alert(error.message || "Error al crear backup de archivos");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (type: 'db' | 'uploads', filename: string) => {
    if (!window.confirm("¿Estás seguro de que deseas eliminar este backup?")) return;
    try {
      await backupsService.deleteBackup(type, filename);
      await loadBackups();
    } catch (error) {
      alert("Error al eliminar backup");
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileLoading(true);
    setProfileSuccess(false);
    try {
      await inmobiliariaService.updateMe(inmobiliaria);
      if (inmobiliaria.nombre) {
        updateInmobiliaria(inmobiliaria.nombre);
      }
      setProfileSuccess(true);
      setTimeout(() => setProfileSuccess(false), 3000);
      // Opcional: Recargar la página o actualizar el contexto para que el Header cambie
      // window.location.reload(); 
    } catch (error) {
      alert("Error al actualizar el perfil");
    } finally {
      setProfileLoading(false);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <div className="max-w-6xl mx-auto w-full space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Configuración del Sistema</h1>
          <p className="text-gray-500 mt-1">Gestión de respaldos y seguridad de datos.</p>
        </div>
        <button 
          onClick={() => {
            loadBackups();
            loadInmobiliaria();
            loadLogs();
          }}
          className="inline-flex items-center px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
        >
          <ArrowPathIcon className={`w-4 h-4 mr-2 ${loading || profileLoading || logsLoading ? 'animate-spin' : ''}`} />
          Refrescar datos
        </button>
      </div>

      {/* Sección Perfil Inmobiliaria */}
      {user?.role === 'ADMIN' && (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <BuildingOfficeIcon className="w-5 h-5 mr-2 text-indigo-600" />
            Perfil de la Inmobiliaria
          </h2>
          {profileSuccess && (
            <span className="text-sm text-emerald-600 font-medium animate-in fade-in slide-in-from-right-4">
              ✓ Cambios guardados con éxito
            </span>
          )}
        </div>
        <form onSubmit={handleUpdateProfile} className="p-6">
          <div className="max-w-md">
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de la Inmobiliaria</label>
            <div className="flex gap-4">
              <input
                type="text"
                value={inmobiliaria.nombre || ''}
                onChange={(e) => setInmobiliaria({...inmobiliaria, nombre: e.target.value})}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                required
              />
              <button
                type="submit"
                disabled={profileLoading}
                className={`px-6 py-2 rounded-lg text-white font-semibold transition-all shadow-md ${
                  profileLoading ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 active:scale-95'
                }`}
              >
                {profileLoading ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </form>
      </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Panel de Acciones */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <ShieldCheckIcon className="w-5 h-5 mr-2 text-indigo-600" />
              Acciones de Respaldo
            </h2>
            <div className="space-y-4">
              <button
                onClick={handleCreateDbBackup}
                disabled={actionLoading !== null}
                className="w-full flex items-center justify-between p-4 bg-indigo-50 border border-indigo-100 rounded-xl text-indigo-700 hover:bg-indigo-100 transition-all group disabled:opacity-50"
              >
                <div className="flex items-center">
                  <Square3Stack3DIcon className="w-6 h-6 mr-3" />
                  <div className="text-left">
                    <p className="font-bold">Base de Datos</p>
                    <p className="text-xs opacity-80">
                      {actionLoading === 'db' ? 'Ejecutando respaldo...' : 'Respaldar tablas y registros'}
                    </p>
                  </div>
                </div>
                {actionLoading === 'db' ? (
                  <ArrowPathIcon className="w-5 h-5 animate-spin" />
                ) : (
                  <CloudArrowUpIcon className="w-5 h-5 group-hover:translate-y-[-2px] transition-transform" />
                )}
              </button>

              <button
                onClick={handleCreateUploadsBackup}
                disabled={actionLoading !== null}
                className="w-full flex items-center justify-between p-4 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-700 hover:bg-emerald-100 transition-all group disabled:opacity-50"
              >
                <div className="flex items-center">
                  <ArchiveBoxIcon className="w-6 h-6 mr-3" />
                  <div className="text-left">
                    <p className="font-bold">Archivos Subidos</p>
                    <p className="text-xs opacity-80">
                      {actionLoading === 'uploads' ? 'Ejecutando respaldo (puede demorar)...' : 'Respaldar carpetas de uploads'}
                    </p>
                  </div>
                </div>
                {actionLoading === 'uploads' ? (
                  <ArrowPathIcon className="w-5 h-5 animate-spin" />
                ) : (
                  <CloudArrowUpIcon className="w-5 h-5 group-hover:translate-y-[-2px] transition-transform" />
                )}
              </button>
            </div>
            
            <div className="mt-8 pt-6 border-t border-gray-100">
              <div className="flex items-start bg-amber-50 p-3 rounded-lg border border-amber-100">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-amber-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-amber-800">Nota sobre seguridad</h3>
                  <div className="mt-1 text-xs text-amber-700 leading-relaxed">
                    Los backups se almacenan localmente en el servidor. Recomendamos descargarlos periódicamente a un dispositivo externo.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabla de Backups */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">Backups Existentes</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-3">Archivo</th>
                    <th className="px-6 py-3">Tipo</th>
                    <th className="px-6 py-3">Tamaño</th>
                    <th className="px-6 py-3">Fecha</th>
                    <th className="px-6 py-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm">
                  {loading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        <td colSpan={5} className="px-6 py-4">
                          <div className="h-4 bg-gray-100 rounded w-full"></div>
                        </td>
                      </tr>
                    ))
                  ) : (backups || []).length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                        No hay archivos de backup disponibles.
                      </td>
                    </tr>
                  ) : (
                    backups.map((file) => (
                      <tr key={file.name} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 font-medium text-gray-900 truncate max-w-[200px]" title={file.name}>
                          {file.name}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                            file.type === 'db' ? 'bg-blue-100 text-blue-800' : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {file.type === 'db' ? 'Base de Datos' : 'Archivos'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-gray-500">
                          {formatSize(file.size)}
                        </td>
                        <td className="px-6 py-4 text-gray-500 whitespace-nowrap">
                          {new Date(file.date).toLocaleString('es-AR')}
                        </td>
                        <td className="px-6 py-4 text-right space-x-2 whitespace-nowrap">
                          <button
                            onClick={() => backupsService.downloadBackup(file.type, file.name)}
                            className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="Descargar"
                          >
                            <ArrowDownTrayIcon className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleDelete(file.type, file.name)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Eliminar"
                          >
                            <TrashIcon className="w-5 h-5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Registro de Auditoría */}
      {user?.role === 'ADMIN' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
              <ListBulletIcon className="w-5 h-5 mr-2 text-indigo-600" />
              Registro de Actividad (Auditoría)
            </h2>
          </div>
          
          {/* Barra de Filtros */}
          <div className="p-4 border-b border-gray-100 bg-gray-50 flex flex-wrap gap-4 items-end">
             <div className="flex-1 min-w-[200px]">
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Acción (ej. CREAR_CONTRATO)</label>
                <input 
                  type="text" 
                  value={logsActionFilter} 
                  onChange={e => setLogsActionFilter(e.target.value.toUpperCase())}
                  placeholder="Buscar por acción..."
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
             </div>
             <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Desde</label>
                <input 
                  type="date" 
                  value={logsDateFrom} 
                  onChange={e => setLogsDateFrom(e.target.value)}
                  className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
             </div>
             <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Hasta</label>
                <input 
                  type="date" 
                  value={logsDateTo} 
                  onChange={e => setLogsDateTo(e.target.value)}
                  className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
             </div>
             <div className="flex gap-2">
                <button 
                  onClick={() => loadLogs(1)}
                  className="px-4 py-2 bg-indigo-600 text-white font-bold text-sm rounded-lg shadow-sm hover:bg-indigo-700 transition-colors"
                >
                  Filtrar
                </button>
                <button 
                  onClick={handleClearFilters}
                  className="px-4 py-2 bg-white border border-gray-200 text-gray-600 font-bold text-sm rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Limpiar
                </button>
             </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3">Acción</th>
                  <th className="px-6 py-3">Usuario</th>
                  <th className="px-6 py-3">Detalle</th>
                  <th className="px-6 py-3">Fecha</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {logsLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td colSpan={4} className="px-6 py-4">
                        <div className="h-4 bg-gray-100 rounded w-full"></div>
                      </td>
                    </tr>
                  ))
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-gray-400 italic">
                      No se han registrado acciones críticas aún.
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                          {log.accion.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-medium text-gray-900">
                        {log.usuario?.nombreCompleto || 'Sistema'}
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        {log.detalle || '-'}
                        {log.entidadId && (
                          <span className="ml-2 text-xs text-gray-400">
                            ({log.entidad} #{log.entidadId})
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-gray-500 whitespace-nowrap">
                        {new Date(log.fechaCreacion).toLocaleString('es-AR')}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
            <p className="text-sm text-gray-500 font-medium">
              Mostrando página <span className="font-bold">{logsPage}</span> de {Math.max(1, Math.ceil(logsTotal / logsLimit))} 
              <span className="mx-2">·</span> 
              {logsTotal} registros en total
            </p>
            <div className="flex gap-2">
              <button 
                onClick={handlePrevPage}
                disabled={logsPage <= 1 || logsLoading}
                className="px-4 py-2 border border-gray-200 bg-white rounded-lg text-sm font-bold text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                Anterior
              </button>
              <button 
                onClick={handleNextPage}
                disabled={logsPage * logsLimit >= logsTotal || logsLoading}
                className="px-4 py-2 border border-gray-200 bg-white rounded-lg text-sm font-bold text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                Siguiente
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
