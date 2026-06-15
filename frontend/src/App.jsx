import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AppLayout from './layout/AppLayout';
import TopProgress from './components/TopProgress';
import { ROUTES } from './routes';
import { ModalRoot } from './features/modals/Modals';
import { AuthProvider } from './auth/AuthContext';
import RequireAuth from './auth/RequireAuth';
import Login from './features/auth/Login';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30_000,
    },
  },
});
import {
  useTweaks, TweaksPanel, TweakSection,
  TweakColor, TweakRadio, TweakToggle, TweakSelect,
} from './tweaks';

const TWEAK_DEFAULTS = {
  accent: '#C2552B',
  density: 'comfortable',
  showSparklines: true,
};

function Toaster() {
  const [items, setItems] = React.useState([]);
  React.useEffect(() => {
    window.toast = (msg, opts = {}) => {
      const id = Math.random().toString(36).slice(2, 8);
      setItems(s => [...s, { id, msg, label: opts.label || 'Acción', kind: opts.kind || 'accent' }]);
      setTimeout(() => setItems(s => s.filter(x => x.id !== id)), 2400);
    };
  }, []);
  return (
    <div className="toaster">
      {items.map(t => (
        <div key={t.id} className={'toast ' + t.kind}>
          <span className="ind" />
          <div style={{ flex: 1 }}>
            <div className="lbl">{t.label}</div>
            <div className="msg">{t.msg}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function ActionDelegator() {
  React.useEffect(() => {
    const onClick = (e) => {
      const sw = e.target.closest('.switch');
      if (sw && !sw.dataset.handled) {
        sw.classList.toggle('on');
        const on = sw.classList.contains('on');
        window.toast?.(on ? 'Activado' : 'Desactivado', { label: 'Toggle', kind: on ? 'good' : 'accent' });
        return;
      }
      const btn = e.target.closest('.btn, .iconbtn');
      if (btn && !btn.dataset.handled) {
        if (btn.closest('.sb-item')) return;
        if (btn.closest('.m-card')) return;
        const text = (btn.innerText || btn.textContent || '').trim() || 'Acción';
        const kind = /whatsapp|wsp|chat/i.test(text) ? 'wa'
          : /publicar|guardar|confirmar|enviar|aplicar|finalizar/i.test(text) ? 'good'
          : 'accent';
        const label = btn.classList.contains('iconbtn') ? 'Botón' : 'Acción';
        window.toast?.(text.length > 60 ? text.slice(0, 56) + '…' : text, { label, kind });
        return;
      }
      const tab = e.target.closest('.tab');
      if (tab && !tab.dataset.handled) {
        const siblings = tab.parentElement.querySelectorAll('.tab');
        siblings.forEach(s => s.classList.remove('active'));
        tab.classList.add('active');
      }
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);
  return null;
}

function ViewSwitcher() {
  const navigate = useNavigate();
  const location = useLocation();
  const current = location.pathname.replace(/^\//, '').split('/')[0] || 'dashboard';
  return (
    <TweakSelect label="Vista activa" value={current}
      options={ROUTES.map(r => r.id)}
      onChange={(v) => navigate(`/${v}`)} />
  );
}

function ChromeAndTweaks() {
  const [tweaks, setTweak] = useTweaks(TWEAK_DEFAULTS);

  React.useEffect(() => {
    document.documentElement.style.setProperty('--accent', tweaks.accent);
    document.documentElement.style.setProperty('--accent-soft', tweaks.accent + '22');
    document.documentElement.style.setProperty('font-size', tweaks.density === 'compact' ? '12.5px' : '13px');
  }, [tweaks]);

  return (
    <>
      <TweaksPanel title="Tweaks">
        <TweakSection label="Marca">
          <TweakColor label="Acento" value={tweaks.accent}
            options={['#C2552B', '#1F6B5E', '#3B5BA5', '#8B5A2B', '#1A1A17']}
            onChange={(v) => setTweak('accent', v)} />
        </TweakSection>
        <TweakSection label="Interfaz">
          <TweakRadio label="Densidad" value={tweaks.density} options={['compact', 'comfortable']}
            onChange={(v) => setTweak('density', v)} />
          <TweakToggle label="Sparklines" value={tweaks.showSparklines}
            onChange={(v) => setTweak('showSparklines', v)} />
        </TweakSection>
        <TweakSection label="Atajos">
          <ViewSwitcher />
        </TweakSection>
      </TweaksPanel>

      <Toaster />
      <ActionDelegator />
      <ModalRoot />
    </>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter basename={import.meta.env.BASE_URL}>
          <TopProgress />
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<RequireAuth><AppLayout /></RequireAuth>}>
              <Route index element={<Navigate to="/dashboard" replace />} />
              {ROUTES.map(r => (
                <Route key={r.id} path={r.path} element={r.element} />
              ))}
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Route>
          </Routes>
          <ChromeAndTweaks />
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
