import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Ico from '../../components/icons';
import { catalogApi } from '../../api/catalog';

const soles = (cents) => 'S/ ' + (cents / 100).toLocaleString('es-PE', { minimumFractionDigits: 2 });
const slugify = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

const TAGS = ['', 'Imperdibles', 'Nuevo', 'Cyber'];
const STATUSES = [
  { value: 'ACTIVE', label: 'Activo' },
  { value: 'DRAFT', label: 'Borrador' },
  { value: 'ARCHIVED', label: 'Archivado' },
];

function PackageModal({ pkg, onClose }) {
  const qc = useQueryClient();
  const editing = !!pkg;
  const [form, setForm] = React.useState(() => ({
    code: pkg?.code || '',
    name: pkg?.name || '',
    slug: pkg?.slug || '',
    destination: pkg?.destination || '',
    category: pkg?.category || '',
    durationDays: pkg?.durationDays ?? 1,
    durationNights: pkg?.durationNights ?? 0,
    price: pkg ? (pkg.priceCents / 100).toString() : '',
    priceBefore: pkg?.priceBeforeCents ? (pkg.priceBeforeCents / 100).toString() : '',
    discountLabel: pkg?.discountLabel || '',
    tag: pkg?.tag || '',
    imageUrl: pkg?.imageUrl || '',
    status: pkg?.status || 'DRAFT',
    description: pkg?.description || '',
  }));
  const [gallery, setGallery] = React.useState((pkg?.gallery || []).join('\n'));
  const [includes, setIncludes] = React.useState((pkg?.includes || []).join('\n'));

  const set = (k) => (e) => setForm((f) => {
    const next = { ...f, [k]: e.target.value };
    // autogenera slug desde el nombre si está vacío
    if (k === 'name' && !f.slug) next.slug = slugify(e.target.value);
    return next;
  });

  const saveMut = useMutation({
    mutationFn: (data) => editing ? catalogApi.update(pkg.id, data) : catalogApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['packages'] });
      window.toast?.(editing ? 'Paquete actualizado' : 'Paquete creado', { label: 'Catálogo', kind: 'good' });
      onClose();
    },
    onError: (err) => {
      const msg = /unique/i.test(err.message) || err.status === 409
        ? 'Ya existe un paquete con ese código o slug.'
        : (err.message || 'No se pudo guardar.');
      window.toast?.(msg, { label: 'Error', kind: 'accent' });
    },
  });

  const onSubmit = (e) => {
    e.preventDefault();
    const payload = {
      code: form.code.trim(),
      name: form.name.trim(),
      slug: form.slug.trim() || slugify(form.name),
      destination: form.destination.trim() || 'Perú',
      category: form.category.trim() || undefined,
      durationDays: Number(form.durationDays),
      durationNights: Number(form.durationNights),
      priceCents: Math.round(Number(form.price) * 100),
      priceBeforeCents: form.priceBefore ? Math.round(Number(form.priceBefore) * 100) : undefined,
      discountLabel: form.discountLabel.trim() || undefined,
      tag: form.tag || undefined,
      imageUrl: form.imageUrl.trim() || undefined,
      status: form.status,
      description: form.description.trim() || undefined,
      gallery: gallery.split('\n').map((s) => s.trim()).filter(Boolean),
      includes: includes.split('\n').map((s) => s.trim()).filter(Boolean),
    };
    saveMut.mutate(payload);
  };

  return (
    <div className="m-back" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <form className="m-card" style={{ width: 620, maxHeight: '88vh' }} onSubmit={onSubmit}>
        <div className="m-h">
          <h2 className="h2">{editing ? `Editar ${pkg.code}` : 'Nuevo paquete'}</h2>
          <button type="button" className="iconbtn" data-handled="1" onClick={onClose} style={{ marginLeft: 'auto' }}>✕</button>
        </div>
        <div className="m-b" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: 10 }}>
            <div className="field"><label>Código (SKU) *</label><input className="input" required value={form.code} onChange={set('code')} placeholder="PKG-007" /></div>
            <div className="field"><label>Nombre *</label><input className="input" required value={form.name} onChange={set('name')} placeholder="Tarapoto 7D/6N..." /></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div className="field"><label>Slug (URL landing)</label><input className="input" value={form.slug} onChange={set('slug')} placeholder="tarapoto-7d6n" /></div>
            <div className="field"><label>Categoría</label><input className="input" value={form.category} onChange={set('category')} placeholder="TARAPOTO ECONÓMICO" /></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 10 }}>
            <div className="field"><label>Días</label><input className="input" type="number" min="1" value={form.durationDays} onChange={set('durationDays')} /></div>
            <div className="field"><label>Noches</label><input className="input" type="number" min="0" value={form.durationNights} onChange={set('durationNights')} /></div>
            <div className="field"><label>Precio (S/) *</label><input className="input" type="number" step="0.01" required value={form.price} onChange={set('price')} placeholder="589" /></div>
            <div className="field"><label>Antes (S/)</label><input className="input" type="number" step="0.01" value={form.priceBefore} onChange={set('priceBefore')} placeholder="829" /></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            <div className="field"><label>Descuento</label><input className="input" value={form.discountLabel} onChange={set('discountLabel')} placeholder="-45%" /></div>
            <div className="field"><label>Etiqueta</label>
              <select className="input" value={form.tag} onChange={set('tag')}>
                {TAGS.map((t) => <option key={t} value={t}>{t || '— sin etiqueta —'}</option>)}
              </select>
            </div>
            <div className="field"><label>Estado</label>
              <select className="input" value={form.status} onChange={set('status')}>
                {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
          </div>
          <div className="field"><label>Imagen principal (URL)</label><input className="input" value={form.imageUrl} onChange={set('imageUrl')} placeholder="https://..." /></div>
          <div className="field"><label>Galería <span style={{ color: 'var(--muted)', fontWeight: 400 }}>(una URL por línea)</span></label>
            <textarea className="input" value={gallery} onChange={(e) => setGallery(e.target.value)} style={{ minHeight: 60 }} placeholder="https://...\nhttps://..." />
          </div>
          <div className="field"><label>Qué incluye <span style={{ color: 'var(--muted)', fontWeight: 400 }}>(un bullet por línea)</span></label>
            <textarea className="input" value={includes} onChange={(e) => setIncludes(e.target.value)} style={{ minHeight: 80 }} placeholder="04 noches de hotel...\nDesayunos..." />
          </div>
        </div>
        <div className="m-f">
          <button type="button" className="btn ghost" data-handled="1" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn" data-handled="1" disabled={saveMut.isPending}>
            {saveMut.isPending ? 'Guardando…' : (editing ? 'Guardar cambios' : 'Crear paquete')}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function Catalogo() {
  const qc = useQueryClient();
  const [modal, setModal] = React.useState(null); // null | {} (nuevo) | pkg (editar)

  const { data: pkgs = [], isLoading, isError, error } = useQuery({
    queryKey: ['packages'],
    queryFn: catalogApi.list,
  });

  const deleteMut = useMutation({
    mutationFn: (id) => catalogApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['packages'] });
      window.toast?.('Paquete eliminado', { label: 'Catálogo', kind: 'accent' });
    },
  });

  const stats = {
    total: pkgs.length,
    activos: pkgs.filter((p) => p.status === 'ACTIVE').length,
    borradores: pkgs.filter((p) => p.status === 'DRAFT').length,
    conSlug: pkgs.filter((p) => p.slug).length,
  };

  return (
    <div className="view">
      <div className="row between">
        <div>
          <h1 className="h1">Catálogo</h1>
          <p className="lead" style={{ marginTop: 4 }}>Todos los paquetes turísticos. Los activos con slug se publican en la landing.</p>
        </div>
        <button className="btn" data-handled="1" onClick={() => setModal({})}><Ico.plus />Nuevo paquete</button>
      </div>

      <div className="spacer-m" />
      <div className="grid-stats">
        <div className="stat"><div className="label">Total paquetes</div><div className="value">{stats.total}</div></div>
        <div className="stat"><div className="label">Activos</div><div className="value">{stats.activos}</div></div>
        <div className="stat"><div className="label">Borradores</div><div className="value">{stats.borradores}</div></div>
        <div className="stat"><div className="label">Publicables (con slug)</div><div className="value">{stats.conSlug}</div></div>
      </div>

      <div className="spacer-m" />
      <div className="card">
        <div className="card-b flush">
          {isLoading && <div style={{ padding: 32, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>Cargando paquetes…</div>}
          {isError && <div style={{ padding: 32, textAlign: 'center', color: 'var(--bad)', fontSize: 13 }}>Error: {error?.message}</div>}
          {!isLoading && !isError && pkgs.length === 0 && (
            <div style={{ padding: 32, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>Sin paquetes. Crea el primero con "Nuevo paquete".</div>
          )}
          {!isLoading && !isError && pkgs.length > 0 && (
            <table className="t">
              <thead><tr><th>SKU</th><th>Paquete</th><th>Categoría</th><th>Etiqueta</th><th style={{ textAlign: 'right' }}>Precio</th><th style={{ textAlign: 'right' }}>Antes</th><th>Estado</th><th></th></tr></thead>
              <tbody>
                {pkgs.map((p) => (
                  <tr key={p.id} style={{ cursor: 'pointer' }} onClick={() => setModal(p)}>
                    <td><span className="cell-id">{p.code}</span></td>
                    <td>
                      <div style={{ fontSize: 12, fontWeight: 500 }}>{p.name}</div>
                      {p.slug && <div className="cell-id">{p.durationDays}D/{p.durationNights}N · /{p.slug}</div>}
                    </td>
                    <td style={{ fontSize: 11 }}>{p.category || '—'}</td>
                    <td>{p.tag ? <span className="pill accent">{p.tag}</span> : <span style={{ color: 'var(--muted)' }}>—</span>}</td>
                    <td className="cell-num" style={{ textAlign: 'right', fontWeight: 500 }}>{soles(p.priceCents)}</td>
                    <td className="cell-num" style={{ textAlign: 'right', color: 'var(--muted)', textDecoration: p.priceBeforeCents ? 'line-through' : 'none' }}>{p.priceBeforeCents ? soles(p.priceBeforeCents) : '—'}</td>
                    <td>
                      {p.status === 'ACTIVE' && <span className="pill good"><span className="d" />activo</span>}
                      {p.status === 'DRAFT' && <span className="pill"><span className="d" style={{ background: 'var(--muted)' }} />borrador</span>}
                      {p.status === 'ARCHIVED' && <span className="pill"><span className="d" style={{ background: 'var(--bad)' }} />archivado</span>}
                    </td>
                    <td>
                      <div className="row" style={{ gap: 4, justifyContent: 'flex-end' }}>
                        <button className="iconbtn" data-handled="1" title="Editar" onClick={(e) => { e.stopPropagation(); setModal(p); }}><Ico.pencil /></button>
                        <button className="iconbtn" data-handled="1" title="Eliminar" onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm(`¿Eliminar "${p.name}"?`)) deleteMut.mutate(p.id);
                        }}><Ico.trash /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {modal && <PackageModal pkg={modal.id ? modal : null} onClose={() => setModal(null)} />}
    </div>
  );
}
