import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services/auth.service';
import { useNavigate } from 'react-router-dom';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
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
    <div className="min-h-screen relative flex items-center justify-center md:justify-end overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <img
          src="/pto_madero.jpg"
          alt="Background"
          className="w-full h-full object-cover"
        />
        {/* Subtle overlay to improve readability without blurring too much */}
        <div className="absolute inset-0 bg-black/30 backdrop-blur-[1px]"></div>
      </div>

      {/* Floating Login Card - Positioned to the right on desktop */}
      <div className="relative z-10 w-full max-w-md px-6 py-12 md:mr-20 lg:mr-32">
        <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-2xl p-8 md:p-10 border border-white/20">
          {/* Logo Section */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-32 h-20 flex items-center justify-center mb-4 overflow-hidden">
              <img
                src="/logo.png"
                alt="Logo Inmobiliaria"
                className="w-full h-full object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://via.placeholder.com/120x80?text=JM+Soluciones';
                }}
              />
            </div>
            <h1 className="text-2xl font-bold text-gray-800 tracking-tight">Administración Inmobiliaria</h1>
            <p className="text-gray-500 text-sm mt-1">Acceso al Sistema de Administracion Inmobiliaria</p>
          </div>

          {error && (
            <div className="bg-red-50/80 border-l-4 border-red-500 p-4 mb-6 rounded-r animate-shake">
              <p className="text-red-700 text-sm font-medium">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5 ml-1">
                Correo Electrónico
              </label>
              <input
                type="email"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white focus:border-transparent transition-all outline-none"
                placeholder="ejemplo@correo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5 ml-1">
                Contraseña
              </label>
              <input
                type="password"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white focus:border-transparent transition-all outline-none"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <div className="flex items-center justify-between text-sm px-1">
              <label className="flex items-center text-gray-600 cursor-pointer group">
                <input
                  type="checkbox"
                  className="mr-2 rounded border-gray-300 text-blue-600 focus:ring-blue-500 transition-all"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <span className="group-hover:text-gray-800 transition-colors">Recordarme</span>
              </label>
              {/* 
              <a href="#" className="text-blue-600 hover:text-blue-800 font-semibold transition-colors">
                ¿Olvidaste tu contraseña?
              </a>
              */}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className={`w-full py-3.5 px-4 rounded-xl text-white font-bold transition-all shadow-lg hover:shadow-blue-500/25 active:scale-[0.98] mt-2 ${isLoading
                ? 'bg-blue-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700'
                }`}
            >
              {isLoading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Iniciando sesión...
                </span>
              ) : 'Ingresar'}
            </button>
          </form>

          <p className="mt-8 text-center text-xs text-gray-400">
            &copy; {new Date().getFullYear()} Administración Inmobiliaria. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
