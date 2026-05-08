import React from 'react';
import Ico from '../../components/icons';

export function Modal({ title, sub, children, footer, onClose, width = 560 }) {
  React.useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="m-back" onClick={onClose}>
      <div className="m-card" style={{ width }} onClick={e => e.stopPropagation()}>
        <div className="m-h">
          <div>
            <div className="h2">{title}</div>
            {sub && <div className="mono" style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{sub}</div>}
          </div>
          <button className="iconbtn" onClick={onClose} data-handled="1"><Ico.x /></button>
        </div>
        <div className="m-b">{children}</div>
        {footer && <div className="m-f">{footer}</div>}
      </div>
    </div>
  );
}

function FormGrid({ children, cols = 2 }) {
  return <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 12 }}>{children}</div>;
}

function F({ label, children, span = 1 }) {
  return <div className="field" style={{ gridColumn: `span ${span}` }}><label>{label}</label>{children}</div>;
}

function ModalNuevoPaquete({ onClose }) {
  return (
    <Modal title="Nuevo paquete turístico" sub="Catálogo · publicación inmediata o como borrador" width={640} onClose={onClose}
      footer={<><button className="btn ghost" onClick={onClose}>Cancelar</button><button className="btn" onClick={() => { window.toast('Paquete creado · PKG-007', { label: 'Catálogo', kind: 'good' }); onClose(); }}>Crear paquete</button></>}>
      <FormGrid>
        <F label="Nombre del paquete" span={2}><input className="input" placeholder="Ej. Tarapoto 5d/4n con Sauce" /></F>
        <F label="SKU"><input className="input mono" defaultValue="PKG-007" /></F>
        <F label="Región"><select className="input"><option>Tarapoto</option><option>Cusco</option><option>Ica</option><option>Arequipa</option></select></F>
        <F label="Precio (S/)"><input className="input mono" placeholder="0.00" /></F>
        <F label="Precio anterior (S/)"><input className="input mono" placeholder="0.00" /></F>
        <F label="Etiqueta"><select className="input"><option value="">Ninguna</option><option>IMPERDIBLES</option><option>NUEVO</option><option>CYBER</option></select></F>
        <F label="Estado"><select className="input"><option value="active">Publicado</option><option value="draft">Borrador</option></select></F>
        <F label="Descripción corta" span={2}><textarea className="input" placeholder="¿Qué hace especial a este paquete?" style={{ minHeight: 60 }} /></F>
        <F label="Galería (arrastra archivos)" span={2}>
          <div className="imgph" style={{ height: 80, fontSize: 11, cursor: 'pointer' }}>+ subir imágenes</div>
        </F>
      </FormGrid>
    </Modal>
  );
}

function ModalNuevoContacto({ onClose }) {
  return (
    <Modal title="Nuevo contacto" sub="Se sincroniza con WhatsApp Business" onClose={onClose}
      footer={<><button className="btn ghost" onClick={onClose}>Cancelar</button><button className="btn" onClick={() => { window.toast('Contacto creado', { label: 'Clientes', kind: 'good' }); onClose(); }}>Guardar contacto</button></>}>
      <FormGrid>
        <F label="Nombre completo" span={2}><input className="input" placeholder="Ej. María Quispe" /></F>
        <F label="Teléfono / WhatsApp"><input className="input mono" placeholder="+51 ..." /></F>
        <F label="Email"><input className="input" placeholder="correo@ejemplo.com" /></F>
        <F label="Ciudad"><input className="input" placeholder="Lima" /></F>
        <F label="Etapa"><select className="input"><option>lead</option><option>carrito-abandonado</option><option>comprador</option></select></F>
        <F label="Etiquetas" span={2}>
          <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
            <span className="pill">cyber-2026</span><span className="pill">vip</span>
            <button className="btn ghost sm" data-handled="1"><Ico.plus />añadir</button>
          </div>
        </F>
      </FormGrid>
    </Modal>
  );
}

function ModalImportarCSV({ onClose }) {
  return (
    <Modal title="Importar contactos desde CSV" sub="Acepta nombre, teléfono, email, ciudad, etiquetas" onClose={onClose}
      footer={<><button className="btn ghost" onClick={onClose}>Cancelar</button><button className="btn" onClick={() => { window.toast('Importación iniciada · 0/0', { label: 'Clientes' }); onClose(); }}>Importar</button></>}>
      <div className="imgph" style={{ height: 140, fontSize: 11, cursor: 'pointer' }}>
        Arrastra tu archivo .csv aquí o haz clic para seleccionar
      </div>
      <div className="spacer-s" />
      <div className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>Plantilla sugerida:&nbsp;
        <a href="#" style={{ color: 'var(--accent)' }}>contactos-tpp.csv</a>
      </div>
      <div className="spacer-s" />
      <label className="row" style={{ gap: 8, fontSize: 12 }}>
        <span className="switch on" />
        <span>Disparar flujo de bienvenida automáticamente</span>
      </label>
    </Modal>
  );
}

function ModalReservaManual({ onClose }) {
  return (
    <Modal title="Reserva manual" sub="Para llamadas, ferias o reservas externas" width={640} onClose={onClose}
      footer={<><button className="btn ghost" onClick={onClose}>Cancelar</button><button className="btn" onClick={() => { window.toast('Reserva creada · TPP-10248 · pendiente de pago', { label: 'Ventas', kind: 'good' }); onClose(); }}>Crear reserva</button></>}>
      <FormGrid>
        <F label="Cliente" span={2}><input className="input" placeholder="Buscar por nombre, teléfono o email..." /></F>
        <F label="Paquete" span={2}>
          <select className="input">
            <option>Tarapoto 7d/6n con noche en Laguna · S/ 589</option>
            <option>Cataratas de Ahuashiyacu — Tour 1d · S/ 159</option>
            <option>Laguna Azul + Sauce 2d/1n · S/ 329</option>
          </select>
        </F>
        <F label="Personas"><input className="input mono" defaultValue="2" /></F>
        <F label="Fecha de viaje"><input type="date" className="input" defaultValue="2026-06-12" /></F>
        <F label="Cupón"><input className="input mono" placeholder="—" /></F>
        <F label="Canal"><select className="input"><option>web</option><option>whatsapp</option><option>presencial</option></select></F>
        <F label="Notas internas" span={2}><textarea className="input" placeholder="Cliente prefiere recogida desde hotel..." style={{ minHeight: 60 }} /></F>
      </FormGrid>
    </Modal>
  );
}

function ModalNuevoFlujo({ onClose }) {
  return (
    <Modal title="Nuevo flujo de WhatsApp" sub="Empieza desde cero o usa una plantilla" width={680} onClose={onClose}
      footer={<><button className="btn ghost" onClick={onClose}>Cancelar</button><button className="btn" onClick={() => { window.toast('Flujo creado · borrador', { label: 'Flujos', kind: 'good' }); onClose(); }}>Crear flujo</button></>}>
      <F label="Nombre del flujo"><input className="input" placeholder="Ej. Recuperación post-tour" /></F>
      <div className="spacer-s" />
      <F label="Disparador">
        <select className="input">
          <option>{'Carrito sin pago > 60 minutos'}</option>
          <option>Pago confirmado</option>
          <option>{'Lead sin compra > 48 h'}</option>
          <option>Fecha de viaje + 2 días</option>
          <option>Suscripción a newsletter</option>
          <option>Manual · campaña</option>
        </select>
      </F>
      <div className="spacer-m" />
      <div className="h3" style={{ marginBottom: 8 }}>Empezar desde plantilla</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
        {['Carrito abandonado', 'Confirmación de reserva', 'Recuperación de lead', 'Recordatorio 24h', 'Encuesta NPS', 'Bienvenida nuevo'].map(t => (
          <div key={t} className="card" style={{ padding: '10px 12px', cursor: 'pointer' }}>
            <div style={{ fontSize: 12, fontWeight: 500 }}>{t}</div>
            <div className="mono" style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>3-5 nodos</div>
          </div>
        ))}
      </div>
    </Modal>
  );
}

function ModalNuevaCampana({ onClose }) {
  return (
    <Modal title="Nueva campaña masiva" sub="Mensaje masivo por WhatsApp · cumple políticas Meta" width={640} onClose={onClose}
      footer={<><button className="btn ghost" onClick={onClose}>Cancelar</button><button className="btn ghost" onClick={() => { window.toast('Campaña guardada como borrador', { label: 'Campañas' }); onClose(); }}>Guardar borrador</button><button className="btn" onClick={() => { window.toast('Campaña programada · 10 may 09:00', { label: 'Campañas', kind: 'good' }); onClose(); }}>Programar envío</button></>}>
      <FormGrid>
        <F label="Nombre interno" span={2}><input className="input" placeholder="Ej. Cyber TPP — extensión 48h" /></F>
        <F label="Audiencia">
          <select className="input">
            <option>Compradores + leads (1,420)</option>
            <option>Compradores Tarapoto (612)</option>
            <option>Inactivos 90d (308)</option>
            <option>Toda la base (2,041)</option>
          </select>
        </F>
        <F label="Plantilla aprobada">
          <select className="input">
            <option>WSP_PROMO_CYBER_v1</option>
            <option>WSP_BIENVENIDA_v2</option>
            <option>WSP_RECUP_CARRITO_v3</option>
          </select>
        </F>
        <F label="Fecha de envío"><input type="date" className="input" defaultValue="2026-05-10" /></F>
        <F label="Hora"><input type="time" className="input" defaultValue="09:00" /></F>
        <F label="Vista previa" span={2}>
          <div style={{ background: '#E5DDD5', padding: 12, borderRadius: 6 }}>
            <div className="bubble bot" style={{ whiteSpace: 'pre-line', maxWidth: '100%' }}>
              CYBER TPP 🔥 Hasta 45% OFF en paquetes a Tarapoto.
              <span className="ts">09:00 ✓✓</span>
            </div>
          </div>
        </F>
      </FormGrid>
    </Modal>
  );
}

function ModalNuevaPlantilla({ onClose }) {
  return (
    <Modal title="Nueva plantilla WhatsApp" sub="Será enviada a Meta para aprobación (~24-72 h)" width={620} onClose={onClose}
      footer={<><button className="btn ghost" onClick={onClose}>Cancelar</button><button className="btn" onClick={() => { window.toast('Plantilla enviada a Meta · pendiente de revisión', { label: 'Plantillas' }); onClose(); }}>Enviar a aprobación</button></>}>
      <FormGrid>
        <F label="Nombre" span={2}><input className="input mono" placeholder="WSP_NOMBRE_v1" /></F>
        <F label="Categoría"><select className="input"><option>Marketing</option><option>Utilidad</option><option>Autenticación</option></select></F>
        <F label="Idioma"><select className="input"><option>Español (PE)</option><option>Español (LATAM)</option><option>Inglés</option></select></F>
        <F label="Cuerpo · usa {{1}}, {{2}}..." span={2}>
          <textarea className="input" placeholder="Hola {{1}}, tu reserva *{{2}}* fue confirmada ✅" style={{ minHeight: 100 }} />
        </F>
        <F label="Botones (opcional)" span={2}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <input className="input" placeholder="Texto del botón" />
            <button className="btn ghost sm" style={{ alignSelf: 'flex-start' }} data-handled="1"><Ico.plus />botón</button>
          </div>
        </F>
      </FormGrid>
    </Modal>
  );
}

function ModalNuevoDocumento({ onClose }) {
  return (
    <Modal title="Nuevo documento del viaje" sub="Se enviará automáticamente según las reglas que definas" width={620} onClose={onClose}
      footer={<><button className="btn ghost" onClick={onClose}>Cancelar</button><button className="btn" onClick={() => { window.toast('Documento creado · activo', { label: 'Documentos', kind: 'good' }); onClose(); }}>Crear documento</button></>}>
      <FormGrid>
        <F label="Nombre" span={2}><input className="input" placeholder="Ej. Itinerario · Tarapoto 5d" /></F>
        <F label="Tipo"><select className="input"><option>PDF</option><option>Imagen</option><option>Flyer</option></select></F>
        <F label="Paquete asociado">
          <select className="input">
            <option>Todos los paquetes</option>
            <option>PKG-001 · Tarapoto 7d/6n</option>
            <option>PKG-002 · Cataratas Ahuashiyacu</option>
          </select>
        </F>
        <F label="Archivo" span={2}>
          <div className="imgph" style={{ height: 80, fontSize: 11, cursor: 'pointer' }}>+ subir PDF o imagen</div>
        </F>
      </FormGrid>
    </Modal>
  );
}

function ModalSubirArchivo({ onClose }) {
  return (
    <Modal title="Subir archivo" sub="PDF, JPG, PNG hasta 16 MB · multi-archivo" onClose={onClose}
      footer={<><button className="btn ghost" onClick={onClose}>Cancelar</button><button className="btn" onClick={() => { window.toast('3 archivos subidos', { label: 'Documentos', kind: 'good' }); onClose(); }}>Subir</button></>}>
      <div className="imgph" style={{ height: 160, fontSize: 11, cursor: 'pointer' }}>
        Arrastra tus archivos aquí o haz clic para seleccionar
      </div>
      <div className="spacer-s" />
      {[
        ['itinerario-tarapoto-2026.pdf', '1.4 MB'],
        ['mapa-laguna-azul.jpg', '880 KB'],
        ['recomendaciones.pdf', '380 KB'],
      ].map(([n, s]) => (
        <div key={n} className="row" style={{ gap: 8, padding: '8px 0', borderBottom: '1px solid var(--hair)' }}>
          <div className="imgph" style={{ width: 24, height: 24, fontSize: 8, borderRadius: 3 }}>{n.endsWith('.pdf') ? 'PDF' : 'IMG'}</div>
          <div style={{ flex: 1, fontSize: 12 }}>{n}</div>
          <span className="cell-id">{s}</span>
          <span className="pill good"><span className="d" />OK</span>
        </div>
      ))}
    </Modal>
  );
}

function ModalProbarEnvio({ onClose }) {
  return (
    <Modal title="Probar envío" sub="Envía esta plantilla a un número real para verificar antes de activar" onClose={onClose}
      footer={<><button className="btn ghost" onClick={onClose}>Cancelar</button><button className="btn" onClick={() => { window.toast('Mensaje de prueba enviado', { label: 'WhatsApp', kind: 'wa' }); onClose(); }}>Enviar prueba</button></>}>
      <F label="Número WhatsApp"><input className="input mono" defaultValue="+51 945 220 110" /></F>
      <div className="spacer-m" />
      <div className="h3" style={{ marginBottom: 8 }}>Vista previa</div>
      <div style={{ background: '#E5DDD5', padding: 12, borderRadius: 6 }}>
        <div className="bubble bot" style={{ whiteSpace: 'pre-line', maxWidth: '100%' }}>
          Hola María 🌿 Tu tour <b>Tarapoto 7d/6n</b> sale en 24 horas.
          <span className="ts">14:32 ✓✓</span>
        </div>
      </div>
    </Modal>
  );
}

function ModalPublicar({ onClose }) {
  return (
    <Modal title="Publicar cambios" sub="Vas a publicar los cambios pendientes" onClose={onClose}
      footer={<><button className="btn ghost" onClick={onClose}>Cancelar</button><button className="btn" onClick={() => { window.toast('Cambios publicados · v3.5', { label: 'Sitio', kind: 'good' }); onClose(); }}>Publicar ahora</button></>}>
      <div style={{ background: 'var(--paper-2)', padding: 12, borderRadius: 4, fontSize: 12 }}>
        <div className="row" style={{ gap: 6, marginBottom: 6 }}>
          <Ico.check style={{ color: 'var(--good)' }} />
          <span>4 cambios pendientes serán publicados en producción.</span>
        </div>
        <ul style={{ margin: '4px 0 0 22px', padding: 0, color: 'var(--muted)' }}>
          <li>Hero · subtítulo modificado</li>
          <li>Card "Laguna Azul + Sauce" — precio S/ 329</li>
          <li>Banner Cyber TPP activado</li>
          <li>Footer · WhatsApp +51 945 220 110</li>
        </ul>
      </div>
    </Modal>
  );
}

function ModalGenerarPago({ onClose }) {
  return (
    <Modal title="Generar link de pago" sub="Para enviar por WhatsApp o email" onClose={onClose}
      footer={<><button className="btn ghost" onClick={onClose}>Cancelar</button><button className="btn" onClick={() => { window.toast('Link de pago generado y copiado', { label: 'Pagos', kind: 'good' }); onClose(); }}>Generar y copiar</button></>}>
      <FormGrid>
        <F label="Cliente" span={2}><input className="input" defaultValue="María Fernanda Quispe" /></F>
        <F label="Concepto" span={2}><input className="input" defaultValue="Reserva TPP-10247 · Tarapoto 7d/6n · 2 personas" /></F>
        <F label="Monto (S/)"><input className="input mono" defaultValue="1178.00" /></F>
        <F label="Vence"><input type="date" className="input" defaultValue="2026-05-10" /></F>
        <F label="Métodos aceptados" span={2}>
          <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
            <span className="pill"><Ico.check />Visa / Mastercard</span>
            <span className="pill"><Ico.check />Yape</span>
            <span className="pill"><Ico.check />Plin</span>
            <span className="pill"><Ico.check />BCP transferencia</span>
          </div>
        </F>
      </FormGrid>
    </Modal>
  );
}

function ModalSimple({ title, sub, body, onClose, primary = 'Aceptar', kind = 'good', primaryToast }) {
  return (
    <Modal title={title} sub={sub} onClose={onClose}
      footer={<><button className="btn ghost" onClick={onClose}>Cerrar</button><button className="btn" onClick={() => { window.toast(primaryToast || title + ' aplicado', { label: title, kind }); onClose(); }}>{primary}</button></>}>
      {body}
    </Modal>
  );
}

const MODAL_MAP = [
  { match: /^Nuevo paquete/i,        comp: ModalNuevoPaquete },
  { match: /^Nuevo contacto/i,       comp: ModalNuevoContacto },
  { match: /^Importar( CSV)?/i,      comp: ModalImportarCSV },
  { match: /^Reserva manual/i,       comp: ModalReservaManual },
  { match: /^Nueva campaña/i,        comp: ModalNuevaCampana },
  { match: /^Nueva plantilla/i,      comp: ModalNuevaPlantilla },
  { match: /^Nuevo flujo/i,          comp: ModalNuevoFlujo },
  { match: /^Nuevo documento/i,      comp: ModalNuevoDocumento },
  { match: /^Subir archivo/i,        comp: ModalSubirArchivo },
  { match: /^Probar envío/i,         comp: ModalProbarEnvio },
  { match: /^Probar/i,               comp: ModalProbarEnvio },
  { match: /^Publicar/i,             comp: ModalPublicar },
  { match: /^Generar link/i,         comp: ModalGenerarPago },
  { match: /^Reenviar voucher/i,     comp: (p) => <ModalSimple title="Reenviar voucher" sub="Se envía por WhatsApp y email" primary="Reenviar" primaryToast="Voucher reenviado" body={
      <div className="col" style={{ gap: 8 }}>
        <label className="row" style={{ gap: 8 }}><span className="switch on" /><span>Enviar por WhatsApp (+51 987 654 321)</span></label>
        <label className="row" style={{ gap: 8 }}><span className="switch on" /><span>Enviar por email (mfquispe@gmail.com)</span></label>
        <label className="row" style={{ gap: 8 }}><span className="switch" /><span>Adjuntar nuevo itinerario actualizado</span></label>
      </div>} {...p} /> },
  { match: /^Abrir chat/i,           comp: (p) => <ModalSimple title="Abrir chat de WhatsApp" sub="Se abrirá en la vista de Conversaciones" primary="Abrir" kind="wa" primaryToast="Conversación abierta" body={<p style={{ fontSize: 13 }}>Vas a abrir la conversación con <b>María Fernanda Quispe</b>.</p>} {...p} /> },
  { match: /^Ver en sitio/i,         comp: (p) => <ModalSimple title="Vista pública" sub="https://tppperu.com" primary="Abrir en pestaña nueva" primaryToast="Sitio público abierto" body={<div className="imgph" style={{ height: 240, fontSize: 12 }}>captura · landing tppperu.com</div>} {...p} /> },
  { match: /^Vista previa$/i,        comp: (p) => <ModalSimple title="Vista previa" sub="Cómo lo verá el cliente" primary="Cerrar" kind="accent" primaryToast="" body={<div className="imgph" style={{ height: 240, fontSize: 12 }}>preview · documento / mensaje</div>} {...p} /> },
  { match: /^Exportar/i,             comp: (p) => <ModalSimple title="Exportar datos" sub="Genera un archivo descargable" primary="Generar archivo" primaryToast="Archivo listo · descarga iniciada" body={
      <FormGrid>
        <F label="Formato"><select className="input"><option>CSV</option><option>Excel</option><option>PDF</option></select></F>
        <F label="Periodo"><select className="input"><option>Mayo 2026</option><option>Abril 2026</option><option>Últimos 90 días</option></select></F>
      </FormGrid>} {...p} /> },
  { match: /^Duplicar/i,             comp: (p) => <ModalSimple title="Duplicar" sub="Se creará una copia editable" primary="Duplicar" primaryToast="Copia creada" body={<F label="Nombre de la copia"><input className="input" defaultValue="Carrito abandonado · 1h (copia)" /></F>} {...p} /> },
  { match: /^Programación$/i,        comp: (p) => <ModalSimple title="Programación de recordatorios" sub="Próximos 7 días" primary="Cerrar" primaryToast="" body={
      <div>
        {[
          ['Hoy 18:00', 'WSP_RECORDATORIO_24H', '14 reservas', 'var(--accent)'],
          ['09 may 06:00', 'WSP_RECORDATORIO_12H', '4 reservas', 'var(--accent)'],
          ['10 may 09:00', 'CMP-2026-05-B', '612 contactos', 'var(--info)'],
          ['11 may 18:00', 'WSP_NPS_POSTSERV', '8 envíos', 'var(--good)'],
        ].map((r, i) => (
          <div key={i} className="row" style={{ gap: 10, padding: '8px 0', borderBottom: '1px solid var(--hair)' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: r[3] }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 500 }}>{r[1]}</div>
              <div className="cell-id">{r[2]}</div>
            </div>
            <span className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>{r[0]}</span>
          </div>
        ))}
      </div>} {...p} /> },
  { match: /^Compartir paquete/i,    comp: (p) => <ModalSimple title="Compartir paquete por WhatsApp" sub="Se inserta como tarjeta enriquecida" primary="Insertar en chat" kind="wa" primaryToast="Paquete insertado en el mensaje" body={
      <select className="input"><option>Tarapoto 7d/6n con noche en Laguna · S/ 589</option><option>Cataratas de Ahuashiyacu — Tour 1d · S/ 159</option></select>} {...p} /> },
  { match: /^Filtrar|^Hoy|^Mayo 2026/i, comp: (p) => <ModalSimple title="Filtros y rango" sub="Aplica filtros a la vista actual" primary="Aplicar filtros" primaryToast="Filtros aplicados" body={
      <FormGrid>
        <F label="Desde"><input type="date" className="input" defaultValue="2026-05-01" /></F>
        <F label="Hasta"><input type="date" className="input" defaultValue="2026-05-31" /></F>
      </FormGrid>} {...p} /> },
];

export function ModalRoot() {
  const [stack, setStack] = React.useState([]);
  React.useEffect(() => {
    window.toast = window.toast || (() => {});
    window.openModal = (Comp, props = {}) => {
      const id = Math.random().toString(36).slice(2, 8);
      setStack(s => [...s, { id, Comp, props }]);
    };
    const onClick = (e) => {
      const btn = e.target.closest('.btn, .iconbtn');
      if (!btn) return;
      if (btn.dataset.handled) return;
      if (btn.closest('.m-card')) return;
      const text = (btn.innerText || btn.textContent || '').trim();
      const hit = MODAL_MAP.find(m => m.match.test(text));
      if (hit) {
        e.preventDefault();
        e.stopPropagation();
        window.openModal(hit.comp);
      }
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, []);

  return (
    <>
      {stack.map(({ id, Comp, props }) => (
        <Comp key={id} {...props} onClose={() => setStack(s => s.filter(x => x.id !== id))} />
      ))}
    </>
  );
}
