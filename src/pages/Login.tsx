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
    <div style={styles.root}>
      {/* Fondo con imagen */}
      <div style={styles.bgWrapper}>
        <img src="/pto_madero.jpg" alt="Background" style={styles.bgImage} />
        <div style={styles.bgOverlay} />
      </div>

      {/* Panel izquierdo - Branding */}
      <div style={styles.brandPanel}>
        <div className="flex flex-col gap-6 mt-8">
          <div style={styles.logoWrap}>
            <img
              src="/logo.png"
              alt="PropControl Logo"
              style={styles.brandLogo}
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          </div>
          <p style={styles.brandSubtitle}>
            Sistema integral de gestión de propiedades, contratos y liquidaciones
          </p>
          <div style={styles.featureList}>
            {[
              'Gestión de contratos',
              'Liquidaciones automáticas',
              'Control de pagos',
              'Registro de auditoría',
            ].map((f) => (
              <div key={f} style={styles.featureItem}>
                <span style={styles.featureDot}>✓</span>
                <span>{f}</span>
              </div>
            ))}
          </div>
        </div>
        <p style={styles.brandFooter}>
          © {new Date().getFullYear()} PropControl. Todos los derechos reservados.
        </p>
      </div>

      {/* Panel derecho - Formulario */}
      <div style={styles.formPanel}>
        <div style={styles.card}>
          {/* Cabecera */}
          <div style={styles.cardHeader}>
            <div style={styles.avatarIcon}>
              <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <h1 style={styles.cardTitle}>Bienvenido</h1>
            <p style={styles.cardSubtitle}>Ingresa tus credenciales para continuar</p>
          </div>

          {/* Error */}
          {error && (
            <div style={styles.errorBox}>
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
              {error}
            </div>
          )}

          {/* Formulario */}
          <form onSubmit={handleSubmit} style={styles.form}>
            {/* Email */}
            <div style={styles.fieldGroup}>
              <label style={styles.label}>Correo Electrónico</label>
              <div style={styles.inputWrapper}>
                <span style={styles.inputIcon}>
                  <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="#94a3b8" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </span>
                <input
                  type="email"
                  style={styles.input}
                  placeholder="ejemplo@correo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  onFocus={(e) => Object.assign(e.target.style, styles.inputFocus)}
                  onBlur={(e) => Object.assign(e.target.style, { borderColor: '#334155', backgroundColor: '#1e293b' })}
                />
              </div>
            </div>

            {/* Contraseña */}
            <div style={styles.fieldGroup}>
              <label style={styles.label}>Contraseña</label>
              <div style={styles.inputWrapper}>
                <span style={styles.inputIcon}>
                  <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="#94a3b8" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  style={styles.input}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  onFocus={(e) => Object.assign(e.target.style, styles.inputFocus)}
                  onBlur={(e) => Object.assign(e.target.style, { borderColor: '#334155', backgroundColor: '#1e293b' })}
                />
                <button
                  type="button"
                  style={styles.eyeBtn}
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="#94a3b8" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="#94a3b8" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Recordarme */}
            <div style={styles.rememberRow}>
              <label style={styles.checkLabel}>
                <input
                  type="checkbox"
                  style={styles.checkbox}
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                Recordarme
              </label>
            </div>

            {/* Botón */}
            <button
              type="submit"
              disabled={isLoading}
              style={{
                ...styles.submitBtn,
                ...(isLoading ? styles.submitBtnDisabled : {}),
              }}
            >
              {isLoading ? (
                <span style={styles.loadingContent}>
                  <svg style={styles.spinner} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Iniciando sesión...
                </span>
              ) : (
                <span style={styles.loadingContent}>
                  Ingresar
                  <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </span>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

/* ─── Estilos inline ─────────────────────────────────────────────── */
const styles: Record<string, React.CSSProperties> = {
  root: {
    minHeight: '100vh',
    display: 'flex',
    position: 'relative',
    fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
  },
  bgWrapper: {
    position: 'absolute',
    inset: 0,
    zIndex: 0,
  },
  bgImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  bgOverlay: {
    position: 'absolute',
    inset: 0,
    background: 'linear-gradient(135deg, rgba(2,6,23,0.95) 0%, rgba(15,23,42,0.85) 50%, rgba(2,6,23,0.70) 100%)',
  },

  /* Panel izquierdo */
  brandPanel: {
    position: 'relative',
    zIndex: 1,
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    padding: '3rem',
    borderRight: '1px solid rgba(99,102,241,0.15)',
  },
  brandContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
    marginTop: '2rem',
  },
  logoWrap: {
    height: '76px',
    width: '260px',
    background: '#ffffff',
    borderRadius: '16px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
    alignSelf: 'flex-start',
    overflow: 'hidden',
  },
  brandLogo: {
    height: '200%',
    width: '200%',
    objectFit: 'contain',
  },
  brandTitle: {
    display: 'none',
  },
  brandSubtitle: {
    fontSize: '1rem',
    color: '#94a3b8',
    lineHeight: 1.6,
    maxWidth: '360px',
    margin: 0,
  },
  featureList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
    marginTop: '0.5rem',
  },
  featureItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    color: '#cbd5e1',
    fontSize: '0.9rem',
  },
  featureDot: {
    width: '22px',
    height: '22px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    fontSize: '0.7rem',
    fontWeight: 700,
    flexShrink: 0,
  },
  brandFooter: {
    color: '#475569',
    fontSize: '0.8rem',
  },

  /* Panel derecho */
  formPanel: {
    position: 'relative',
    zIndex: 1,
    width: '480px',
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '2rem',
    background: 'rgba(15, 23, 42, 0.6)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
  },
  card: {
    width: '100%',
    maxWidth: '400px',
  },
  cardHeader: {
    textAlign: 'center',
    marginBottom: '2rem',
  },
  avatarIcon: {
    width: '60px',
    height: '60px',
    borderRadius: '18px',
    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 1.25rem',
    boxShadow: '0 0 30px rgba(99,102,241,0.4)',
  },
  cardTitle: {
    fontSize: '1.75rem',
    fontWeight: 700,
    color: '#f1f5f9',
    margin: '0 0 0.4rem',
    letterSpacing: '-0.5px',
  },
  cardSubtitle: {
    color: '#64748b',
    fontSize: '0.875rem',
    margin: 0,
  },

  /* Error */
  errorBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    background: 'rgba(239,68,68,0.12)',
    border: '1px solid rgba(239,68,68,0.3)',
    color: '#fca5a5',
    padding: '0.75rem 1rem',
    borderRadius: '10px',
    fontSize: '0.85rem',
    marginBottom: '1.25rem',
  },

  /* Form */
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem',
  },
  fieldGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.4rem',
  },
  label: {
    color: '#94a3b8',
    fontSize: '0.825rem',
    fontWeight: 500,
    letterSpacing: '0.3px',
  },
  inputWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  inputIcon: {
    position: 'absolute',
    left: '0.875rem',
    display: 'flex',
    alignItems: 'center',
    pointerEvents: 'none',
  },
  input: {
    width: '100%',
    padding: '0.8rem 2.75rem',
    background: '#1e293b',
    border: '1px solid #334155',
    borderRadius: '10px',
    color: '#f1f5f9',
    fontSize: '0.9rem',
    outline: 'none',
    transition: 'all 0.2s',
    boxSizing: 'border-box',
  },
  inputFocus: {
    borderColor: '#6366f1',
    backgroundColor: '#1e293b',
    boxShadow: '0 0 0 3px rgba(99,102,241,0.2)',
  },
  eyeBtn: {
    position: 'absolute',
    right: '0.875rem',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    padding: 0,
  },

  /* Recordarme */
  rememberRow: {
    display: 'flex',
    justifyContent: 'flex-start',
  },
  checkLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    color: '#64748b',
    fontSize: '0.85rem',
    cursor: 'pointer',
  },
  checkbox: {
    accentColor: '#6366f1',
    width: '15px',
    height: '15px',
    cursor: 'pointer',
  },

  /* Botón */
  submitBtn: {
    width: '100%',
    padding: '0.9rem',
    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    border: 'none',
    borderRadius: '10px',
    color: 'white',
    fontWeight: 600,
    fontSize: '0.95rem',
    cursor: 'pointer',
    transition: 'all 0.2s',
    boxShadow: '0 4px 20px rgba(99,102,241,0.35)',
    marginTop: '0.25rem',
  },
  submitBtnDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed',
  },
  loadingContent: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
  },
  spinner: {
    width: '18px',
    height: '18px',
    animation: 'spin 1s linear infinite',
  },
};

export default Login;
