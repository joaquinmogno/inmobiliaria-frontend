import { Dialog, Transition } from '@headlessui/react';
import { Fragment, useState } from 'react';
import { superadminService } from '../services/superadmin.service';

interface NewInmobiliariaModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export default function NewInmobiliariaModal({ isOpen, onClose, onSuccess }: NewInmobiliariaModalProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const [formData, setFormData] = useState({
        nombre: '',
        direccion: '',
        nombreCompletoAdmin: '',
        emailAdmin: '',
        passwordAdmin: ''
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            await superadminService.createInmobiliaria(formData);
            onSuccess();
            onClose();
        } catch (err: unknown) {
            const error = err as { response?: { data?: { message?: string } } };
            setError(error.response?.data?.message || 'Error al crear la inmobiliaria');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-50" onClose={onClose}>
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-black bg-opacity-25 backdrop-blur-sm" />
                </Transition.Child>

                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4 text-center">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 scale-95"
                            enterTo="opacity-100 scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 scale-100"
                            leaveTo="opacity-0 scale-95"
                        >
                            <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                                <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900 border-b pb-2 mb-4">
                                    Añadir Nueva Inmobiliaria
                                </Dialog.Title>

                                {error && (
                                    <div className="mb-4 bg-red-50 text-red-600 p-3 rounded-lg text-sm border border-red-100">
                                        {error}
                                    </div>
                                )}

                                <form onSubmit={handleSubmit} className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Inmobiliaria *</label>
                                        <input
                                            type="text"
                                            name="nombre"
                                            required
                                            value={formData.nombre}
                                            onChange={handleChange}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                                            placeholder="Inmobiliaria Ejemplo SRL"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Dirección Comercial</label>
                                        <input
                                            type="text"
                                            name="direccion"
                                            value={formData.direccion}
                                            onChange={handleChange}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                                            placeholder="Opcional"
                                        />
                                    </div>

                                    <div className="pt-2 pb-1">
                                        <h4 className="text-sm font-bold text-gray-500 uppercase">Datos del Primer Administrador</h4>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Completo *</label>
                                        <input
                                            type="text"
                                            name="nombreCompletoAdmin"
                                            required
                                            value={formData.nombreCompletoAdmin}
                                            onChange={handleChange}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                                            placeholder="Juan Pérez"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Correo Electrónico *</label>
                                        <input
                                            type="email"
                                            name="emailAdmin"
                                            required
                                            value={formData.emailAdmin}
                                            onChange={handleChange}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                                            placeholder="juan@inmobiliaria.com"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña Inicial *</label>
                                        <input
                                            type="password"
                                            name="passwordAdmin"
                                            required
                                            minLength={6}
                                            value={formData.passwordAdmin}
                                            onChange={handleChange}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                                        />
                                    </div>

                                    <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-gray-100">
                                        <button
                                            type="button"
                                            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium"
                                            onClick={onClose}
                                        >
                                            Cancelar
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={loading}
                                            className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 font-medium disabled:opacity-50"
                                        >
                                            {loading ? 'Creando...' : 'Crear Inmobiliaria'}
                                        </button>
                                    </div>
                                </form>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
}
