/* Seed de datos reales (basado en el mock del frontend).
 * Idempotente: usa upsert por códigos/teléfonos únicos.
 * Ejecutar: npx prisma db seed
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const daysAgo = (d: number, h = 0, m = 0) => {
  const t = new Date();
  t.setDate(t.getDate() - d);
  t.setHours(h, m, 0, 0);
  return t;
};

async function main() {
  // ---------- Usuario admin ----------
  await prisma.user.updateMany({
    where: { email: 'gerardo.gonzalez@sertech.pe' },
    data: { role: 'ADMIN', fullName: 'Gerardo González' },
  });

  // ---------- Paquetes ----------
  // Alineados con landing/src/data/paquetes.js (mismos slugs y datos).
  const GALERIA = [
    'https://images.unsplash.com/photo-1531168556467-80aace0d0144?w=600&q=80',
    'https://images.unsplash.com/photo-1437846972679-9e6e537be46e?w=600&q=80',
    'https://images.unsplash.com/photo-1518182170546-07661fd94144?w=600&q=80',
    'https://images.unsplash.com/photo-1472396961693-142e6e269027?w=600&q=80',
    'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=600&q=80',
    'https://images.unsplash.com/photo-1544735716-392fe2489ffa?w=600&q=80',
  ];
  const INCLUYE = [
    'Recogemos del Aeropuerto de Tarapoto al hotel ida y vuelta',
    '04 noches de Hotel Boutique Kovakii (Piscina y Aire acondicionado)',
    '4 días de Desayunos',
    '3 días de Almuerzos',
    'Tours Laguna Azul - Sauce',
    'Tours Alto Mayo - Moyobamba y Rioja',
    'Tours Cascadas de Carpishuyacu',
    'Tours Lamas Nativa - Castillo',
    'Tours Cataratas de Ahuashiyacu',
    'Entradas, guía y más',
  ];

  const packagesData = [
    { code: 'PKG-001', slug: 'tarapoto-laguna-azul-7d6n', name: 'Tarapoto 7D/6N con noche en Laguna Azul', destination: 'Tarapoto', category: 'TARAPOTO ECONÓMICO', durationDays: 7, durationNights: 6, priceCents: 58900, priceBeforeCents: 82900, discountLabel: '-45%', tag: 'Imperdibles', imageUrl: 'https://images.unsplash.com/photo-1531168556467-80aace0d0144?w=500&q=80', status: 'ACTIVE' },
    { code: 'PKG-002', slug: 'cataratas-ahuashiyacu-4d3n', name: 'Cataratas de Ahuashiyacu 4D/3N full aventura', destination: 'Tarapoto', category: 'TARAPOTO', durationDays: 4, durationNights: 3, priceCents: 74900, priceBeforeCents: 98000, discountLabel: '-24%', tag: 'Nuevo', imageUrl: 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?w=500&q=80', status: 'ACTIVE' },
    { code: 'PKG-003', slug: 'alto-mayo-moyobamba-rioja-5d4n', name: 'Alto Mayo: Moyobamba y Rioja 5D/4N', destination: 'Moyobamba', category: 'TARAPOTO', durationDays: 5, durationNights: 4, priceCents: 92000, priceBeforeCents: 115000, discountLabel: '-20%', tag: 'Cyber', imageUrl: 'https://images.unsplash.com/photo-1437846972679-9e6e537be46e?w=500&q=80', status: 'ACTIVE' },
    { code: 'PKG-004', slug: 'lamas-nativa-castillo-3d2n', name: 'Lamas Nativa y Castillo 3D/2N cultural', destination: 'Lamas', category: 'TARAPOTO ECONÓMICO', durationDays: 3, durationNights: 2, priceCents: 45900, priceBeforeCents: 62000, discountLabel: '-26%', tag: 'Imperdibles', imageUrl: 'https://images.unsplash.com/photo-1518182170546-07661fd94144?w=500&q=80', status: 'ACTIVE' },
    { code: 'PKG-005', slug: 'sauce-laguna-azul-2d1n', name: 'Sauce y Laguna Azul 2D/1N escapada', destination: 'Sauce', category: 'TARAPOTO ECONÓMICO', durationDays: 2, durationNights: 1, priceCents: 29900, priceBeforeCents: 42000, discountLabel: '-29%', tag: 'Nuevo', imageUrl: 'https://images.unsplash.com/photo-1472396961693-142e6e269027?w=500&q=80', status: 'ACTIVE' },
    { code: 'PKG-006', slug: 'cancun-playa-del-carmen-6d5n', name: 'Cancún y Playa del Carmen 6D/5N todo incluido', destination: 'Cancún', category: 'INTERNACIONAL', durationDays: 6, durationNights: 5, priceCents: 489000, priceBeforeCents: 620000, discountLabel: '-21%', tag: 'Cyber', imageUrl: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=500&q=80', status: 'ACTIVE' },
  ] as const;

  const pkgByCode: Record<string, string> = {};
  for (const p of packagesData) {
    const data = {
      ...p,
      status: p.status as any,
      currency: 'PEN',
      description: `${p.name} · salida desde Tarapoto.`,
      gallery: GALERIA,
      includes: INCLUYE,
    };
    const row = await prisma.package.upsert({
      where: { code: p.code },
      update: data,
      create: data,
    });
    pkgByCode[p.code] = row.id;
  }

  // ---------- Clientes ----------
  const customersData = [
    { fullName: 'María Fernanda Quispe', phone: '+51987654321', email: 'mfquispe@gmail.com', tags: ['comprador', 'lima'], notes: 'Cliente frecuente, 3 reservas.' },
    { fullName: 'Renzo Aguirre', phone: '+51945220110', email: 'renzo.a@hotmail.com', tags: ['comprador', 'arequipa'] },
    { fullName: 'Lucía Vargas', phone: '+51998102884', email: 'luciavargasm@gmail.com', tags: ['carrito-abandonado', 'trujillo'] },
    { fullName: 'Diego Salcedo', phone: '+51977451209', email: 'dsalcedo@outlook.com', tags: ['comprador', 'cusco'] },
    { fullName: 'Ana Paula Rivero', phone: '+51964880332', email: 'aprivero@gmail.com', tags: ['lead', 'lima'] },
    { fullName: 'Carlos Mendoza', phone: '+51932117045', email: 'cmendoza@gmail.com', tags: ['comprador', 'piura'] },
    { fullName: 'Sofía Linares', phone: '+51911305718', email: 'sofialinares@gmail.com', tags: ['lead', 'lima'] },
  ];

  const custByPhone: Record<string, string> = {};
  for (const c of customersData) {
    const row = await prisma.customer.upsert({
      where: { phone: c.phone },
      update: { fullName: c.fullName, email: c.email, tags: c.tags },
      create: c,
    });
    custByPhone[c.phone] = row.id;
  }

  // ---------- Órdenes ----------
  const ordersData = [
    { code: 'TPP-10247', phone: '+51987654321', pkg: 'PKG-001', pax: 2, totalCents: 117800, status: 'PAID', channel: 'WEB', createdAt: daysAgo(0, 14, 32) },
    { code: 'TPP-10246', phone: '+51945220110', pkg: 'PKG-002', pax: 1, totalCents: 15900, status: 'PENDING', channel: 'WHATSAPP', createdAt: daysAgo(0, 14, 21) },
    { code: 'TPP-10245', phone: '+51977451209', pkg: 'PKG-003', pax: 4, totalCents: 131600, status: 'PAID', channel: 'WEB', createdAt: daysAgo(0, 13, 55) },
    { code: 'TPP-10244', phone: '+51998102884', pkg: 'PKG-001', pax: 2, totalCents: 117800, status: 'CANCELLED', channel: 'WEB', createdAt: daysAgo(0, 13, 12) },
    { code: 'TPP-10243', phone: '+51932117045', pkg: 'PKG-004', pax: 1, totalCents: 22000, status: 'PAID', channel: 'WHATSAPP', createdAt: daysAgo(0, 11, 48) },
    { code: 'TPP-10242', phone: '+51964880332', pkg: 'PKG-006', pax: 2, totalCents: 89800, status: 'REFUNDED', channel: 'WEB', createdAt: daysAgo(1, 18, 30) },
    { code: 'TPP-10241', phone: '+51911305718', pkg: 'PKG-001', pax: 3, totalCents: 176700, status: 'PAID', channel: 'WEB', createdAt: daysAgo(1, 17, 5) },
    { code: 'TPP-10240', phone: '+51945220110', pkg: 'PKG-003', pax: 1, totalCents: 32900, status: 'PAID', channel: 'WHATSAPP', createdAt: daysAgo(1, 15, 22) },
  ] as const;

  for (const o of ordersData) {
    const order = await prisma.order.upsert({
      where: { code: o.code },
      update: { status: o.status as any },
      create: {
        code: o.code,
        customerId: custByPhone[o.phone],
        packageId: pkgByCode[o.pkg],
        status: o.status as any,
        channel: o.channel as any,
        pax: o.pax,
        totalCents: o.totalCents,
        paidCents: o.status === 'PAID' ? o.totalCents : 0,
        travelDate: daysAgo(-8),
        createdAt: o.createdAt,
      },
    });
    if (o.status === 'PAID') {
      const exists = await prisma.payment.findFirst({ where: { orderId: order.id } });
      if (!exists) {
        await prisma.payment.create({
          data: { orderId: order.id, method: 'yape', amountCents: o.totalCents, paidAt: o.createdAt, reference: `YAPE-${o.code}` },
        });
      }
    }
  }

  // ---------- Plantillas ----------
  const templatesData = [
    { code: 'WSP_RECUP_CARRITO_v3', name: 'Recuperación de carrito', body: 'Hola {nombre} 🌿 Veo que dejaste *{paquete}* en tu maleta de viaje. ¿Te ayudo a finalizar la reserva?', variables: ['nombre', 'paquete'], status: 'APPROVED' },
    { code: 'WSP_PROMO_CYBER_v1', name: 'Promo Cyber TPP', body: '🔥 {nombre}, solo por Cyber: *{paquete}* con {descuento}% dscto. Reserva aquí: {link}', variables: ['nombre', 'paquete', 'descuento', 'link'], status: 'APPROVED' },
    { code: 'WSP_BIENVENIDA_v2', name: 'Bienvenida suscriptor', body: '¡Hola {nombre}! Soy *Mara*, asistente de TPP Perú 🌿 Gracias por suscribirte. ¿Buscas tu próxima aventura?', variables: ['nombre'], status: 'APPROVED' },
    { code: 'WSP_CONFIRMACION_v1', name: 'Confirmación de reserva', body: 'Hola {nombre}, tu reserva *{codigo}* fue confirmada ✅\n📍 {paquete}\n👥 {pax} personas\n📅 {fecha}\n💰 S/ {total}', variables: ['nombre', 'codigo', 'paquete', 'pax', 'fecha', 'total'], status: 'APPROVED' },
    { code: 'WSP_POST_TOUR_v1', name: 'Encuesta post-tour', body: 'Hola {nombre}, ¿qué tal estuvo tu experiencia en *{paquete}*? Califícanos del 1 al 5 ⭐', variables: ['nombre', 'paquete'], status: 'PENDING_REVIEW' },
  ] as const;

  for (const t of templatesData) {
    await prisma.template.upsert({
      where: { code: t.code },
      update: { body: t.body, status: t.status as any },
      create: { ...t, variables: [...t.variables], status: t.status as any, approvedAt: t.status === 'APPROVED' ? daysAgo(10) : null },
    });
  }

  // ---------- Flujos ----------
  const flowsData = [
    { code: 'FLOW-01', name: 'Carrito abandonado · 1h', triggerType: 'CART_ABANDONED', status: 'ACTIVE', stats: { sent: 412, conv: 38, rev: 14820 } },
    { code: 'FLOW-02', name: 'Confirmación de reserva', triggerType: 'PAYMENT_CONFIRMED', status: 'ACTIVE', stats: { sent: 287, conv: 287, rev: 0 } },
    { code: 'FLOW-03', name: 'Recuperación de lead', triggerType: 'LEAD_NO_PURCHASE', status: 'ACTIVE', stats: { sent: 198, conv: 22, rev: 6480 } },
    { code: 'FLOW-04', name: 'Promo Cyber TPP', triggerType: 'MANUAL', status: 'PAUSED', stats: { sent: 1230, conv: 91, rev: 41200 } },
    { code: 'FLOW-05', name: 'Encuesta post-tour', triggerType: 'TRAVEL_DATE_OFFSET', status: 'ACTIVE', stats: { sent: 64, conv: 41, rev: 0 } },
    { code: 'FLOW-06', name: 'Bienvenida nuevo suscriptor', triggerType: 'NEWSLETTER_SUBSCRIBE', status: 'ACTIVE', stats: { sent: 332, conv: 12, rev: 1480 } },
  ] as const;

  const flowByCode: Record<string, string> = {};
  for (const f of flowsData) {
    const row = await prisma.flow.upsert({
      where: { code: f.code },
      update: { status: f.status as any },
      create: {
        code: f.code,
        name: f.name,
        triggerType: f.triggerType as any,
        status: f.status as any,
        triggerConfig: f.stats as any,
        publishedAt: f.status === 'ACTIVE' ? daysAgo(20) : null,
      },
    });
    flowByCode[f.code] = row.id;
  }

  // Nodos y aristas del FLOW-01 (el que muestra el builder)
  const flow01 = flowByCode['FLOW-01'];
  const nodeCount = await prisma.flowNode.count({ where: { flowId: flow01 } });
  if (nodeCount === 0) {
    const mkNode = (type: string, title: string, body: string, x: number, y: number) =>
      prisma.flowNode.create({ data: { flowId: flow01, type: type as any, title, body, posX: x, posY: y } });

    const n1 = await mkNode('TRIGGER', 'Disparador', 'Carrito sin pago > 60 minutos', 40, 60);
    const n2 = await mkNode('DELAY', 'Esperar', '1 hora', 320, 60);
    const n3 = await mkNode('MESSAGE', 'Mensaje WhatsApp', 'Hola {nombre} 🌿 Veo que dejaste *{paquete}* en tu maleta de viaje. ¿Te ayudo a finalizar la reserva?', 600, 60);
    const n4 = await mkNode('CONDITION', 'Condición', '¿Respondió en 30 min?', 880, 60);
    const n5 = await mkNode('MESSAGE', 'Mensaje WhatsApp', '¡Genial! Te envío el link de pago seguro con 5% extra de descuento.', 1160, -40);
    const n6 = await mkNode('ACTION', 'Asignar agente', 'Asignar a Camila · cola "Recuperación"', 1160, 130);
    const n7 = await mkNode('MESSAGE', 'Mensaje WhatsApp', 'No te preocupes, te dejo este código *VUELVE10* válido por 24 h ⏳', 1160, 280);

    const mkEdge = (from: string, to: string, kind?: string) =>
      prisma.flowEdge.create({ data: { flowId: flow01, fromNodeId: from, toNodeId: to, kind } });
    await mkEdge(n1.id, n2.id);
    await mkEdge(n2.id, n3.id);
    await mkEdge(n3.id, n4.id);
    await mkEdge(n4.id, n5.id, 'alt');
    await mkEdge(n4.id, n6.id, 'alt2');
    await mkEdge(n4.id, n7.id);
  }

  // ---------- Conversaciones + mensajes ----------
  const convsData = [
    {
      phone: '+51987654321', name: 'María Fernanda Quispe', daysOld: 0,
      messages: [
        { dir: 'INBOUND', t: 'Hola, vi su paquete de Tarapoto en la web', h: 14, m: 18 },
        { dir: 'OUTBOUND', t: '¡Hola María! Soy *Mara*, asistente de Travesía 🌿 Veo que añadiste el paquete *Tarapoto 7d/6n* a tu maleta de viaje. ¿Te ayudo a finalizar la reserva?', h: 14, m: 18 },
        { dir: 'INBOUND', t: 'Sí, somos 2 personas, salida el 14 de mayo', h: 14, m: 21 },
        { dir: 'OUTBOUND', t: 'Listo. Tu reserva queda en *S/ 1,178* (incluye 45% Cyber). Te envío el link de pago seguro.', h: 14, m: 22 },
        { dir: 'INBOUND', t: '¿Aceptan Yape?', h: 14, m: 24 },
        { dir: 'OUTBOUND', t: 'Hola María, soy Camila del equipo. Sí, aceptamos Yape, BCP, Plin y tarjetas. Te paso los datos.', h: 14, m: 28 },
        { dir: 'INBOUND', t: 'Perfecto, gracias! Confirmo el pago hoy mismo', h: 14, m: 32 },
      ],
    },
    {
      phone: '+51945220110', name: 'Renzo Aguirre', daysOld: 0, unread: 2,
      messages: [
        { dir: 'INBOUND', t: 'Hola, quería preguntar por el tour a Ahuashiyacu', h: 13, m: 50 },
        { dir: 'OUTBOUND', t: '¡Hola Renzo! Sí, el tour 1 día a las Cataratas está disponible. ¿Para qué fecha lo necesitas?', h: 13, m: 50 },
        { dir: 'INBOUND', t: '¿Hay disponibilidad para el sábado?', h: 14, m: 21 },
      ],
    },
    {
      phone: '+51998102884', name: 'Lucía Vargas', daysOld: 0,
      messages: [
        { dir: 'OUTBOUND', t: 'Hola Lucía, vimos que dejaste tu maleta de viaje sin completar 🧳 ¿Te ayudamos a terminar la reserva con un 5% extra?', h: 13, m: 8 },
        { dir: 'INBOUND', t: 'Lo voy a pensar y te aviso', h: 13, m: 12 },
      ],
    },
    {
      phone: '+51977451209', name: 'Diego Salcedo', daysOld: 1,
      messages: [
        { dir: 'OUTBOUND', t: 'Hola Diego, tu reserva *TPP-10245* fue confirmada ✅\n📍 Laguna Azul + Sauce 2d/1n\n👥 4 personas\n📅 22 May 2026\n💰 S/ 1,316', h: 13, m: 55 },
        { dir: 'INBOUND', t: 'Recibido, muchas gracias!', h: 13, m: 56 },
      ],
    },
    {
      phone: '+51932117045', name: 'Carlos Mendoza', daysOld: 1, unread: 1,
      messages: [
        { dir: 'INBOUND', t: '¿Pueden recogerme del aeropuerto?', h: 11, m: 48 },
      ],
    },
  ];

  for (const cv of convsData) {
    const jid = `${cv.phone.replace('+', '')}@s.whatsapp.net`;
    const lastMsg = cv.messages[cv.messages.length - 1];
    const conv = await prisma.conversation.upsert({
      where: { remoteJid: jid },
      update: { unreadCount: cv.unread ?? 0 },
      create: {
        remoteJid: jid,
        customerId: custByPhone[cv.phone],
        displayName: cv.name,
        status: 'OPEN',
        unreadCount: cv.unread ?? 0,
        lastMessageAt: daysAgo(cv.daysOld, lastMsg.h, lastMsg.m),
      },
    });
    const msgCount = await prisma.message.count({ where: { conversationId: conv.id } });
    if (msgCount === 0) {
      for (const m of cv.messages) {
        await prisma.message.create({
          data: {
            conversationId: conv.id,
            direction: m.dir as any,
            kind: 'TEXT',
            status: m.dir === 'OUTBOUND' ? 'READ' : 'DELIVERED',
            body: m.t,
            sentAt: daysAgo(cv.daysOld, m.h, m.m),
            createdAt: daysAgo(cv.daysOld, m.h, m.m),
          },
        });
      }
    }
  }

  // ---------- Documentos ----------
  const docsData = [
    { code: 'DOC-001', name: 'Itinerario · Tarapoto 7d/6n', kind: 'ITINERARY', pkg: 'PKG-001', fileUrl: '/files/itinerario-tarapoto-7d.pdf', fileSize: 1_400_000, sentCount: 142 },
    { code: 'DOC-002', name: 'Voucher de reserva · genérico', kind: 'VOUCHER', pkg: null, fileUrl: '/files/voucher-generico.pdf', fileSize: 320_000, sentCount: 287 },
    { code: 'DOC-003', name: 'Recomendaciones de viaje · Selva', kind: 'OTHER', pkg: null, fileUrl: '/files/recomendaciones-selva.pdf', fileSize: 850_000, sentCount: 198 },
    { code: 'DOC-004', name: 'Itinerario · Laguna Azul 2d/1n', kind: 'ITINERARY', pkg: 'PKG-003', fileUrl: '/files/itinerario-laguna-azul.pdf', fileSize: 980_000, sentCount: 64 },
  ] as const;

  for (const d of docsData) {
    await prisma.document.upsert({
      where: { code: d.code },
      update: { sentCount: d.sentCount },
      create: {
        code: d.code,
        name: d.name,
        kind: d.kind as any,
        packageId: d.pkg ? pkgByCode[d.pkg] : null,
        fileUrl: d.fileUrl,
        fileSize: d.fileSize,
        mimeType: 'application/pdf',
        sentCount: d.sentCount,
      },
    });
  }

  // ---------- Resumen ----------
  const counts = {
    packages: await prisma.package.count(),
    customers: await prisma.customer.count(),
    orders: await prisma.order.count(),
    payments: await prisma.payment.count(),
    templates: await prisma.template.count(),
    flows: await prisma.flow.count(),
    flowNodes: await prisma.flowNode.count(),
    conversations: await prisma.conversation.count(),
    messages: await prisma.message.count(),
    documents: await prisma.document.count(),
  };
  console.log('Seed completado:', counts);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
