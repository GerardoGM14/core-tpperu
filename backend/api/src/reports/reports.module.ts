import { Module, Controller, Get, Injectable, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PrismaService } from '../shared/prisma.service';

// Formatea céntimos PEN → "S/ 1,178.00"
function formatPEN(cents: number): string {
  return 'S/ ' + (cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Etiqueta legible por canal de venta.
const CHANNEL_LABEL: Record<string, string> = {
  WEB: 'Web — pago en línea',
  WHATSAPP: 'WhatsApp',
  PHONE: 'Teléfono',
  REFERRAL: 'Referidos',
  WALKIN: 'Presencial',
};

@Injectable()
class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async overview() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const [orders, customersTotal, conversationsTotal] = await Promise.all([
      this.prisma.order.findMany({ orderBy: { createdAt: 'desc' } }),
      this.prisma.customer.count(),
      this.prisma.conversation.count(),
    ]);

    const paid = orders.filter((o) => o.status === 'PAID');

    // --- KPI: ingresos del mes (y variación vs mes anterior) ---
    const revenueThisMonth = paid
      .filter((o) => o.createdAt >= startOfMonth)
      .reduce((s, o) => s + o.totalCents, 0);
    const revenuePrevMonth = paid
      .filter((o) => o.createdAt >= startOfPrevMonth && o.createdAt < startOfMonth)
      .reduce((s, o) => s + o.totalCents, 0);
    const revenueDelta = revenuePrevMonth > 0
      ? Math.round(((revenueThisMonth - revenuePrevMonth) / revenuePrevMonth) * 100)
      : 0;

    // --- KPI: conversión (órdenes pagadas / total de conversaciones) ---
    const conversionPct = conversationsTotal > 0
      ? +((paid.length / conversationsTotal) * 100).toFixed(1)
      : 0;

    // --- Ventas por canal (sobre órdenes pagadas) ---
    const byChannel = new Map<string, number>();
    let totalPaidCents = 0;
    for (const o of paid) {
      byChannel.set(o.channel, (byChannel.get(o.channel) || 0) + o.totalCents);
      totalPaidCents += o.totalCents;
    }
    const ventasPorCanal = Array.from(byChannel.entries())
      .map(([channel, cents]) => ({
        canal: CHANNEL_LABEL[channel] || channel,
        montoCents: cents,
        monto: formatPEN(cents),
        porcentaje: totalPaidCents > 0 ? Math.round((cents / totalPaidCents) * 100) : 0,
      }))
      .sort((a, b) => b.montoCents - a.montoCents);

    // --- Funnel de conversión (datos reales disponibles) ---
    const totalOrders = orders.length;
    const funnel = [
      { etapa: 'Conversaciones iniciadas', valor: conversationsTotal, porcentaje: 100 },
      {
        etapa: 'Generaron una orden',
        valor: totalOrders,
        porcentaje: conversationsTotal > 0 ? +((totalOrders / conversationsTotal) * 100).toFixed(1) : 0,
      },
      {
        etapa: 'Pagaron',
        valor: paid.length,
        porcentaje: conversationsTotal > 0 ? +((paid.length / conversationsTotal) * 100).toFixed(1) : 0,
      },
    ];

    return {
      periodo: now.toLocaleDateString('es-PE', { month: 'long', year: 'numeric' }),
      kpis: {
        ingresosMes: formatPEN(revenueThisMonth),
        ingresosMesDelta: (revenueDelta >= 0 ? '+' : '') + revenueDelta + '%',
        clientes: customersTotal,
        conversion: conversionPct + '%',
        ordenesPagadas: paid.length,
      },
      ventasPorCanal,
      funnel,
    };
  }
}

@Controller('reports')
@UseGuards(AuthGuard('jwt'))
class ReportsController {
  constructor(private readonly svc: ReportsService) {}
  @Get('overview') overview() { return this.svc.overview(); }
}

@Module({
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
