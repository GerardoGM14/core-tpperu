import React from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import logo from '../../assets/logo-tppperu.png';

export default function Login() {
  const { status, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState(null);
  const [busy, setBusy] = React.useState(false);

  if (status === 'authed') {
    return <Navigate to={location.state?.from || '/dashboard'} replace />;
  }

  const onSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await login(email, password);
      navigate(location.state?.from || '/dashboard', { replace: true });
    } catch (err) {
      setError(err.status === 401 ? 'Correo o contraseña incorrectos.' : 'No se pudo conectar con el servidor.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{
      height: '100vh', display: 'grid', placeItems: 'center',
      background: '#1C1A14',
    }}>
      <div style={{ width: 360, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 22 }}>
        <img src={logo} alt="TPP Perú" style={{ height: 44, objectFit: 'contain' }} />

        <form onSubmit={onSubmit} className="card" style={{ width: '100%', padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <h1 className="h2" style={{ marginBottom: 2 }}>Iniciar sesión</h1>
            <p style={{ fontSize: 12, color: 'var(--muted)', margin: 0 }}>Panel de gestión · TPP Perú</p>
          </div>

          <div className="field">
            <label>Correo</label>
            <input
              className="input" type="email" autoComplete="email" required
              value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@tppperu.com" autoFocus
            />
          </div>

          <div className="field">
            <label>Contraseña</label>
            <input
              className="input" type="password" autoComplete="current-password" required minLength={8}
              value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div style={{
              fontSize: 12, color: 'var(--bad)', background: 'var(--bad-soft)',
              padding: '8px 10px', borderRadius: 4,
            }}>
              {error}
            </div>
          )}

          <button className="btn" type="submit" disabled={busy} data-handled="1" style={{ justifyContent: 'center' }}>
            {busy ? 'Ingresando…' : 'Ingresar'}
          </button>
        </form>

        <div className="mono" style={{ fontSize: 11, color: 'rgba(232,227,212,0.4)' }}>
          tpp · ops · v0.1
        </div>
      </div>
    </div>
  );
}
