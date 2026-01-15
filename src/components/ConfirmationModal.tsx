import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";

interface ConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    type?: 'danger' | 'info';
}

export default function ConfirmationModal({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = "Confirmar",
    cancelText = "Cancelar",
    type = 'danger'
}: ConfirmationModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl transform transition-all animate-in fade-in zoom-in duration-200">
                <div className="flex items-center gap-4 mb-4">
                    <div className={`p-3 rounded-full ${type === 'danger' ? 'bg-red-100 text-red-600' : 'bg-indigo-100 text-indigo-600'
                        }`}>
                        <ExclamationTriangleIcon className="w-6 h-6" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900">{title}</h2>
                </div>

                <p className="text-gray-600 mb-8 leading-relaxed">
                    {message}
                </p>

                <div className="flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-xl transition-colors font-medium"
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={() => {
                            onConfirm();
                            onClose();
                        }}
                        className={`px-6 py-2 text-white rounded-xl transition-all font-semibold shadow-lg ${type === 'danger'
                                ? 'bg-red-600 hover:bg-red-700 shadow-red-100'
                                : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-100'
                            }`}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
}
