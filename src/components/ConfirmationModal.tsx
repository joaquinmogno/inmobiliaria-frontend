import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from "@headlessui/react";
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import { useState } from "react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => unknown | Promise<unknown>;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: "danger" | "info";
}

export default function ConfirmationModal({ isOpen, onClose, onConfirm, title, message, confirmText = "Confirmar", cancelText = "Cancelar", type = "danger" }: Props) {
  const [loading, setLoading] = useState(false);
  const confirm = async () => {
    if (loading) return;
    setLoading(true);
    try { await onConfirm(); onClose(); } finally { setLoading(false); }
  };

  return <Dialog open={isOpen} onClose={() => !loading && onClose()} className="relative z-[100]">
    <DialogBackdrop className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
    <div className="fixed inset-0 flex items-center justify-center p-4">
      <DialogPanel className="w-full max-w-md rounded-lg bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-center gap-4">
          <div className={`rounded-full p-3 ${type === "danger" ? "bg-red-100 text-red-700" : "bg-indigo-100 text-indigo-700"}`}>
            <ExclamationTriangleIcon className="h-6 w-6" />
          </div>
          <DialogTitle className="text-xl font-bold text-gray-900">{title}</DialogTitle>
        </div>
        <p className="mb-8 leading-relaxed text-gray-700">{message}</p>
        <div className="flex justify-end gap-3">
          <button disabled={loading} onClick={onClose} className="min-h-11 rounded-lg px-4 font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50">{cancelText}</button>
          <button disabled={loading} onClick={() => void confirm()} className={`min-h-11 rounded-lg px-6 font-semibold text-white disabled:opacity-50 ${type === "danger" ? "bg-red-600 hover:bg-red-700" : "bg-indigo-600 hover:bg-indigo-700"}`}>
            {loading ? "Procesando..." : confirmText}
          </button>
        </div>
      </DialogPanel>
    </div>
  </Dialog>;
}
