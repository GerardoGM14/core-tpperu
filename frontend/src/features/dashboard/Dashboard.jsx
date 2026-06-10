import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import Ico from '../../components/icons';
import { api } from '../../api/client';

const soles = (cents) => 'S/ ' + (cents / 100).toLocaleString('es-PE', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
const timeAgo = (iso) => {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'ahora';
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h`;
  return `hace ${Math.floor(h / 24)} d`;
};

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
  // Acepta valores del backend (paid, pending...) y los antiguos en español.
  const map = {
    pagado: 'good', pagado_: 'good', paid: 'good', confirmed: 'good',
    pendiente: 'warn', pending: 'warn',
    abandonado: 'bad', cancelled: 'bad',
    reembolsado: 'info', refunded: 'info',
  };
  const labels = {
    paid: 'Pagado', pagado: 'Pagado', confirmed: 'Confirmado',
    pending: 'Pendiente', pendiente: 'Pendiente',
    cancelled: 'Cancelado', abandonado: 'Abandonado',
    refunded: 'Reembolsado', reembolsado: 'Reembolsado',
  };
  return <span className={'pill ' + (map[status] || '')}><span className="d" />{labels[status] || status}</span>;
}

export function ChannelPill({ channel }) {
  if (channel === 'whatsapp') return <span className="pill wa"><Ico.wa style={{ width: 10, height: 10 }} />WhatsApp</span>;
  return <span className="pill"><Ico.eye style={{ width: 10, height: 10, opacity: 0.6 }} />Web</span>;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const onNav = (id) => navigate(`/${id}`);

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => api('/api/dashboard/stats'),
    refetchInterval: 30000, // refresca cada 30s
  });

  const k = data?.kpis;
  const salesByDay = data?.salesByDay || [];
  const topPackages = data?.topPackages || [];
  const recent = data?.recentActivity || [];

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Buenos días' : hour < 19 ? 'Buenas tardes' : 'Buenas noches';
  const today = new Date().toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric', weekday: 'long' });

  if (isLoading || !k) {
    return <div className="view"><div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>Cargando panel…</div></div>;
  }

  return (
    <div className="view">
      <div className="row between" style={{ marginBottom: 4 }}>
        <div>
          <div className="h3" style={{ marginBottom: 6 }}>{today}</div>
          <h1 className="h1">{greeting}</h1>
          <p className="lead" style={{ marginTop: 4 }}>
            {k.openConversations} conversaciones abiertas · {k.unreadTotal} mensajes sin leer · {k.ordersTotal} reservas en total
          </p>
        </div>
      </div>

      <div className="spacer-l" />

      <div className="grid-stats">
        <div className="stat">
          <div className="label">Ingresos del mes</div>
          <div className="value">{soles(k.revenueThisMonthCents)}</div>
          <div className="delta up"><Ico.up /> {k.ordersPaid} pagadas</div>
          {salesByDay.length > 1 && <div className="spark"><Sparkline data={salesByDay} color="var(--ink)" fill /></div>}
        </div>
        <div className="stat">
          <div className="label">Reservas pagadas</div>
          <div className="value">{k.ordersPaid}</div>
          <div className="delta up"><Ico.up /> de {k.ordersTotal} totales</div>
        </div>
        <div className="stat">
          <div className="label">Ticket promedio</div>
          <div className="value">{soles(k.avgTicketCents)}</div>
        </div>
        <div className="stat">
          <div className="label">Vía WhatsApp</div>
          <div className="value">{soles(k.waRevenueCents)}</div>
          <div className="delta up"><Ico.wa style={{ width: 11, height: 11 }} /> ingresos por chat</div>
        </div>
      </div>

      <div className="spacer-m" />

      <div className="grid-2">
        <div className="card">
          <div className="card-h">
            <h2 className="h2">Ventas · últimos 14 días</h2>
            <span className="pill accent"><span className="d" />Ingresos</span>
            <button className="iconbtn" style={{ marginLeft: 'auto' }}><Ico.more /></button>
          </div>
          <div className="card-b">
            <div style={{ height: 180 }}>
              {salesByDay.length > 1
                ? <Sparkline data={salesByDay} color="var(--accent)" height={180} fill />
                : <div style={{ color: 'var(--muted)', fontSize: 12, textAlign: 'center', paddingTop: 70 }}>Sin ventas en el periodo</div>}
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-h">
            <h2 className="h2">Actividad reciente</h2>
            <span className="pill good"><span className="d" />en vivo</span>
          </div>
          <div className="card-b flush" style={{ maxHeight: 360, overflow: 'auto' }}>
            {recent.map((a, i) => (
              <div key={i} className="feed-item">
                <div className={'feed-rail ' + (a.status === 'PAID' ? 'good' : a.channel === 'WHATSAPP' ? 'wa' : 'acc')} />
                <div className="feed-body">
                  <div className="t"><b style={{ fontWeight: 500 }}>{a.customer}</b> · {a.code} — {a.packageName}</div>
                  <div className="s">
                    <span className="mono">{timeAgo(a.createdAt)}</span> · <b style={{ color: 'var(--ink)', fontWeight: 500 }}>{soles(a.totalCents)}</b>
                  </div>
                </div>
                <div className="feed-meta"><StatusPill status={(a.status || '').toLowerCase()} /></div>
              </div>
            ))}
            {recent.length === 0 && <div style={{ padding: 20, textAlign: 'center', color: 'var(--muted)', fontSize: 12 }}>Sin actividad reciente.</div>}
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
                <tr><th>ID</th><th>Cliente</th><th>Canal</th><th style={{ textAlign: 'right' }}>Total</th><th>Estado</th></tr>
              </thead>
              <tbody>
                {recent.map((o) => (
                  <tr key={o.code} style={{ cursor: 'pointer' }} onClick={() => onNav('ventas')}>
                    <td><span className="cell-id">{o.code}</span></td>
                    <td>{o.customer}</td>
                    <td><ChannelPill channel={(o.channel || '').toLowerCase()} /></td>
                    <td className="cell-num" style={{ textAlign: 'right' }}>{soles(o.totalCents)}</td>
                    <td><StatusPill status={(o.status || '').toLowerCase()} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <div className="card-h"><h2 className="h2">Top paquetes</h2></div>
          <div className="card-b flush">
            {topPackages.map((p, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderBottom: '1px solid var(--hair)' }}>
                <div className="mono" style={{ fontSize: 11, color: 'var(--muted)', width: 16 }}>{i + 1}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>{soles(p.revenue)} · {p.count} reservas</div>
                </div>
                <div style={{ width: 50, height: 18 }}><Bars data={[p.count * 0.4, p.count * 0.6, p.count * 0.5, p.count * 0.8, p.count]} color="var(--accent)" height={18} /></div>
              </div>
            ))}
            {topPackages.length === 0 && <div style={{ padding: 20, textAlign: 'center', color: 'var(--muted)', fontSize: 12 }}>Sin ventas todavía.</div>}
          </div>
        </div>
      </div>

      <div className="spacer-m" />

      <div className="grid-3">
        <div className="card">
          <div className="card-h"><h2 className="h2">Clientes</h2></div>
          <div className="card-b">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', rowGap: 10, fontSize: 12 }}>
              <span style={{ color: 'var(--muted)' }}>Total contactos</span><span className="mono" style={{ fontWeight: 500 }}>{k.customersTotal}</span>
              <span style={{ color: 'var(--muted)' }}>Nuevos (7 días)</span><span className="mono" style={{ color: 'var(--good)' }}>+{k.customersThisWeek}</span>
              <span style={{ color: 'var(--muted)' }}>Paquetes activos</span><span className="mono">{k.packagesActive}</span>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-h"><h2 className="h2">WhatsApp</h2>{k.unreadTotal > 0 && <span className="pill wa"><span className="d" />{k.unreadTotal} sin leer</span>}</div>
          <div className="card-b">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', rowGap: 10, fontSize: 12 }}>
              <span style={{ color: 'var(--muted)' }}>Conversaciones</span><span className="mono" style={{ fontWeight: 500 }}>{k.conversations}</span>
              <span style={{ color: 'var(--muted)' }}>Abiertas</span><span className="mono">{k.openConversations}</span>
              <span style={{ color: 'var(--muted)' }}>Sin leer</span><span className="mono" style={{ color: k.unreadTotal > 0 ? 'var(--accent)' : 'var(--good)' }}>{k.unreadTotal}</span>
            </div>
            <div className="spacer-s" />
            <button className="btn ghost sm" style={{ width: '100%', justifyContent: 'center' }} onClick={() => onNav('conversaciones')}>Ir a la bandeja <Ico.arrow /></button>
          </div>
        </div>

        <div className="card">
          <div className="card-h"><h2 className="h2">Ingresos totales</h2></div>
          <div className="card-b">
            <div style={{ fontSize: 28, fontWeight: 600, letterSpacing: '-0.02em' }}>{soles(k.revenueTotalCents)}</div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>de {k.ordersPaid} reservas pagadas</div>
            <div className="spacer-s" />
            <button className="btn ghost sm" style={{ width: '100%', justifyContent: 'center' }} onClick={() => onNav('catalogo')}>Gestionar catálogo <Ico.arrow /></button>
          </div>
        </div>
      </div>

      <div className="spacer-l" />
    </div>
  );
}
