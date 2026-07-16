import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from "@headlessui/react";
import { useEffect, useState } from "react";
import { resolveReauthentication } from "../services/reauthentication";

export default function ReauthenticationDialog() {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  useEffect(() => {
    const show = () => { setPassword(""); setOpen(true); };
    window.addEventListener("reauthentication-required", show);
    return () => window.removeEventListener("reauthentication-required", show);
  }, []);
  const close = () => { setOpen(false); resolveReauthentication(null); };
  const submit = (event: React.FormEvent) => { event.preventDefault(); const value = password; setOpen(false); setPassword(""); resolveReauthentication(value); };
  return <Dialog open={open} onClose={close} className="relative z-[120]">
    <DialogBackdrop className="fixed inset-0 bg-black/50" />
    <div className="fixed inset-0 flex items-center justify-center p-4">
      <DialogPanel className="w-full max-w-sm rounded-lg bg-white p-6 shadow-2xl">
        <DialogTitle className="text-lg font-bold text-gray-900">Confirmá tu identidad</DialogTitle>
        <p className="mt-2 text-sm text-gray-600">Esta operación es sensible. Ingresá nuevamente tu contraseña.</p>
        <form onSubmit={submit} className="mt-5 space-y-4">
          <input autoFocus type="password" required value={password} onChange={e => setPassword(e.target.value)} className="min-h-11 w-full rounded-lg border border-gray-300 px-3" aria-label="Contraseña actual" />
          <div className="flex justify-end gap-3"><button type="button" onClick={close} className="min-h-11 px-4 text-gray-700">Cancelar</button><button className="min-h-11 rounded-lg bg-indigo-600 px-4 font-semibold text-white">Continuar</button></div>
        </form>
      </DialogPanel>
    </div>
  </Dialog>;
}
