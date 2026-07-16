import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { authService } from "../services/auth.service";
import { EyeIcon, EyeSlashIcon, CheckCircleIcon } from "@heroicons/react/24/outline";

export default function RecuperarContrasena() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [success, setSuccess] = useState(false);
  const requirements = [
    [password.length >= 12, "12 caracteres"],
    [/[A-Z]/.test(password), "una mayúscula"],
    [/[a-z]/.test(password), "una minúscula"],
    [/\d/.test(password), "un número"],
    [/[^A-Za-z0-9]/.test(password), "un símbolo"],
  ] as const;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const token = params.get("token");
    if (!token) return setError("El enlace de recuperación no es válido");
    if (password !== confirmation) return setError("Las contraseñas no coinciden");
    setLoading(true);
    setError("");
    try {
      await authService.completePasswordReset(token, password);
      setSuccess(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo actualizar la contraseña");
    } finally {
      setLoading(false);
    }
  };

  if (success) return <main className="flex min-h-screen items-center justify-center bg-gray-100 px-4"><section className="w-full max-w-md rounded-lg bg-white p-8 text-center shadow"><CheckCircleIcon className="mx-auto h-12 w-12 text-emerald-600" /><h1 className="mt-4 text-2xl font-bold text-gray-900">Contraseña actualizada</h1><p className="mt-2 text-gray-600">Ya podés ingresar con tu nueva contraseña.</p><button onClick={() => navigate('/login', { replace: true })} className="mt-6 min-h-11 w-full rounded-lg bg-indigo-600 px-4 font-semibold text-white">Ir al inicio de sesión</button></section></main>;

  return <main className="min-h-screen bg-gray-100 px-4 py-16">
    <form onSubmit={submit} className="mx-auto max-w-md space-y-5 rounded-lg bg-white p-6 shadow">
      <h1 className="text-xl font-bold text-gray-900">Crear nueva contraseña</h1>
      {error && <p className="rounded bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <div><label htmlFor="new-password" className="text-sm font-semibold text-gray-700">Nueva contraseña</label><div className="relative"><input id="new-password" type={showPassword ? "text" : "password"} required minLength={12} maxLength={128} value={password} onChange={e => setPassword(e.target.value)} className="mt-1 min-h-11 w-full rounded border border-gray-300 px-3 pr-12" aria-describedby="password-requirements" /><button type="button" onClick={() => setShowPassword(value => !value)} aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"} className="absolute right-0 top-1 flex h-11 w-11 items-center justify-center text-gray-600">{showPassword ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}</button></div></div>
      <ul id="password-requirements" className="grid grid-cols-2 gap-1 text-xs">{requirements.map(([valid, label]) => <li key={label} className={valid ? "text-emerald-700" : "text-gray-600"}>{valid ? "✓" : "○"} {label}</li>)}</ul>
      <div><label htmlFor="password-confirmation" className="text-sm font-semibold text-gray-700">Repetir contraseña</label><input id="password-confirmation" type={showPassword ? "text" : "password"} required minLength={12} maxLength={128} value={confirmation} onChange={e => setConfirmation(e.target.value)} className="mt-1 min-h-11 w-full rounded border border-gray-300 px-3" aria-invalid={Boolean(confirmation && confirmation !== password)} />{confirmation && confirmation !== password && <p className="mt-1 text-sm text-red-700">Las contraseñas no coinciden.</p>}</div>
      <button disabled={loading} className="w-full rounded bg-indigo-600 px-4 py-3 font-semibold text-white disabled:opacity-50">{loading ? "Actualizando..." : "Actualizar contraseña"}</button>
    </form>
  </main>;
}
