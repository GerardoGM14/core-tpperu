import React from 'react';
import { NavLink } from 'react-router-dom';
import Ico from '../components/icons';
import logo from '../assets/logo-tppperu.png';

const NAV = [
  { group: 'Operaciones', items: [
    { id: 'dashboard',     label: 'Dashboard',                icon: 'dash' },
    { id: 'ventas',        label: 'Ventas y reservas',        icon: 'cart',  badge: 12 },
    { id: 'conversaciones',label: 'Conversaciones',           icon: 'chat',  dot: true },
    { id: 'clientes',      label: 'Clientes',                 icon: 'users' },
  ]},
  { group: 'Automatización', items: [
    { id: 'flujos',        label: 'Flujos WhatsApp',          icon: 'bot' },
    { id: 'recordatorios', label: 'Recordatorios y campañas', icon: 'bell' },
    { id: 'documentos',    label: 'Documentos del viaje',     icon: 'copy' },
    { id: 'plantillas',    label: 'Plantillas',               icon: 'bolt' },
  ]},
  { group: 'Sitio público', items: [
    { id: 'landing',   label: 'Landing y cards', icon: 'layout' },
    { id: 'catalogo',  label: 'Catálogo',        icon: 'bag' },
    { id: 'reportes',  label: 'Reportes',        icon: 'chart' },
  ]},
];

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sb-brand">
        <img src={logo} alt="TPP Perú" className="sb-logo" />
      </div>

      <div style={{ padding: '10px 8px', borderBottom: '1px solid var(--hair)' }}>
        <button className="btn ghost" style={{ width: '100%', justifyContent: 'space-between', padding: '5px 9px' }}>
          <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--good)' }}></span>
            <span style={{ fontSize: 12 }}>TPP Perú · producción</span>
          </span>
          <Ico.arrow style={{ transform: 'rotate(90deg)', color: 'var(--muted)' }} />
        </button>
      </div>

      <div style={{ flex: 1, overflow: 'auto', paddingBottom: 10 }}>
        {NAV.map(g => (
          <div key={g.group}>
            <div className="sb-section">{g.group}</div>
            <nav className="sb-nav">
              {g.items.map(it => {
                const Icon = Ico[it.icon];
                return (
                  <NavLink key={it.id} to={`/${it.id}`}
                    className={({ isActive }) => 'sb-item' + (isActive ? ' active' : '')}>
                    <span className="ico"><Icon /></span>
                    <span>{it.label}</span>
                    {it.badge ? <span className="badge">{it.badge}</span> : null}
                    {it.dot ? <span className="dot" /> : null}
                  </NavLink>
                );
              })}
            </nav>
          </div>
        ))}
      </div>

      <div className="sb-footer">
        <div className="sb-avatar">CM</div>
        <div className="sb-user-meta">
          <div className="nm">Camila Morales</div>
          <div className="em">ops@tppperu.com</div>
        </div>
        <button className="iconbtn" title="Ajustes"><Ico.cog /></button>
      </div>
    </aside>
  );
}
