import { Module, Controller, Get, Injectable, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PrismaService } from '../shared/prisma.service';

@Injectable()
class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async stats() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfWeek = new Date(now.getTime() - 7 * 86400_000);

    const [
      orders,
      customersTotal,
      customersThisWeek,
      packagesActive,
      conversations,
      openConversations,
      unreadAgg,
    ] = await Promise.all([
      this.prisma.order.findMany({
        include: { customer: true, package: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.customer.count(),
      this.prisma.customer.count({ where: { createdAt: { gte: startOfWeek } } }),
      this.prisma.package.count({ where: { status: 'ACTIVE' } }),
      this.prisma.conversation.count(),
      this.prisma.conversation.count({ where: { status: 'OPEN' } }),
      this.prisma.conversation.aggregate({ _sum: { unreadCount: true } }),
    ]);

    const paid = orders.filter((o) => o.status === 'PAID');
    const revenue = paid.reduce((s, o) => s + o.totalCents, 0);
    const revenueThisMonth = paid
      .filter((o) => o.createdAt >= startOfMonth)
      .reduce((s, o) => s + o.totalCents, 0);
    const waRevenue = paid.filter((o) => o.channel === 'WHATSAPP').reduce((s, o) => s + o.totalCents, 0);
    const avgTicket = paid.length ? Math.round(revenue / paid.length) : 0;

    // Ventas pagadas por día (últimos 14 días) para el sparkline
    const days = 14;
    const salesByDay: number[] = Array(days).fill(0);
    for (const o of paid) {
      const diff = Math.floor((now.getTime() - o.createdAt.getTime()) / 86400_000);
      if (diff >= 0 && diff < days) salesByDay[days - 1 - diff] += o.totalCents;
    }

    // Top paquetes por reservas pagadas
    const byPkg: Record<string, { name: string; count: number; revenue: number }> = {};
    for (const o of paid) {
      const k = o.packageId;
      if (!byPkg[k]) byPkg[k] = { name: o.package?.name || '—', count: 0, revenue: 0 };
      byPkg[k].count++;
      byPkg[k].revenue += o.totalCents;
    }
    const topPackages = Object.values(byPkg).sort((a, b) => b.revenue - a.revenue).slice(0, 4);

    // Actividad reciente: últimas 6 órdenes
    const recentActivity = orders.slice(0, 6).map((o) => ({
      code: o.code,
      customer: o.customer?.fullName || '—',
      packageName: o.package?.name || '—',
      status: o.status,
      channel: o.channel,
      totalCents: o.totalCents,
      createdAt: o.createdAt,
    }));

    return {
      kpis: {
        revenueTotalCents: revenue,
        revenueThisMonthCents: revenueThisMonth,
        waRevenueCents: waRevenue,
        avgTicketCents: avgTicket,
        ordersPaid: paid.length,
        ordersTotal: orders.length,
        customersTotal,
        customersThisWeek,
        packagesActive,
        conversations,
        openConversations,
        unreadTotal: unreadAgg._sum.unreadCount || 0,
      },
      salesByDay,
      topPackages,
      recentActivity,
    };
  }
}

@Controller('dashboard')
@UseGuards(AuthGuard('jwt'))
class DashboardController {
  constructor(private readonly svc: DashboardService) {}
  @Get('stats') stats() { return this.svc.stats(); }
}

@Module({
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
