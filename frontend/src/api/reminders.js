import { api } from './client';

export const remindersApi = {
  list: () => api('/api/reminders'),
  // Envía un recordatorio de prueba a un número real.
  // body: { phone, template?, when?, name?, paquete? }
  test: (body) => api('/api/reminders/test', { method: 'POST', body }),
};
