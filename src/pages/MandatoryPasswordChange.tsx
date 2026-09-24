import { useState } from 'react';
import { ArrowRightOnRectangleIcon, KeyIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/auth.service';

const passwordIsStrong = (password: string) =>
  password.length >= 12
  && /[a-z]/.test(password)
  && /[A-Z]/.test(password)
  && /[0-9]/.test(password)
  && /[^A-Za-z0-9]/.test(password);

export default function MandatoryPasswordChange() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    if (newPassword === currentPassword) {
      setError('La nueva contraseña debe ser diferente de la contraseña temporal.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('La nueva contraseña y la confirmación no coinciden.');
      return;
    }
    if (!passwordIsStrong(newPassword)) {
      setError('Usá al menos 12 caracteres e incluí mayúscula, minúscula, número y símbolo.');
      return;
    }

    setLoading(true);
    try {
      await authService.changePassword(currentPassword, newPassword);
      sessionStorage.setItem('passwordChanged', 'true');
      window.dispatchEvent(new Event('logout'));
      navigate('/login', { replace: true, state: { passwordChanged: true } });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo actualizar la contraseña. Intentá nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  const closeSession = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-8">
      <section aria-labelledby="mandatory-password-title" className="w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="bg-gradient-to-br from-indigo-600 to-violet-700 px-6 py-8 text-white sm:px-9">
          <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/20">
            <KeyIcon className="h-8 w-8" />
          </div>
          <h1 id="mandatory-password-title" className="text-2xl font-black sm:text-3xl">Creá tu contraseña personal</h1>
          <p className="mt-3 leading-relaxed text-indigo-100">
            Estás usando una contraseña temporal. Para proteger la cuenta de {user?.fullName || user?.email}, tenés que reemplazarla antes de ingresar al sistema.
          </p>
        </div>

        <div className="p-6 sm:p-9">
          <div className="mb-6 flex gap-3 rounded-2xl border border-indigo-100 bg-indigo-50 p-4 text-sm text-indigo-900">
            <ShieldCheckIcon className="h-6 w-6 shrink-0 text-indigo-600" />
            <p>No podrás abrir contratos, pagos ni otros módulos hasta completar este paso.</p>
          </div>

          <form onSubmit={submit} className="space-y-5">
            {error && <div role="alert" aria-live="assertive" className="rounded-xl border border-red-100 bg-red-50 p-3 text-sm font-medium text-red-700">{error}</div>}

            <label htmlFor="current-password" className="block text-sm font-bold text-gray-800">
              Contraseña temporal
              <input id="current-password" autoFocus autoComplete="current-password" required type="password" value={currentPassword} onChange={event => setCurrentPassword(event.target.value)} className="mt-2 min-h-12 w-full rounded-xl border border-gray-300 px-4 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200" />
            </label>

            <label htmlFor="new-password" className="block text-sm font-bold text-gray-800">
              Nueva contraseña
              <input id="new-password" autoComplete="new-password" required minLength={12} type="password" value={newPassword} onChange={event => setNewPassword(event.target.value)} className="mt-2 min-h-12 w-full rounded-xl border border-gray-300 px-4 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200" />
            </label>

            <label htmlFor="confirm-password" className="block text-sm font-bold text-gray-800">
              Repetir nueva contraseña
              <input id="confirm-password" autoComplete="new-password" required minLength={12} type="password" value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} className="mt-2 min-h-12 w-full rounded-xl border border-gray-300 px-4 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200" />
            </label>

            <p className="text-xs leading-relaxed text-content-muted">Mínimo 12 caracteres, con una mayúscula, una minúscula, un número y un símbolo.</p>

            <button disabled={loading} className="min-h-12 w-full rounded-xl bg-indigo-600 px-5 font-bold text-white transition-colors hover:bg-indigo-700 disabled:cursor-wait disabled:opacity-60">
              {loading ? 'Actualizando contraseña…' : 'Guardar y continuar'}
            </button>
          </form>

          <button type="button" onClick={closeSession} className="mt-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-100">
            <ArrowRightOnRectangleIcon className="h-5 w-5" />
            Cerrar sesión
          </button>
        </div>
      </section>
    </main>
  );
}
