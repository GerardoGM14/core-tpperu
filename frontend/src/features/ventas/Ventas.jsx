import React from 'react';
import Ico from '../../components/icons';
import { TRAVESIA_DATA } from '../../data/travesia';
import { StatusPill, ChannelPill } from '../dashboard/Dashboard';

const { orders, customers } = TRAVESIA_DATA;

export function Ventas() {
  const [filter, setFilter] = React.useState('todos');
  const [selected, setSelected] = React.useState(orders[0].id);

  const filtered = orders.filter(o => filter === 'todos' || o.status === filter);
  const sel = orders.find(o => o.id === selected);

  const totals = {
    todos: orders.length,
    pagado: orders.filter(o => o.status === 'pagado').length,
    pendiente: orders.filter(o => o.status === 'pendiente').length,
    abandonado: orders.filter(o => o.status === 'abandonado').length,
    reembolsado: orders.filter(o => o.status === 'reembolsado').length,
  };

  return (
    <div className="view">
      <div className="row between">
        <div>
          <h1 className="h1">Ventas y reservas</h1>
          <p className="lead" style={{ marginTop: 4 }}>Todas las reservas iniciadas desde la web y WhatsApp.</p>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <button className="btn ghost"><Ico.filter />Mayo 2026</button>
          <button className="btn ghost"><Ico.copy />Exportar</button>
          <button className="btn"><Ico.plus />Reserva manual</button>
        </div>
      </div>

      <div className="spacer-m" />

      <div className="grid-stats">
        <div className="stat"><div className="label">Ingresos del mes</div><div className="value">S/ 47,820</div><div className="delta up"><Ico.up />+24% vs. abril</div></div>
        <div className="stat"><div className="label">Reservas confirmadas</div><div className="value">128</div><div className="delta up"><Ico.up />+18 vs. abril</div></div>
        <div className="stat"><div className="label">Ticket promedio</div><div className="value">S/ 374</div><div className="delta down"><Ico.down />–S/ 12</div></div>
        <div className="stat"><div className="label">Recuperados por WhatsApp</div><div className="value">S/ 8,940</div><div className="delta up"><Ico.up />19% del total</div></div>
      </div>

      <div className="spacer-m" />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 12, alignItems: 'start' }}>
        <div className="card">
          <div className="card-h">
            <div className="tabs" style={{ border: 0, marginBottom: -13, marginTop: -12 }}>
              {['todos', 'pagado', 'pendiente', 'abandonado', 'reembolsado'].map(k => (
                <button key={k} className={'tab ' + (filter === k ? 'active' : '')} onClick={() => setFilter(k)}>
                  {k.charAt(0).toUpperCase() + k.slice(1)}
                  <span className="mono" style={{ marginLeft: 6, fontSize: 10, color: 'var(--muted)' }}>{totals[k]}</span>
                </button>
              ))}
            </div>
            <div style={{ flex: 1 }} />
            <div className="topbar-search" style={{ width: 200 }}>
              <Ico.search />
              <input placeholder="ID, cliente, paquete..." />
            </div>
          </div>
          <div className="card-b flush">
            <table className="t">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Cliente</th>
                  <th>Paquete</th>
                  <th>Canal</th>
                  <th style={{ textAlign: 'right' }}>Cant.</th>
                  <th style={{ textAlign: 'right' }}>Total</th>
                  <th>Estado</th>
                  <th>Fecha</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(o => (
                  <tr key={o.id} className={selected === o.id ? 'selected' : ''} onClick={() => setSelected(o.id)} style={{ cursor: 'pointer' }}>
                    <td><span className="cell-id">{o.id}</span></td>
                    <td>
                      <div style={{ fontSize: 12, fontWeight: 500 }}>{o.customer}</div>
                      <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>{o.phone}</div>
                    </td>
                    <td style={{ maxWidth: 220 }}>
                      <div style={{ fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.pkg}</div>
                    </td>
                    <td><ChannelPill channel={o.channel} /></td>
                    <td className="cell-num" style={{ textAlign: 'right' }}>{o.qty}</td>
                    <td className="cell-num" style={{ textAlign: 'right', fontWeight: 500 }}>S/ {o.total.toLocaleString()}</td>
                    <td><StatusPill status={o.status} /></td>
                    <td className="cell-id">{o.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {sel && (
          <div className="card" style={{ position: 'sticky', top: 0 }}>
            <div className="card-h">
              <h2 className="h2">{sel.id}</h2>
              <StatusPill status={sel.status} />
              <button className="iconbtn" style={{ marginLeft: 'auto' }}><Ico.more /></button>
            </div>
            <div className="card-b" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <div className="h3" style={{ marginBottom: 6 }}>Cliente</div>
                <div className="row" style={{ gap: 10 }}>
                  <div className="av lg">{sel.customer.split(' ').map(n => n[0]).slice(0, 2).join('')}</div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{sel.customer}</div>
                    <div className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>{sel.phone}</div>
                  </div>
                </div>
              </div>
              <div className="divider" />
              <div>
                <div className="h3" style={{ marginBottom: 6 }}>Paquete</div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <div className="imgph" style={{ width: 64, height: 48, borderRadius: 4 }}>foto</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 500 }}>{sel.pkg}</div>
                    <div className="mono" style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{sel.qty} pers · 14 may 2026</div>
                  </div>
                </div>
              </div>
              <div className="divider" />
              <div>
                <div className="h3" style={{ marginBottom: 8 }}>Resumen</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', rowGap: 6, fontSize: 12 }}>
                  <span style={{ color: 'var(--muted)' }}>Subtotal</span><span className="cell-num">S/ {(sel.total * 1.45 / 1).toFixed(0)}</span>
                  <span style={{ color: 'var(--muted)' }}>Descuento Cyber 45%</span><span className="cell-num" style={{ color: 'var(--bad)' }}>– S/ {(sel.total * 0.45).toFixed(0)}</span>
                  <span style={{ color: 'var(--muted)' }}>Cupón WSP-RECUP</span><span className="cell-num" style={{ color: 'var(--bad)' }}>– S/ 30</span>
                  <span style={{ fontWeight: 500 }}>Total pagado</span><span className="cell-num" style={{ fontWeight: 500 }}>S/ {sel.total.toLocaleString()}</span>
                </div>
              </div>
              <div className="divider" />
              <div>
                <div className="h3" style={{ marginBottom: 8 }}>Línea de tiempo</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[
                    { t: 'Visita a la landing', s: '06 may · 14:02', dot: 'var(--muted)' },
                    { t: 'Añadió al carrito', s: '06 may · 14:18', dot: 'var(--info)' },
                    { t: 'Inició checkout', s: '06 may · 14:22', dot: 'var(--accent)' },
                    { t: 'Pago confirmado · Mercado Pago', s: '06 may · 14:32', dot: 'var(--good)' },
                    { t: 'Bot envió confirmación por WhatsApp', s: '06 may · 14:32', dot: 'var(--wa)' },
                  ].map((step, i) => (
                    <div key={i} className="row" style={{ gap: 8, fontSize: 12 }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: step.dot }} />
                      <span style={{ flex: 1 }}>{step.t}</span>
                      <span className="mono" style={{ fontSize: 10, color: 'var(--muted)' }}>{step.s}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="divider" />
              <div className="row" style={{ gap: 6 }}>
                <button className="btn ghost" style={{ flex: 1 }}><Ico.wa />Abrir chat</button>
                <button className="btn" style={{ flex: 1 }}><Ico.send />Reenviar voucher</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function Clientes() {
  const [stage, setStage] = React.useState('todos');
  const filtered = customers.filter(c => stage === 'todos' || c.stage === stage);

  return (
    <div className="view">
      <div className="row between">
        <div>
          <h1 className="h1">Clientes</h1>
          <p className="lead" style={{ marginTop: 4 }}>Todos los contactos capturados desde la web, WhatsApp y campañas.</p>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <button className="btn ghost"><Ico.copy />Importar CSV</button>
          <button className="btn"><Ico.plus />Nuevo contacto</button>
        </div>
      </div>

      <div className="spacer-m" />

      <div className="grid-stats">
        <div className="stat"><div className="label">Total contactos</div><div className="value">2,041</div><div className="delta up"><Ico.up />+38 esta semana</div></div>
        <div className="stat"><div className="label">Compradores</div><div className="value">428</div><div className="delta up"><Ico.up />+12</div></div>
        <div className="stat"><div className="label">Carrito abandonado</div><div className="value">63</div><div className="delta down"><Ico.down />–7 recuperados</div></div>
        <div className="stat"><div className="label">LTV promedio</div><div className="value">S/ 612</div><div className="delta up"><Ico.up />+S/ 24</div></div>
      </div>

      <div className="spacer-m" />

      <div className="card">
        <div className="card-h">
          <div className="tabs" style={{ border: 0, marginBottom: -13, marginTop: -12 }}>
            {['todos', 'lead', 'carrito-abandonado', 'comprador'].map(k => (
              <button key={k} className={'tab ' + (stage === k ? 'active' : '')} onClick={() => setStage(k)}>{k}</button>
            ))}
          </div>
          <div style={{ flex: 1 }} />
          <div className="topbar-search" style={{ width: 200 }}>
            <Ico.search /><input placeholder="Buscar contacto..." />
          </div>
        </div>
        <div className="card-b flush">
          <table className="t">
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Teléfono</th>
                <th>Email</th>
                <th>Ciudad</th>
                <th style={{ textAlign: 'right' }}>Reservas</th>
                <th style={{ textAlign: 'right' }}>Gastado</th>
                <th>Etapa</th>
                <th>Última actividad</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c.id}>
                  <td>
                    <div className="row" style={{ gap: 8 }}>
                      <div className="av sm">{c.name.split(' ').map(n => n[0]).slice(0, 2).join('')}</div>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 500 }}>{c.name}</div>
                        <div className="cell-id">{c.id}</div>
                      </div>
                    </div>
                  </td>
                  <td className="cell-id">{c.phone}</td>
                  <td className="cell-id">{c.email}</td>
                  <td>{c.city}</td>
                  <td className="cell-num" style={{ textAlign: 'right' }}>{c.orders}</td>
                  <td className="cell-num" style={{ textAlign: 'right', fontWeight: c.spent > 0 ? 500 : 400, color: c.spent > 0 ? 'var(--ink)' : 'var(--muted)' }}>S/ {c.spent.toLocaleString()}</td>
                  <td>
                    {c.stage === 'comprador' && <span className="pill good"><span className="d" />Comprador</span>}
                    {c.stage === 'carrito-abandonado' && <span className="pill warn"><span className="d" />Carrito abierto</span>}
                    {c.stage === 'lead' && <span className="pill info"><span className="d" />Lead</span>}
                  </td>
                  <td className="cell-id">{c.lastSeen}</td>
                  <td><button className="iconbtn"><Ico.wa /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
