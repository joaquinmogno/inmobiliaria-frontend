import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from "@headlessui/react";
import { ClipboardDocumentIcon } from "@heroicons/react/24/outline";
import { useState } from "react";
import toast from "react-hot-toast";

interface Props { open: boolean; onClose: () => void; recipient: string; link: string; expiresIn?: string }

export default function RecoveryLinkDialog({ open, onClose, recipient, link, expiresIn = "20 minutos" }: Props) {
  const [copying, setCopying] = useState(false);
  const copy = async () => { setCopying(true); try { await navigator.clipboard.writeText(link); toast.success("Enlace copiado"); } catch { toast.error("No se pudo copiar el enlace"); } finally { setCopying(false); } };
  return <Dialog open={open} onClose={onClose} className="relative z-[110]">
    <DialogBackdrop className="fixed inset-0 bg-black/50" />
    <div className="fixed inset-0 flex items-center justify-center p-4"><DialogPanel className="w-full max-w-lg rounded-lg bg-white p-6 shadow-2xl">
      <DialogTitle className="text-xl font-bold text-gray-900">Enlace de recuperación</DialogTitle>
      <p className="mt-2 text-sm text-gray-600">Destinatario: <strong>{recipient}</strong>. Expira en {expiresIn} y solo puede usarse una vez.</p>
      <label htmlFor="recovery-link" className="mt-5 block text-sm font-semibold text-gray-700">Enlace</label>
      <textarea id="recovery-link" readOnly value={link} rows={3} className="mt-1 w-full resize-none rounded-lg border border-gray-300 p-3 text-sm text-gray-700" />
      <div className="mt-5 flex justify-end gap-3"><button onClick={onClose} className="min-h-11 rounded-lg px-4 font-semibold text-gray-700 hover:bg-gray-100">Cerrar</button><button disabled={copying} onClick={() => void copy()} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-indigo-600 px-4 font-semibold text-white disabled:opacity-50"><ClipboardDocumentIcon className="h-5 w-5" />{copying ? "Copiando..." : "Copiar enlace"}</button></div>
    </DialogPanel></div>
  </Dialog>;
}
