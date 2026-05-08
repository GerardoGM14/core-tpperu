import React from 'react';
import Ico from '../../components/icons';
import { TRAVESIA_DATA } from '../../data/travesia';

const { conversations } = TRAVESIA_DATA;

export function Conversations() {
  const [activeId, setActiveId] = React.useState(conversations[0].id);
  const [filter, setFilter] = React.useState('todos');
  const [draft, setDraft] = React.useState('');
  const active = conversations.find(c => c.id === activeId);

  return (
    <div className="view no-pad">
      <div className="conv">
        <div className="conv-list">
          <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--hair)' }}>
            <div className="row between">
              <h2 className="h2">Bandeja</h2>
              <span className="pill wa"><span className="d" />3 sin leer</span>
            </div>
            <div className="topbar-search" style={{ marginTop: 10, width: '100%' }}>
              <Ico.search /><input placeholder="Buscar contacto..." />
            </div>
            <div className="row" style={{ marginTop: 8, gap: 4 }}>
              {['todos', 'sin-leer', 'bot', 'asesor'].map(k => (
                <button key={k} className={'pill ' + (filter === k ? 'ink' : '')} onClick={() => setFilter(k)}>{k}</button>
              ))}
            </div>
          </div>
          {conversations.map(c => (
            <div key={c.id} className={'cl-item ' + (activeId === c.id ? 'active' : '')} onClick={() => setActiveId(c.id)}>
              <div style={{ position: 'relative' }}>
                <div className="av">{c.name.split(' ').map(n => n[0]).slice(0, 2).join('')}</div>
                {c.online && <span style={{ position: 'absolute', bottom: 0, right: 0, width: 8, height: 8, borderRadius: '50%', background: 'var(--good)', border: '1.5px solid var(--paper)' }} />}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="row between"><span className="nm">{c.name}</span><span className="tm">{c.time}</span></div>
                <div className="row between" style={{ marginTop: 2 }}>
                  <span className="pv" style={{ flex: 1, minWidth: 0 }}>{c.preview}</span>
                  {c.unread > 0 && <span className="pill ink" style={{ padding: '1px 6px', fontSize: 10, marginLeft: 6 }}>{c.unread}</span>}
                </div>
                <div className="mono" style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>{c.phone}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="conv-thread">
          <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--hair)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="av lg">{active.name.split(' ').map(n => n[0]).slice(0, 2).join('')}</div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 500 }}>{active.name}</div>
              <div className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>{active.phone} · {active.online ? 'en línea' : 'visto hace 14 min'}</div>
            </div>
            <div style={{ flex: 1 }} />
            <span className="pill wa"><Ico.bot style={{ width: 11, height: 11 }} />bot pausado</span>
            <button className="iconbtn"><Ico.bot /></button>
            <button className="iconbtn"><Ico.more /></button>
          </div>

          <div style={{
            flex: 1, overflow: 'auto', padding: '18px 24px',
            background: 'radial-gradient(circle, var(--hair) 1px, transparent 1px) 0 0 / 16px 16px, var(--paper)',
          }}>
            <div className="row" style={{ justifyContent: 'center', marginBottom: 16 }}>
              <span className="pill mono" style={{ fontSize: 10 }}>06 may 2026 · jueves</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {active.messages.map((m, i) => {
                const align = m.from === 'them' ? 'flex-start' : 'flex-end';
                const cls = m.from === 'bot' ? 'bot' : m.from === 'me' ? 'me' : 'them';
                return (
                  <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: align }}>
                    {m.from === 'bot' && <div className="mono" style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 2 }}>● Bot · Mara</div>}
                    {m.from === 'me' && <div className="mono" style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 2 }}>Camila Morales</div>}
                    <div className={'bubble ' + cls} style={{ whiteSpace: 'pre-line' }}>
                      {m.t}
                      <span className="ts">{m.ts} {m.from !== 'them' && <span style={{ marginLeft: 4 }}>✓✓</span>}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--hair)', padding: '10px 16px', background: 'var(--paper)' }}>
            <div className="row" style={{ gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
              <button className="btn ghost sm">Plantilla · Confirmación</button>
              <button className="btn ghost sm">Plantilla · Recuperación</button>
              <button className="btn ghost sm">Compartir paquete</button>
              <button className="btn ghost sm">Generar link de pago</button>
              <button className="btn ghost sm" style={{ marginLeft: 'auto', color: 'var(--accent)' }}><Ico.bot />Reanudar bot</button>
            </div>
            <div className="row" style={{ gap: 8, alignItems: 'flex-end' }}>
              <textarea className="input" placeholder="Escribe un mensaje... usa / para insertar variables o plantillas"
                value={draft} onChange={e => setDraft(e.target.value)}
                style={{ flex: 1, minHeight: 44, maxHeight: 120 }} />
              <button className="btn accent" style={{ height: 36 }}><Ico.send />Enviar</button>
            </div>
          </div>
        </div>

        <div className="conv-side">
          <div style={{ padding: '16px 16px 10px', borderBottom: '1px solid var(--hair)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <div className="av lg" style={{ width: 56, height: 56, fontSize: 16 }}>{active.name.split(' ').map(n => n[0]).slice(0, 2).join('')}</div>
              <div style={{ fontSize: 14, fontWeight: 500 }}>{active.name}</div>
              <div className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>{active.phone}</div>
              <div className="row" style={{ gap: 6, marginTop: 4 }}>
                <button className="btn ghost sm"><Ico.eye />Perfil</button>
                <button className="btn ghost sm"><Ico.pencil />Editar</button>
              </div>
            </div>
          </div>

          <div style={{ padding: 14, borderBottom: '1px solid var(--hair)' }}>
            <div className="h3" style={{ marginBottom: 8 }}>Atributos</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 12 }}>
              <div><div style={{ color: 'var(--muted)', fontSize: 11 }}>Etapa</div><span className="pill good"><span className="d" />Comprador</span></div>
              <div><div style={{ color: 'var(--muted)', fontSize: 11 }}>Origen</div><div className="mono" style={{ fontSize: 11 }}>landing · cyber</div></div>
              <div><div style={{ color: 'var(--muted)', fontSize: 11 }}>Reservas</div><div className="mono">3</div></div>
              <div><div style={{ color: 'var(--muted)', fontSize: 11 }}>LTV</div><div className="mono">S/ 1,247</div></div>
              <div><div style={{ color: 'var(--muted)', fontSize: 11 }}>Ciudad</div><div>Lima</div></div>
              <div><div style={{ color: 'var(--muted)', fontSize: 11 }}>Idioma</div><div>Español</div></div>
            </div>
          </div>

          <div style={{ padding: 14, borderBottom: '1px solid var(--hair)' }}>
            <div className="h3" style={{ marginBottom: 8 }}>Carrito actual</div>
            <div style={{ display: 'flex', gap: 10 }}>
              <div className="imgph" style={{ width: 48, height: 48, borderRadius: 4 }}>foto</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 500 }}>Tarapoto 7d/6n con noche en Laguna</div>
                <div className="mono" style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>2 personas · 14 may 2026</div>
                <div className="row" style={{ marginTop: 4, gap: 6 }}>
                  <span className="mono" style={{ fontSize: 11, fontWeight: 500 }}>S/ 1,178</span>
                  <span className="pill bad" style={{ padding: '1px 5px', fontSize: 10 }}>-45%</span>
                </div>
              </div>
            </div>
          </div>

          <div style={{ padding: 14 }}>
            <div className="h3" style={{ marginBottom: 8 }}>Etiquetas</div>
            <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
              <span className="pill"><Ico.x style={{ width: 9, height: 9, opacity: 0.6 }} />cyber-2026</span>
              <span className="pill"><Ico.x style={{ width: 9, height: 9, opacity: 0.6 }} />vip</span>
              <span className="pill"><Ico.x style={{ width: 9, height: 9, opacity: 0.6 }} />tarapoto</span>
              <button className="btn ghost sm"><Ico.plus />etiqueta</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const TEMPLATES = [
  { id: 'TPL-01', name: 'WSP_RECUP_CARRITO_v3', cat: 'Marketing', status: 'aprobada',  body: 'Hola {{1}} 🌿 Veo que dejaste *{{2}}* en tu maleta de viaje. ¿Te ayudo a finalizar la reserva?', uses: 412 },
  { id: 'TPL-02', name: 'WSP_CONFIRM_RESERVA',  cat: 'Utilidad',  status: 'aprobada',  body: 'Tu reserva *{{1}}* fue confirmada ✅\n📍 {{2}}\n👥 {{3}} personas\n📅 {{4}}\n💰 S/ {{5}}', uses: 287 },
  { id: 'TPL-03', name: 'WSP_PROMO_CYBER_v1',   cat: 'Marketing', status: 'aprobada',  body: 'CYBER TPP 🔥 Hasta 45% OFF en paquetes a Tarapoto. Reserva con S/ {{1}} de descuento usando *{{2}}*.', uses: 1230 },
  { id: 'TPL-04', name: 'WSP_RECORDATORIO_24H', cat: 'Utilidad',  status: 'aprobada',  body: 'Hola {{1}}, te recordamos que tu tour *{{2}}* sale mañana a las {{3}}. Te recogemos en {{4}}.', uses: 156 },
  { id: 'TPL-05', name: 'WSP_BIENVENIDA_v2',    cat: 'Utilidad',  status: 'pendiente', body: 'Hola {{1}}! Bienvenido a TPP Perú 🇵🇪 ¿Te gustaría conocer nuestros paquetes destacados?', uses: 0 },
  { id: 'TPL-06', name: 'WSP_ENCUESTA_NPS',     cat: 'Utilidad',  status: 'rechazada', body: 'Hola {{1}}, ¿cómo calificarías tu experiencia con TPP? Responde 1-10.', uses: 0 },
];

export function Plantillas() {
  const [sel, setSel] = React.useState(TEMPLATES[0].id);
  const t = TEMPLATES.find(x => x.id === sel);

  return (
    <div className="view">
      <div className="row between">
        <div>
          <h1 className="h1">Plantillas WhatsApp</h1>
          <p className="lead" style={{ marginTop: 4 }}>Mensajes aprobados por Meta listos para usarse en flujos y respuestas manuales.</p>
        </div>
        <button className="btn"><Ico.plus />Nueva plantilla</button>
      </div>
      <div className="spacer-m" />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 12 }}>
        <div className="card">
          <div className="card-b flush">
            <table className="t">
              <thead><tr><th>Nombre</th><th>Categoría</th><th>Estado</th><th style={{ textAlign: 'right' }}>Usos</th><th></th></tr></thead>
              <tbody>
                {TEMPLATES.map(p => (
                  <tr key={p.id} className={sel === p.id ? 'selected' : ''} onClick={() => setSel(p.id)} style={{ cursor: 'pointer' }}>
                    <td><div style={{ fontSize: 12, fontWeight: 500 }}>{p.name}</div><div className="cell-id">{p.id}</div></td>
                    <td>{p.cat}</td>
                    <td>
                      {p.status === 'aprobada'  && <span className="pill good"><span className="d" />aprobada</span>}
                      {p.status === 'pendiente' && <span className="pill warn"><span className="d" />en revisión</span>}
                      {p.status === 'rechazada' && <span className="pill bad"><span className="d" />rechazada</span>}
                    </td>
                    <td className="cell-num" style={{ textAlign: 'right' }}>{p.uses}</td>
                    <td><button className="iconbtn"><Ico.more /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="card">
          <div className="card-h"><h2 className="h2">Vista previa</h2></div>
          <div className="card-b">
            <div className="field"><label>Nombre</label><input className="input" defaultValue={t.name} /></div>
            <div className="spacer-s" />
            <div className="field"><label>Categoría</label>
              <select className="input"><option>Marketing</option><option>Utilidad</option><option>Autenticación</option></select>
            </div>
            <div className="spacer-s" />
            <div className="field"><label>Cuerpo</label><textarea className="input" defaultValue={t.body} style={{ minHeight: 120 }} /></div>
            <div className="spacer-m" />
            <div className="h3" style={{ marginBottom: 8 }}>Vista previa en WhatsApp</div>
            <div style={{ background: '#E5DDD5', padding: 14, borderRadius: 6 }}>
              <div className="bubble bot" style={{ whiteSpace: 'pre-line', maxWidth: '100%' }}>
                {t.body.replace(/\{\{1\}\}/g, 'María').replace(/\{\{2\}\}/g, 'Tarapoto 7d/6n').replace(/\{\{3\}\}/g, '2').replace(/\{\{4\}\}/g, '14 may 2026').replace(/\{\{5\}\}/g, '1,178')}
                <span className="ts">14:32 ✓✓</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
