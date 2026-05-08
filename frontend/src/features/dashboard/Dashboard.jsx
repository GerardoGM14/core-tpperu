import React from 'react';
import { useNavigate } from 'react-router-dom';
import Ico from '../../components/icons';
import { TRAVESIA_DATA } from '../../data/travesia';

const { packages, orders, flows, conversations, activity, salesByHour, trafficByHour } = TRAVESIA_DATA;

export function Sparkline({ data, color = 'var(--ink)', height = 32, fill = false }) {
  const w = 100, h = height;
  const max = Math.max(...data), min = Math.min(...data);
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / (max - min || 1)) * (h - 4) - 2;
    return [x, y];
  });
  const d = pts.map((p, i) => (i === 0 ? `M${p[0]},${p[1]}` : `L${p[0]},${p[1]}`)).join(' ');
  const dFill = d + ` L${w},${h} L0,${h} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} preserveAspectRatio="none">
      {fill && <path d={dFill} fill={color} opacity="0.08" />}
      <path d={d} stroke={color} strokeWidth="1.2" fill="none" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export function Bars({ data, color = 'var(--ink)', height = 110 }) {
  const max = Math.max(...data);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height, paddingTop: 8 }}>
      {data.map((v, i) => (
        <div key={i} style={{
          flex: 1,
          height: `${(v / max) * 100}%`,
          background: color,
          minHeight: 1,
          borderRadius: '1px 1px 0 0',
        }} />
      ))}
    </div>
  );
}

export function StatusPill({ status }) {
  const map = { pagado: 'good', pendiente: 'warn', abandonado: 'bad', reembolsado: 'info' };
  const labels = { pagado: 'Pagado', pendiente: 'Pendiente', abandonado: 'Abandonado', reembolsado: 'Reembolsado' };
  return <span className={'pill ' + (map[status] || '')}><span className="d" />{labels[status] || status}</span>;
}

export function ChannelPill({ channel }) {
  if (channel === 'whatsapp') return <span className="pill wa"><Ico.wa style={{ width: 10, height: 10 }} />WhatsApp</span>;
  return <span className="pill"><Ico.eye style={{ width: 10, height: 10, opacity: 0.6 }} />Web</span>;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const onNav = (id) => navigate(`/${id}`);
  const totalToday = orders.filter(o => o.date.startsWith('06 May')).reduce((s, o) => s + (o.status === 'pagado' ? o.total : 0), 0);
  const reservasToday = orders.filter(o => o.date.startsWith('06 May') && o.status === 'pagado').length;

  return (
    <div className="view">
      <div className="row between" style={{ marginBottom: 4 }}>
        <div>
          <div className="h3" style={{ marginBottom: 6 }}>06 may 2026 · jueves · 14:34</div>
          <h1 className="h1">Buenos días, Camila</h1>
          <p className="lead" style={{ marginTop: 4 }}>3 conversaciones nuevas · 12 reservas en últimas 24 h · 2 flujos disparados</p>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <button className="btn ghost"><Ico.filter />Hoy · 06 may</button>
          <button className="btn"><Ico.plus />Nueva campaña</button>
        </div>
      </div>

      <div className="spacer-l" />

      <div className="grid-stats">
        <div className="stat">
          <div className="label">Ventas hoy</div>
          <div className="value">S/ {totalToday.toLocaleString()}</div>
          <div className="delta up"><Ico.up /> +18.4% vs. ayer</div>
          <div className="spark"><Sparkline data={salesByHour} color="var(--ink)" fill /></div>
        </div>
        <div className="stat">
          <div className="label">Reservas confirmadas</div>
          <div className="value">{reservasToday}</div>
          <div className="delta up"><Ico.up /> +2 vs. ayer</div>
          <div className="spark"><Sparkline data={[2, 3, 1, 4, 2, 5, 3, 4]} color="var(--accent)" fill /></div>
        </div>
        <div className="stat">
          <div className="label">Carritos abandonados</div>
          <div className="value">7</div>
          <div className="delta down"><Ico.down /> –1 recuperado</div>
          <div className="spark"><Sparkline data={[3, 5, 4, 7, 6, 8, 7, 7]} color="var(--bad)" /></div>
        </div>
        <div className="stat">
          <div className="label">Tasa conversión</div>
          <div className="value">3.8<span style={{ fontSize: 14, color: 'var(--muted)' }}>%</span></div>
          <div className="delta up"><Ico.up /> +0.4 pts</div>
          <div className="spark"><Sparkline data={[2.1, 2.4, 2.8, 3.0, 3.2, 3.5, 3.6, 3.8]} color="var(--good)" fill /></div>
        </div>
      </div>

      <div className="spacer-m" />

      <div className="grid-2">
        <div className="card">
          <div className="card-h">
            <h2 className="h2">Tráfico y ventas · 24 h</h2>
            <span className="pill"><span className="d" style={{ background: 'var(--ink)' }} />Visitas</span>
            <span className="pill accent"><span className="d" />Ventas</span>
            <button className="iconbtn" style={{ marginLeft: 'auto' }}><Ico.more /></button>
          </div>
          <div className="card-b">
            <div style={{ position: 'relative', height: 180 }}>
              <div style={{ position: 'absolute', inset: 0 }}>
                <Sparkline data={trafficByHour} color="var(--ink)" height={180} fill />
              </div>
              <div style={{ position: 'absolute', inset: 0 }}>
                <Sparkline data={salesByHour.map(v => v * 5)} color="var(--accent)" height={180} />
              </div>
            </div>
            <div className="row" style={{ gap: 0, marginTop: 4, fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--muted)' }}>
              {['00', '03', '06', '09', '12', '15', '18', '21'].map(h => <div key={h} style={{ flex: 1 }}>{h}h</div>)}
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-h">
            <h2 className="h2">Actividad en vivo</h2>
            <span className="pill good"><span className="d" />en tiempo real</span>
          </div>
          <div className="card-b flush" style={{ maxHeight: 360, overflow: 'auto' }}>
            {activity.map((a, i) => (
              <div key={i} className="feed-item">
                <div className={'feed-rail ' + (a.kind === 'sale' ? 'good' : a.kind === 'wa' ? 'wa' : a.kind === 'edit' ? '' : 'acc')} />
                <div className="feed-body">
                  <div className="t"><b style={{ fontWeight: 500 }}>{a.who}</b> {a.what}</div>
                  <div className="s">
                    <span className="mono">{a.t}</span>
                    {a.amount && <> · <b style={{ color: 'var(--ink)', fontWeight: 500 }}>{a.amount}</b></>}
                  </div>
                </div>
                <div className="feed-meta">{a.ago}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="spacer-m" />

      <div className="grid-2">
        <div className="card">
          <div className="card-h">
            <h2 className="h2">Reservas recientes</h2>
            <button className="btn ghost sm" onClick={() => onNav('ventas')}>Ver todas <Ico.arrow /></button>
          </div>
          <div className="card-b flush">
            <table className="t">
              <thead>
                <tr>
                  <th>ID</th><th>Cliente</th><th>Canal</th><th style={{ textAlign: 'right' }}>Total</th><th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {orders.slice(0, 6).map(o => (
                  <tr key={o.id}>
                    <td><span className="cell-id">{o.id}</span></td>
                    <td>{o.customer}</td>
                    <td><ChannelPill channel={o.channel} /></td>
                    <td className="cell-num" style={{ textAlign: 'right' }}>S/ {o.total.toLocaleString()}</td>
                    <td><StatusPill status={o.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <div className="card-h">
            <h2 className="h2">Flujos de WhatsApp</h2>
            <button className="btn ghost sm" onClick={() => onNav('flujos')}>Editar flujos <Ico.arrow /></button>
          </div>
          <div className="card-b flush">
            {flows.slice(0, 5).map(f => (
              <div key={f.id} style={{ display: 'grid', gridTemplateColumns: '1fr auto auto auto', gap: 16, padding: '10px 14px', borderBottom: '1px solid var(--hair)', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 500 }}>{f.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>{f.trigger}</div>
                </div>
                <div className="cell-num" style={{ fontSize: 11, color: 'var(--muted)' }}>{f.sent} env.</div>
                <div className="cell-num" style={{ fontSize: 11, color: 'var(--good)' }}>{Math.round((f.conv / f.sent) * 100)}% conv.</div>
                <span className={'switch' + (f.active ? ' on' : '')} />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="spacer-m" />

      <div className="grid-3">
        <div className="card">
          <div className="card-h"><h2 className="h2">Top paquetes hoy</h2></div>
          <div className="card-b flush">
            {[...packages].filter(p => p.status === 'active').sort((a, b) => b.sales - a.sales).slice(0, 4).map((p, i) => (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderBottom: '1px solid var(--hair)' }}>
                <div className="mono" style={{ fontSize: 11, color: 'var(--muted)', width: 16 }}>{i + 1}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>S/ {p.price} · {p.sales} reservas</div>
                </div>
                <div style={{ width: 50, height: 18 }}><Bars data={[p.sales * 0.4, p.sales * 0.6, p.sales * 0.5, p.sales * 0.8, p.sales]} color="var(--accent)" height={18} /></div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="card-h"><h2 className="h2">Bandeja WhatsApp</h2><span className="pill wa"><span className="d" />3 sin leer</span></div>
          <div className="card-b flush">
            {conversations.slice(0, 4).map(c => (
              <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderBottom: '1px solid var(--hair)', cursor: 'pointer' }} onClick={() => onNav('conversaciones')}>
                <div className="av">{c.name.split(' ').map(n => n[0]).slice(0, 2).join('')}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 500 }}>{c.name}</div>
                  <div className="pv" style={{ fontSize: 11, color: 'var(--muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.preview}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="mono" style={{ fontSize: 10, color: 'var(--muted)' }}>{c.time}</div>
                  {c.unread > 0 && <span className="pill ink" style={{ marginTop: 2, padding: '1px 6px', fontSize: 10 }}>{c.unread}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="card-h"><h2 className="h2">Salud del sitio</h2><span className="pill good"><span className="d" />todo OK</span></div>
          <div className="card-b">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', rowGap: 10, columnGap: 12, fontSize: 12 }}>
              <span style={{ color: 'var(--muted)' }}>Tiempo de carga (p50)</span><span className="mono">1.24 s</span>
              <span style={{ color: 'var(--muted)' }}>API checkout</span><span className="mono" style={{ color: 'var(--good)' }}>200 · 124 ms</span>
              <span style={{ color: 'var(--muted)' }}>WhatsApp Business</span><span className="mono" style={{ color: 'var(--good)' }}>conectado</span>
              <span style={{ color: 'var(--muted)' }}>Mercado Pago</span><span className="mono" style={{ color: 'var(--good)' }}>conectado</span>
              <span style={{ color: 'var(--muted)' }}>Google Analytics</span><span className="mono" style={{ color: 'var(--good)' }}>sincronizado</span>
              <span style={{ color: 'var(--muted)' }}>Última publicación</span><span className="mono" style={{ color: 'var(--ink-2)' }}>hace 54 min</span>
            </div>
          </div>
        </div>
      </div>

      <div className="spacer-l" />
    </div>
  );
}
