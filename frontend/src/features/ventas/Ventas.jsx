import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Ico from '../../components/icons';
import { ordersApi } from '../../api/orders';
import { StatusPill, ChannelPill } from '../dashboard/Dashboard';

const soles = (cents) => 'S/ ' + (cents / 100).toLocaleString('es-PE', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
const fmtDate = (iso) => iso ? new Date(iso).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

// Mapeo estado backend → etiqueta de filtro/UI
const STATUS_FILTERS = [
  { key: 'todos', label: 'Todos' },
  { key: 'PAID', label: 'Pagado' },
  { key: 'PENDING', label: 'Pendiente' },
  { key: 'CANCELLED', label: 'Cancelado' },
  { key: 'REFUNDED', label: 'Reembolsado' },
];
const STATUS_OPTIONS = ['PENDING', 'CONFIRMED', 'PAID', 'CANCELLED', 'REFUNDED'];

export function Ventas() {
  const qc = useQueryClient();
  const [filter, setFilter] = React.useState('todos');
  const [selectedId, setSelectedId] = React.useState(null);
  const [search, setSearch] = React.useState('');

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['orders'],
    queryFn: ordersApi.list,
  });

  React.useEffect(() => {
    if (!selectedId && orders.length) setSelectedId(orders[0].id);
  }, [orders, selectedId]);

  const statusMut = useMutation({
    mutationFn: ({ id, status }) => ordersApi.update(id, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orders'] });
      window.toast?.('Estado actualizado', { label: 'Ventas', kind: 'good' });
    },
  });

  const q = search.trim().toLowerCase();
  const matched = orders.filter((o) => {
    if (filter !== 'todos' && o.status !== filter) return false;
    if (!q) return true;
    return o.code.toLowerCase().includes(q)
      || (o.customer?.fullName || '').toLowerCase().includes(q)
      || (o.package?.name || '').toLowerCase().includes(q);
  });

  const sel = orders.find((o) => o.id === selectedId);

  const counts = STATUS_FILTERS.reduce((acc, f) => {
    acc[f.key] = f.key === 'todos' ? orders.length : orders.filter((o) => o.status === f.key).length;
    return acc;
  }, {});

  // KPIs reales
  const paid = orders.filter((o) => o.status === 'PAID');
  const revenue = paid.reduce((s, o) => s + o.totalCents, 0);
  const waRevenue = paid.filter((o) => o.channel === 'WHATSAPP').reduce((s, o) => s + o.totalCents, 0);
  const avgTicket = paid.length ? revenue / paid.length : 0;

  return (
    <div className="view">
      <div className="row between">
        <div>
          <h1 className="h1">Ventas y reservas</h1>
          <p className="lead" style={{ marginTop: 4 }}>Todas las reservas iniciadas desde la web y WhatsApp.</p>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <button className="btn ghost"><Ico.copy />Exportar</button>
        </div>
      </div>

      <div className="spacer-m" />

      <div className="grid-stats">
        <div className="stat"><div className="label">Ingresos (pagados)</div><div className="value">{soles(revenue)}</div></div>
        <div className="stat"><div className="label">Reservas confirmadas</div><div className="value">{paid.length}</div></div>
        <div className="stat"><div className="label">Ticket promedio</div><div className="value">{soles(avgTicket)}</div></div>
        <div className="stat"><div className="label">Vía WhatsApp</div><div className="value">{soles(waRevenue)}</div></div>
      </div>

      <div className="spacer-m" />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 12, alignItems: 'start' }}>
        <div className="card">
          <div className="card-h">
            <div className="tabs" style={{ border: 0, marginBottom: -13, marginTop: -12 }}>
              {STATUS_FILTERS.map((f) => (
                <button key={f.key} className={'tab ' + (filter === f.key ? 'active' : '')} onClick={() => setFilter(f.key)}>
                  {f.label}
                  <span className="mono" style={{ marginLeft: 6, fontSize: 10, color: 'var(--muted)' }}>{counts[f.key]}</span>
                </button>
              ))}
            </div>
            <div style={{ flex: 1 }} />
            <div className="topbar-search" style={{ width: 200 }}>
              <Ico.search />
              <input placeholder="ID, cliente, paquete..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>
          <div className="card-b flush">
            {isLoading ? (
              <div style={{ padding: 32, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>Cargando reservas…</div>
            ) : matched.length === 0 ? (
              <div style={{ padding: 32, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>Sin reservas para este filtro.</div>
            ) : (
              <table className="t">
                <thead>
                  <tr>
                    <th>ID</th><th>Cliente</th><th>Paquete</th><th>Canal</th>
                    <th style={{ textAlign: 'right' }}>Pax</th><th style={{ textAlign: 'right' }}>Total</th><th>Estado</th><th>Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {matched.map((o) => (
                    <tr key={o.id} className={selectedId === o.id ? 'selected' : ''} onClick={() => setSelectedId(o.id)} style={{ cursor: 'pointer' }}>
                      <td><span className="cell-id">{o.code}</span></td>
                      <td>
                        <div style={{ fontSize: 12, fontWeight: 500 }}>{o.customer?.fullName || '—'}</div>
                        <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>{o.customer?.phone || ''}</div>
                      </td>
                      <td style={{ maxWidth: 220 }}>
                        <div style={{ fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.package?.name || '—'}</div>
                      </td>
                      <td><ChannelPill channel={(o.channel || '').toLowerCase()} /></td>
                      <td className="cell-num" style={{ textAlign: 'right' }}>{o.pax}</td>
                      <td className="cell-num" style={{ textAlign: 'right', fontWeight: 500 }}>{soles(o.totalCents)}</td>
                      <td><StatusPill status={(o.status || '').toLowerCase()} /></td>
                      <td className="cell-id">{fmtDate(o.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {sel && (
          <div className="card" style={{ position: 'sticky', top: 0 }}>
            <div className="card-h">
              <h2 className="h2">{sel.code}</h2>
              <StatusPill status={(sel.status || '').toLowerCase()} />
              <button className="iconbtn" style={{ marginLeft: 'auto' }}><Ico.more /></button>
            </div>
            <div className="card-b" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <div className="h3" style={{ marginBottom: 6 }}>Cliente</div>
                <div className="row" style={{ gap: 10 }}>
                  <div className="av lg">{(sel.customer?.fullName || '?').split(' ').map((n) => n[0]).slice(0, 2).join('')}</div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{sel.customer?.fullName}</div>
                    <div className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>{sel.customer?.phone}</div>
                  </div>
                </div>
              </div>
              <div className="divider" />
              <div>
                <div className="h3" style={{ marginBottom: 6 }}>Paquete</div>
                <div style={{ display: 'flex', gap: 10 }}>
                  {sel.package?.imageUrl
                    ? <img src={sel.package.imageUrl} alt="" style={{ width: 64, height: 48, borderRadius: 4, objectFit: 'cover' }} />
                    : <div className="imgph" style={{ width: 64, height: 48, borderRadius: 4 }}>foto</div>}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 500 }}>{sel.package?.name}</div>
                    <div className="mono" style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{sel.pax} pers · {fmtDate(sel.travelDate)}</div>
                  </div>
                </div>
              </div>
              <div className="divider" />
              <div>
                <div className="h3" style={{ marginBottom: 8 }}>Resumen</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', rowGap: 6, fontSize: 12 }}>
                  <span style={{ color: 'var(--muted)' }}>Total</span><span className="cell-num" style={{ fontWeight: 500 }}>{soles(sel.totalCents)}</span>
                  <span style={{ color: 'var(--muted)' }}>Pagado</span><span className="cell-num" style={{ color: sel.paidCents >= sel.totalCents ? 'var(--good)' : 'var(--ink)' }}>{soles(sel.paidCents)}</span>
                  {sel.paidCents < sel.totalCents && (
                    <>
                      <span style={{ color: 'var(--muted)' }}>Saldo</span>
                      <span className="cell-num" style={{ color: 'var(--bad)' }}>{soles(sel.totalCents - sel.paidCents)}</span>
                    </>
                  )}
                </div>
              </div>
              <div className="divider" />
              <div>
                <div className="h3" style={{ marginBottom: 6 }}>Cambiar estado</div>
                <select className="input" value={sel.status} disabled={statusMut.isPending}
                  onChange={(e) => statusMut.mutate({ id: sel.id, status: e.target.value })}>
                  {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              {sel.notes && (
                <>
                  <div className="divider" />
                  <div><div className="h3" style={{ marginBottom: 4 }}>Notas</div><div style={{ fontSize: 12 }}>{sel.notes}</div></div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
