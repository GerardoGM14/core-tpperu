import { api } from './client';

export const campaignsApi = {
  list: () => api('/api/campaigns'),
  get: (id) => api(`/api/campaigns/${id}`),
  create: (data) => api('/api/campaigns', { method: 'POST', body: data }),
  update: (id, data) => api(`/api/campaigns/${id}`, { method: 'PATCH', body: data }),
  remove: (id) => api(`/api/campaigns/${id}`, { method: 'DELETE' }),
  // Dispara el envío masivo de la campaña a su audiencia.
  send: (id) => api(`/api/campaigns/${id}/send`, { method: 'POST' }),
  // Cuenta de destinatarios para un filtro de tags (preview "X destinatarios").
  audienceCount: (tags = []) => {
    const qs = tags.length ? '?' + tags.map((t) => `tags=${encodeURIComponent(t)}`).join('&') : '';
    return api(`/api/campaigns/audience-count${qs}`);
  },
};
