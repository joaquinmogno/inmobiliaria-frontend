import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/auth.service';
import { useNavigate } from 'react-router-dom';
import { EnvelopeIcon, LockClosedIcon, EyeIcon, EyeSlashIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const savedEmail = localStorage.getItem('rememberedEmail');
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    try {
      const response = await authService.login(email, password);
      if (rememberMe) {
        localStorage.setItem('rememberedEmail', email);
      } else {
        localStorage.removeItem('rememberedEmail');
      }
      login(response.token, response.user);
      navigate('/home');
    } catch (err) {
      setError('Credenciales inválidas. Por favor, intenta de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex relative font-sans">
      {/* Background with overlay */}
      <div className="absolute inset-0 z-0">
        <img src="/pto_madero.jpg" alt="Background" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950/95 via-slate-900/90 to-slate-950/80" />
      </div>

      {/* Main Container */}
      <div className="relative z-10 w-full flex flex-col md:flex-row">
        
        {/* Left Branding Panel (Hidden on very small mobile, visible on desktop) */}
        <div className="hidden md:flex flex-1 flex-col justify-between p-12 lg:p-20 border-r border-indigo-500/10">
          <div className="flex flex-col gap-8 mt-12 animate-in fade-in slide-in-from-left-8 duration-1000">
            <div className="h-16 lg:h-20 max-w-[280px] bg-white rounded-2xl flex items-center justify-center p-4 shadow-[0_8px_32px_rgba(0,0,0,0.2)] overflow-hidden">
              <img
                src="/logo.png"
                alt="PropControl Logo"
                className="w-full h-full object-contain filter"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            </div>
            
            <div className="space-y-6">
                <p className="text-lg text-slate-300 leading-relaxed max-w-md">
                Sistema integral de gestión de propiedades, contratos y liquidaciones para administradores inmobiliarios.
                </p>
                <div className="flex flex-col gap-4">
                {[
                    'Gestión de contratos automatizada',
                    'Liquidaciones de inquilinos y propietarios',
                    'Control de pagos e historial financiero',
                    'Registro de auditoría y reportes',
                ].map((f, i) => (
                    <div key={i} className="flex items-center gap-3 text-slate-300">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 shrink-0">
                        <CheckCircleIcon className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-sm font-medium">{f}</span>
                    </div>
                ))}
                </div>
            </div>
          </div>
          
          <p className="text-slate-500 text-sm font-medium">
            © {new Date().getFullYear()} PropControl. Todos los derechos reservados.
          </p>
        </div>

        {/* Right Form Panel */}
        <div className="w-full md:w-[480px] lg:w-[540px] flex-1 md:flex-none shrink-0 flex flex-col justify-center items-center p-6 sm:p-12 md:bg-slate-900/60 md:backdrop-blur-xl transition-all relative">
          
          <div className="w-full max-w-[420px] animate-in fade-in zoom-in-95 duration-1000 my-auto">
            
            {/* Mobile Logo (Visible only on mobile) */}
            <div className="md:hidden flex justify-center mb-8">
               <div className="h-14 sm:h-16 bg-white rounded-[1.25rem] flex items-center justify-center px-6 py-2 shadow-[0_8px_30px_rgba(0,0,0,0.3)]">
                 <img
                   src="/logo.png"
                   alt="PropControl Logo"
                   className="h-full object-contain"
                   onError={(e) => {
                     (e.target as HTMLImageElement).style.display = 'none';
                   }}
                 />
               </div>
            </div>

            <div className="text-center mb-10">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center mx-auto mb-6 shadow-[0_0_40px_rgba(99,102,241,0.4)]">
                 <LockClosedIcon className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-3xl font-black tracking-tight text-white mb-2">Bienvenido</h1>
              <p className="text-slate-400 text-sm font-medium">Ingresa tus credenciales para continuar</p>
            </div>

            {error && (
              <div className="flex items-center gap-3 bg-red-950/40 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl text-sm font-medium mb-6 animate-in fade-in">
                <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                </svg>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-6">
              
              <div className="space-y-2 relative group">
                <label className="text-[13px] font-bold text-slate-300 uppercase tracking-wider ml-1">Correo Electrónico</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <EnvelopeIcon className="w-5 h-5 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
                  </div>
                  <input
                    type="email"
                    placeholder="ejemplo@correo.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full bg-slate-900/40 border border-slate-700/50 text-white placeholder-slate-600 text-[15px] rounded-2xl pl-12 pr-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-400 focus:bg-slate-900/80 transition-all shadow-inner"
                  />
                </div>
              </div>

              <div className="space-y-2 relative group">
                <label className="text-[13px] font-bold text-slate-300 uppercase tracking-wider ml-1">Contraseña</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                     <LockClosedIcon className="w-5 h-5 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full bg-slate-900/40 border border-slate-700/50 text-white placeholder-slate-600 text-[15px] rounded-2xl pl-12 pr-12 py-3.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-400 focus:bg-slate-900/80 transition-all shadow-inner"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    {showPassword ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center -mt-1 mb-2 ml-1">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className="relative flex items-center justify-center">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="peer appearance-none w-5 h-5 border-2 border-slate-600 rounded bg-slate-800/50 checked:bg-indigo-500 checked:border-indigo-500 transition-colors cursor-pointer"
                    />
                    <svg className="absolute w-3 h-3 text-white opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-sm text-slate-400 font-medium group-hover:text-slate-200 transition-colors select-none">Recordarme en este equipo</span>
                </label>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full relative overflow-hidden bg-gradient-to-r from-indigo-500 via-indigo-600 to-violet-600 hover:from-indigo-400 hover:via-indigo-500 hover:to-violet-500 text-white font-bold py-4 rounded-2xl transition-all duration-300 shadow-[0_0_20px_rgba(99,102,241,0.2)] hover:shadow-[0_0_30px_rgba(99,102,241,0.4)] hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-70 disabled:hover:translate-y-0 disabled:cursor-not-allowed group mt-2"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="w-5 h-5 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Iniciando sesión...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2 text-[15px]">
                    Ingresar a mi cuenta
                    <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </span>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
