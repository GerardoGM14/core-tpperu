import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Ico from '../../components/icons';
import { campaignsApi } from '../../api/campaigns';
import { documentsApi } from '../../api/documents';
import { remindersApi } from '../../api/reminders';
import { settingsApi } from '../../api/settings';

const STATUS_PILL = {
  DRAFT:     { cls: '',     label: 'borrador',   dot: 'var(--muted)' },
  SCHEDULED: { cls: 'info', label: 'programada', dot: null },
  RUNNING:   { cls: 'warn', label: 'enviando',   dot: null },
  COMPLETED: { cls: 'good', label: 'enviada',    dot: null },
  PAUSED:    { cls: '',     label: 'pausada',    dot: 'var(--muted)' },
  CANCELLED: { cls: 'bad',  label: 'cancelada',  dot: null },
};

function PreTripPreview({ when }) {
  const map = {
    '-48h': '🌿 Hola María, faltan *48 horas* para tu tour *Tarapoto 7d/6n*. Tu reserva está confirmada ✅\n\nTe escribimos pronto con el horario exacto y punto de encuentro.',
    '-24h': '⏰ Recordatorio · *24 h* para el inicio de tu tour.\n\n📍 Punto de encuentro: Aeropuerto FAP Guillermo del Castillo · 06:30 AM\n👤 Guía asignado: Luis Apuela (+51 945 220 110)\n\nMapa: https://maps.app.goo.gl/tpp-aeropuerto',
    '-12h': '🎒 *Mañana viajas con TPP*. Recomendaciones:\n• Documento de identidad\n• Bloqueador, repelente y zapatos cerrados\n• Ropa ligera + abrigo para la noche\n\nNos vemos a las 06:30 AM. ¡Disfruta tu viaje!',
    '+48h': '🙏 Hola María, esperamos que hayas disfrutado *Tarapoto 7d/6n*.\n\n¿Cómo calificarías tu experiencia del 1 al 10?\n\nResponde y te enviamos un cupón *VUELVE15* para tu próximo viaje 🌿',
  };
  return <div className="bubble bot" style={{ whiteSpace: 'pre-line', maxWidth: '100%' }}>{map[when]}<span className="ts">14:32 ✓✓</span></div>;
}

// ---------- Modal: crear / editar campaña ----------
function CampaignModal({ campaign, onClose, onCreated }) {
  const qc = useQueryClient();
  const editing = !!campaign?.id;
  const [name, setName] = React.useState(campaign?.name || '');
  const [body, setBody] = React.useState(campaign?.body || '');
  const [tags, setTags] = React.useState(campaign?.audience?.tags || []);
  // Cuándo enviar: 'now' (inmediato) | 'schedule' (programar fecha)
  const [modo, setModo] = React.useState(campaign?.scheduledAt ? 'schedule' : 'now');
  const [scheduledAt, setScheduledAt] = React.useState(campaign?.scheduledAt?.slice(0, 16) || '');

  // Etiquetas reales de los clientes (con conteo) para segmentar la audiencia.
  const { data: realTags = [] } = useQuery({ queryKey: ['customer-tags'], queryFn: documentsApi.customerTags });

  // Cuenta de destinatarios según los tags seleccionados.
  const { data: audience } = useQuery({
    queryKey: ['audience-count', tags],
    queryFn: () => campaignsApi.audienceCount(tags),
  });
  const count = audience?.count ?? 0;

  const save = useMutation({
    mutationFn: async (data) => {
      if (editing) return campaignsApi.update(campaign.id, data);
      const created = await campaignsApi.create(data);
      // Si es envío inmediato, dispara el send apenas se crea.
      if (data.status === 'DRAFT' && modo === 'now') {
        const res = await campaignsApi.send(created.id);
        return { created, res };
      }
      return { created };
    },
    onSuccess: ({ res } = {}) => {
      qc.invalidateQueries({ queryKey: ['campaigns'] });
      if (editing) {
        window.toast?.('Campaña actualizada', { label: 'Campañas', kind: 'good' });
      } else if (modo === 'schedule') {
        window.toast?.('Campaña programada · la verás en la lista', { label: 'Campañas', kind: 'good' });
      } else {
        const stats = res?.stats || {};
        const extra = stats.failed ? ` · ${stats.failed} falló(aron)` : '';
        window.toast?.(`Campaña enviada a ${stats.sent ?? 0} cliente(s)${extra}`, { label: 'Campañas', kind: stats.failed ? 'accent' : 'good' });
      }
      if (!editing && onCreated) onCreated(); // lleva a la pestaña de campañas
      onClose();
    },
    onError: (err) => {
      const msg = err.status === 502 ? 'WhatsApp no está conectado.' : (err.message || 'No se pudo guardar la campaña.');
      window.toast?.(msg, { label: 'Error', kind: 'accent' });
    },
  });

  const toggleTag = (t) => setTags((prev) => prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]);

  const submit = (e) => {
    e.preventDefault();
    if (!name.trim() || !body.trim()) return;
    if (modo === 'schedule' && !scheduledAt) return;
    const data = {
      name: name.trim(),
      body: body.trim(),
      audience: { tags },
    };
    if (editing) {
      // Al editar, no resucitamos campañas ya enviadas: solo ajustamos
      // la programación si la campaña sigue programada o en borrador.
      if (campaign.status === 'SCHEDULED' || campaign.status === 'DRAFT') {
        data.status = modo === 'schedule' ? 'SCHEDULED' : 'DRAFT';
        data.scheduledAt = modo === 'schedule' ? new Date(scheduledAt).toISOString() : null;
      }
    } else {
      data.status = modo === 'schedule' ? 'SCHEDULED' : 'DRAFT';
      data.scheduledAt = modo === 'schedule' ? new Date(scheduledAt).toISOString() : undefined;
    }
    save.mutate(data);
  };

  // Texto del botón principal según el modo.
  const accionLabel = editing
    ? (save.isPending ? 'Guardando…' : 'Guardar cambios')
    : modo === 'now'
      ? (save.isPending ? 'Enviando…' : `Enviar ahora a ${count} cliente${count === 1 ? '' : 's'}`)
      : (save.isPending ? 'Programando…' : 'Programar envío');

  return (
    <div className="m-back" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <form onSubmit={submit} className="m-card" style={{ width: 560, maxWidth: '92vw' }}>
        <div className="m-h">
          <h2 className="h2">{editing ? 'Editar campaña' : 'Nueva campaña'}</h2>
          <button type="button" className="iconbtn" onClick={onClose} style={{ marginLeft: 'auto' }}>✕</button>
        </div>
        <div className="m-b" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="field">
            <label>Nombre de la campaña</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej. Cyber TPP — extensión 48h" autoFocus />
          </div>

          <div className="field">
            <label>Mensaje (usa <span className="mono">{'{nombre}'}</span> para personalizar)</label>
            <textarea className="input" value={body} onChange={(e) => setBody(e.target.value)} style={{ minHeight: 96 }}
              placeholder="🌿 Hola {nombre}, tenemos una oferta especial para ti..." />
          </div>

          <div className="field">
            <label>Audiencia (a quién se envía)</label>
            <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
              <button type="button"
                className={'btn ghost sm ' + (tags.length === 0 ? 'active' : '')}
                onClick={() => setTags([])}>
                Toda la base de clientes
              </button>
              {realTags.map((a) => (
                <button type="button" key={a.tag}
                  className={'btn ghost sm ' + (tags.includes(a.tag) ? 'active' : '')}
                  onClick={() => toggleTag(a.tag)}>
                  {a.tag} <span style={{ color: 'var(--muted)' }}>· {a.count}</span>
                </button>
              ))}
            </div>
            <div className="mono" style={{ fontSize: 11, color: tags.length && count === 0 ? 'var(--bad)' : 'var(--muted)', marginTop: 6 }}>
              {tags.length === 0
                ? `Se enviará a TODOS los clientes · ${count} destinatario${count === 1 ? '' : 's'}`
                : `Etiquetas: ${tags.join(', ')} · ${count} destinatario${count === 1 ? '' : 's'}${count === 0 ? ' ⚠ nadie coincide' : ''}`}
            </div>
            {realTags.length === 0 && (
              <div className="mono" style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
                Aún no hay etiquetas en tus clientes. Etiquétalos en la vista Clientes para segmentar.
              </div>
            )}
          </div>

          {(!editing || campaign.status === 'DRAFT' || campaign.status === 'SCHEDULED') && (
            <div className="field">
              <label>¿Cuándo enviar?</label>
              <div className="row" style={{ gap: 6 }}>
                <button type="button" className={'btn ghost sm ' + (modo === 'now' ? 'active' : '')} onClick={() => setModo('now')}>
                  <Ico.send />Enviar ahora
                </button>
                <button type="button" className={'btn ghost sm ' + (modo === 'schedule' ? 'active' : '')} onClick={() => setModo('schedule')}>
                  <Ico.eye />Programar
                </button>
              </div>
              {modo === 'schedule' && (
                <input className="input" type="datetime-local" style={{ marginTop: 8 }}
                  value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
              )}
              <div className="mono" style={{ fontSize: 11, color: 'var(--muted)', marginTop: 6 }}>
                {modo === 'now'
                  ? (editing ? 'Al guardar quedará como borrador, lista para enviar con el botón Enviar.' : 'El mensaje saldrá por WhatsApp de inmediato.')
                  : 'Se enviará automáticamente a la fecha y hora elegidas.'}
              </div>
            </div>
          )}

          <div className="row between" style={{ marginTop: 4 }}>
            <button type="button" className="btn ghost" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn" disabled={save.isPending || !name.trim() || !body.trim() || (modo === 'schedule' && !scheduledAt)}>
              {accionLabel}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

// ---------- Modal: probar el envío de un recordatorio a un número real ----------
function TestReminderModal({ rule, onClose }) {
  const [phone, setPhone] = React.useState('');
  const [name, setName] = React.useState('María');

  const test = useMutation({
    mutationFn: () => remindersApi.test({
      phone: phone.trim(),
      template: rule?.template,
      when: rule?.when,
      name: name.trim() || undefined,
    }),
    onSuccess: (res) => {
      window.toast?.(`Mensaje de prueba enviado a ${res?.phone || phone}`, { label: 'WhatsApp', kind: 'wa' });
      onClose();
    },
    onError: (err) => {
      const msg = err.status === 502 ? 'WhatsApp no está conectado.' : (err.message || 'No se pudo enviar la prueba.');
      window.toast?.(msg, { label: 'Error', kind: 'accent' });
    },
  });

  const canSend = phone.replace(/\D/g, '').length >= 9 && !test.isPending;

  return (
    <div className="m-back" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="m-card" style={{ width: 460, maxWidth: '92vw' }}>
        <div className="m-h">
          <h2 className="h2">Probar envío</h2>
          <button type="button" className="iconbtn" data-handled="1" onClick={onClose} style={{ marginLeft: 'auto' }}>✕</button>
        </div>
        <div className="m-b" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <p className="lead" style={{ fontSize: 12, marginTop: -2 }}>Envía este recordatorio (<b>{rule?.label || '—'}</b>) a un número real para verificar antes de activar.</p>
          <div className="field">
            <label>Número WhatsApp</label>
            <input className="input mono" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+51 987 654 321" autoFocus />
          </div>
          <div className="field">
            <label>Nombre de prueba (reemplaza <span className="mono">{'{nombre}'}</span>)</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="María" />
          </div>
          <div className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>
            Plantilla: {rule?.template || '—'} · se envía por la sesión de WhatsApp conectada.
          </div>
        </div>
        <div className="m-f">
          <button type="button" className="btn ghost" data-handled="1" onClick={onClose}>Cancelar</button>
          <button type="button" className="btn" data-handled="1" disabled={!canSend} onClick={() => test.mutate()}>
            <Ico.send />{test.isPending ? 'Enviando…' : 'Enviar prueba'}
          </button>
        </div>
      </div>
    </div>
  );
}

export function Recordatorios() {
  const [tab, setTab] = React.useState('pre-trip');
  const [picked, setPicked] = React.useState('R-24');
  const [modal, setModal] = React.useState(null); // null | {} (nueva) | campaign (editar)
  const [testRule, setTestRule] = React.useState(null); // regla a probar (abre TestReminderModal)
  const qc = useQueryClient();

  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ['campaigns'],
    queryFn: campaignsApi.list,
  });

  const send = useMutation({
    mutationFn: (id) => campaignsApi.send(id),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['campaigns'] });
      const stats = res?.stats || {};
      const extra = stats.failed ? ` · ${stats.failed} falló(aron)` : '';
      window.toast?.(`Enviada a ${stats.sent ?? 0} cliente(s)${extra}`, { label: 'Campañas', kind: stats.failed ? 'accent' : 'good' });
    },
    onError: (err) => {
      const msg = err.status === 502 ? 'WhatsApp no está conectado.' : (err.message || 'No se pudo enviar.');
      window.toast?.(msg, { label: 'Error', kind: 'accent' });
    },
  });
  const remove = useMutation({
    mutationFn: (id) => campaignsApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['campaigns'] });
      window.toast?.('Campaña eliminada', { label: 'Campañas', kind: 'accent' });
    },
  });

  // ---- Config persistente: recordatorios pre-trip + post-servicio ----
  const { data: pretripCfg } = useQuery({ queryKey: ['settings', 'reminders.pretrip'], queryFn: () => settingsApi.get('reminders.pretrip') });
  const { data: postCfg } = useQuery({ queryKey: ['settings', 'reminders.postservice'], queryFn: () => settingsApi.get('reminders.postservice') });

  const [rules, setRules] = React.useState([]);
  const [post, setPost] = React.useState(null);

  React.useEffect(() => { if (pretripCfg?.value?.rules) setRules(pretripCfg.value.rules); }, [pretripCfg]);
  React.useEffect(() => { if (postCfg?.value) setPost(postCfg.value); }, [postCfg]);

  const savePretrip = useMutation({
    mutationFn: (value) => settingsApi.set('reminders.pretrip', value),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['settings', 'reminders.pretrip'] }),
  });
  const savePost = useMutation({
    mutationFn: (value) => settingsApi.set('reminders.postservice', value),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['settings', 'reminders.postservice'] }),
  });

  // Alterna una regla pre-trip y persiste de inmediato.
  const toggleRule = (id) => {
    const next = rules.map((x) => x.id === id ? { ...x, active: !x.active } : x);
    setRules(next);
    savePretrip.mutate({ rules: next });
  };

  // Regla seleccionada para la vista previa (cae a la primera si la elegida no existe).
  const r = rules.find((x) => x.id === picked) || rules[0] || { when: '-24h', label: '—', template: '' };

  const fmt = (iso) => iso ? new Date(iso).toLocaleString('es-PE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';

  return (
    <div className="view">
      <div className="row between">
        <div>
          <h1 className="h1">Recordatorios y campañas</h1>
          <p className="lead" style={{ marginTop: 4 }}>Comunicación previa al viaje, post-servicio y mensajes masivos a tu base de clientes.</p>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <button className="btn ghost" onClick={() => setTab('mass')}><Ico.eye />Ver campañas</button>
          <button className="btn" onClick={() => { setTab('mass'); setModal({}); }}><Ico.plus />Nueva campaña</button>
        </div>
      </div>

      <div className="spacer-m" />

      <div className="grid-stats">
        <div className="stat"><div className="label">Recordatorios hoy</div><div className="value">38</div><div className="delta"><span className="mono">14 enviados · 24 programados</span></div></div>
        <div className="stat"><div className="label">Tasa de lectura</div><div className="value">96<span style={{ fontSize: 14, color: 'var(--muted)' }}>%</span></div><div className="delta up"><Ico.up />+0.8 pts</div></div>
        <div className="stat"><div className="label">NPS post-servicio (30d)</div><div className="value">8.7</div><div className="delta up"><Ico.up />+0.3</div></div>
        <div className="stat"><div className="label">Campañas programadas</div><div className="value">{campaigns.filter((c) => c.status === 'SCHEDULED').length}</div><div className="delta"><span className="mono">{campaigns.filter((c) => c.status === 'COMPLETED').length} enviadas · {campaigns.length} en total</span></div></div>
      </div>

      <div className="spacer-m" />

      <div className="tabs" style={{ marginBottom: 14 }}>
        {[
          ['pre-trip', 'Recordatorios previos al viaje'],
          ['post', 'Comunicación post-servicio'],
          ['mass', 'Mensajes masivos / campañas'],
        ].map(([k, l]) => (
          <button key={k} className={'tab ' + (tab === k ? 'active' : '')} onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>

      {tab === 'pre-trip' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 12 }}>
          <div className="card">
            <div className="card-h"><h2 className="h2">Línea de tiempo del viajero</h2><span className="pill good"><span className="d" />activa</span></div>
            <div className="card-b" style={{ padding: '24px 20px 16px' }}>
              <div style={{ position: 'relative', height: 110, marginBottom: 10 }}>
                <div style={{ position: 'absolute', left: 0, right: 0, top: '50%', height: 1, background: 'var(--hair-2)' }} />
                {[
                  { l: 'Reserva', x: '2%',  c: 'var(--good)' },
                  { l: '-48h',    x: '30%', c: 'var(--accent)' },
                  { l: '-24h',    x: '50%', c: 'var(--accent)' },
                  { l: '-12h',    x: '66%', c: 'var(--accent)' },
                  { l: 'TOUR',    x: '78%', c: 'var(--ink)' },
                  { l: '+48h NPS',x: '95%', c: 'var(--info)' },
                ].map((s, i) => (
                  <div key={i} style={{ position: 'absolute', left: s.x, top: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
                    <div style={{ width: 12, height: 12, borderRadius: '50%', background: s.c, border: '2px solid var(--surface)', boxShadow: '0 0 0 1px var(--hair-2)', margin: '0 auto' }} />
                    <div className="mono" style={{ fontSize: 10, color: 'var(--muted)', marginTop: 6, whiteSpace: 'nowrap' }}>{s.l}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="card-b flush" style={{ borderTop: '1px solid var(--hair)' }}>
              <table className="t">
                <thead><tr><th>Disparo</th><th>Plantilla</th><th style={{ textAlign: 'right' }}>Enviados</th><th style={{ textAlign: 'right' }}>Leídos</th><th>Estado</th><th></th></tr></thead>
                <tbody>
                  {rules.map(x => (
                    <tr key={x.id} className={picked === x.id ? 'selected' : ''} onClick={() => setPicked(x.id)} style={{ cursor: 'pointer' }}>
                      <td><div style={{ fontSize: 12, fontWeight: 500 }}>{x.label}</div><div className="cell-id">{x.when}</div></td>
                      <td className="cell-id">{x.template}</td>
                      <td className="cell-num" style={{ textAlign: 'right', color: 'var(--muted)' }}>—</td>
                      <td className="cell-num" style={{ textAlign: 'right', color: 'var(--muted)' }}>—</td>
                      <td onClick={(e) => { e.stopPropagation(); toggleRule(x.id); }} style={{ cursor: 'pointer' }} title={x.active ? 'Desactivar' : 'Activar'}>
                        <span className={'switch ' + (x.active ? 'on' : '')} />
                      </td>
                      <td><span className="cell-id">{x.active ? 'activo' : 'inactivo'}</span></td>
                    </tr>
                  ))}
                  {rules.length === 0 && <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--muted)', padding: 18 }}>Cargando recordatorios…</td></tr>}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card" style={{ position: 'sticky', top: 0 }}>
            <div className="card-h"><h2 className="h2">Vista previa · {r.label}</h2></div>
            <div className="card-b">
              <div style={{ background: '#E5DDD5', padding: 14, borderRadius: 6 }}>
                <PreTripPreview when={r.when} />
              </div>
              <div className="spacer-m" />
              <div className="field"><label>Plantilla</label>
                <select className="input" defaultValue={r.template}>
                  <option>{r.template}</option>
                </select>
              </div>
              <div className="spacer-s" />
              <div className="field"><label>Adjuntar</label>
                <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
                  <button className="btn ghost sm">PDF itinerario</button>
                  <button className="btn ghost sm">Mapa Google</button>
                  <button className="btn ghost sm">Recomendaciones</button>
                </div>
              </div>
              <div className="spacer-s" />
              <button className="btn" style={{ width: '100%' }} data-handled="1" onClick={() => setTestRule(r)}><Ico.send />Probar envío a mi número</button>
            </div>
          </div>
        </div>
      )}

      {tab === 'post' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 12 }}>
          <div className="card">
            <div className="card-h">
              <h2 className="h2">Comunicación post-servicio</h2>
              <span className={'pill ' + (post?.active ? 'good' : '')}><span className="d" style={post?.active ? undefined : { background: 'var(--muted)' }} />{post?.active ? 'activa' : 'inactiva'}</span>
            </div>
            <div className="card-b" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {!post && <div style={{ color: 'var(--muted)', fontSize: 12 }}>Cargando configuración…</div>}
              {post && <>
                <div className="field"><label>Disparador</label>
                  <select className="input" value={post.trigger} onChange={(e) => setPost({ ...post, trigger: e.target.value })}>
                    <option>Fecha de fin de tour + 48 horas</option>
                    <option>Inmediato al cierre del tour</option>
                  </select>
                </div>
                <div className="field"><label>Mensaje de agradecimiento</label>
                  <textarea className="input" value={post.thankYou || ''} onChange={(e) => setPost({ ...post, thankYou: e.target.value })} style={{ minHeight: 80 }} />
                </div>
                <div className="field"><label>Cupón de fidelización (opcional)</label>
                  <div className="row" style={{ gap: 6 }}>
                    <input className="input mono" value={post.coupon?.code || ''} onChange={(e) => setPost({ ...post, coupon: { ...post.coupon, code: e.target.value } })} style={{ flex: 1 }} />
                    <input className="input" value={post.coupon?.label || ''} onChange={(e) => setPost({ ...post, coupon: { ...post.coupon, label: e.target.value } })} style={{ flex: 2 }} />
                  </div>
                </div>
                <div className="field"><label>Si NPS ≥ 9 → pedir reseña</label>
                  <input className="input" value={post.reviewUrl || ''} onChange={(e) => setPost({ ...post, reviewUrl: e.target.value })} />
                </div>
                <div className="field"><label>Estado</label>
                  <label className="row" style={{ gap: 8, cursor: 'pointer' }}>
                    <span className={'switch ' + (post.active ? 'on' : '')} onClick={() => setPost({ ...post, active: !post.active })} />
                    <span style={{ fontSize: 12 }}>{post.active ? 'Activa' : 'Inactiva'}</span>
                  </label>
                </div>
                <div className="row between" style={{ marginTop: 4 }}>
                  <span className="cell-id">{savePost.isSuccess ? 'Guardado ✓' : savePost.isPending ? 'Guardando…' : ''}</span>
                  <button className="btn" onClick={() => savePost.mutate(post)} disabled={savePost.isPending}><Ico.send />Guardar configuración</button>
                </div>
              </>}
            </div>
          </div>
          <div className="card">
            <div className="card-h"><h2 className="h2">Resultados últimos 30 días</h2><span className="cell-id">ejemplo</span></div>
            <div className="card-b">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', rowGap: 10, fontSize: 12 }}>
                <span style={{ color: 'var(--muted)' }}>Encuestas enviadas</span><span className="mono">298</span>
                <span style={{ color: 'var(--muted)' }}>Respuestas</span><span className="mono">212 · 71%</span>
                <span style={{ color: 'var(--muted)' }}>NPS promedio</span><span className="mono" style={{ color: 'var(--good)' }}>8.7 / 10</span>
                <span style={{ color: 'var(--muted)' }}>Reseñas Google generadas</span><span className="mono">+47</span>
                <span style={{ color: 'var(--muted)' }}>Cupones canjeados</span><span className="mono">28 · S/ 6,140</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'mass' && (
        <div className="card">
          <div className="card-h">
            <div>
              <h2 className="h2">Campañas masivas</h2>
              <p className="lead" style={{ marginTop: 2, fontSize: 12 }}>Envía promociones, nuevas rutas, cambios operativos o avisos a toda tu base o a un grupo de clientes, al instante o programado.</p>
            </div>
            <div style={{ flex: 1 }} />
            <button className="btn" onClick={() => setModal({})}><Ico.plus />Nueva campaña</button>
          </div>
          <div className="card-b flush">
            <table className="t">
              <thead><tr><th>Campaña</th><th>Audiencia</th><th>Programada</th><th style={{ textAlign: 'right' }}>Enviados</th><th style={{ textAlign: 'right' }}>Fallidos</th><th>Estado</th><th></th></tr></thead>
              <tbody>
                {isLoading && <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--muted)', padding: 20 }}>Cargando campañas…</td></tr>}
                {!isLoading && campaigns.length === 0 && (
                  <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--muted)', padding: 24 }}>
                    Aún no hay campañas. Crea la primera con “Nueva campaña”.
                  </td></tr>
                )}
                {campaigns.map(c => {
                  const pill = STATUS_PILL[c.status] || STATUS_PILL.DRAFT;
                  const tags = c.audience?.tags || [];
                  const stats = c.stats || {};
                  const sending = send.isPending && send.variables === c.id;
                  // Solo tiene sentido enviar manualmente lo que no se ha enviado y no está en curso.
                  const canSend = c.status !== 'RUNNING' && c.status !== 'COMPLETED';
                  return (
                    <tr key={c.id}>
                      <td>
                        <div style={{ fontSize: 12, fontWeight: 500 }}>{c.name}</div>
                        {c.body && <div className="cell-id" style={{ maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.body}</div>}
                      </td>
                      <td><span className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>{tags.length ? tags.join(', ') : 'Toda la base'}</span></td>
                      <td className="cell-id">{c.scheduledAt ? fmt(c.scheduledAt) : (c.status === 'COMPLETED' ? 'Inmediata' : '—')}</td>
                      <td className="cell-num" style={{ textAlign: 'right' }}>{stats.sent ?? '—'}</td>
                      <td className="cell-num" style={{ textAlign: 'right', color: stats.failed ? 'var(--bad)' : 'var(--muted)' }}>{stats.failed ?? '—'}</td>
                      <td><span className={'pill ' + pill.cls}><span className="d" style={pill.dot ? { background: pill.dot } : undefined} />{pill.label}</span></td>
                      <td>
                        <div className="row" style={{ gap: 4, justifyContent: 'flex-end' }}>
                          {canSend && (
                            <button className="btn ghost sm" disabled={sending}
                              onClick={() => { if (confirm(`¿Enviar la campaña "${c.name}" ahora a sus destinatarios?`)) send.mutate(c.id); }}>
                              <Ico.send />{sending ? 'Enviando…' : (c.status === 'SCHEDULED' ? 'Enviar ya' : 'Enviar')}
                            </button>
                          )}
                          <button className="iconbtn" title="Editar" onClick={() => setModal(c)}><Ico.pencil /></button>
                          <button className="iconbtn" title="Eliminar"
                            onClick={() => { if (confirm('¿Eliminar esta campaña?')) remove.mutate(c.id); }}><Ico.trash /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {modal && <CampaignModal campaign={modal.id ? modal : null} onClose={() => setModal(null)} onCreated={() => setTab('mass')} />}
      {testRule && <TestReminderModal rule={testRule} onClose={() => setTestRule(null)} />}
    </div>
  );
}
