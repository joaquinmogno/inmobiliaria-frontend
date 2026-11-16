import { useEffect, useRef, useState } from "react";
import { DialogTitle } from "@headlessui/react";
import { XMarkIcon, KeyIcon } from "@heroicons/react/24/outline";
import { authService } from "../services/auth.service";
import PasswordInput from "./PasswordInput";
import { Modal, ModalBackdrop, ModalPanel } from "./Modal";
import FieldError, { useFieldValidation } from "./FieldError";
import FormError from "./FormError";

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: { email?: string } | null;
}

export default function UserProfileModal({ isOpen, onClose, user }: UserProfileModalProps) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const fields = useFieldValidation();
  const formRef = useRef<HTMLFormElement>(null);
  const busy = loading || Boolean(success);
  const close = () => { if (!busy) onClose(); };

  useEffect(() => {
    if (isOpen) {
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
      setError(""); setSuccess(""); fields.reset();
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setError("");
    fields.reset();
    const invalid: Record<string, string> = {};
    if (newPassword.length < 12 || !/[a-z]/.test(newPassword) || !/[A-Z]/.test(newPassword) || !/[0-9]/.test(newPassword) || !/[^A-Za-z0-9]/.test(newPassword)) {
      invalid['profile-new-password'] = 'Usá al menos 12 caracteres e incluí mayúscula, minúscula, número y símbolo.';
    }
    if (newPassword !== confirmPassword) invalid['profile-confirm-password'] = 'La confirmación no coincide con la nueva contraseña.';
    if (Object.keys(invalid).length) { fields.showErrors(invalid); return; }

    setLoading(true);
    try {
      await authService.changePassword(currentPassword, newPassword);
      setSuccess("Contraseña actualizada. Volvé a iniciar sesión.");
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
      setTimeout(() => { onClose(); window.dispatchEvent(new Event("logout")); }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cambiar la contraseña. Revisá tu contraseña actual e intentá nuevamente.");
      requestAnimationFrame(() => formRef.current?.querySelector<HTMLElement>('[role="alert"]')?.focus());
    } finally { setLoading(false); }
  };

  return <Modal open={isOpen} onClose={close} className="fixed inset-0 z-[100]">
    <ModalBackdrop className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
    <div className="fixed inset-0 flex min-h-0 items-center justify-center overflow-hidden p-3 sm:p-4">
      <ModalPanel data-modal-panel className="flex max-h-full w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex shrink-0 items-center justify-between gap-3 border-b px-5 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <KeyIcon aria-hidden="true" className="h-6 w-6 shrink-0 text-indigo-600" />
            <div className="min-w-0"><DialogTitle className="text-xl font-bold text-gray-900">Mi perfil</DialogTitle><p className="break-words text-sm text-gray-600">{user?.email}</p></div>
          </div>
          <button type="button" onClick={close} disabled={busy} aria-label="Cerrar mi perfil" className="ui-button ui-button-ghost h-11 w-11 shrink-0 p-0"><XMarkIcon aria-hidden="true" className="h-5 w-5" /></button>
        </div>
        <form id="profile-password-form" ref={formRef} onSubmit={handleSubmit} aria-busy={loading} className="modal-scroll min-h-0 flex-1 space-y-4 p-5">
          <h3 className="text-lg font-semibold text-gray-900">Cambiar contraseña</h3>
          <FormError message={error} />
          {success && <p role="status" className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">{success}</p>}
          <div>
            <label htmlFor="profile-current-password" className="mb-1 block text-sm font-medium text-gray-700">Contraseña actual</label>
            <PasswordInput {...fields.inputProps('profile-current-password')} data-autofocus autoComplete="current-password" visibilityLabel="contraseña actual" required disabled={busy} value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} className="ui-field" />
            <FieldError id="profile-current-password" message={fields.errors['profile-current-password']} />
          </div>
          <div>
            <label htmlFor="profile-new-password" className="mb-1 block text-sm font-medium text-gray-700">Nueva contraseña</label>
            <PasswordInput {...fields.inputProps('profile-new-password')} aria-describedby={['profile-password-help', fields.errors['profile-new-password'] && 'profile-new-password-error'].filter(Boolean).join(' ')} autoComplete="new-password" visibilityLabel="nueva contraseña" required minLength={12} disabled={busy} value={newPassword} onChange={e => setNewPassword(e.target.value)} className="ui-field" />
            <p id="profile-password-help" className="mt-1 text-xs text-gray-600">Al menos 12 caracteres, con mayúscula, minúscula, número y símbolo.</p>
            <FieldError id="profile-new-password" message={fields.errors['profile-new-password']} />
          </div>
          <div>
            <label htmlFor="profile-confirm-password" className="mb-1 block text-sm font-medium text-gray-700">Confirmar nueva contraseña</label>
            <PasswordInput {...fields.inputProps('profile-confirm-password')} autoComplete="new-password" visibilityLabel="confirmación de contraseña" required minLength={12} disabled={busy} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="ui-field" />
            <FieldError id="profile-confirm-password" message={fields.errors['profile-confirm-password']} />
          </div>
        </form>
        <div className="flex shrink-0 flex-wrap justify-end gap-3 border-t bg-gray-50 px-5 py-3">
          <button type="button" onClick={close} disabled={busy} className="ui-button ui-button-secondary">Cancelar</button>
          <button type="submit" form="profile-password-form" disabled={busy} className="ui-button ui-button-primary">{loading ? 'Actualizando…' : 'Actualizar contraseña'}</button>
        </div>
      </ModalPanel>
    </div>
  </Modal>;
}
