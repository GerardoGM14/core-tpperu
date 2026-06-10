import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Ico from '../../components/icons';
import { customersApi } from '../../api/customers';

const fmtDate = (iso) => new Date(iso).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' });

function NewCustomerModal({ onClose }) {
  const qc = useQueryClient();
  const [form, setForm] = React.useState({ fullName: '', phone: '', email: '', documentId: '', notes: '' });
  const [tags, setTags] = React.useState('');

  const createMut = useMutation({
    mutationFn: (data) => customersApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customers'] });
      window.toast?.('Contacto creado correctamente', { label: 'Clientes', kind: 'good' });
      onClose();
    },
    onError: (err) => {
      const msg = err.status === 409 || /unique/i.test(err.message)
        ? 'Ya existe un contacto con ese teléfono.'
        : (err.message || 'No se pudo crear el contacto.');
      window.toast?.(msg, { label: 'Error', kind: 'accent' });
    },
  });

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const onSubmit = (e) => {
    e.preventDefault();
    const payload = {
      fullName: form.fullName.trim(),
      phone: form.phone.trim(),
      ...(form.email.trim() ? { email: form.email.trim() } : {}),
      ...(form.documentId.trim() ? { documentId: form.documentId.trim() } : {}),
      ...(form.notes.trim() ? { notes: form.notes.trim() } : {}),
      tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
    };
    createMut.mutate(payload);
  };

  return (
    <div className="m-back" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <form className="m-card" style={{ width: 480 }} onSubmit={onSubmit}>
        <div className="m-h">
          <h2 className="h2">Nuevo contacto</h2>
          <button type="button" className="iconbtn" data-handled="1" onClick={onClose} style={{ marginLeft: 'auto' }}>✕</button>
        </div>
        <div className="m-b" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="field">
            <label>Nombre completo *</label>
            <input className="input" required minLength={2} value={form.fullName} onChange={set('fullName')} placeholder="María López" autoFocus />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div className="field">
              <label>Teléfono (WhatsApp) *</label>
              <input className="input" required value={form.phone} onChange={set('phone')} placeholder="+51 987 654 321" />
            </div>
            <div className="field">
              <label>DNI / CE</label>
              <input className="input" value={form.documentId} onChange={set('documentId')} placeholder="12345678" />
            </div>
          </div>
          <div className="field">
            <label>Email</label>
            <input className="input" type="email" value={form.email} onChange={set('email')} placeholder="maria@email.com" />
          </div>
          <div className="field">
            <label>Tags <span style={{ color: 'var(--muted)', fontWeight: 400 }}>(separados por coma)</span></label>
            <input className="input" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="vip, cusco, referido" />
          </div>
          <div className="field">
            <label>Notas</label>
            <textarea className="input" value={form.notes} onChange={set('notes')} placeholder="Contexto del contacto..." style={{ minHeight: 60 }} />
          </div>
        </div>
        <div className="m-f">
          <button type="button" className="btn ghost" data-handled="1" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn" data-handled="1" disabled={createMut.isPending}>
            {createMut.isPending ? 'Guardando…' : 'Crear contacto'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function Clientes() {
  const qc = useQueryClient();
  const [search, setSearch] = React.useState('');
  const [showNew, setShowNew] = React.useState(false);

  const { data: customers = [], isLoading, isError, error } = useQuery({
    queryKey: ['customers'],
    queryFn: customersApi.list,
  });

  const deleteMut = useMutation({
    mutationFn: (id) => customersApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customers'] });
      window.toast?.('Contacto eliminado', { label: 'Clientes', kind: 'accent' });
    },
  });

  const q = search.trim().toLowerCase();
  const filtered = q
    ? customers.filter((c) =>
        c.fullName.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        (c.email || '').toLowerCase().includes(q) ||
        c.tags.some((t) => t.toLowerCase().includes(q)))
    : customers;

  const weekAgo = Date.now() - 7 * 86400_000;
  const stats = {
    total: customers.length,
    nuevos: customers.filter((c) => new Date(c.createdAt).getTime() > weekAgo).length,
    conEmail: customers.filter((c) => c.email).length,
    conTags: customers.filter((c) => c.tags.length > 0).length,
  };

  return (
    <div className="view">
      <div className="row between">
        <div>
          <h1 className="h1">Clientes</h1>
          <p className="lead" style={{ marginTop: 4 }}>Todos los contactos capturados desde la web, WhatsApp y campañas.</p>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <button className="btn ghost"><Ico.copy />Importar CSV</button>
          <button className="btn" data-handled="1" onClick={() => setShowNew(true)}><Ico.plus />Nuevo contacto</button>
        </div>
      </div>

      <div className="spacer-m" />

      <div className="grid-stats">
        <div className="stat"><div className="label">Total contactos</div><div className="value">{stats.total}</div></div>
        <div className="stat"><div className="label">Nuevos (7 días)</div><div className="value">{stats.nuevos}</div></div>
        <div className="stat"><div className="label">Con email</div><div className="value">{stats.conEmail}</div></div>
        <div className="stat"><div className="label">Con tags</div><div className="value">{stats.conTags}</div></div>
      </div>

      <div className="spacer-m" />

      <div className="card">
        <div className="card-h">
          <h2 className="h2">Contactos</h2>
          <div style={{ flex: 1 }} />
          <div className="topbar-search" style={{ width: 240 }}>
            <Ico.search />
            <input placeholder="Nombre, teléfono, email, tag..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>
        <div className="card-b flush">
          {isLoading && (
            <div style={{ padding: 32, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>Cargando contactos…</div>
          )}
          {isError && (
            <div style={{ padding: 32, textAlign: 'center', color: 'var(--bad)', fontSize: 13 }}>
              Error al cargar: {error?.message || 'desconocido'}
            </div>
          )}
          {!isLoading && !isError && filtered.length === 0 && (
            <div style={{ padding: 32, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
              {customers.length === 0
                ? 'Todavía no hay contactos. Crea el primero con "Nuevo contacto".'
                : 'Sin resultados para esa búsqueda.'}
            </div>
          )}
          {!isLoading && !isError && filtered.length > 0 && (
            <table className="t">
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Teléfono</th>
                  <th>Email</th>
                  <th>Documento</th>
                  <th>Tags</th>
                  <th>Creado</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <div className="row" style={{ gap: 8 }}>
                        <div className="av sm">{c.fullName.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()}</div>
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 500 }}>{c.fullName}</div>
                          {c.notes && <div style={{ fontSize: 11, color: 'var(--muted)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.notes}</div>}
                        </div>
                      </div>
                    </td>
                    <td className="cell-id">{c.phone}</td>
                    <td className="cell-id">{c.email || '—'}</td>
                    <td className="cell-id">{c.documentId || '—'}</td>
                    <td>
                      <div className="row" style={{ gap: 4, flexWrap: 'wrap' }}>
                        {c.tags.length === 0 && <span style={{ color: 'var(--muted)', fontSize: 12 }}>—</span>}
                        {c.tags.map((t) => <span key={t} className="pill" style={{ fontSize: 10 }}>{t}</span>)}
                      </div>
                    </td>
                    <td className="cell-id">{fmtDate(c.createdAt)}</td>
                    <td>
                      <div className="row" style={{ gap: 4, justifyContent: 'flex-end' }}>
                        <button className="iconbtn" title="Abrir WhatsApp"><Ico.wa /></button>
                        <button
                          className="iconbtn" title="Eliminar" data-handled="1"
                          onClick={() => {
                            if (window.confirm(`¿Eliminar a ${c.fullName}?`)) deleteMut.mutate(c.id);
                          }}>
                          <Ico.trash />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {showNew && <NewCustomerModal onClose={() => setShowNew(false)} />}
    </div>
  );
}
