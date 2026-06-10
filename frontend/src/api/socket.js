import { io } from 'socket.io-client';
import { BASE_URL, getAccessToken } from './client';

// Socket para el namespace /conversations.
// Reusa la misma conexión en toda la app (singleton).
let socket = null;

export function getConversationsSocket() {
  if (socket) return socket;
  // Si BASE_URL está vacío, conecta al mismo origen (proxy de Vite en dev).
  const url = BASE_URL ? `${BASE_URL}/conversations` : '/conversations';
  socket = io(url, {
    // polling para el handshake (siempre pasa por el proxy) y upgrade a
    // websocket (que vía proxy de Vite funciona: 101 Switching Protocols).
    transports: ['polling', 'websocket'],
    auth: () => ({ token: getAccessToken() }),
    autoConnect: true,
    reconnection: true,
  });

  // Logs visibles en la consola del navegador para diagnóstico
  socket.on('connect', () => console.log('[socket] conectado:', socket.id));
  socket.on('connect_error', (e) => console.warn('[socket] connect_error:', e.message));
  socket.on('disconnect', (r) => console.warn('[socket] disconnect:', r));
  socket.onAny((event, ...args) => console.log('[socket] evento:', event, args));

  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
