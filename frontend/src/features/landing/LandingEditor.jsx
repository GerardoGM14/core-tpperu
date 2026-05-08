import React from 'react';
import Ico from '../../components/icons';
import { TRAVESIA_DATA } from '../../data/travesia';
import { Sparkline } from '../dashboard/Dashboard';

const { packages: initialPkgs, salesByHour, trafficByHour } = TRAVESIA_DATA;

export function LandingEditor() {
  const [tab, setTab] = React.useState('hero');
  const [pkgs, setPkgs] = React.useState(initialPkgs);

  return (
    <div className="view no-pad" style={{ display: 'grid', gridTemplateColumns: '320px 1fr', height: '100%' }}>
      <div style={{ borderRight: '1px solid var(--hair)', overflow: 'auto', background: 'var(--paper)' }}>
        <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid var(--hair)' }}>
          <h1 className="h1" style={{ fontSize: 18 }}>Landing</h1>
          <p style={{ color: 'var(--muted)', fontSize: 12, marginTop: 4 }}>Edita las secciones que ven los clientes en tppperu.com</p>
          <div className="row" style={{ gap: 6, marginTop: 10 }}>
            <span className="pill good"><span className="d" />publicado</span>
            <span className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>v3.4 · 12 may 14:02</span>
          </div>
        </div>
        <div style={{ padding: '8px' }}>
          {[
            { id: 'hero',   label: 'Hero',              sub: 'video + título + CTAs' },
            { id: 'banner', label: 'Banner Cyber TPP',  sub: 'banner promocional' },
            { id: 'cards',  label: 'Cards de paquetes', sub: '6 paquetes activos' },
            { id: 'menu',   label: 'Menú y top bar',    sub: 'navegación principal' },
            { id: 'footer', label: 'Footer y contacto', sub: 'links + redes' },
            { id: 'seo',    label: 'SEO y metadatos',   sub: 'titles, descriptions' },
          ].map(s => (
            <div key={s.id} className={'sb-item ' + (tab === s.id ? 'active' : '')} onClick={() => setTab(s.id)}
              style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 2, padding: '10px 12px' }}>
              <div style={{ fontSize: 13, fontWeight: 500 }}>{s.label}</div>
              <div className="mono" style={{ fontSize: 10, color: 'var(--muted)' }}>{s.sub}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--hair)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="h3">Editando: {tab}</div>
          <div style={{ flex: 1 }} />
          <div className="row" style={{ gap: 6 }}>
            <button className="btn ghost sm">Desktop</button>
            <button className="btn ghost sm" style={{ opacity: 0.6 }}>Tablet</button>
            <button className="btn ghost sm" style={{ opacity: 0.6 }}>Mobile</button>
          </div>
          <button className="btn ghost"><Ico.eye />Ver en sitio</button>
          <button className="btn"><Ico.send />Publicar cambios</button>
        </div>

        <div style={{ flex: 1, overflow: 'auto', padding: 20, background: 'var(--paper-2)' }}>
          {tab === 'hero'   && <HeroEditor />}
          {tab === 'banner' && <BannerEditor />}
          {tab === 'cards'  && <CardsEditor pkgs={pkgs} setPkgs={setPkgs} />}
          {tab === 'menu'   && <SimpleEditor title="Menú principal" rows={[
            { label: 'Logo', value: 'TPP Perú · letras + montaña' },
            { label: 'Items', value: 'Nosotros, Tours, Paquetes, Ofertas, Políticas' },
            { label: 'CTA principal', value: 'Contáctanos · enlace WhatsApp' },
            { label: 'Mensaje top bar', value: 'Tours, paquetes y experiencias listas para que solo te preocupes por disfrutar.' },
          ]} />}
          {tab === 'footer' && <SimpleEditor title="Footer" rows={[
            { label: 'Dirección', value: 'Jr. Ramírez Hurtado 270, Tarapoto' },
            { label: 'Teléfono / WhatsApp', value: '+51 945 220 110' },
            { label: 'Email', value: 'reservas@tppperu.com' },
            { label: 'Redes', value: 'Instagram, Facebook, TikTok' },
          ]} />}
          {tab === 'seo' && <SimpleEditor title="SEO" rows={[
            { label: 'Title', value: 'TPP Perú — Paquetes turísticos a Tarapoto' },
            { label: 'Meta description', value: 'Tours, paquetes y experiencias listas para que solo te preocupes por disfrutar.' },
            { label: 'Open Graph image', value: 'og-tarapoto-2026.jpg' },
            { label: 'Schema', value: 'TravelAgency · LocalBusiness' },
          ]} />}
        </div>
      </div>
    </div>
  );
}

function HeroEditor() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 14, maxWidth: 1400, margin: '0 auto' }}>
      <div className="preview-frame">
        <div style={{ background: '#16140F', color: '#fff', padding: '40px 36px', position: 'relative', minHeight: 380 }}>
          <div className="imgph" style={{ position: 'absolute', inset: 0, opacity: 0.4, color: 'transparent' }} />
          <div style={{ position: 'relative', maxWidth: 460 }}>
            <div className="mono" style={{ fontSize: 11, opacity: 0.8, marginBottom: 8 }}>▶ Reproduce el video completo</div>
            <div style={{ fontSize: 36, fontWeight: 600, lineHeight: 1.05, letterSpacing: '-0.02em' }}>
              Vive Tarapoto<br />como se debe:<br /><span style={{ color: 'var(--accent)' }}>Sin complicaciones</span>
            </div>
            <p style={{ fontSize: 13, opacity: 0.85, marginTop: 12, maxWidth: 360 }}>Tours, paquetes y experiencias listas para que solo te preocupes por disfrutar.</p>
            <div className="row" style={{ gap: 8, marginTop: 18 }}>
              <button className="btn accent">Ver paquetes</button>
              <button className="btn ghost" style={{ background: 'transparent', color: '#fff', borderColor: 'rgba(255,255,255,0.3)' }}><Ico.wa />Hablar por WhatsApp</button>
            </div>
          </div>
        </div>
      </div>
      <div className="card" style={{ height: 'fit-content' }}>
        <div className="card-h"><h2 className="h2">Contenido del hero</h2></div>
        <div className="card-b" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="field"><label>Etiqueta superior</label><input className="input" defaultValue="Reproduce el video completo" /></div>
          <div className="field"><label>Título</label><textarea className="input" defaultValue="Vive Tarapoto como se debe:" /></div>
          <div className="field"><label>Énfasis (acento)</label><input className="input" defaultValue="Sin complicaciones" /></div>
          <div className="field"><label>Subtítulo</label><textarea className="input" defaultValue="Tours, paquetes y experiencias listas para que solo te preocupes por disfrutar." /></div>
          <div className="field"><label>Botón primario</label>
            <div className="row" style={{ gap: 6 }}>
              <input className="input" defaultValue="Ver paquetes" style={{ flex: 1 }} />
              <input className="input" defaultValue="/paquetes" style={{ flex: 1 }} />
            </div>
          </div>
          <div className="field"><label>Botón secundario (WhatsApp)</label>
            <div className="row" style={{ gap: 6 }}>
              <input className="input" defaultValue="Hablar por WhatsApp" style={{ flex: 1 }} />
              <input className="input mono" defaultValue="+51 945 220 110" style={{ flex: 1 }} />
            </div>
          </div>
          <div className="field"><label>Video / fondo</label>
            <div className="imgph" style={{ height: 80 }}>tarapoto-hero.mp4</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function BannerEditor() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 14, maxWidth: 1400, margin: '0 auto' }}>
      <div className="preview-frame">
        <div style={{ background: '#1B2D2A', color: '#fff', padding: '28px 32px', display: 'grid', gridTemplateColumns: '1fr 280px', gap: 24, alignItems: 'center', minHeight: 220 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 500 }}>¡Descubre el paraíso!</div>
            <div style={{ fontSize: 42, fontWeight: 700, lineHeight: 1, color: 'var(--accent)', marginTop: 4 }}>CYBER TPP</div>
            <div style={{ fontSize: 14, opacity: 0.85, marginTop: 6 }}>Reserva tu viaje soñado</div>
            <div style={{ display: 'inline-block', background: 'var(--accent)', color: '#fff', padding: '8px 14px', fontWeight: 600, fontSize: 18, marginTop: 12 }}>Desde: S/ 279</div>
            <div className="mono" style={{ fontSize: 11, opacity: 0.7, marginTop: 10 }}>***Descuento en todos nuestros paquetes!***</div>
          </div>
          <div className="imgph" style={{ aspectRatio: '1', borderRadius: 6 }}>foto · Tarapoto 2026</div>
        </div>
      </div>
      <div className="card">
        <div className="card-h"><h2 className="h2">Banner promocional</h2><span className="switch on" /></div>
        <div className="card-b" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="field"><label>Eyebrow</label><input className="input" defaultValue="¡Descubre el paraíso!" /></div>
          <div className="field"><label>Título</label><input className="input" defaultValue="CYBER TPP" /></div>
          <div className="field"><label>Subtítulo</label><input className="input" defaultValue="Reserva tu viaje soñado" /></div>
          <div className="field"><label>Precio desde</label><input className="input" defaultValue="S/ 279" /></div>
          <div className="field"><label>Vigencia</label>
            <div className="row" style={{ gap: 6 }}>
              <input className="input" type="date" defaultValue="2026-05-01" style={{ flex: 1 }} />
              <input className="input" type="date" defaultValue="2026-05-15" style={{ flex: 1 }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CardsEditor({ pkgs, setPkgs }) {
  const [editing, setEditing] = React.useState(null);
  return (
    <div style={{ maxWidth: 1400, margin: '0 auto' }}>
      <div className="row between" style={{ marginBottom: 14 }}>
        <div>
          <h2 className="h2">Cards de paquetes</h2>
          <p style={{ color: 'var(--muted)', fontSize: 12, marginTop: 2 }}>Arrastra para reordenar.</p>
        </div>
        <button className="btn"><Ico.plus />Nuevo paquete</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        {pkgs.map(p => (
          <div key={p.id} className={'le-card ' + (p.status === 'draft' ? 'draft' : '')}>
            <div style={{ position: 'relative' }}>
              <div className="ph imgph">foto · {p.id}</div>
              {p.tag && <span style={{ position: 'absolute', top: 8, left: 8, background: 'var(--accent)', color: '#fff', padding: '2px 8px', fontSize: 10, fontFamily: 'var(--font-mono)', letterSpacing: '0.04em' }}>{p.tag}</span>}
              <div style={{ position: 'absolute', top: 8, right: 8 }} className="row">
                <button className="iconbtn" style={{ width: 24, height: 24 }}><Ico.drag /></button>
              </div>
            </div>
            <div className="meta">
              <div className="nm">{p.name}</div>
              <div className="row" style={{ gap: 6, marginTop: 4 }}>
                <span className="mono" style={{ fontSize: 12, fontWeight: 500 }}>S/ {p.price}</span>
                <span className="mono" style={{ fontSize: 11, color: 'var(--muted)', textDecoration: 'line-through' }}>S/ {p.was}</span>
                <span className="pill bad" style={{ padding: '1px 5px', fontSize: 10 }}>-{p.discount}%</span>
              </div>
              <div className="row" style={{ marginTop: 6, gap: 6 }}>
                <span className="mono" style={{ fontSize: 10, color: 'var(--muted)' }}>{p.sales} reservas · {p.views} vistas</span>
              </div>
            </div>
            <div className="actions">
              <button className="btn ghost sm" style={{ flex: 1 }} onClick={() => setEditing(p.id)}><Ico.pencil />Editar</button>
              <span className={'switch ' + (p.status === 'active' ? 'on' : '')} onClick={() => {
                setPkgs(pkgs.map(x => x.id === p.id ? { ...x, status: x.status === 'active' ? 'draft' : 'active' } : x));
              }} />
            </div>
          </div>
        ))}
        <div className="le-card" style={{ display: 'grid', placeItems: 'center', minHeight: 280, color: 'var(--muted)', cursor: 'pointer' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 36, height: 36, border: '1px dashed var(--hair-2)', borderRadius: '50%', display: 'grid', placeItems: 'center' }}><Ico.plus /></div>
            <div style={{ fontSize: 12 }}>Nuevo paquete</div>
          </div>
        </div>
      </div>

      {editing && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(22,20,15,0.4)', zIndex: 50, display: 'grid', placeItems: 'center' }} onClick={() => setEditing(null)}>
          <div className="card" style={{ width: 720, maxHeight: '80vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
            <div className="card-h">
              <h2 className="h2">Editar paquete · {editing}</h2>
              <button className="iconbtn" style={{ marginLeft: 'auto' }} onClick={() => setEditing(null)}><Ico.x /></button>
            </div>
            <div className="card-b" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="field" style={{ gridColumn: '1/-1' }}><label>Nombre del paquete</label><input className="input" defaultValue={pkgs.find(p => p.id === editing).name} /></div>
              <div className="field"><label>Etiqueta</label>
                <select className="input" defaultValue={pkgs.find(p => p.id === editing).tag || ''}>
                  <option value="">Ninguna</option><option>IMPERDIBLES</option><option>NUEVO</option><option>CYBER</option>
                </select>
              </div>
              <div className="field"><label>Estado</label>
                <select className="input" defaultValue={pkgs.find(p => p.id === editing).status}>
                  <option value="active">Activo</option><option value="draft">Borrador</option>
                </select>
              </div>
              <div className="field"><label>Precio actual (S/)</label><input className="input mono" defaultValue={pkgs.find(p => p.id === editing).price} /></div>
              <div className="field"><label>Precio anterior (S/)</label><input className="input mono" defaultValue={pkgs.find(p => p.id === editing).was} /></div>
              <div style={{ gridColumn: '1/-1', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button className="btn ghost" onClick={() => setEditing(null)}>Cancelar</button>
                <button className="btn" onClick={() => setEditing(null)}>Guardar cambios</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SimpleEditor({ title, rows }) {
  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <div className="card">
        <div className="card-h"><h2 className="h2">{title}</h2></div>
        <div className="card-b" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {rows.map((r, i) => (
            <div className="field" key={i}>
              <label>{r.label}</label>
              <input className="input" defaultValue={r.value} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function Catalogo() {
  const pkgs = initialPkgs;
  return (
    <div className="view">
      <div className="row between">
        <div>
          <h1 className="h1">Catálogo</h1>
          <p className="lead" style={{ marginTop: 4 }}>Todos los paquetes turísticos. Edita precios, disponibilidad e itinerarios.</p>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <button className="btn ghost"><Ico.copy />Importar</button>
          <button className="btn"><Ico.plus />Nuevo paquete</button>
        </div>
      </div>
      <div className="spacer-m" />
      <div className="card">
        <div className="card-h">
          <div className="tabs" style={{ border: 0, marginBottom: -13, marginTop: -12 }}>
            <button className="tab active">Paquetes <span className="mono" style={{ fontSize: 10, color: 'var(--muted)', marginLeft: 4 }}>6</span></button>
            <button className="tab">Tours del día</button>
            <button className="tab">Hoteles</button>
            <button className="tab">Cupones</button>
          </div>
        </div>
        <div className="card-b flush">
          <table className="t">
            <thead><tr><th>SKU</th><th>Paquete</th><th>Etiqueta</th><th style={{ textAlign: 'right' }}>Precio</th><th style={{ textAlign: 'right' }}>Antes</th><th style={{ textAlign: 'right' }}>Reservas</th><th style={{ textAlign: 'right' }}>Vistas</th><th>Estado</th><th></th></tr></thead>
            <tbody>
              {pkgs.map(p => (
                <tr key={p.id}>
                  <td><span className="cell-id">{p.id}</span></td>
                  <td><div style={{ fontSize: 12, fontWeight: 500 }}>{p.name}</div></td>
                  <td>{p.tag ? <span className="pill accent">{p.tag}</span> : <span className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>—</span>}</td>
                  <td className="cell-num" style={{ textAlign: 'right', fontWeight: 500 }}>S/ {p.price}</td>
                  <td className="cell-num" style={{ textAlign: 'right', color: 'var(--muted)', textDecoration: 'line-through' }}>S/ {p.was}</td>
                  <td className="cell-num" style={{ textAlign: 'right' }}>{p.sales}</td>
                  <td className="cell-num" style={{ textAlign: 'right' }}>{p.views}</td>
                  <td>{p.status === 'active' ? <span className="pill good"><span className="d" />activo</span> : <span className="pill"><span className="d" style={{ background: 'var(--muted)' }} />borrador</span>}</td>
                  <td><button className="iconbtn"><Ico.pencil /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export function Reportes() {
  return (
    <div className="view">
      <div className="row between">
        <div>
          <h1 className="h1">Reportes</h1>
          <p className="lead" style={{ marginTop: 4 }}>Mide ventas, tráfico y desempeño de campañas en WhatsApp.</p>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <button className="btn ghost"><Ico.filter />Mayo 2026</button>
          <button className="btn ghost"><Ico.copy />Exportar PDF</button>
        </div>
      </div>
      <div className="spacer-m" />
      <div className="grid-stats">
        <div className="stat"><div className="label">Ingresos del mes</div><div className="value">S/ 47,820</div><div className="delta up"><Ico.up />+24%</div><div className="spark"><Sparkline data={salesByHour} fill /></div></div>
        <div className="stat"><div className="label">Visitas únicas</div><div className="value">8,412</div><div className="delta up"><Ico.up />+12%</div><div className="spark"><Sparkline data={trafficByHour} color="var(--info)" fill /></div></div>
        <div className="stat"><div className="label">Conversión web</div><div className="value">3.8%</div><div className="delta up"><Ico.up />+0.4 pts</div><div className="spark"><Sparkline data={[2, 2.5, 3, 3.2, 3.5, 3.6, 3.8, 3.8]} color="var(--good)" fill /></div></div>
        <div className="stat"><div className="label">ROI campañas WSP</div><div className="value">7.2x</div><div className="delta up"><Ico.up />+1.1x</div><div className="spark"><Sparkline data={[3, 4, 5, 5, 6, 6.5, 7, 7.2]} color="var(--accent)" fill /></div></div>
      </div>
      <div className="spacer-m" />
      <div className="grid-2">
        <div className="card">
          <div className="card-h"><h2 className="h2">Ventas por canal</h2></div>
          <div className="card-b">
            {[
              { k: 'Web — pago en línea', v: 32400, p: 67, c: 'var(--ink)' },
              { k: 'WhatsApp — link de pago', v: 8940, p: 19, c: 'var(--wa)' },
              { k: 'WhatsApp — recuperación', v: 4280, p: 9, c: 'var(--accent)' },
              { k: 'Referidos', v: 2200, p: 5, c: 'var(--info)' },
            ].map((r, i) => (
              <div key={i} style={{ marginBottom: 12 }}>
                <div className="row between" style={{ fontSize: 12, marginBottom: 4 }}>
                  <span>{r.k}</span><span className="mono">S/ {r.v.toLocaleString()} · {r.p}%</span>
                </div>
                <div style={{ height: 6, background: 'var(--paper-2)' }}>
                  <div style={{ height: '100%', width: r.p + '%', background: r.c }} />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="card">
          <div className="card-h"><h2 className="h2">Funnel de conversión</h2></div>
          <div className="card-b">
            {[
              { k: 'Visitas a la landing', v: 8412, p: 100 },
              { k: 'Vieron un paquete', v: 3820, p: 45 },
              { k: 'Añadieron al carrito', v: 842, p: 10 },
              { k: 'Iniciaron checkout', v: 312, p: 3.7 },
              { k: 'Pagaron', v: 128, p: 1.5 },
            ].map((r, i) => (
              <div key={i} style={{ marginBottom: 10 }}>
                <div className="row between" style={{ fontSize: 12, marginBottom: 4 }}>
                  <span>{r.k}</span><span className="mono">{r.v.toLocaleString()} · {r.p}%</span>
                </div>
                <div style={{ height: 22, background: 'var(--paper-2)', position: 'relative' }}>
                  <div style={{ height: '100%', width: r.p + '%', background: 'var(--ink)' }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
