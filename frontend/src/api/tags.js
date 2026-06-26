import { api } from './client';

// Maestro de etiquetas de clientes. Devuelve [{ tag, count, inMaster }].
export const tagsApi = {
  list: () => api('/api/tags'),
  create: (tag) => api('/api/tags', { method: 'POST', body: { tag } }),
  rename: (tag, to) => api(`/api/tags/${encodeURIComponent(tag)}`, { method: 'PATCH', body: { to } }),
  // removeFromCustomers: si true, también la quita de los clientes que la tengan.
  remove: (tag, removeFromCustomers = false) =>
    api(`/api/tags/${encodeURIComponent(tag)}`, { method: 'DELETE', body: { removeFromCustomers } }),
};
