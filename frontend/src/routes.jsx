import Dashboard from './features/dashboard/Dashboard';
import { Ventas } from './features/ventas/Ventas';
import Clientes from './features/clientes/Clientes';
import { Conversations, Plantillas } from './features/conversations/Conversations';
import FlowBuilder from './features/flows/FlowBuilder';
import { LandingEditor, Catalogo, Reportes } from './features/landing/LandingEditor';
import { Documentos, Recordatorios } from './features/modules/Modules';
import WhatsappSettings from './features/whatsapp/WhatsappSettings';

export const ROUTES = [
  { path: 'dashboard',      id: 'dashboard',      element: <Dashboard />,    crumb: ['Travesía', 'Operaciones',   'Dashboard'] },
  { path: 'ventas',         id: 'ventas',         element: <Ventas />,       crumb: ['Travesía', 'Operaciones',   'Ventas y reservas'] },
  { path: 'conversaciones', id: 'conversaciones', element: <Conversations />,crumb: ['Travesía', 'Operaciones',   'Conversaciones'] },
  { path: 'clientes',       id: 'clientes',       element: <Clientes />,     crumb: ['Travesía', 'Operaciones',   'Clientes'] },
  { path: 'flujos',         id: 'flujos',         element: <FlowBuilder />,  crumb: ['Travesía', 'Automatización','Flujos WhatsApp'] },
  { path: 'recordatorios',  id: 'recordatorios',  element: <Recordatorios />,crumb: ['Travesía', 'Automatización','Recordatorios y campañas'] },
  { path: 'documentos',     id: 'documentos',     element: <Documentos />,   crumb: ['Travesía', 'Automatización','Documentos del viaje'] },
  { path: 'plantillas',     id: 'plantillas',     element: <Plantillas />,   crumb: ['Travesía', 'Automatización','Plantillas'] },
  { path: 'whatsapp',       id: 'whatsapp',       element: <WhatsappSettings />, crumb: ['Travesía', 'Automatización','Conexión WhatsApp'] },
  { path: 'landing',        id: 'landing',        element: <LandingEditor />,crumb: ['Travesía', 'Sitio público', 'Landing y cards'] },
  { path: 'catalogo',       id: 'catalogo',       element: <Catalogo />,     crumb: ['Travesía', 'Sitio público', 'Catálogo'] },
  { path: 'reportes',       id: 'reportes',       element: <Reportes />,     crumb: ['Travesía', 'Sitio público', 'Reportes'] },
];

export const ROUTE_BY_ID = Object.fromEntries(ROUTES.map(r => [r.id, r]));
