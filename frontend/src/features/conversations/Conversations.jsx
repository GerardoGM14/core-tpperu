import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Ico from '../../components/icons';
import { conversationsApi, fileToBase64 } from '../../api/conversations';
import { templatesApi } from '../../api/templates';
import { getConversationsSocket } from '../../api/socket';

// Rellena las variables {nombre} de una plantilla con datos del contacto.
function fillTemplate(body, conversation) {
  const name = conversation?.customer?.fullName || conversation?.displayName || '';
  const firstName = name.split(' ')[0] || '';
  const map = { nombre: firstName || name, cliente: name };
  return body.replace(/\{(\w+)\}/g, (_, k) => map[k] ?? `{${k}}`);
}

// Render del contenido multimedia de un mensaje según su tipo.
function MessageMedia({ m }) {
  const url = m.mediaUrl;
  const mime = m.mediaMimeType || '';
  if (!url && m.kind === 'TEXT') return null;

  if (m.kind === 'IMAGE' && url) {
    return <img src={url} alt={m.body || 'imagen'} style={{ maxWidth: 240, borderRadius: 6, display: 'block', marginBottom: m.body ? 6 : 0 }} />;
  }
  if (m.kind === 'VIDEO' && url) {
    return <video src={url} controls style={{ maxWidth: 260, borderRadius: 6, display: 'block', marginBottom: m.body ? 6 : 0 }} />;
  }
  if (m.kind === 'AUDIO' && url) {
    return <audio src={url} controls style={{ display: 'block', marginBottom: 4, maxWidth: 240 }} />;
  }
  if (m.kind === 'DOCUMENT' && url) {
    return (
      <a href={url} target="_blank" rel="noreferrer" className="row" style={{ gap: 8, textDecoration: 'none', color: 'inherit', marginBottom: m.body ? 6 : 0 }}>
        <Ico.copy /><span style={{ fontSize: 12, fontWeight: 500 }}>{m.body || 'Documento'}</span>
      </a>
    );
  }
  // media saliente sin url servible (la enviamos pero no la re-servimos)
  if (!url && m.kind !== 'TEXT') {
    const label = { IMAGE: '🖼️ Imagen', VIDEO: '🎬 Video', AUDIO: '🎵 Audio', DOCUMENT: '📄 Documento' }[m.kind] || m.kind;
    return <div style={{ fontSize: 12, opacity: 0.85, marginBottom: m.body ? 6 : 0 }}>{label}</div>;
  }
  return null;
}

// Devuelve el teléfono legible desde un JID de WhatsApp.
// - usuario@s.whatsapp.net → +51987654321 (quita el :device si lo trae)
// - cualquier otro tipo (@lid, @g.us...) → sin número mostrable
const phoneFromJid = (jid) => {
  if (!jid) return '';
  const [user, server] = jid.split('@');
  if (server !== 's.whatsapp.net') return ''; // @lid u otros: no hay teléfono real
  const num = user.split(':')[0].split('.')[0]; // quita device id
  return '+' + num;
};

function timeLabel(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return d.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: false });
  const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return 'ayer';
  return d.toLocaleDateString('es-PE', { day: '2-digit', month: 'short' });
}

const initials = (name) => (name || '??').split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();

// Etiqueta del tipo de chat para la bandeja.
const chatTypeBadge = (type) => {
  if (type === 'group') return { icon: '👥', label: 'Grupo' };
  if (type === 'community') return { icon: '🏘️', label: 'Comunidad' };
  return null; // individual: sin badge
};

// Color determinístico a partir del nombre, para los avatares con iniciales.
const AVATAR_COLORS = ['#C2552B', '#1F6B5E', '#3B5BA5', '#8B5A2B', '#6E5494', '#B23A48', '#2E7D6F', '#A8761C'];
const avatarColor = (key) => {
  let h = 0;
  for (let i = 0; i < (key || '').length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
};

// Avatar: muestra foto si la hay, si no iniciales con color por contacto.
function Avatar({ name, src, size = 36 }) {
  const [broken, setBroken] = React.useState(false);
  const showImg = src && !broken;
  return (
    <div
      className="av"
      style={{
        width: size, height: size, fontSize: size <= 36 ? 12 : 16,
        background: showImg ? 'transparent' : avatarColor(name),
        color: '#fff', overflow: 'hidden', flexShrink: 0,
      }}>
      {showImg
        ? <img src={src} alt={name} width={size} height={size} style={{ objectFit: 'cover', display: 'block' }} onError={() => setBroken(true)} />
        : initials(name)}
    </div>
  );
}

export function Conversations() {
  const qc = useQueryClient();
  const [activeId, setActiveId] = React.useState(null);
  const [draft, setDraft] = React.useState('');
  const [search, setSearch] = React.useState('');
  const [attachment, setAttachment] = React.useState(null); // { file, previewUrl }
  const [showTemplates, setShowTemplates] = React.useState(false);
  const scrollRef = React.useRef(null);
  const fileInputRef = React.useRef(null);

  // Plantillas aprobadas para respuestas rápidas
  const { data: allTemplates = [] } = useQuery({
    queryKey: ['templates'],
    queryFn: templatesApi.list,
    staleTime: 60000,
  });
  const quickTemplates = allTemplates.filter((t) => t.status === 'APPROVED');

  const { data: convos = [], isLoading } = useQuery({
    queryKey: ['conversations'],
    queryFn: conversationsApi.list,
  });

  // Selecciona la primera conversación al cargar
  React.useEffect(() => {
    if (!activeId && convos.length) setActiveId(convos[0].id);
  }, [convos, activeId]);

  const active = convos.find((c) => c.id === activeId);

  const { data: messagesDesc = [] } = useQuery({
    queryKey: ['messages', activeId],
    queryFn: () => conversationsApi.messages(activeId, 100),
    enabled: !!activeId,
  });
  // Las reacciones no son mensajes propios: van pegadas a su mensaje original.
  // Filtramos los REACTION sueltos (incluidos los viejos ya guardados).
  const messages = React.useMemo(
    () => [...messagesDesc].reverse().filter((m) => m.kind !== 'REACTION'),
    [messagesDesc],
  );

  // Tiempo real: cuando llega/sale un mensaje, refrescar bandeja e hilo
  React.useEffect(() => {
    const socket = getConversationsSocket();
    const onMessage = ({ conversation }) => {
      qc.invalidateQueries({ queryKey: ['conversations'] });
      if (conversation?.id) qc.invalidateQueries({ queryKey: ['messages', conversation.id] });
    };
    socket.on('message', onMessage);
    return () => socket.off('message', onMessage);
  }, [qc]);

  // Marcar leída al abrir
  React.useEffect(() => {
    if (active && active.unreadCount > 0) {
      conversationsApi.markRead(active.id).then(() =>
        qc.invalidateQueries({ queryKey: ['conversations'] }),
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId, active?.unreadCount]);

  // Auto-scroll al fondo cuando cambian los mensajes
  React.useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length, activeId]);

  const sendMut = useMutation({
    mutationFn: (body) => conversationsApi.send(activeId, body),
    onSuccess: () => {
      setDraft('');
      qc.invalidateQueries({ queryKey: ['messages', activeId] });
      qc.invalidateQueries({ queryKey: ['conversations'] });
    },
    onError: (e) => {
      const msg = e.status === 502
        ? 'WhatsApp no está conectado. Ve a Conexión WhatsApp y vincula tu número.'
        : (e.message || 'No se pudo enviar el mensaje.');
      window.toast?.(msg, { label: 'WhatsApp', kind: 'accent' });
    },
  });

  const sendMediaMut = useMutation({
    mutationFn: async ({ file, caption }) => {
      const data = await fileToBase64(file);
      return conversationsApi.sendMedia(activeId, {
        data, mime: file.type || 'application/octet-stream', caption, filename: file.name,
      });
    },
    onSuccess: () => {
      setDraft('');
      if (attachment?.previewUrl) URL.revokeObjectURL(attachment.previewUrl);
      setAttachment(null);
      qc.invalidateQueries({ queryKey: ['messages', activeId] });
      qc.invalidateQueries({ queryKey: ['conversations'] });
    },
    onError: (e) => {
      const msg = e.status === 502
        ? 'WhatsApp no está conectado.'
        : (e.message || 'No se pudo enviar el archivo.');
      window.toast?.(msg, { label: 'WhatsApp', kind: 'accent' });
    },
  });

  const onPickFile = (e) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // permite re-seleccionar el mismo archivo
    if (!file) return;
    if (file.size > 25 * 1024 * 1024) {
      window.toast?.('El archivo supera 25 MB.', { label: 'WhatsApp', kind: 'accent' });
      return;
    }
    const previewUrl = file.type.startsWith('image') || file.type.startsWith('video')
      ? URL.createObjectURL(file) : null;
    setAttachment({ file, previewUrl });
  };

  const doSend = () => {
    if (!activeId) return;
    if (attachment) {
      if (sendMediaMut.isPending) return;
      sendMediaMut.mutate({ file: attachment.file, caption: draft.trim() });
      return;
    }
    const body = draft.trim();
    if (!body || sendMut.isPending) return;
    sendMut.mutate(body);
  };

  const busy = sendMut.isPending || sendMediaMut.isPending;

  const q = search.trim().toLowerCase();
  const filtered = q
    ? convos.filter((c) => {
        const name = c.customer?.fullName || c.displayName || '';
        return name.toLowerCase().includes(q) || c.remoteJid.includes(q.replace('+', ''));
      })
    : convos;

  const totalUnread = convos.reduce((s, c) => s + (c.unreadCount || 0), 0);
  const nameOf = (c) => {
    if (!c) return '';
    // En grupos/comunidades el displayName es el nombre del grupo.
    if (c.chatType === 'group' || c.chatType === 'community') {
      return c.displayName || 'Grupo de WhatsApp';
    }
    return c.customer?.fullName || c.displayName || phoneFromJid(c.remoteJid);
  };

  return (
    <div className="view no-pad">
      <div className="conv">
        {/* ---------- Lista ---------- */}
        <div className="conv-list">
          <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--hair)' }}>
            <div className="row between">
              <h2 className="h2">Bandeja</h2>
              {totalUnread > 0 && <span className="pill wa"><span className="d" />{totalUnread} sin leer</span>}
            </div>
            <div className="topbar-search" style={{ marginTop: 10, width: '100%' }}>
              <Ico.search />
              <input placeholder="Buscar contacto..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>

          {isLoading && (
            <div style={{ padding: 20, textAlign: 'center', color: 'var(--muted)', fontSize: 12 }}>Cargando…</div>
          )}
          {!isLoading && filtered.length === 0 && (
            <div style={{ padding: 20, textAlign: 'center', color: 'var(--muted)', fontSize: 12 }}>
              {convos.length === 0
                ? 'Sin conversaciones todavía. Cuando alguien escriba a tu WhatsApp aparecerá aquí.'
                : 'Sin resultados.'}
            </div>
          )}

          {filtered.map((c) => (
            <div key={c.id} className={'cl-item ' + (activeId === c.id ? 'active' : '')} onClick={() => setActiveId(c.id)}>
              <Avatar name={nameOf(c)} src={c.avatarUrl} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="row between">
                  <span className="nm" style={{ display: 'flex', alignItems: 'center', gap: 5, minWidth: 0 }}>
                    {chatTypeBadge(c.chatType) && <span title={chatTypeBadge(c.chatType).label} style={{ fontSize: 11, flexShrink: 0 }}>{chatTypeBadge(c.chatType).icon}</span>}
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nameOf(c)}</span>
                  </span>
                  <span className="tm">{timeLabel(c.lastMessageAt)}</span>
                </div>
                <div className="row between" style={{ marginTop: 2 }}>
                  <span className="pv" style={{ flex: 1, minWidth: 0 }}>
                    {c.messages?.[0]?.body || (c.messages?.[0] ? `[${c.messages[0].kind?.toLowerCase()}]` : '')}
                  </span>
                  {c.unreadCount > 0 && (
                    <span className="pill ink" style={{ padding: '1px 6px', fontSize: 10, marginLeft: 6 }}>{c.unreadCount}</span>
                  )}
                </div>
                <div className="mono" style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>{phoneFromJid(c.remoteJid)}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ---------- Hilo ---------- */}
        <div className="conv-thread">
          {!active ? (
            <div style={{ flex: 1, display: 'grid', placeItems: 'center', color: 'var(--muted)', fontSize: 13 }}>
              Selecciona una conversación
            </div>
          ) : (
            <>
              <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--hair)', display: 'flex', alignItems: 'center', gap: 10 }}>
                <Avatar name={nameOf(active)} src={active.avatarUrl} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{nameOf(active)}</div>
                  <div className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>{phoneFromJid(active.remoteJid)}</div>
                </div>
                <div style={{ flex: 1 }} />
                <button className="iconbtn"><Ico.more /></button>
              </div>

              <div ref={scrollRef} style={{
                flex: 1, overflow: 'auto', padding: '18px 24px',
                background: 'radial-gradient(circle, var(--hair) 1px, transparent 1px) 0 0 / 16px 16px, var(--paper)',
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {messages.map((m) => {
                    const isMe = m.direction === 'OUTBOUND';
                    const isGroupChat = active.chatType === 'group' || active.chatType === 'community';
                    return (
                      <div key={m.id} style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
                        {isGroupChat && !isMe && m.senderName && (
                          <div style={{ fontSize: 10, fontWeight: 600, color: avatarColor(m.senderName), marginBottom: 2, marginLeft: 4 }}>
                            {m.senderName}
                          </div>
                        )}
                        <div className={'bubble ' + (isMe ? 'me' : 'them')} style={{ whiteSpace: 'pre-line', position: 'relative', marginBottom: m.reaction ? 10 : 0 }}>
                          <MessageMedia m={m} />
                          {m.body}
                          <span className="ts">
                            {timeLabel(m.sentAt || m.createdAt)}
                            {isMe && <span style={{ marginLeft: 4 }}>{m.status === 'READ' ? '✓✓' : '✓'}</span>}
                          </span>
                          {m.reaction && (
                            <span style={{
                              position: 'absolute', bottom: -12, [isMe ? 'right' : 'left']: 8,
                              background: 'var(--surface)', border: '1px solid var(--hair)', borderRadius: 999,
                              padding: '1px 5px', fontSize: 13, lineHeight: 1.2, boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
                            }}>{m.reaction}</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {messages.length === 0 && (
                    <div style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 12, marginTop: 30 }}>
                      Sin mensajes en esta conversación.
                    </div>
                  )}
                </div>
              </div>

              <div style={{ borderTop: '1px solid var(--hair)', padding: '10px 16px', background: 'var(--paper)' }}>
                {attachment && (
                  <div className="row" style={{ gap: 10, marginBottom: 8, padding: 8, background: 'var(--surface)', border: '1px solid var(--hair)', borderRadius: 6 }}>
                    {attachment.previewUrl && attachment.file.type.startsWith('image') && (
                      <img src={attachment.previewUrl} alt="preview" style={{ width: 44, height: 44, objectFit: 'cover', borderRadius: 4 }} />
                    )}
                    {attachment.previewUrl && attachment.file.type.startsWith('video') && (
                      <video src={attachment.previewUrl} style={{ width: 44, height: 44, objectFit: 'cover', borderRadius: 4 }} />
                    )}
                    {!attachment.previewUrl && <div style={{ fontSize: 20 }}>📄</div>}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{attachment.file.name}</div>
                      <div className="mono" style={{ fontSize: 10, color: 'var(--muted)' }}>{(attachment.file.size / 1024).toFixed(0)} KB · {attachment.file.type || 'archivo'}</div>
                    </div>
                    <button className="iconbtn" data-handled="1" title="Quitar" onClick={() => {
                      if (attachment.previewUrl) URL.revokeObjectURL(attachment.previewUrl);
                      setAttachment(null);
                    }}><Ico.x /></button>
                  </div>
                )}
                <div className="row" style={{ gap: 8, alignItems: 'flex-end', position: 'relative' }}>
                  <input ref={fileInputRef} type="file" hidden onChange={onPickFile}
                    accept="image/*,video/*,audio/*,application/pdf" />
                  <button className="iconbtn" data-handled="1" title="Adjuntar archivo"
                    style={{ height: 36, width: 36 }}
                    onClick={() => fileInputRef.current?.click()}>
                    <Ico.plus />
                  </button>

                  {/* Plantillas rápidas */}
                  <button className="iconbtn" data-handled="1" title="Insertar plantilla"
                    style={{ height: 36, width: 36 }}
                    onClick={() => setShowTemplates((s) => !s)}>
                    <Ico.bolt />
                  </button>
                  {showTemplates && (
                    <div style={{
                      position: 'absolute', bottom: 44, left: 0, zIndex: 50, width: 320,
                      background: 'var(--surface)', border: '1px solid var(--hair-2)', borderRadius: 8,
                      boxShadow: '0 8px 30px rgba(0,0,0,0.18)', maxHeight: 280, overflow: 'auto',
                    }}>
                      <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--hair)', fontSize: 11, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        Respuestas rápidas
                      </div>
                      {quickTemplates.length === 0 && (
                        <div style={{ padding: 14, fontSize: 12, color: 'var(--muted)' }}>No hay plantillas aprobadas. Créalas en Plantillas.</div>
                      )}
                      {quickTemplates.map((t) => (
                        <div key={t.id}
                          onClick={() => { setDraft((d) => (d ? d + '\n' : '') + fillTemplate(t.body, active)); setShowTemplates(false); }}
                          style={{ padding: '10px 12px', borderBottom: '1px solid var(--hair)', cursor: 'pointer' }}
                          onMouseEnter={(e) => e.currentTarget.style.background = 'var(--paper)'}
                          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                          <div style={{ fontSize: 12, fontWeight: 500 }}>{t.name}</div>
                          <div style={{ fontSize: 11, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{fillTemplate(t.body, active)}</div>
                        </div>
                      ))}
                    </div>
                  )}
                  <textarea
                    className="input"
                    placeholder={attachment ? 'Añade un comentario (opcional)…' : 'Escribe un mensaje... (Enter para enviar)'}
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); doSend(); }
                    }}
                    style={{ flex: 1, minHeight: 44, maxHeight: 120 }}
                  />
                  <button
                    className="btn accent" data-handled="1"
                    style={{ height: 36 }}
                    disabled={busy || (!draft.trim() && !attachment)}
                    onClick={doSend}>
                    <Ico.send />{busy ? 'Enviando…' : 'Enviar'}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* ---------- Panel lateral ---------- */}
        <div className="conv-side">
          {active && (
            <>
              <div style={{ padding: '16px 16px 10px', borderBottom: '1px solid var(--hair)' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                  <Avatar name={nameOf(active)} src={active.avatarUrl} size={56} />
                  <div style={{ fontSize: 14, fontWeight: 500 }}>{nameOf(active)}</div>
                  <div className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>{phoneFromJid(active.remoteJid)}</div>
                </div>
              </div>

              <div style={{ padding: 14, borderBottom: '1px solid var(--hair)' }}>
                <div className="h3" style={{ marginBottom: 8 }}>Contacto</div>
                {active.customer ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12 }}>
                    {active.customer.email && (
                      <div><div style={{ color: 'var(--muted)', fontSize: 11 }}>Email</div><div className="mono" style={{ fontSize: 11 }}>{active.customer.email}</div></div>
                    )}
                    {active.customer.documentId && (
                      <div><div style={{ color: 'var(--muted)', fontSize: 11 }}>Documento</div><div className="mono">{active.customer.documentId}</div></div>
                    )}
                    {active.customer.notes && (
                      <div><div style={{ color: 'var(--muted)', fontSize: 11 }}>Notas</div><div>{active.customer.notes}</div></div>
                    )}
                  </div>
                ) : (
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                    Este número no está registrado como cliente todavía.
                  </div>
                )}
              </div>

              {active.customer?.tags?.length > 0 && (
                <div style={{ padding: 14 }}>
                  <div className="h3" style={{ marginBottom: 8 }}>Etiquetas</div>
                  <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
                    {active.customer.tags.map((t) => <span key={t} className="pill">{t}</span>)}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
