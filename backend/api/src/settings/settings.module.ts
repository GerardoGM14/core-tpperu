import { Module, Body, Controller, Get, Injectable, Param, Put, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { IsObject } from 'class-validator';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../shared/prisma.service';

// Valores por defecto por clave (lo que ve el panel la primera vez).
const DEFAULTS: Record<string, unknown> = {
  'reminders.pretrip': {
    rules: [
      { id: 'R-48', label: '48 horas antes del tour', when: '-48h', active: true, template: 'WSP_RECORDATORIO_48H' },
      { id: 'R-24', label: '24 horas antes del tour', when: '-24h', active: true, template: 'WSP_RECORDATORIO_24H' },
      { id: 'R-12', label: '12 horas antes del tour', when: '-12h', active: true, template: 'WSP_RECORDATORIO_12H' },
    ],
  },
  'reminders.postservice': {
    trigger: 'Fecha de fin de tour + 48 horas',
    thankYou: '🙏 Hola {nombre}, esperamos que hayas disfrutado *{paquete}*.',
    coupon: { code: 'VUELVE15', label: '15% OFF en próxima compra' },
    reviewUrl: 'https://g.page/tpp-peru/review',
    active: true,
  },
};

class PutSettingDto {
  @IsObject() value: Record<string, unknown>;
}

@Injectable()
class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async get(key: string) {
    const row = await this.prisma.setting.findUnique({ where: { key } });
    return { key, value: row ? row.value : (DEFAULTS[key] ?? {}) };
  }

  async set(key: string, value: Record<string, unknown>) {
    const row = await this.prisma.setting.upsert({
      where: { key },
      update: { value: value as Prisma.InputJsonValue },
      create: { key, value: value as Prisma.InputJsonValue },
    });
    return { key, value: row.value };
  }
}

@Controller('settings')
@UseGuards(AuthGuard('jwt'))
class SettingsController {
  constructor(private readonly svc: SettingsService) {}
  @Get(':key') get(@Param('key') key: string) { return this.svc.get(key); }
  @Put(':key') set(@Param('key') key: string, @Body() dto: PutSettingDto) { return this.svc.set(key, dto.value); }
}

@Module({ controllers: [SettingsController], providers: [SettingsService] })
export class SettingsModule {}
