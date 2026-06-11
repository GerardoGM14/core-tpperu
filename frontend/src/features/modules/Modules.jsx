import React from 'react';
import Ico from '../../components/icons';

const REMINDERS = [
  { id: 'R-48',  label: '48 horas antes del tour', when: '-48h', active: true,  sent: 412, opened: 388, template: 'WSP_RECORDATORIO_48H' },
  { id: 'R-24',  label: '24 horas antes del tour', when: '-24h', active: true,  sent: 412, opened: 401, template: 'WSP_RECORDATORIO_24H' },
  { id: 'R-12',  label: '12 horas antes del tour', when: '-12h', active: true,  sent: 402, opened: 399, template: 'WSP_RECORDATORIO_12H' },
  { id: 'R-POST',label: 'Encuesta post-servicio',  when: '+48h', active: true,  sent: 298, opened: 212, template: 'WSP_NPS_POSTSERV' },
];

const CAMPAIGNS = [
  { id: 'CMP-2026-05-A', name: 'Cyber TPP — extensión 48h', audience: 'Compradores +leads (1,420)',    status: 'enviada',    scheduled: '05 may 17:00', sent: 1420, read: 1210, replied: 182, conv: 91, rev: 41200 },
  { id: 'CMP-2026-05-B', name: 'Nueva ruta · Carpishuyacu', audience: 'Compradores Tarapoto (612)',     status: 'programada', scheduled: '10 may 09:00', sent: 0,    read: 0,    replied: 0,   conv: 0,  rev: 0 },
  { id: 'CMP-2026-04-C', name: 'Aviso operativo · Lluvias', audience: 'Reservas próximas 7 días (84)', status: 'enviada',    scheduled: '29 abr 18:30', sent: 84,   read: 84,   replied: 12,  conv: 0,  rev: 0 },
  { id: 'CMP-2026-04-D', name: 'Reactivación inactivos 90d',audience: 'Inactivos 90d (308)',           status: 'borrador',   scheduled: '—',            sent: 0,    read: 0,    replied: 0,   conv: 0,  rev: 0 },
];

function PreTripPreview({ when }) {
  const map = {
    '-48h': '🌿 Hola María, faltan *48 horas* para tu tour *Tarapoto 7d/6n*. Tu reserva está confirmada ✅\n\nTe escribimos pronto con el horario exacto y punto de encuentro.',
    '-24h': '⏰ Recordatorio · *24 h* para el inicio de tu tour.\n\n📍 Punto de encuentro: Aeropuerto FAP Guillermo del Castillo · 06:30 AM\n👤 Guía asignado: Luis Apuela (+51 945 220 110)\n\nMapa: https://maps.app.goo.gl/tpp-aeropuerto',
    '-12h': '🎒 *Mañana viajas con TPP*. Recomendaciones:\n• Documento de identidad\n• Bloqueador, repelente y zapatos cerrados\n• Ropa ligera + abrigo para la noche\n\nNos vemos a las 06:30 AM. ¡Disfruta tu viaje!',
    '+48h': '🙏 Hola María, esperamos que hayas disfrutado *Tarapoto 7d/6n*.\n\n¿Cómo calificarías tu experiencia del 1 al 10?\n\nResponde y te enviamos un cupón *VUELVE15* para tu próximo viaje 🌿',
  };
  return <div className="bubble bot" style={{ whiteSpace: 'pre-line', maxWidth: '100%' }}>{map[when]}<span className="ts">14:32 ✓✓</span></div>;
}

export function Recordatorios() {
  const [tab, setTab] = React.useState('pre-trip');
  const [picked, setPicked] = React.useState('R-24');
  const r = REMINDERS.find(x => x.id === picked);

  return (
    <div className="view">
      <div className="row between">
        <div>
          <h1 className="h1">Recordatorios y campañas</h1>
          <p className="lead" style={{ marginTop: 4 }}>Comunicación previa al viaje, post-servicio y mensajes masivos a tu base de clientes.</p>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <button className="btn ghost"><Ico.eye />Programación</button>
          <button className="btn"><Ico.plus />Nueva campaña</button>
        </div>
      </div>

      <div className="spacer-m" />

      <div className="grid-stats">
        <div className="stat"><div className="label">Recordatorios hoy</div><div className="value">38</div><div className="delta"><span className="mono">14 enviados · 24 programados</span></div></div>
        <div className="stat"><div className="label">Tasa de lectura</div><div className="value">96<span style={{ fontSize: 14, color: 'var(--muted)' }}>%</span></div><div className="delta up"><Ico.up />+0.8 pts</div></div>
        <div className="stat"><div className="label">NPS post-servicio (30d)</div><div className="value">8.7</div><div className="delta up"><Ico.up />+0.3</div></div>
        <div className="stat"><div className="label">Ingresos por campañas (mes)</div><div className="value">S/ 41,200</div><div className="delta up"><Ico.up />+24%</div></div>
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
                  {REMINDERS.filter(x => x.id !== 'R-POST').map(x => (
                    <tr key={x.id} className={picked === x.id ? 'selected' : ''} onClick={() => setPicked(x.id)} style={{ cursor: 'pointer' }}>
                      <td><div style={{ fontSize: 12, fontWeight: 500 }}>{x.label}</div><div className="cell-id">{x.when}</div></td>
                      <td className="cell-id">{x.template}</td>
                      <td className="cell-num" style={{ textAlign: 'right' }}>{x.sent}</td>
                      <td className="cell-num" style={{ textAlign: 'right', color: 'var(--good)' }}>{Math.round((x.opened / x.sent) * 100)}%</td>
                      <td><span className={'switch ' + (x.active ? 'on' : '')} /></td>
                      <td><button className="iconbtn"><Ico.pencil /></button></td>
                    </tr>
                  ))}
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
              <button className="btn" style={{ width: '100%' }}><Ico.send />Probar envío a mi número</button>
            </div>
          </div>
        </div>
      )}

      {tab === 'post' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 12 }}>
          <div className="card">
            <div className="card-h"><h2 className="h2">Comunicación post-servicio</h2><span className="pill good"><span className="d" />activa</span></div>
            <div className="card-b" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="field"><label>Disparador</label>
                <select className="input"><option>Fecha de fin de tour + 48 horas</option><option>Inmediato al cierre del tour</option></select>
              </div>
              <div className="field"><label>Mensaje de agradecimiento</label>
                <textarea className="input" defaultValue="🙏 Hola {nombre}, esperamos que hayas disfrutado *{paquete}*." style={{ minHeight: 80 }} />
              </div>
              <div className="field"><label>Encuesta NPS</label>
                <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                    <button key={n} className="btn ghost sm" style={{ minWidth: 34 }}>{n}</button>
                  ))}
                </div>
              </div>
              <div className="field"><label>Cupón de fidelización (opcional)</label>
                <div className="row" style={{ gap: 6 }}>
                  <input className="input mono" defaultValue="VUELVE15" style={{ flex: 1 }} />
                  <input className="input" defaultValue="15% OFF en próxima compra" style={{ flex: 2 }} />
                </div>
              </div>
              <div className="field"><label>Si NPS ≥ 9 → pedir reseña</label>
                <input className="input" defaultValue="https://g.page/tpp-peru/review" />
              </div>
            </div>
          </div>
          <div className="card">
            <div className="card-h"><h2 className="h2">Resultados últimos 30 días</h2></div>
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
            <h2 className="h2">Campañas masivas</h2>
            <div style={{ flex: 1 }} />
            <div className="topbar-search" style={{ width: 200 }}><Ico.search /><input placeholder="Buscar campaña..." /></div>
            <button className="btn"><Ico.plus />Nueva campaña</button>
          </div>
          <div className="card-b flush">
            <table className="t">
              <thead><tr><th>ID</th><th>Campaña</th><th>Audiencia</th><th>Programada</th><th style={{ textAlign: 'right' }}>Enviados</th><th style={{ textAlign: 'right' }}>Leídos</th><th style={{ textAlign: 'right' }}>Conv.</th><th style={{ textAlign: 'right' }}>Ingresos</th><th>Estado</th></tr></thead>
              <tbody>
                {CAMPAIGNS.map(c => (
                  <tr key={c.id} style={{ cursor: 'pointer' }}>
                    <td><span className="cell-id">{c.id}</span></td>
                    <td><div style={{ fontSize: 12, fontWeight: 500 }}>{c.name}</div></td>
                    <td><span className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>{c.audience}</span></td>
                    <td className="cell-id">{c.scheduled}</td>
                    <td className="cell-num" style={{ textAlign: 'right' }}>{c.sent.toLocaleString()}</td>
                    <td className="cell-num" style={{ textAlign: 'right', color: c.read > 0 ? 'var(--good)' : 'var(--muted)' }}>{c.read > 0 ? Math.round((c.read / c.sent) * 100) + '%' : '—'}</td>
                    <td className="cell-num" style={{ textAlign: 'right' }}>{c.conv > 0 ? c.conv : '—'}</td>
                    <td className="cell-num" style={{ textAlign: 'right', fontWeight: c.rev > 0 ? 500 : 400 }}>{c.rev > 0 ? 'S/ ' + c.rev.toLocaleString() : '—'}</td>
                    <td>
                      {c.status === 'enviada'    && <span className="pill good"><span className="d" />enviada</span>}
                      {c.status === 'programada' && <span className="pill info"><span className="d" />programada</span>}
                      {c.status === 'borrador'   && <span className="pill"><span className="d" style={{ background: 'var(--muted)' }} />borrador</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
