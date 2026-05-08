import React from 'react';
import Ico from '../../components/icons';
import { TRAVESIA_DATA } from '../../data/travesia';

const { flows } = TRAVESIA_DATA;

const initialNodes = [
  { id: 'n1', type: 'trigger', x: 40,   y: 60,  title: 'Disparador',       body: 'Carrito sin pago > 60 minutos' },
  { id: 'n2', type: 'delay',   x: 320,  y: 60,  title: 'Esperar',          body: '1 hora' },
  { id: 'n3', type: 'message', x: 600,  y: 60,  title: 'Mensaje WhatsApp', body: 'Hola {nombre} 🌿 Veo que dejaste *{paquete}* en tu maleta de viaje. ¿Te ayudo a finalizar la reserva?' },
  { id: 'n4', type: 'cond',    x: 880,  y: 60,  title: 'Condición',        body: '¿Respondió en 30 min?' },
  { id: 'n5', type: 'message', x: 1160, y: -40, title: 'Mensaje WhatsApp', body: '¡Genial! Te envío el link de pago seguro con 5% extra de descuento.' },
  { id: 'n6', type: 'action',  x: 1160, y: 130, title: 'Asignar agente',   body: 'Asignar a Camila · cola "Recuperación"' },
  { id: 'n7', type: 'message', x: 1160, y: 280, title: 'Mensaje WhatsApp', body: 'No te preocupes, te dejo este código *VUELVE10* válido por 24 h ⏳' },
];

const initialEdges = [
  { from: 'n1', to: 'n2' },
  { from: 'n2', to: 'n3' },
  { from: 'n3', to: 'n4' },
  { from: 'n4', to: 'n5', kind: 'alt' },
  { from: 'n4', to: 'n6', kind: 'alt2' },
  { from: 'n4', to: 'n7' },
];

const NODE_W = 240;
const NODE_H = 110;

function bezier(x1, y1, x2, y2) {
  const dx = Math.max(40, Math.abs(x2 - x1) / 2);
  return `M${x1},${y1} C${x1 + dx},${y1} ${x2 - dx},${y2} ${x2},${y2}`;
}

export default function FlowBuilder() {
  const [selected, setSelected] = React.useState('n3');
  const [nodes, setNodes] = React.useState(initialNodes);
  const [drag, setDrag] = React.useState(null);
  const canvasRef = React.useRef(null);
  const [activeFlow, setActiveFlow] = React.useState('FLOW-01');

  const onMouseDown = (e, id) => {
    if (e.target.closest('.bnode-port')) return;
    const n = nodes.find(x => x.id === id);
    setSelected(id);
    setDrag({ id, ox: e.clientX - n.x, oy: e.clientY - n.y });
    e.preventDefault();
  };

  React.useEffect(() => {
    if (!drag) return;
    const onMove = (e) => {
      setNodes(prev => prev.map(n => n.id === drag.id ? { ...n, x: e.clientX - drag.ox, y: e.clientY - drag.oy } : n));
    };
    const onUp = () => setDrag(null);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, [drag]);

  const sel = nodes.find(n => n.id === selected);

  const typeMeta = {
    trigger: { ico: <Ico.trigger />, label: 'Disparador' },
    message: { ico: <Ico.wa />,      label: 'Mensaje' },
    cond:    { ico: <Ico.branch />,  label: 'Condición' },
    action:  { ico: <Ico.bolt />,    label: 'Acción' },
    delay:   { ico: <Ico.clock />,   label: 'Esperar' },
  };

  return (
    <div className="view no-pad" style={{ display: 'grid', gridTemplateColumns: '260px 1fr 320px', height: '100%' }}>
      <div style={{ borderRight: '1px solid var(--hair)', background: 'var(--paper)', overflow: 'auto' }}>
        <div style={{ padding: '14px 14px 10px', borderBottom: '1px solid var(--hair)' }}>
          <div className="row between">
            <h2 className="h2">Flujos</h2>
            <button className="iconbtn"><Ico.plus /></button>
          </div>
          <div className="topbar-search" style={{ marginTop: 10, width: '100%' }}>
            <Ico.search /><input placeholder="Buscar flujo..." />
          </div>
        </div>
        <div className="sb-section" style={{ padding: '12px 14px 4px' }}>Activos</div>
        {flows.filter(f => f.active).map(f => (
          <div key={f.id} onClick={() => setActiveFlow(f.id)} style={{
            padding: '10px 14px', borderBottom: '1px solid var(--hair)', cursor: 'pointer',
            background: activeFlow === f.id ? 'var(--surface)' : 'transparent',
            borderRight: activeFlow === f.id ? '2px solid var(--accent)' : '0',
            marginRight: activeFlow === f.id ? -1 : 0,
          }}>
            <div style={{ fontSize: 12, fontWeight: 500 }}>{f.name}</div>
            <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>{f.trigger}</div>
            <div className="row" style={{ marginTop: 6, gap: 6 }}>
              <span className="pill"><span className="d" style={{ background: 'var(--good)' }} />activo</span>
              <span className="pill mono" style={{ fontSize: 10 }}>{f.sent} env.</span>
              <span className="pill mono" style={{ fontSize: 10, color: 'var(--good)' }}>{Math.round((f.conv / f.sent) * 100)}%</span>
            </div>
          </div>
        ))}
        <div className="sb-section" style={{ padding: '12px 14px 4px' }}>Inactivos</div>
        {flows.filter(f => !f.active).map(f => (
          <div key={f.id} onClick={() => setActiveFlow(f.id)} style={{ padding: '10px 14px', borderBottom: '1px solid var(--hair)', cursor: 'pointer', opacity: 0.7 }}>
            <div style={{ fontSize: 12, fontWeight: 500 }}>{f.name}</div>
            <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>{f.trigger}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--hair)', background: 'var(--paper)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div>
            <div className="h2">Carrito abandonado · 1h</div>
            <div className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>FLOW-01 · última edición hace 12 min · publicado</div>
          </div>
          <div style={{ flex: 1 }} />
          <span className="pill good"><span className="d" />activo</span>
          <button className="btn ghost"><Ico.eye />Probar</button>
          <button className="btn ghost"><Ico.copy />Duplicar</button>
          <button className="btn"><Ico.send />Publicar cambios</button>
        </div>

        <div className="builder" ref={canvasRef} style={{ flex: 1, minHeight: 0 }}>
          <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
            {initialEdges.map((e, i) => {
              const a = nodes.find(n => n.id === e.from);
              const b = nodes.find(n => n.id === e.to);
              if (!a || !b) return null;
              let x1 = a.x + NODE_W, y1 = a.y + NODE_H / 2;
              let x2 = b.x, y2 = b.y + NODE_H / 2;
              if (e.kind === 'alt')  y1 = a.y + NODE_H - 14;
              if (e.kind === 'alt2') y1 = a.y + 14;
              return <path key={i} d={bezier(x1, y1, x2, y2)} className={'bedge ' + (e.kind || '')} />;
            })}
          </svg>

          {nodes.map(n => {
            const meta = typeMeta[n.type];
            return (
              <div key={n.id}
                className={'bnode ' + n.type + (selected === n.id ? ' selected' : '')}
                style={{ left: n.x, top: n.y, width: NODE_W }}
                onMouseDown={(e) => onMouseDown(e, n.id)}>
                <div className="bnode-h">
                  {meta.ico}
                  <span>{meta.label}</span>
                  <span className="mono" style={{ marginLeft: 'auto', color: 'var(--muted-2)' }}>{n.id}</span>
                </div>
                <div className="bnode-b">
                  {n.type === 'message' ? (
                    <div className="preview">{n.body}</div>
                  ) : (
                    <div style={{ fontSize: 12, color: 'var(--ink-2)' }}>{n.body}</div>
                  )}
                </div>
                {n.type !== 'trigger' && <span className="bnode-port in" />}
                {n.type === 'cond' ? (
                  <>
                    <span className="bnode-port out alt2" />
                    <span className="bnode-port out" />
                    <span className="bnode-port out alt" />
                  </>
                ) : (
                  <span className="bnode-port out" />
                )}
              </div>
            );
          })}
        </div>

        <div style={{ padding: '8px 16px', borderTop: '1px solid var(--hair)', display: 'flex', gap: 8, background: 'var(--paper)', alignItems: 'center' }}>
          <span className="h3">Añadir nodo:</span>
          {Object.entries(typeMeta).map(([k, m]) => (
            <button key={k} className="btn ghost sm">{m.ico}{m.label}</button>
          ))}
          <div style={{ flex: 1 }} />
          <span className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>arrastra para reordenar · ⌘ + clic para conectar</span>
        </div>
      </div>

      <div style={{ borderLeft: '1px solid var(--hair)', background: 'var(--paper)', overflow: 'auto' }}>
        <div style={{ padding: '14px', borderBottom: '1px solid var(--hair)' }}>
          <div className="h3">Inspector</div>
          {sel && <div style={{ fontSize: 13, fontWeight: 500, marginTop: 4 }}>{typeMeta[sel.type].label} · {sel.id}</div>}
        </div>

        {sel && sel.type === 'message' && (
          <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="field">
              <label>Mensaje</label>
              <textarea className="input" defaultValue={sel.body} style={{ minHeight: 120 }} />
              <div className="mono" style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>Variables: {'{nombre}'} {'{paquete}'} {'{precio}'} {'{cupon}'}</div>
            </div>
            <div className="field">
              <label>Botones rápidos</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div className="row" style={{ gap: 6 }}>
                  <input className="input" defaultValue="Sí, terminar reserva" style={{ flex: 1 }} />
                  <button className="iconbtn"><Ico.trash /></button>
                </div>
                <div className="row" style={{ gap: 6 }}>
                  <input className="input" defaultValue="Hablar con asesor" style={{ flex: 1 }} />
                  <button className="iconbtn"><Ico.trash /></button>
                </div>
                <button className="btn ghost sm" style={{ alignSelf: 'flex-start' }}><Ico.plus />Botón</button>
              </div>
            </div>
            <div className="field">
              <label>Adjuntar</label>
              <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
                <button className="btn ghost sm">Imagen del paquete</button>
                <button className="btn ghost sm">PDF itinerario</button>
                <button className="btn ghost sm">Link de pago</button>
              </div>
            </div>
            <div className="field">
              <label>Plantilla aprobada</label>
              <select className="input">
                <option>WSP_RECUP_CARRITO_v3</option>
                <option>WSP_PROMO_CYBER_v1</option>
                <option>WSP_BIENVENIDA_v2</option>
              </select>
              <div className="mono" style={{ fontSize: 10, color: 'var(--good)', marginTop: 2 }}>● aprobada por Meta el 28 abr 2026</div>
            </div>
            <div className="divider" />
            <div className="field">
              <label>Estadísticas de este paso</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 12 }}>
                <div className="card" style={{ padding: '8px 10px' }}><div className="h3">Enviados</div><div style={{ fontSize: 18, fontWeight: 500 }} className="mono">412</div></div>
                <div className="card" style={{ padding: '8px 10px' }}><div className="h3">Leídos</div><div style={{ fontSize: 18, fontWeight: 500 }} className="mono">388</div></div>
                <div className="card" style={{ padding: '8px 10px' }}><div className="h3">Respuestas</div><div style={{ fontSize: 18, fontWeight: 500 }} className="mono">152</div></div>
                <div className="card" style={{ padding: '8px 10px' }}><div className="h3">Conversiones</div><div style={{ fontSize: 18, fontWeight: 500, color: 'var(--good)' }} className="mono">38</div></div>
              </div>
            </div>
          </div>
        )}

        {sel && sel.type !== 'message' && (
          <div style={{ padding: 14 }}>
            <div className="field">
              <label>Configuración</label>
              <textarea className="input" defaultValue={sel.body} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
