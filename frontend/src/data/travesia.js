/* Mock data for Travesía operations panel */

const packages = [
  { id: 'PKG-001', name: 'Tarapoto 7d/6n con noche en Laguna', tag: 'IMPERDIBLES', price: 589, was: 829, discount: 45, status: 'active', sales: 42, views: 1820 },
  { id: 'PKG-002', name: 'Cataratas de Ahuashiyacu — Tour 1d', tag: 'NUEVO', price: 159, was: 220, discount: 28, status: 'active', sales: 31, views: 980 },
  { id: 'PKG-003', name: 'Laguna Azul + Sauce 2d/1n', tag: 'CYBER', price: 329, was: 480, discount: 31, status: 'active', sales: 27, views: 1240 },
  { id: 'PKG-004', name: 'Cascadas de Carpishuyacu — Aventura', tag: 'IMPERDIBLES', price: 220, was: 320, discount: 31, status: 'active', sales: 19, views: 720 },
  { id: 'PKG-005', name: 'Lamas Nativa + Castillo — Cultural', tag: null, price: 145, was: 200, discount: 27, status: 'draft', sales: 0, views: 0 },
  { id: 'PKG-006', name: 'Alto Mayo — Moyobamba & Rioja 3d', tag: 'CYBER', price: 449, was: 650, discount: 30, status: 'active', sales: 14, views: 510 },
];

const customers = [
  { id: 'CST-2041', name: 'María Fernanda Quispe', phone: '+51 987 654 321', email: 'mfquispe@gmail.com', city: 'Lima', orders: 3, spent: 1247, lastSeen: 'hace 2 min', stage: 'comprador' },
  { id: 'CST-2040', name: 'Renzo Aguirre', phone: '+51 945 220 110', email: 'renzo.a@hotmail.com', city: 'Arequipa', orders: 1, spent: 589, lastSeen: 'hace 14 min', stage: 'comprador' },
  { id: 'CST-2039', name: 'Lucía Vargas', phone: '+51 998 102 884', email: 'luciavargasm@gmail.com', city: 'Trujillo', orders: 0, spent: 0, lastSeen: 'hace 1 h', stage: 'carrito-abandonado' },
  { id: 'CST-2038', name: 'Diego Salcedo', phone: '+51 977 451 209', email: 'dsalcedo@outlook.com', city: 'Cusco', orders: 2, spent: 778, lastSeen: 'hace 3 h', stage: 'comprador' },
  { id: 'CST-2037', name: 'Ana Paula Rivero', phone: '+51 964 880 332', email: 'aprivero@gmail.com', city: 'Lima', orders: 0, spent: 0, lastSeen: 'hace 5 h', stage: 'lead' },
  { id: 'CST-2036', name: 'Carlos Mendoza', phone: '+51 932 117 045', email: 'cmendoza@gmail.com', city: 'Piura', orders: 1, spent: 220, lastSeen: 'ayer', stage: 'comprador' },
  { id: 'CST-2035', name: 'Sofía Linares', phone: '+51 911 305 718', email: 'sofialinares@gmail.com', city: 'Lima', orders: 0, spent: 0, lastSeen: 'hace 2 d', stage: 'lead' },
];

const orders = [
  { id: 'TPP-10247', customer: 'María Fernanda Quispe', phone: '+51 987 654 321', pkg: 'Tarapoto 7d/6n con noche en Laguna', qty: 2, total: 1178, status: 'pagado',     channel: 'web',      date: '06 May 2026 · 14:32' },
  { id: 'TPP-10246', customer: 'Renzo Aguirre',          phone: '+51 945 220 110', pkg: 'Cataratas de Ahuashiyacu — Tour 1d',     qty: 1, total: 159,  status: 'pendiente',  channel: 'whatsapp', date: '06 May 2026 · 14:21' },
  { id: 'TPP-10245', customer: 'Diego Salcedo',          phone: '+51 977 451 209', pkg: 'Laguna Azul + Sauce 2d/1n',              qty: 4, total: 1316, status: 'pagado',     channel: 'web',      date: '06 May 2026 · 13:55' },
  { id: 'TPP-10244', customer: 'Lucía Vargas',           phone: '+51 998 102 884', pkg: 'Tarapoto 7d/6n con noche en Laguna',     qty: 2, total: 1178, status: 'abandonado', channel: 'web',      date: '06 May 2026 · 13:12' },
  { id: 'TPP-10243', customer: 'Carlos Mendoza',         phone: '+51 932 117 045', pkg: 'Cascadas de Carpishuyacu — Aventura',    qty: 1, total: 220,  status: 'pagado',     channel: 'whatsapp', date: '06 May 2026 · 11:48' },
  { id: 'TPP-10242', customer: 'Ana Paula Rivero',       phone: '+51 964 880 332', pkg: 'Alto Mayo — Moyobamba & Rioja 3d',       qty: 2, total: 898,  status: 'reembolsado',channel: 'web',      date: '05 May 2026 · 18:30' },
  { id: 'TPP-10241', customer: 'Sofía Linares',          phone: '+51 911 305 718', pkg: 'Tarapoto 7d/6n con noche en Laguna',     qty: 3, total: 1767, status: 'pagado',     channel: 'web',      date: '05 May 2026 · 17:05' },
  { id: 'TPP-10240', customer: 'Renzo Aguirre',          phone: '+51 945 220 110', pkg: 'Laguna Azul + Sauce 2d/1n',              qty: 1, total: 329,  status: 'pagado',     channel: 'whatsapp', date: '05 May 2026 · 15:22' },
];

const flows = [
  { id: 'FLOW-01', name: 'Carrito abandonado · 1h',    trigger: 'Carrito sin pago > 60 min',     active: true,  sent: 412, conv: 38,  rev: 14820 },
  { id: 'FLOW-02', name: 'Confirmación de reserva',    trigger: 'Pago confirmado',               active: true,  sent: 287, conv: 287, rev: 0 },
  { id: 'FLOW-03', name: 'Recuperación de lead',       trigger: 'Lead sin compra > 48h',         active: true,  sent: 198, conv: 22,  rev: 6480 },
  { id: 'FLOW-04', name: 'Promo Cyber TPP',            trigger: 'Manual · campaña',              active: false, sent: 1230,conv: 91,  rev: 41200 },
  { id: 'FLOW-05', name: 'Encuesta post-tour',         trigger: 'Fecha de viaje + 2 días',       active: true,  sent: 64,  conv: 41,  rev: 0 },
  { id: 'FLOW-06', name: 'Bienvenida nuevo suscriptor',trigger: 'Suscripción a newsletter',      active: true,  sent: 332, conv: 12,  rev: 1480 },
];

const conversations = [
  { id: 'C-01', name: 'María Fernanda Quispe', phone: '+51 987 654 321', preview: 'Perfecto, gracias! Confirmo el pago hoy mismo', time: '14:32', unread: 0, online: true,
    messages: [
      { from: 'them', t: 'Hola, vi su paquete de Tarapoto en la web', ts: '14:18' },
      { from: 'bot',  t: '¡Hola María! Soy *Mara*, asistente de Travesía 🌿 Veo que añadiste el paquete *Tarapoto 7d/6n* a tu maleta de viaje. ¿Te ayudo a finalizar la reserva?', ts: '14:18' },
      { from: 'them', t: 'Sí, somos 2 personas, salida el 14 de mayo', ts: '14:21' },
      { from: 'bot',  t: 'Listo. Tu reserva queda en *S/ 1,178* (incluye 45% Cyber). Te envío el link de pago seguro.', ts: '14:22' },
      { from: 'them', t: '¿Aceptan Yape?', ts: '14:24' },
      { from: 'me',   t: 'Hola María, soy Camila del equipo. Sí, aceptamos Yape, BCP, Plin y tarjetas. Te paso los datos.', ts: '14:28' },
      { from: 'them', t: 'Perfecto, gracias! Confirmo el pago hoy mismo', ts: '14:32' },
    ]
  },
  { id: 'C-02', name: 'Renzo Aguirre', phone: '+51 945 220 110', preview: '¿Hay disponibilidad para el sábado?', time: '14:21', unread: 2, online: false,
    messages: [
      { from: 'them', t: 'Hola, quería preguntar por el tour a Ahuashiyacu', ts: '13:50' },
      { from: 'bot',  t: '¡Hola Renzo! Sí, el tour 1 día a las Cataratas está disponible. ¿Para qué fecha lo necesitas?', ts: '13:50' },
      { from: 'them', t: '¿Hay disponibilidad para el sábado?', ts: '14:21' },
    ]
  },
  { id: 'C-03', name: 'Lucía Vargas', phone: '+51 998 102 884', preview: 'Lo voy a pensar y te aviso', time: '13:12', unread: 0, online: false,
    messages: [
      { from: 'bot',  t: 'Hola Lucía, vimos que dejaste tu maleta de viaje sin completar 🧳 ¿Te ayudamos a terminar la reserva con un 5% extra?', ts: '13:08' },
      { from: 'them', t: 'Lo voy a pensar y te aviso', ts: '13:12' },
    ]
  },
  { id: 'C-04', name: 'Diego Salcedo', phone: '+51 977 451 209', preview: 'Recibido, muchas gracias!', time: 'ayer', unread: 0, online: false,
    messages: [
      { from: 'bot', t: 'Hola Diego, tu reserva *TPP-10245* fue confirmada ✅\n📍 Laguna Azul + Sauce 2d/1n\n👥 4 personas\n📅 22 May 2026\n💰 S/ 1,316', ts: '13:55' },
      { from: 'them', t: 'Recibido, muchas gracias!', ts: '13:56' },
    ]
  },
  { id: 'C-05', name: 'Carlos Mendoza', phone: '+51 932 117 045', preview: '¿Pueden recogerme del aeropuerto?', time: 'ayer', unread: 1, online: false,
    messages: [
      { from: 'them', t: '¿Pueden recogerme del aeropuerto?', ts: 'ayer 11:48' },
    ]
  },
];

const activity = [
  { kind: 'sale',  who: 'María Fernanda Quispe', what: 'pagó reserva TPP-10247', amount: 'S/ 1,178', t: '14:32', ago: 'hace 2 min' },
  { kind: 'wa',    who: 'Bot · Mara',            what: 'envió flujo "Confirmación de reserva" a Diego Salcedo', t: '14:30', ago: 'hace 4 min' },
  { kind: 'cart',  who: 'Lucía Vargas',          what: 'abandonó carrito con 2 paquetes (S/ 1,178)', t: '14:12', ago: 'hace 22 min' },
  { kind: 'sale',  who: 'Renzo Aguirre',         what: 'inició checkout — pendiente de pago', amount: 'S/ 159', t: '14:21', ago: 'hace 13 min' },
  { kind: 'edit',  who: 'Tú',                    what: 'editaste el card "Laguna Azul + Sauce 2d/1n"', t: '13:40', ago: 'hace 54 min' },
  { kind: 'wa',    who: 'Bot · Mara',            what: 'disparó flujo "Carrito abandonado" a 4 contactos', t: '13:00', ago: 'hace 1 h' },
  { kind: 'sale',  who: 'Sofía Linares',         what: 'pagó reserva TPP-10241', amount: 'S/ 1,767', t: '17:05 (ayer)', ago: 'ayer' },
];

const salesByHour = [2,1,0,1,3,4,2,5,8,12,9,11,14,10,13,9,7,5,4,2,1,2,3,1];
const trafficByHour = [12,8,6,9,18,22,28,40,55,70,82,90,105,98,112,88,72,60,48,32,22,18,14,10];

export const TRAVESIA_DATA = { packages, customers, orders, flows, conversations, activity, salesByHour, trafficByHour };
