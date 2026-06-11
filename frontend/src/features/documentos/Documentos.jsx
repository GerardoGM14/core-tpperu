import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Ico from '../../components/icons';
import { documentsApi } from '../../api/documents';
import { catalogApi } from '../../api/catalog';
import { conversationsApi, fileToBase64 } from '../../api/conversations';

const KINDS = [
  { value: 'ITINERARY', label: 'Itinerario' },
  { value: 'VOUCHER', label: 'Voucher' },
  { value: 'INVOICE', label: 'Factura' },
  { value: 'CONTRACT', label: 'Contrato' },
  { value: 'OTHER', label: 'Otro' },
];
const kindLabel = (k) => KINDS.find((x) => x.value === k)?.label || k;

const fmtSize = (bytes) => {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};
const fmtDate = (iso) => new Date(iso).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' });

function DocumentModal({ doc, packages, onClose }) {
  const qc = useQueryClient();
  const editing = !!doc;
  const [form, setForm] = React.useState({
    code: doc?.code || '',
    name: doc?.name || '',
    kind: doc?.kind || 'OTHER',
    packageId: doc?.packageId || '',
    isActive: doc?.isActive ?? true,
  });
  // Archivo: si edita, mantiene el existente salvo que suba uno nuevo.
  const [file, setFile] = React.useState(null);
  const hasExistingFile = doc?.fileUrl?.includes('/api/documents/file/');
  const fileRef = React.useRef(null);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  const saveMut = useMutation({
    mutationFn: async () => {
      let fileUrl = doc?.fileUrl;
      let fileSize = doc?.fileSize;
      let mimeType = doc?.mimeType;
      // Si hay archivo nuevo, súbelo primero
      if (file) {
        const data = await fileToBase64(file);
        const up = await documentsApi.upload({ data, mime: file.type || 'application/octet-stream', filename: file.name });
        fileUrl = up.fileUrl;
        fileSize = up.fileSize;
        mimeType = up.mimeType;
      }
      const payload = {
        code: form.code.trim(),
        name: form.name.trim(),
        kind: form.kind,
        packageId: form.packageId || undefined,
        fileUrl,
        fileSize,
        mimeType,
        isActive: form.isActive,
      };
      return editing ? documentsApi.update(doc.id, payload) : documentsApi.create(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['documents'] });
      window.toast?.(editing ? 'Documento actualizado' : 'Documento creado', { label: 'Documentos', kind: 'good' });
      onClose();
    },
    onError: (err) => {
      const msg = /unique/i.test(err.message) || err.status === 409 ? 'Ya existe un documento con ese código.' : (err.message || 'No se pudo guardar.');
      window.toast?.(msg, { label: 'Error', kind: 'accent' });
    },
  });

  const onSubmit = (e) => {
    e.preventDefault();
    if (!editing && !file) {
      window.toast?.('Sube un archivo para el documento.', { label: 'Documentos', kind: 'accent' });
      return;
    }
    saveMut.mutate();
  };

  const onPickFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 25 * 1024 * 1024) {
      window.toast?.('El archivo supera 25 MB.', { label: 'Documentos', kind: 'accent' });
      return;
    }
    setFile(f);
    // autocompletar nombre si está vacío
    if (!form.name) setForm((s) => ({ ...s, name: f.name.replace(/\.[^.]+$/, '') }));
  };

  return (
    <div className="m-back" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <form className="m-card" style={{ width: 520 }} onSubmit={onSubmit}>
        <div className="m-h">
          <h2 className="h2">{editing ? `Editar ${doc.code}` : 'Nuevo documento'}</h2>
          <button type="button" className="iconbtn" data-handled="1" onClick={onClose} style={{ marginLeft: 'auto' }}>✕</button>
        </div>
        <div className="m-b" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: 10 }}>
            <div className="field"><label>Código *</label><input className="input" required value={form.code} onChange={set('code')} placeholder="DOC-005" /></div>
            <div className="field"><label>Nombre *</label><input className="input" required value={form.name} onChange={set('name')} placeholder="Itinerario · Tarapoto 7d" /></div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div className="field"><label>Tipo</label>
              <select className="input" value={form.kind} onChange={set('kind')}>
                {KINDS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
              </select>
            </div>
            <div className="field"><label>Paquete asociado</label>
              <select className="input" value={form.packageId} onChange={set('packageId')}>
                <option value="">— ninguno (general) —</option>
                {packages.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          </div>
          <div className="field">
            <label>Archivo {!editing && '*'}</label>
            <input ref={fileRef} type="file" hidden onChange={onPickFile}
              accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx" />
            <div className="row" style={{ gap: 10, alignItems: 'center' }}>
              <button type="button" className="btn ghost" data-handled="1" onClick={() => fileRef.current?.click()}>
                <Ico.doc />{file ? 'Cambiar archivo' : (hasExistingFile ? 'Reemplazar archivo' : 'Subir archivo')}
              </button>
              <div style={{ flex: 1, minWidth: 0, fontSize: 12 }}>
                {file
                  ? <span><b style={{ fontWeight: 500 }}>{file.name}</b> <span className="mono" style={{ color: 'var(--muted)', fontSize: 11 }}>({(file.size / 1024).toFixed(0)} KB)</span></span>
                  : hasExistingFile
                    ? <span style={{ color: 'var(--good)' }}>Archivo actual conservado</span>
                    : <span style={{ color: 'var(--muted)' }}>PDF, imagen o documento (máx 25 MB)</span>}
              </div>
            </div>
          </div>
          <label className="row" style={{ gap: 6, fontSize: 13 }}>
            <input type="checkbox" checked={form.isActive} onChange={set('isActive')} /> Activo
          </label>
        </div>
        <div className="m-f">
          <button type="button" className="btn ghost" data-handled="1" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn" data-handled="1" disabled={saveMut.isPending}>{saveMut.isPending ? 'Guardando…' : (editing ? 'Guardar' : 'Crear documento')}</button>
        </div>
      </form>
    </div>
  );
}

// Modal para enviar un documento a una conversación por WhatsApp.
function SendDocModal({ doc, onClose }) {
  const qc = useQueryClient();
  const [search, setSearch] = React.useState('');
  const [caption, setCaption] = React.useState('');

  const { data: convos = [], isLoading } = useQuery({ queryKey: ['conversations'], queryFn: conversationsApi.list });

  const sendMut = useMutation({
    mutationFn: (conversationId) => documentsApi.sendToConversation(conversationId, doc.id, caption.trim() || undefined),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['documents'] });
      qc.invalidateQueries({ queryKey: ['conversations'] });
      window.toast?.('Documento enviado por WhatsApp', { label: 'Documentos', kind: 'good' });
      onClose();
    },
    onError: (err) => {
      const msg = err.status === 502 ? 'WhatsApp no está conectado.' : (err.message || 'No se pudo enviar.');
      window.toast?.(msg, { label: 'Error', kind: 'accent' });
    },
  });

  const nameOf = (c) => c?.customer?.fullName || c?.displayName || ('+' + (c?.remoteJid || '').split('@')[0]);
  const q = search.trim().toLowerCase();
  const filtered = q ? convos.filter((c) => nameOf(c).toLowerCase().includes(q)) : convos;

  return (
    <div className="m-back" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="m-card" style={{ width: 460, maxHeight: '82vh' }}>
        <div className="m-h">
          <span style={{ color: 'var(--accent)', display: 'inline-flex' }}><Ico.doc /></span>
          <h2 className="h2">Enviar "{doc.name}"</h2>
          <button type="button" className="iconbtn" data-handled="1" onClick={onClose} style={{ marginLeft: 'auto' }}>✕</button>
        </div>
        <div className="m-b" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div className="field">
            <label>Mensaje (opcional)</label>
            <input className="input" value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Aquí tienes tu itinerario 🌿" />
          </div>
          <div className="topbar-search" style={{ width: '100%' }}>
            <Ico.search /><input placeholder="Buscar conversación..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div style={{ border: '1px solid var(--hair)', borderRadius: 6, maxHeight: 320, overflow: 'auto' }}>
            {isLoading && <div style={{ padding: 16, textAlign: 'center', color: 'var(--muted)', fontSize: 12 }}>Cargando…</div>}
            {!isLoading && filtered.length === 0 && <div style={{ padding: 16, textAlign: 'center', color: 'var(--muted)', fontSize: 12 }}>Sin conversaciones.</div>}
            {filtered.map((c) => (
              <div key={c.id}
                onClick={() => !sendMut.isPending && sendMut.mutate(c.id)}
                style={{ padding: '10px 12px', borderBottom: '1px solid var(--hair)', cursor: 'pointer', opacity: sendMut.isPending ? 0.5 : 1 }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--paper)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                <div style={{ fontSize: 12, fontWeight: 500 }}>{nameOf(c)}</div>
                <div className="mono" style={{ fontSize: 10, color: 'var(--muted)' }}>{'+' + (c.remoteJid || '').split('@')[0]}</div>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)' }}>Toca una conversación para enviar el documento.</div>
        </div>
      </div>
    </div>
  );
}

export function Documentos() {
  const qc = useQueryClient();
  const [modal, setModal] = React.useState(null);
  const [sendDoc, setSendDoc] = React.useState(null);
  const [search, setSearch] = React.useState('');

  const { data: docs = [], isLoading } = useQuery({ queryKey: ['documents'], queryFn: documentsApi.list });
  const { data: packages = [] } = useQuery({ queryKey: ['packages'], queryFn: catalogApi.list, staleTime: 60000 });

  const pkgName = (id) => packages.find((p) => p.id === id)?.name || '—';

  const deleteMut = useMutation({
    mutationFn: (id) => documentsApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['documents'] });
      window.toast?.('Documento eliminado', { label: 'Documentos', kind: 'accent' });
    },
  });

  const q = search.trim().toLowerCase();
  const filtered = q ? docs.filter((d) => d.name.toLowerCase().includes(q) || d.code.toLowerCase().includes(q)) : docs;

  const stats = {
    total: docs.length,
    activos: docs.filter((d) => d.isActive).length,
    enviados: docs.reduce((s, d) => s + (d.sentCount || 0), 0),
  };

  return (
    <div className="view">
      <div className="row between">
        <div>
          <h1 className="h1">Documentos del viaje</h1>
          <p className="lead" style={{ marginTop: 4 }}>Itinerarios, vouchers y material que envías a tus clientes por WhatsApp.</p>
        </div>
        <button className="btn" data-handled="1" onClick={() => setModal({})}><Ico.plus />Nuevo documento</button>
      </div>

      <div className="spacer-m" />
      <div className="grid-stats">
        <div className="stat"><div className="label">Total documentos</div><div className="value">{stats.total}</div></div>
        <div className="stat"><div className="label">Activos</div><div className="value">{stats.activos}</div></div>
        <div className="stat"><div className="label">Envíos acumulados</div><div className="value">{stats.enviados}</div></div>
      </div>

      <div className="spacer-m" />
      <div className="card">
        <div className="card-h">
          <h2 className="h2">Biblioteca</h2>
          <div style={{ flex: 1 }} />
          <div className="topbar-search" style={{ width: 220 }}>
            <Ico.search /><input placeholder="Buscar documento..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>
        <div className="card-b flush">
          {isLoading ? (
            <div style={{ padding: 32, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>Cargando…</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
              {docs.length === 0 ? 'Sin documentos. Crea el primero.' : 'Sin resultados.'}
            </div>
          ) : (
            <table className="t">
              <thead><tr><th>Código</th><th>Documento</th><th>Tipo</th><th>Paquete</th><th style={{ textAlign: 'right' }}>Tamaño</th><th style={{ textAlign: 'right' }}>Envíos</th><th>Estado</th><th>Actualizado</th><th></th></tr></thead>
              <tbody>
                {filtered.map((d) => (
                  <tr key={d.id} style={{ cursor: 'pointer' }} onClick={() => setModal(d)}>
                    <td><span className="cell-id">{d.code}</span></td>
                    <td>
                      <div className="row" style={{ gap: 8 }}>
                        <span style={{ color: d.mimeType?.includes('image') ? 'var(--info)' : 'var(--accent)', display: 'inline-flex' }}>
                          {d.mimeType?.includes('image') ? <Ico.image /> : <Ico.doc />}
                        </span>
                        <div style={{ fontSize: 12, fontWeight: 500 }}>{d.name}</div>
                      </div>
                    </td>
                    <td style={{ fontSize: 11 }}>{kindLabel(d.kind)}</td>
                    <td style={{ fontSize: 11, color: 'var(--muted)' }}>{d.packageId ? pkgName(d.packageId) : 'General'}</td>
                    <td className="cell-num" style={{ textAlign: 'right' }}>{fmtSize(d.fileSize)}</td>
                    <td className="cell-num" style={{ textAlign: 'right' }}>{d.sentCount || 0}</td>
                    <td>{d.isActive ? <span className="pill good"><span className="d" />activo</span> : <span className="pill"><span className="d" style={{ background: 'var(--muted)' }} />inactivo</span>}</td>
                    <td className="cell-id">{fmtDate(d.updatedAt)}</td>
                    <td>
                      <div className="row" style={{ gap: 4, justifyContent: 'flex-end' }}>
                        {d.fileUrl?.includes('/api/documents/file/') && (
                          <>
                            <a href={d.fileUrl} target="_blank" rel="noreferrer" className="iconbtn" title="Ver archivo" onClick={(e) => e.stopPropagation()}><Ico.eye /></a>
                            <button className="iconbtn" data-handled="1" title="Enviar por WhatsApp" style={{ color: 'var(--wa)' }}
                              onClick={(e) => { e.stopPropagation(); setSendDoc(d); }}><Ico.wa /></button>
                          </>
                        )}
                        <button className="iconbtn" data-handled="1" title="Editar" onClick={(e) => { e.stopPropagation(); setModal(d); }}><Ico.pencil /></button>
                        <button className="iconbtn" data-handled="1" title="Eliminar" onClick={(e) => { e.stopPropagation(); if (window.confirm(`¿Eliminar "${d.name}"?`)) deleteMut.mutate(d.id); }}><Ico.trash /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {modal && <DocumentModal doc={modal.id ? modal : null} packages={packages} onClose={() => setModal(null)} />}
      {sendDoc && <SendDocModal doc={sendDoc} onClose={() => setSendDoc(null)} />}
    </div>
  );
}
