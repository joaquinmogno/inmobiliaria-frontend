import { useState, useEffect } from "react";
import {
    UserIcon,
    PlusIcon,
    PencilSquareIcon,
    TrashIcon,
    KeyIcon,
    ShieldCheckIcon,
} from "@heroicons/react/24/outline";
import { usersService, type CreateUserData, type Permission, type UserRole } from "../services/users.service";
import { type User } from "../services/auth.service";
import { useAuth } from "../context/AuthContext";
import {
    PERMISSION_LABELS,
    PERMISSION_GROUPS,
    ROLE_PRESETS,
    ROLE_LABELS,
    type PermissionKey,
    hasPermission,
} from "../utils/permissions";

const emptyForm = (): CreateUserData => ({
    email: "",
    nombreCompleto: "",
    rol: "AGENTE",
    password: "",
});

export default function Usuarios() {
    const { user: currentUser } = useAuth();
    const [users, setUsers] = useState<User[]>([]);
    const [permissionsCatalog, setPermissionsCatalog] = useState<Permission[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [formData, setFormData] = useState<CreateUserData>(emptyForm());
    const [selectedPermissions, setSelectedPermissions] = useState<PermissionKey[]>([]);
    const [selectedDeniedPermissions, setSelectedDeniedPermissions] = useState<PermissionKey[]>([]);
    const canViewUsers = hasPermission(currentUser, "usuarios.ver");
    const canCreateUsers = hasPermission(currentUser, "usuarios.crear");
    const canEditUsers = hasPermission(currentUser, "usuarios.editar");
    const canDeleteUsers = hasPermission(currentUser, "usuarios.eliminar");
    const canManagePermissions = hasPermission(currentUser, "usuarios.permisos");

    useEffect(() => {
        loadUsers();
    }, []);

    const loadUsers = async () => {
        try {
            setLoading(true);
            const [usersData, permissionsData] = await Promise.all([
                usersService.getAll(),
                canManagePermissions ? usersService.getPermissionsCatalog() : Promise.resolve([]),
            ]);
            setUsers(usersData);
            setPermissionsCatalog(permissionsData);
        } catch (error) {
            console.error("Error loading users:", error);
        } finally {
            setLoading(false);
        }
    };

    const openCreateModal = () => {
        if (!canCreateUsers) return;
        setEditingUser(null);
        setFormData(emptyForm());
        setSelectedPermissions([]);
        setSelectedDeniedPermissions([]);
        setIsModalOpen(true);
    };

    const openEditModal = (user: User) => {
        if (!canEditUsers && !canManagePermissions) return;
        setEditingUser(user);
        setFormData({
            email: user.email,
            nombreCompleto: user.nombreCompleto || user.fullName,
            rol: (user.rol || user.role) as UserRole,
            password: "",
        });
        setSelectedPermissions((user.directPermissions || []) as PermissionKey[]);
        setSelectedDeniedPermissions((user.deniedPermissions || []) as PermissionKey[]);
        setIsModalOpen(true);
    };

    const setPermissionDecision = (permission: PermissionKey, allowed: boolean) => {
        const inherited = editingUser?.inheritedPermissions?.includes(permission) || false;

        if (allowed) {
            setSelectedDeniedPermissions(prev => prev.filter(item => item !== permission));
            setSelectedPermissions(prev => {
                if (inherited) return prev.filter(item => item !== permission);
                return prev.includes(permission) ? prev : [...prev, permission];
            });
            return;
        }

        setSelectedPermissions(prev => prev.filter(item => item !== permission));
        setSelectedDeniedPermissions(prev => prev.includes(permission) ? prev : [...prev, permission]);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const savedUser = editingUser
                ? canEditUsers
                    ? await usersService.update(editingUser.id, {
                        email: formData.email,
                        nombreCompleto: formData.nombreCompleto,
                        rol: formData.rol,
                    })
                    : editingUser
                : await usersService.create(formData);

            if (canManagePermissions) {
                await usersService.updatePermissions(savedUser.id, selectedPermissions, selectedDeniedPermissions);
            }
            setIsModalOpen(false);
            setEditingUser(null);
            setFormData(emptyForm());
            setSelectedPermissions([]);
            setSelectedDeniedPermissions([]);
            loadUsers();
        } catch (error) {
            alert("Error al guardar usuario");
        }
    };

    const handleDelete = async (id: number) => {
        if (!canDeleteUsers) return;
        if (id === currentUser?.id) {
            alert("No puedes eliminar tu propio usuario");
            return;
        }
        if (window.confirm("¿Estás seguro de eliminar este usuario?")) {
            try {
                await usersService.delete(id);
                loadUsers();
            } catch (error) {
                alert("Error al eliminar usuario");
            }
        }
    };

    const handleResetPassword = async (id: number) => {
        if (!canEditUsers) return;
        const newPassword = window.prompt("Ingresa la nueva contraseña:");
        if (newPassword) {
            try {
                await usersService.resetPassword(id, newPassword);
                alert("Contraseña reseteada con éxito");
            } catch (error) {
                alert("Error al resetear contraseña");
            }
        }
    };

    const applyPreset = (permissions: PermissionKey[], deniedPermissions: PermissionKey[] = []) => {
        setSelectedPermissions(permissions);
        setSelectedDeniedPermissions(deniedPermissions);
    };

    if (!canViewUsers) {
        return (
            <div className="max-w-3xl mx-auto bg-white border border-red-100 rounded-2xl p-8 shadow-sm">
                <h1 className="text-2xl font-bold text-gray-900">Acceso denegado</h1>
                <p className="text-gray-500 mt-2">No tenés permisos para administrar usuarios.</p>
            </div>
        );
    }

    if (loading) return <div className="p-8 text-center">Cargando usuarios...</div>;

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Gestión de Equipo</h1>
                    <p className="text-gray-500 mt-1">Administra usuarios, roles y permisos de la inmobiliaria</p>
                </div>
                {canCreateUsers && (
                    <button
                        onClick={openCreateModal}
                        className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 font-semibold"
                    >
                        <PlusIcon className="w-5 h-5" />
                        Nuevo Usuario
                    </button>
                )}
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-gray-50/50 border-b border-gray-100">
                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Usuario</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Rol</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Permisos efectivos</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {users.map((teamUser) => (
                            <tr key={teamUser.id} className="hover:bg-gray-50/50 transition-colors">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="bg-indigo-100 p-2 rounded-lg">
                                            <UserIcon className="w-5 h-5 text-indigo-600" />
                                        </div>
                                        <div>
                                            <p className="font-semibold text-gray-900">{teamUser.nombreCompleto || teamUser.fullName}</p>
                                            <p className="text-sm text-gray-500">{teamUser.email}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${["SUPERADMIN", "OWNER", "JEFE", "ADMIN"].includes(teamUser.role) ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"}`}>
                                        {ROLE_LABELS[teamUser.role] || teamUser.role}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex flex-wrap gap-2 max-w-md">
                                        {(teamUser.permissions || []).length === 0 ? (
                                            <span className="text-xs text-gray-400">Sin permisos</span>
                                        ) : (
                                            (teamUser.permissions || [])
                                                .slice(0, 6)
                                                .map(permission => (
                                                    <span key={permission} className="px-2 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
                                                        {PERMISSION_LABELS[permission as PermissionKey]}
                                                    </span>
                                                )).concat((teamUser.permissions || []).length > 6 ? [
                                                    <span key="more" className="px-2 py-1 rounded-lg text-xs font-semibold bg-gray-50 text-gray-500 border border-gray-100">
                                                        +{(teamUser.permissions || []).length - 6}
                                                    </span>
                                                ] : [])
                                        )}
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex justify-end gap-2">
                                        {canEditUsers && <button
                                            onClick={() => handleResetPassword(teamUser.id)}
                                            className="p-2 text-gray-400 hover:text-indigo-600 transition-colors"
                                            title="Resetear contraseña"
                                        >
                                            <KeyIcon className="w-5 h-5" />
                                        </button>}
                                        {(canEditUsers || canManagePermissions) && <button
                                            onClick={() => openEditModal(teamUser)}
                                            className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                                            title="Editar usuario y permisos"
                                        >
                                            <PencilSquareIcon className="w-5 h-5" />
                                        </button>}
                                        {canDeleteUsers && <button
                                            onClick={() => handleDelete(teamUser.id)}
                                            className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                                            title="Eliminar usuario"
                                        >
                                            <TrashIcon className="w-5 h-5" />
                                        </button>}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-2xl shadow-2xl">
                        <h2 className="text-xl font-bold mb-4">
                            {editingUser ? "Editar Usuario" : "Nuevo Usuario"}
                        </h2>
                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Completo</label>
                                    <input
                                        type="text"
                                        required
                                        disabled={!!editingUser && !canEditUsers}
                                        className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                                        value={formData.nombreCompleto}
                                        onChange={(e) => setFormData({ ...formData, nombreCompleto: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                    <input
                                        type="email"
                                        required
                                        disabled={!!editingUser && !canEditUsers}
                                        className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    />
                                </div>
                                {!editingUser && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
                                        <input
                                            type="password"
                                            required
                                            className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                                            value={formData.password}
                                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        />
                                    </div>
                                )}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Rol</label>
                                    <select
                                        className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                                        value={formData.rol}
                                        disabled={!!editingUser && !canEditUsers}
                                        onChange={(e) => setFormData({ ...formData, rol: e.target.value as UserRole })}
                                    >
                                        <option value="AGENTE">Agente</option>
                                        <option value="ADMIN">Administrador</option>
                                        <option value="JEFE">Jefe</option>
                                        <option value="OWNER">Owner</option>
                                    </select>
                                </div>
                            </div>

                            {canManagePermissions && (
                            <div className="border border-gray-100 rounded-2xl p-4 bg-gray-50 max-h-[48vh] overflow-y-auto">
                                <div className="flex items-center gap-2 mb-3">
                                    <ShieldCheckIcon className="w-5 h-5 text-indigo-600" />
                                    <div>
                                        <p className="text-sm font-bold text-gray-900">Permisos</p>
                                        <p className="text-xs text-gray-500">Elegí Permitir o No permitir. No permitir tiene prioridad aunque el rol incluya ese permiso.</p>
                                    </div>
                                </div>
                                <div className="mb-4">
                                    <p className="text-xs font-black uppercase tracking-wide text-gray-500 mb-2">Plantillas de roles</p>
                                    <div className="flex flex-wrap gap-2">
                                        {ROLE_PRESETS.map(preset => (
                                            <button
                                                key={preset.name}
                                                type="button"
                                                onClick={() => applyPreset(preset.permissions, preset.deniedPermissions || [])}
                                                className="px-3 py-1.5 rounded-lg border border-indigo-100 bg-white text-xs font-bold text-indigo-700 hover:bg-indigo-50 transition-colors"
                                            >
                                                {preset.name}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="space-y-5">
                                    {PERMISSION_GROUPS.map(group => (
                                        <div key={group.title} className="bg-white border border-gray-100 rounded-xl overflow-hidden">
                                            <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
                                                <p className="text-xs font-black uppercase tracking-wide text-gray-500">{group.title}</p>
                                            </div>
                                            <div className="divide-y divide-gray-50">
                                                {group.permissions
                                                    .filter(permission => permissionsCatalog.some(item => item.clave === permission))
                                                    .map(permission => {
                                                        const inherited = editingUser?.inheritedPermissions?.includes(permission) || false;
                                                        const denied = selectedDeniedPermissions.includes(permission);
                                                        const allowed = !denied && (inherited || selectedPermissions.includes(permission));

                                                        return (
                                                            <div key={permission} className="grid grid-cols-1 gap-3 px-4 py-3 md:grid-cols-[1fr_auto_auto] md:items-center">
                                                                <div>
                                                                    <p className="text-sm font-bold text-gray-800">{PERMISSION_LABELS[permission]}</p>
                                                                    <p className="text-xs text-gray-500">
                                                                        {permission}
                                                                        {inherited && <span className="ml-2 text-indigo-600 font-semibold">Incluido por rol</span>}
                                                                    </p>
                                                                </div>
                                                                <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-1">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setPermissionDecision(permission, true)}
                                                                        className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${allowed ? "bg-emerald-600 text-white shadow-sm" : "text-gray-500 hover:text-emerald-700"}`}
                                                                        aria-pressed={allowed}
                                                                    >
                                                                        Permitir
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setPermissionDecision(permission, false)}
                                                                        className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${!allowed ? "bg-red-600 text-white shadow-sm" : "text-gray-500 hover:text-red-700"}`}
                                                                        aria-pressed={!allowed}
                                                                    >
                                                                        No permitir
                                                                    </button>
                                                                </div>
                                                                <div className="md:text-right">
                                                                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${allowed ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
                                                                        {allowed ? "Permitido" : "No permitido"}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            )}

                            <div className="flex justify-end gap-3 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="px-6 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all font-semibold shadow-lg shadow-indigo-100"
                                >
                                    Guardar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
