import { useState, useEffect } from "react";
import {
    UserIcon,
    PlusIcon,
    PencilSquareIcon,
    TrashIcon,
    KeyIcon,
} from "@heroicons/react/24/outline";
import { usersService, type CreateUserData } from "../services/users.service";
import { type User } from "../services/auth.service";
import { useAuth } from "../context/AuthContext";

export default function Usuarios() {
    const { user: currentUser } = useAuth();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [formData, setFormData] = useState<CreateUserData>({
        email: "",
        nombreCompleto: "",
        rol: "AGENTE",
        password: "",
    });

    useEffect(() => {
        loadUsers();
    }, []);

    const loadUsers = async () => {
        try {
            const data = await usersService.getAll();
            setUsers(data);
        } catch (error) {
            console.error("Error loading users:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingUser) {
                await usersService.update(editingUser.id, {
                    email: formData.email,
                    nombreCompleto: formData.nombreCompleto,
                    rol: formData.rol,
                });
            } else {
                await usersService.create(formData);
            }
            setIsModalOpen(false);
            setEditingUser(null);
            setFormData({ email: "", nombreCompleto: "", rol: "AGENTE", password: "" });
            loadUsers();
        } catch (error) {
            alert("Error al guardar usuario");
        }
    };

    const handleDelete = async (id: number) => {
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

    if (loading) return <div className="p-8 text-center">Cargando usuarios...</div>;

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Gestión de Equipo</h1>
                    <p className="text-gray-500 mt-1">Administra los usuarios de tu inmobiliaria</p>
                </div>
                <button
                    onClick={() => {
                        setEditingUser(null);
                        setFormData({ email: "", nombreCompleto: "", rol: "AGENTE", password: "" });
                        setIsModalOpen(true);
                    }}
                    className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 font-semibold"
                >
                    <PlusIcon className="w-5 h-5" />
                    Nuevo Usuario
                </button>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-gray-50/50 border-b border-gray-100">
                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Usuario</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Rol</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {users.map((u) => (
                            <tr key={u.id} className="hover:bg-gray-50/50 transition-colors">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="bg-indigo-100 p-2 rounded-lg">
                                            <UserIcon className="w-5 h-5 text-indigo-600" />
                                        </div>
                                        <div>
                                            <p className="font-semibold text-gray-900">{u.fullName}</p>
                                            <p className="text-sm text-gray-500">{u.email}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${u.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                                        }`}>
                                        {u.role}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex justify-end gap-2">
                                        <button
                                            onClick={() => handleResetPassword(u.id)}
                                            className="p-2 text-gray-400 hover:text-indigo-600 transition-colors"
                                            title="Resetear Contraseña"
                                        >
                                            <KeyIcon className="w-5 h-5" />
                                        </button>
                                        <button
                                            onClick={() => {
                                                setEditingUser(u);
                                                setFormData({
                                                    email: u.email,
                                                    nombreCompleto: u.fullName,
                                                    rol: u.role as 'ADMIN' | 'AGENTE',
                                                    password: ""
                                                });
                                                setIsModalOpen(true);
                                            }}
                                            className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                                            title="Editar"
                                        >
                                            <PencilSquareIcon className="w-5 h-5" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(u.id)}
                                            className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                                            title="Eliminar"
                                        >
                                            <TrashIcon className="w-5 h-5" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Modal Simple (puedes mejorarlo con Headless UI Dialog si prefieres consistencia total) */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
                        <h2 className="text-xl font-bold mb-4">
                            {editingUser ? "Editar Usuario" : "Nuevo Usuario"}
                        </h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Completo</label>
                                <input
                                    type="text"
                                    required
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
                                    onChange={(e) => setFormData({ ...formData, rol: e.target.value as 'ADMIN' | 'AGENTE' })}
                                >
                                    <option value="AGENTE">Agente</option>
                                    <option value="ADMIN">Administrador</option>
                                </select>
                            </div>
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
