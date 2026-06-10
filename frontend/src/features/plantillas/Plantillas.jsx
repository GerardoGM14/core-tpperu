import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Ico from '../../components/icons';
import { templatesApi } from '../../api/templates';

const STATUS_META = {
  APPROVED: { cls: 'good', label: 'aprobada' },
  PENDING_REVIEW: { cls: 'warn', label: 'en revisión' },
  DRAFT: { cls: '', label: 'borrador' },
  REJECTED: { cls: 'bad', label: 'rechazada' },
};
const STATUS_OPTIONS = ['DRAFT', 'PENDING_REVIEW', 'APPROVED', 'REJECTED'];

// Extrae variables {asi} del cuerpo.
const extractVars = (body) => [...new Set([...body.matchAll(/\{(\w+)\}/g)].map((m) => m[1]))];

// Reemplaza variables por valores de ejemplo para la vista previa.
const SAMPLE = { nombre: 'María', paquete: 'Tarapoto 7D/6N', precio: '1,178', codigo: 'TPP-10247', pax: '2', fecha: '14 may 2026', total: '1,178', descuento: '45', cupon: 'VUELVE10', link: 'pago.tppperu.com/x' };
const preview = (body) => body.replace(/\{(\w+)\}/g, (_, k) => SAMPLE[k] || `{${k}}`);

function TemplateModal({ tpl, onClose }) {
  const qc = useQueryClient();
  const editing = !!tpl;
  const [form, setForm] = React.useState({
    code: tpl?.code || '',
    name: tpl?.name || '',
    body: tpl?.body || '',
    language: tpl?.language || 'es',
    status: tpl?.status || 'DRAFT',
  });
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const saveMut = useMutation({
    mutationFn: (data) => editing ? templatesApi.update(tpl.id, data) : templatesApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['templates'] });
      window.toast?.(editing ? 'Plantilla actualizada' : 'Plantilla creada', { label: 'Plantillas', kind: 'good' });
      onClose();
    },
    onError: (err) => {
      const msg = /unique/i.test(err.message) || err.status === 409 ? 'Ya existe una plantilla con ese código.' : (err.message || 'No se pudo guardar.');
      window.toast?.(msg, { label: 'Error', kind: 'accent' });
    },
  });

  const onSubmit = (e) => {
    e.preventDefault();
    saveMut.mutate({
      code: form.code.trim(),
      name: form.name.trim(),
      body: form.body,
      language: form.language,
      status: form.status,
      variables: extractVars(form.body),
    });
  };

  return (
    <div className="m-back" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <form className="m-card" style={{ width: 560 }} onSubmit={onSubmit}>
        <div className="m-h">
          <h2 className="h2">{editing ? `Editar ${tpl.code}` : 'Nueva plantilla'}</h2>
          <button type="button" className="iconbtn" data-handled="1" onClick={onClose} style={{ marginLeft: 'auto' }}>✕</button>
        </div>
        <div className="m-b" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div className="field"><label>Código *</label><input className="input" required value={form.code} onChange={set('code')} placeholder="WSP_NUEVA_v1" /></div>
            <div className="field"><label>Nombre *</label><input className="input" required value={form.name} onChange={set('name')} placeholder="Recordatorio 24h" /></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div className="field"><label>Idioma</label>
              <select className="input" value={form.language} onChange={set('language')}>
                <option value="es">Español</option><option value="en">Inglés</option>
              </select>
            </div>
            <div className="field"><label>Estado</label>
              <select className="input" value={form.status} onChange={set('status')}>
                {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{STATUS_META[s].label}</option>)}
              </select>
            </div>
          </div>
          <div className="field">
            <label>Cuerpo * <span style={{ color: 'var(--muted)', fontWeight: 400 }}>usa {'{variable}'} para campos dinámicos</span></label>
            <textarea className="input" required value={form.body} onChange={set('body')} style={{ minHeight: 120 }} placeholder="Hola {nombre}, tu reserva {codigo}..." />
            <div className="mono" style={{ fontSize: 10, color: 'var(--muted)', marginTop: 4 }}>Variables detectadas: {extractVars(form.body).map((v) => `{${v}}`).join(' ') || '—'}</div>
          </div>
          <div>
            <div className="h3" style={{ marginBottom: 6 }}>Vista previa</div>
            <div style={{ background: '#E5DDD5', padding: 12, borderRadius: 6 }}>
              <div className="bubble them" style={{ whiteSpace: 'pre-line', maxWidth: '100%' }}>
                {preview(form.body) || 'Escribe el cuerpo…'}
                <span className="ts">14:32 ✓✓</span>
              </div>
            </div>
          </div>
        </div>
        <div className="m-f">
          <button type="button" className="btn ghost" data-handled="1" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn" data-handled="1" disabled={saveMut.isPending}>{saveMut.isPending ? 'Guardando…' : (editing ? 'Guardar' : 'Crear plantilla')}</button>
        </div>
      </form>
    </div>
  );
}

export function Plantillas() {
  const qc = useQueryClient();
  const [modal, setModal] = React.useState(null);
  const [selId, setSelId] = React.useState(null);

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['templates'],
    queryFn: templatesApi.list,
  });

  React.useEffect(() => {
    if (!selId && templates.length) setSelId(templates[0].id);
  }, [templates, selId]);

  const deleteMut = useMutation({
    mutationFn: (id) => templatesApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['templates'] });
      window.toast?.('Plantilla eliminada', { label: 'Plantillas', kind: 'accent' });
    },
  });

  const sel = templates.find((t) => t.id === selId);

  return (
    <div className="view">
      <div className="row between">
        <div>
          <h1 className="h1">Plantillas WhatsApp</h1>
          <p className="lead" style={{ marginTop: 4 }}>Mensajes reutilizables para respuestas rápidas, flujos y campañas.</p>
        </div>
        <button className="btn" data-handled="1" onClick={() => setModal({})}><Ico.plus />Nueva plantilla</button>
      </div>
      <div className="spacer-m" />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 12 }}>
        <div className="card">
          <div className="card-b flush">
            {isLoading ? (
              <div style={{ padding: 32, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>Cargando…</div>
            ) : templates.length === 0 ? (
              <div style={{ padding: 32, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>Sin plantillas. Crea la primera.</div>
            ) : (
              <table className="t">
                <thead><tr><th>Nombre</th><th>Variables</th><th>Estado</th><th></th></tr></thead>
                <tbody>
                  {templates.map((t) => (
                    <tr key={t.id} className={selId === t.id ? 'selected' : ''} onClick={() => setSelId(t.id)} style={{ cursor: 'pointer' }}>
                      <td><div style={{ fontSize: 12, fontWeight: 500 }}>{t.name}</div><div className="cell-id">{t.code}</div></td>
                      <td className="mono" style={{ fontSize: 10, color: 'var(--muted)' }}>{t.variables.length ? t.variables.map((v) => `{${v}}`).join(' ') : '—'}</td>
                      <td><span className={'pill ' + (STATUS_META[t.status]?.cls || '')}><span className="d" />{STATUS_META[t.status]?.label || t.status}</span></td>
                      <td>
                        <div className="row" style={{ gap: 4, justifyContent: 'flex-end' }}>
                          <button className="iconbtn" data-handled="1" title="Editar" onClick={(e) => { e.stopPropagation(); setModal(t); }}><Ico.pencil /></button>
                          <button className="iconbtn" data-handled="1" title="Eliminar" onClick={(e) => { e.stopPropagation(); if (window.confirm(`¿Eliminar "${t.name}"?`)) deleteMut.mutate(t.id); }}><Ico.trash /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
        <div className="card">
          <div className="card-h"><h2 className="h2">Vista previa</h2></div>
          <div className="card-b">
            {sel ? (
              <>
                <div className="field"><label>Nombre</label><div style={{ fontSize: 13 }}>{sel.name}</div></div>
                <div className="spacer-s" />
                <div className="field"><label>Cuerpo</label><div style={{ fontSize: 13, whiteSpace: 'pre-line', color: 'var(--ink-2)' }}>{sel.body}</div></div>
                <div className="spacer-m" />
                <div className="h3" style={{ marginBottom: 8 }}>Cómo se ve en WhatsApp</div>
                <div style={{ background: '#E5DDD5', padding: 14, borderRadius: 6 }}>
                  <div className="bubble them" style={{ whiteSpace: 'pre-line', maxWidth: '100%' }}>
                    {preview(sel.body)}
                    <span className="ts">14:32 ✓✓</span>
                  </div>
                </div>
                <div className="spacer-m" />
                <button className="btn ghost" style={{ width: '100%', justifyContent: 'center' }} data-handled="1" onClick={() => setModal(sel)}><Ico.pencil />Editar plantilla</button>
              </>
            ) : (
              <div style={{ color: 'var(--muted)', fontSize: 13 }}>Selecciona una plantilla.</div>
            )}
          </div>
        </div>
      </div>
      {modal && <TemplateModal tpl={modal.id ? modal : null} onClose={() => setModal(null)} />}
    </div>
  );
}
