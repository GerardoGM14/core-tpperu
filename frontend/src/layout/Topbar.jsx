import React from 'react';
import Ico from '../components/icons';

export default function Topbar({ crumb }) {
  return (
    <div className="topbar">
      <div className="crumb">
        {crumb.map((c, i) => (
          <React.Fragment key={i}>
            {i > 0 && <span className="sep">/</span>}
            <span className={i === crumb.length - 1 ? 'cur' : ''}>{c}</span>
          </React.Fragment>
        ))}
      </div>
      <div className="topbar-spacer" />
      <div className="topbar-search">
        <Ico.search />
        <input placeholder="Buscar reservas, clientes, paquetes..." />
        <span className="kbd">⌘K</span>
      </div>
      <button className="iconbtn" title="Notificaciones">
        <Ico.bell />
        <span style={{ position: 'absolute', top: -3, right: -3, width: 7, height: 7, borderRadius: '50%', background: 'var(--accent)', border: '1.5px solid var(--paper)' }} />
      </button>
      <button className="iconbtn" title="Ayuda">?</button>
    </div>
  );
}
