import { api } from './client';

export const whatsappApi = {
  connect: () => api('/api/whatsapp/connect', { method: 'POST' }),
  disconnect: () => api('/api/whatsapp/disconnect', { method: 'POST' }),
  status: () => api('/api/whatsapp/status'),
  // QR vigente por HTTP (fallback al socket)
  currentQr: () => api('/api/conversations/whatsapp/qr'),
};
