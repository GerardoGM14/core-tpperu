import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';

export default function RequireAuth({ children }) {
  const { status } = useAuth();
  const location = useLocation();

  if (status === 'loading') {
    return (
      <div style={{
        height: '100vh', display: 'grid', placeItems: 'center',
        background: 'var(--paper)', color: 'var(--muted)', fontSize: 13,
      }}>
        Cargando sesión…
      </div>
    );
  }

  if (status === 'anon') {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return children;
}
