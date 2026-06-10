import React from 'react';
import QRCode from 'qrcode';
import Ico from '../../components/icons';
import { whatsappApi } from '../../api/whatsapp';
import { getConversationsSocket } from '../../api/socket';

// estados: idle | connecting | qr | connected | logged-out | error
export default function WhatsappConnect({ onConnected }) {
  const [state, setState] = React.useState('idle');
  const [qrDataUrl, setQrDataUrl] = React.useState(null);
  const [info, setInfo] = React.useState(null); // { jid, pushName }
  const [error, setError] = React.useState(null);

  const [socketReady, setSocketReady] = React.useState(false);
  const [qrSecondsLeft, setQrSecondsLeft] = React.useState(0);
  const qrTimeout = React.useRef(null);
  const pollRef = React.useRef(null);
  const countdownRef = React.useRef(null);
  const lastQrRef = React.useRef(null);

  const QR_TTL = 20; // segundos de vida de cada QR de WhatsApp

  // Guardamos onConnected en un ref para NO re-suscribir el socket cuando
  // el padre re-renderiza (era la causa de que el QR se perdiera).
  const onConnectedRef = React.useRef(onConnected);
  React.useEffect(() => { onConnectedRef.current = onConnected; }, [onConnected]);

  // Reinicia la cuenta atrás de vigencia del QR (20s → 0).
  const startCountdown = React.useCallback(() => {
    clearInterval(countdownRef.current);
    setQrSecondsLeft(QR_TTL);
    countdownRef.current = setInterval(() => {
      setQrSecondsLeft((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
  }, []);

  // Pinta un QR (string) en pantalla. Reutilizable desde socket y desde polling.
  const renderQr = React.useCallback(async (qr) => {
    if (!qr) return;
    // Si es el mismo QR que ya mostramos, no re-pintamos ni reiniciamos el contador.
    if (qr === lastQrRef.current) return;
    lastQrRef.current = qr;
    clearTimeout(qrTimeout.current);
    try {
      const url = await QRCode.toDataURL(qr, { width: 240, margin: 1 });
      setQrDataUrl(url);
      setState('qr');
      startCountdown();
    } catch {
      setError('No se pudo generar el QR');
      setState('error');
    }
  }, [startCountdown]);

  // Suscribir a eventos del socket (qr, status) — SOLO UNA VEZ al montar.
  React.useEffect(() => {
    const socket = getConversationsSocket();

    const onConnect = () => setSocketReady(true);
    const onDisconnect = () => setSocketReady(false);
    if (socket.connected) {
      setSocketReady(true);
    } else {
      socket.connect();
    }
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    const onQr = ({ qr }) => {
      renderQr(qr); // el polling sigue activo para renovar
    };

    const onStatus = (payload) => {
      const s = payload?.status;
      if (s === 'connected') {
        clearInterval(pollRef.current);
        clearInterval(countdownRef.current);
        setInfo({ jid: payload.jid, pushName: payload.pushName });
        setState('connected');
        setQrDataUrl(null);
        lastQrRef.current = null;
        onConnectedRef.current?.(payload);
        window.toast?.('WhatsApp vinculado correctamente', { label: 'WhatsApp', kind: 'good' });
      } else if (s === 'disconnected') {
        setState((prev) => (prev === 'connected' ? 'connected' : prev));
      } else if (s === 'logged-out') {
        setState('logged-out');
        setInfo(null);
        window.toast?.('La sesión de WhatsApp se cerró', { label: 'WhatsApp', kind: 'accent' });
      } else if (s === 'qr-timeout') {
        setState('idle');
        setQrDataUrl(null);
        window.toast?.('El QR expiró, vuelve a intentar', { label: 'WhatsApp', kind: 'accent' });
      }
    };

    socket.on('qr', onQr);
    socket.on('status', onStatus);
    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('qr', onQr);
      socket.off('status', onStatus);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Consultar estado inicial
  React.useEffect(() => {
    whatsappApi.status()
      .then((st) => {
        if (st?.connected) {
          setInfo({ jid: st.jid, pushName: st.pushName });
          setState('connected');
        }
      })
      .catch(() => {});
  }, []);

  const startConnect = async () => {
    setError(null);
    setState('connecting');

    const socket = getConversationsSocket();
    if (!socket.connected) socket.connect();

    try {
      await whatsappApi.connect();
    } catch (err) {
      setError(err.message || 'No se pudo contactar al servicio de WhatsApp');
      setState('error');
      return;
    }

    // Consultamos el QR por HTTP cada 1.5s. El polling SIGUE activo mientras
    // estamos emparejando, para renovar el QR cuando el daemon genera uno nuevo
    // (renderQr ignora duplicados). Se detiene al conectar o tras mucho tiempo.
    clearInterval(pollRef.current);
    let tries = 0;
    let gotFirst = false;
    pollRef.current = setInterval(async () => {
      tries++;
      try {
        const res = await whatsappApi.currentQr();
        if (res?.qr) {
          gotFirst = true;
          renderQr(res.qr); // solo re-pinta si cambió
        }
      } catch { /* ignore */ }
      // Si nunca llegó un QR en ~18s, error. Si ya llegó, seguimos renovando.
      if (!gotFirst && tries > 12) {
        clearInterval(pollRef.current);
        setState((prev) => {
          if (prev === 'qr' || prev === 'connected') return prev;
          setError('No se recibió el QR. Verifica que el servicio de WhatsApp esté activo y reintenta.');
          return 'error';
        });
      }
    }, 1500);
  };

  React.useEffect(() => () => {
    clearTimeout(qrTimeout.current);
    clearInterval(pollRef.current);
    clearInterval(countdownRef.current);
  }, []);

  const disconnect = async () => {
    try {
      await whatsappApi.disconnect();
      setState('idle');
      setInfo(null);
      setQrDataUrl(null);
    } catch (err) {
      window.toast?.(err.message || 'Error al desconectar', { label: 'WhatsApp', kind: 'accent' });
    }
  };

  return (
    <div className="card" style={{ maxWidth: 420 }}>
      <div className="card-h">
        <span style={{ display: 'inline-flex', color: 'var(--wa)' }}><Ico.wa /></span>
        <h2 className="h2">Conexión de WhatsApp</h2>
        <span style={{ marginLeft: 'auto' }}>
          {state === 'connected'
            ? <span className="pill good"><span className="d" />conectado</span>
            : state === 'qr'
              ? <span className="pill warn"><span className="d" />válido {qrSecondsLeft}s</span>
              : <span className="pill"><span className="d" style={{ background: 'var(--muted)' }} />desconectado</span>}
        </span>
      </div>

      <div className="card-b" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, textAlign: 'center' }}>
        {state === 'idle' && (
          <>
            <p style={{ fontSize: 13, color: 'var(--muted)', margin: 0 }}>
              Vincula tu número escaneando un código QR, como en WhatsApp Web.
              El teléfono debe permanecer con conexión.
            </p>
            <button className="btn" data-handled="1" onClick={startConnect}><Ico.wa />Conectar WhatsApp</button>
          </>
        )}

        {state === 'connecting' && (
          <p style={{ fontSize: 13, color: 'var(--muted)', margin: '12px 0' }}>Iniciando sesión…</p>
        )}

        {state === 'qr' && qrDataUrl && (
          <>
            <div style={{ padding: 10, background: '#fff', borderRadius: 8, border: '1px solid var(--hair)' }}>
              <img src={qrDataUrl} alt="QR de WhatsApp" width={220} height={220} />
            </div>

            {/* Barra de vigencia del QR: se vacía en QR_TTL segundos y se reinicia
                con cada QR nuevo. */}
            <div style={{ width: 240 }}>
              <div style={{ height: 4, background: 'var(--hair)', borderRadius: 999, overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: `${(qrSecondsLeft / QR_TTL) * 100}%`,
                  background: qrSecondsLeft <= 5 ? 'var(--bad)' : 'var(--accent)',
                  borderRadius: 999,
                  transition: 'width 1s linear, background .3s',
                }} />
              </div>
              <div className="mono" style={{ fontSize: 10, color: 'var(--muted)', marginTop: 4 }}>
                {qrSecondsLeft > 0
                  ? `Este código expira en ${qrSecondsLeft}s · se renueva solo`
                  : 'Renovando código…'}
              </div>
            </div>

            <ol style={{ fontSize: 12, color: 'var(--muted)', textAlign: 'left', margin: 0, paddingLeft: 18, lineHeight: 1.7 }}>
              <li>Abre WhatsApp en tu teléfono</li>
              <li>Ve a <b>Ajustes → Dispositivos vinculados</b></li>
              <li>Toca <b>Vincular un dispositivo</b> y escanea este código</li>
            </ol>
          </>
        )}

        {state === 'connected' && (
          <>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--good-soft)', display: 'grid', placeItems: 'center', color: 'var(--good)' }}>
              <Ico.check />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 500 }}>{info?.pushName || 'Número vinculado'}</div>
              <div className="mono" style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                {info?.jid?.split('@')[0] || '—'}
              </div>
            </div>
            <button className="btn ghost" data-handled="1" onClick={disconnect}>Desconectar</button>
          </>
        )}

        {state === 'logged-out' && (
          <>
            <p style={{ fontSize: 13, color: 'var(--bad)', margin: 0 }}>La sesión se cerró desde el teléfono.</p>
            <button className="btn" data-handled="1" onClick={startConnect}>Volver a vincular</button>
          </>
        )}

        {state === 'error' && (
          <>
            <p style={{ fontSize: 13, color: 'var(--bad)', margin: 0 }}>{error}</p>
            <button className="btn ghost" data-handled="1" onClick={startConnect}>Reintentar</button>
          </>
        )}
      </div>
    </div>
  );
}
