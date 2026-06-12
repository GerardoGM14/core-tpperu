import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Ico from '../../components/icons';
import { flowsApi } from '../../api/flows';

const NODE_W = 240;
const NODE_H = 110;

// Tipos del backend (FlowNodeType) ↔ tipo visual del canvas.
const TYPE_FROM_API = { TRIGGER: 'trigger', MESSAGE: 'message', CONDITION: 'cond', ACTION: 'action', DELAY: 'delay' };
const TYPE_TO_API = { trigger: 'TRIGGER', message: 'MESSAGE', cond: 'CONDITION', action: 'ACTION', delay: 'DELAY' };

// Plantilla de canvas para un flujo nuevo (un disparador inicial).
const STARTER_NODES = [
  { key: 'n1', type: 'trigger', posX: 60, posY: 80, title: 'Disparador', body: 'Configura cuándo se dispara este flujo' },
];

function bezier(x1, y1, x2, y2) {
  const dx = Math.max(40, Math.abs(x2 - x1) / 2);
  return `M${x1},${y1} C${x1 + dx},${y1} ${x2 - dx},${y2} ${x2},${y2}`;
}

const typeMeta = {
  trigger: { ico: <Ico.trigger />, label: 'Disparador' },
  message: { ico: <Ico.wa />,      label: 'Mensaje' },
  cond:    { ico: <Ico.branch />,  label: 'Condición' },
  action:  { ico: <Ico.bolt />,    label: 'Acción' },
  delay:   { ico: <Ico.clock />,   label: 'Esperar' },
};

const STATUS_PILL = {
  ACTIVE:   { cls: 'good', label: 'activo' },
  DRAFT:    { cls: '',     label: 'borrador' },
  PAUSED:   { cls: 'warn', label: 'pausado' },
  ARCHIVED: { cls: '',     label: 'archivado' },
};

let keyCounter = 100;
const nextKey = () => 'n' + (++keyCounter);

export default function FlowBuilder() {
  const qc = useQueryClient();
  const [activeId, setActiveId] = React.useState(null);
  const [selected, setSelected] = React.useState(null);
  const [nodes, setNodes] = React.useState([]);
  const [edges, setEdges] = React.useState([]);
  const [dirty, setDirty] = React.useState(false);
  const [drag, setDrag] = React.useState(null);
  const canvasRef = React.useRef(null);

  // Lista de flujos (sidebar)
  const { data: flows = [], isLoading: loadingList } = useQuery({ queryKey: ['flows'], queryFn: flowsApi.list });

  // Selección inicial: primer flujo de la lista
  React.useEffect(() => {
    if (!activeId && flows.length) setActiveId(flows[0].id);
  }, [flows, activeId]);

  // Detalle del flujo activo (incluye nodos + edges)
  const { data: flow } = useQuery({
    queryKey: ['flow', activeId],
    queryFn: () => flowsApi.get(activeId),
    enabled: !!activeId,
  });

  // Cargar el canvas del flujo en el estado local cuando llega del backend
  React.useEffect(() => {
    if (!flow) return;
    const ns = (flow.nodes || []).map((n) => ({
      key: n.id, type: TYPE_FROM_API[n.type] || 'message', title: n.title, body: n.body || '', posX: n.posX, posY: n.posY,
    }));
    const es = (flow.edges || []).map((e) => {
      const from = (flow.nodes || []).find((n) => n.id === e.fromNodeId);
      const to = (flow.nodes || []).find((n) => n.id === e.toNodeId);
      return from && to ? { from: from.id, to: to.id, kind: e.kind || undefined } : null;
    }).filter(Boolean);
    setNodes(ns.length ? ns : STARTER_NODES);
    setEdges(es);
    setSelected(ns[0]?.key || null);
    setDirty(false);
  }, [flow]);

  // ---- Drag de nodos ----
  const onMouseDown = (e, key) => {
    if (e.target.closest('.bnode-port')) return;
    const n = nodes.find((x) => x.key === key);
    setSelected(key);
    setDrag({ key, ox: e.clientX - n.posX, oy: e.clientY - n.posY });
    e.preventDefault();
  };
  React.useEffect(() => {
    if (!drag) return;
    const onMove = (e) => {
      setNodes((prev) => prev.map((n) => n.key === drag.key ? { ...n, posX: e.clientX - drag.ox, posY: e.clientY - drag.oy } : n));
      setDirty(true);
    };
    const onUp = () => setDrag(null);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, [drag]);

  // ---- Mutaciones ----
  const createFlow = useMutation({
    mutationFn: () => flowsApi.create({
      code: 'FLOW-' + Date.now().toString(36).toUpperCase(),
      name: 'Nuevo flujo',
      triggerType: 'MANUAL',
      status: 'DRAFT',
    }),
    onSuccess: (f) => { qc.invalidateQueries({ queryKey: ['flows'] }); setActiveId(f.id); },
  });

  const saveCanvas = useMutation({
    mutationFn: () => flowsApi.saveCanvas(activeId, { nodes, edges }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['flow', activeId] }); setDirty(false); },
  });

  const toggleStatus = useMutation({
    mutationFn: (status) => flowsApi.update(activeId, {
      code: flow.code, name: flow.name, triggerType: flow.triggerType, status,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['flows'] }); qc.invalidateQueries({ queryKey: ['flow', activeId] }); },
  });

  const removeFlow = useMutation({
    mutationFn: (id) => flowsApi.remove(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['flows'] }); setActiveId(null); },
  });

  // ---- Edición de nodos ----
  const addNode = (type) => {
    const key = nextKey();
    setNodes((prev) => [...prev, { key, type, title: typeMeta[type].label, body: '', posX: 80 + prev.length * 30, posY: 240 }]);
    setSelected(key);
    setDirty(true);
  };
  const updateNode = (key, patch) => {
    setNodes((prev) => prev.map((n) => n.key === key ? { ...n, ...patch } : n));
    setDirty(true);
  };
  const deleteNode = (key) => {
    setNodes((prev) => prev.filter((n) => n.key !== key));
    setEdges((prev) => prev.filter((e) => e.from !== key && e.to !== key));
    setSelected(null);
    setDirty(true);
  };

  const sel = nodes.find((n) => n.key === selected);
  const active = flows.find((f) => f.id === activeId);
  const pill = STATUS_PILL[active?.status] || STATUS_PILL.DRAFT;

  return (
    <div className="view no-pad" style={{ display: 'grid', gridTemplateColumns: '260px 1fr 320px', height: '100%' }}>
      {/* Sidebar: lista de flujos */}
      <div style={{ borderRight: '1px solid var(--hair)', background: 'var(--paper)', overflow: 'auto' }}>
        <div style={{ padding: '14px 14px 10px', borderBottom: '1px solid var(--hair)' }}>
          <div className="row between">
            <h2 className="h2">Flujos</h2>
            <button className="iconbtn" title="Nuevo flujo" onClick={() => createFlow.mutate()}><Ico.plus /></button>
          </div>
        </div>
        {loadingList && <div style={{ padding: 14, color: 'var(--muted)', fontSize: 12 }}>Cargando…</div>}
        {!loadingList && flows.length === 0 && (
          <div style={{ padding: 16, color: 'var(--muted)', fontSize: 12 }}>
            No hay flujos. Crea el primero con <Ico.plus />.
          </div>
        )}
        {flows.map((f) => {
          const fp = STATUS_PILL[f.status] || STATUS_PILL.DRAFT;
          return (
            <div key={f.id} onClick={() => setActiveId(f.id)} style={{
              padding: '10px 14px', borderBottom: '1px solid var(--hair)', cursor: 'pointer',
              background: activeId === f.id ? 'var(--surface)' : 'transparent',
              borderRight: activeId === f.id ? '2px solid var(--accent)' : '0',
              opacity: f.status === 'ACTIVE' ? 1 : 0.75,
            }}>
              <div style={{ fontSize: 12, fontWeight: 500 }}>{f.name}</div>
              <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>{f.code} · {f.triggerType}</div>
              <div className="row" style={{ marginTop: 6, gap: 6 }}>
                <span className={'pill ' + fp.cls}><span className="d" />{fp.label}</span>
                <span className="pill mono" style={{ fontSize: 10 }}>{f._count?.nodes ?? 0} nodos</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Canvas */}
      <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--hair)', background: 'var(--paper)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ minWidth: 0 }}>
            <div className="h2" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{active?.name || 'Selecciona un flujo'}</div>
            <div className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>{active ? `${active.code} · ${dirty ? 'cambios sin guardar' : 'guardado'}` : '—'}</div>
          </div>
          <div style={{ flex: 1 }} />
          {active && <span className={'pill ' + pill.cls}><span className="d" />{pill.label}</span>}
          {active && active.status !== 'ACTIVE' && (
            <button className="btn ghost" onClick={() => toggleStatus.mutate('ACTIVE')} disabled={toggleStatus.isPending}>Activar</button>
          )}
          {active && active.status === 'ACTIVE' && (
            <button className="btn ghost" onClick={() => toggleStatus.mutate('PAUSED')} disabled={toggleStatus.isPending}>Pausar</button>
          )}
          {active && (
            <button className="iconbtn" title="Eliminar flujo" onClick={() => { if (confirm('¿Eliminar este flujo?')) removeFlow.mutate(activeId); }}><Ico.trash /></button>
          )}
          <button className="btn" onClick={() => saveCanvas.mutate()} disabled={!active || !dirty || saveCanvas.isPending}>
            <Ico.send />{saveCanvas.isPending ? 'Guardando…' : 'Publicar cambios'}
          </button>
        </div>

        <div className="builder" ref={canvasRef} style={{ flex: 1, minHeight: 0 }}>
          <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
            {edges.map((e, i) => {
              const a = nodes.find((n) => n.key === e.from);
              const b = nodes.find((n) => n.key === e.to);
              if (!a || !b) return null;
              let x1 = a.posX + NODE_W, y1 = a.posY + NODE_H / 2;
              const x2 = b.posX, y2 = b.posY + NODE_H / 2;
              if (e.kind === 'alt')  y1 = a.posY + NODE_H - 14;
              if (e.kind === 'alt2') y1 = a.posY + 14;
              return <path key={i} d={bezier(x1, y1, x2, y2)} className={'bedge ' + (e.kind || '')} />;
            })}
          </svg>

          {nodes.map((n) => {
            const meta = typeMeta[n.type] || typeMeta.message;
            return (
              <div key={n.key}
                className={'bnode ' + n.type + (selected === n.key ? ' selected' : '')}
                style={{ left: n.posX, top: n.posY, width: NODE_W }}
                onMouseDown={(e) => onMouseDown(e, n.key)}>
                <div className="bnode-h">
                  {meta.ico}
                  <span>{meta.label}</span>
                  <span className="mono" style={{ marginLeft: 'auto', color: 'var(--muted-2)' }}>{n.key}</span>
                </div>
                <div className="bnode-b">
                  {n.type === 'message'
                    ? <div className="preview">{n.body || 'Mensaje vacío…'}</div>
                    : <div style={{ fontSize: 12, color: 'var(--ink-2)' }}>{n.body || n.title}</div>}
                </div>
                {n.type !== 'trigger' && <span className="bnode-port in" />}
                {n.type === 'cond'
                  ? <><span className="bnode-port out alt2" /><span className="bnode-port out" /><span className="bnode-port out alt" /></>
                  : <span className="bnode-port out" />}
              </div>
            );
          })}

          {active && nodes.length === 0 && (
            <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', color: 'var(--muted)' }}>
              Canvas vacío — añade un nodo abajo 👇
            </div>
          )}
        </div>

        <div style={{ padding: '8px 16px', borderTop: '1px solid var(--hair)', display: 'flex', gap: 8, background: 'var(--paper)', alignItems: 'center' }}>
          <span className="h3">Añadir nodo:</span>
          {Object.entries(typeMeta).map(([k, m]) => (
            <button key={k} className="btn ghost sm" disabled={!active} onClick={() => addNode(k)}>{m.ico}{m.label}</button>
          ))}
          <div style={{ flex: 1 }} />
          <span className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>arrastra los nodos para reordenar</span>
        </div>
      </div>

      {/* Inspector */}
      <div style={{ borderLeft: '1px solid var(--hair)', background: 'var(--paper)', overflow: 'auto' }}>
        <div style={{ padding: '14px', borderBottom: '1px solid var(--hair)' }}>
          <div className="h3">Inspector</div>
          {sel && <div style={{ fontSize: 13, fontWeight: 500, marginTop: 4 }}>{typeMeta[sel.type]?.label} · {sel.key}</div>}
        </div>

        {!sel && <div style={{ padding: 14, color: 'var(--muted)', fontSize: 12 }}>Selecciona un nodo para editarlo.</div>}

        {sel && (
          <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="field">
              <label>Título</label>
              <input className="input" value={sel.title} onChange={(e) => updateNode(sel.key, { title: e.target.value })} />
            </div>
            <div className="field">
              <label>{sel.type === 'message' ? 'Mensaje' : 'Configuración'}</label>
              <textarea className="input" value={sel.body} onChange={(e) => updateNode(sel.key, { body: e.target.value })} style={{ minHeight: sel.type === 'message' ? 120 : 80 }}
                placeholder={sel.type === 'message' ? 'Hola {nombre} 🌿 …' : 'Describe la condición / acción…'} />
              {sel.type === 'message' && (
                <div className="mono" style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>Variables: {'{nombre}'} {'{paquete}'} {'{precio}'} {'{cupon}'}</div>
              )}
            </div>
            <div className="divider" />
            <button className="btn ghost sm" style={{ alignSelf: 'flex-start', color: 'var(--bad)' }} onClick={() => deleteNode(sel.key)}>
              <Ico.trash />Eliminar nodo
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
