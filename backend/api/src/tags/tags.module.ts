import { Module, Body, Controller, Delete, Get, Injectable, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { IsString, MinLength } from 'class-validator';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../shared/prisma.service';

// Clave del maestro de etiquetas en Setting.
const TAGS_KEY = 'customer.tags';

// Normaliza una etiqueta: minúsculas, sin espacios extra, espacios → guiones.
function normalizeTag(raw: string): string {
  return (raw || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\-_áéíóúñ]/gi, '')
    .slice(0, 40);
}

class CreateTagDto {
  @IsString() @MinLength(2) tag: string;
}
class RenameTagDto {
  @IsString() @MinLength(2) to: string;
}

@Injectable()
class TagsService {
  constructor(private readonly prisma: PrismaService) {}

  // Lee la lista maestra de etiquetas guardada (puede estar vacía la 1ª vez).
  private async masterList(): Promise<string[]> {
    const row = await this.prisma.setting.findUnique({ where: { key: TAGS_KEY } });
    const value = (row?.value as { tags?: string[] }) || {};
    return Array.isArray(value.tags) ? value.tags : [];
  }

  private async saveMaster(tags: string[]) {
    const unique = [...new Set(tags.map(normalizeTag).filter(Boolean))].sort();
    await this.prisma.setting.upsert({
      where: { key: TAGS_KEY },
      update: { value: { tags: unique } as Prisma.InputJsonValue },
      create: { key: TAGS_KEY, value: { tags: unique } as Prisma.InputJsonValue },
    });
    return unique;
  }

  // Conteo de clientes por etiqueta (de las etiquetas reales en Customer).
  private async tagCounts(): Promise<Map<string, number>> {
    const customers = await this.prisma.customer.findMany({ select: { tags: true } });
    const counts = new Map<string, number>();
    for (const c of customers) for (const t of c.tags) counts.set(t, (counts.get(t) || 0) + 1);
    return counts;
  }

  /**
   * Lista de etiquetas para los filtros: une el maestro + las que ya usan los
   * clientes (aunque no estén en el maestro), cada una con su conteo.
   */
  async list() {
    const [master, counts] = await Promise.all([this.masterList(), this.tagCounts()]);
    const all = new Set<string>([...master, ...counts.keys()]);
    return [...all]
      .map((tag) => ({ tag, count: counts.get(tag) || 0, inMaster: master.includes(tag) }))
      .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
  }

  // Agrega una etiqueta al maestro.
  async create(raw: string) {
    const tag = normalizeTag(raw);
    if (!tag) throw new Error('Etiqueta inválida');
    const master = await this.masterList();
    if (!master.includes(tag)) master.push(tag);
    await this.saveMaster(master);
    return this.list();
  }

  // Renombra una etiqueta en el maestro Y en todos los clientes que la tengan.
  async rename(from: string, toRaw: string) {
    const to = normalizeTag(toRaw);
    if (!to) throw new Error('Nombre nuevo inválido');
    // 1) Maestro
    const master = (await this.masterList()).map((t) => (t === from ? to : t));
    await this.saveMaster(master);
    // 2) Clientes que tengan la etiqueta vieja
    const customers = await this.prisma.customer.findMany({ where: { tags: { has: from } }, select: { id: true, tags: true } });
    for (const c of customers) {
      const next = [...new Set(c.tags.map((t) => (t === from ? to : t)))];
      await this.prisma.customer.update({ where: { id: c.id }, data: { tags: next } });
    }
    return this.list();
  }

  /**
   * Quita una etiqueta del maestro. Si removeFromCustomers es true, también la
   * borra de todos los clientes que la tengan.
   */
  async remove(tag: string, removeFromCustomers: boolean) {
    const master = (await this.masterList()).filter((t) => t !== tag);
    await this.saveMaster(master);
    if (removeFromCustomers) {
      const customers = await this.prisma.customer.findMany({ where: { tags: { has: tag } }, select: { id: true, tags: true } });
      for (const c of customers) {
        await this.prisma.customer.update({ where: { id: c.id }, data: { tags: c.tags.filter((t) => t !== tag) } });
      }
    }
    return this.list();
  }
}

@Controller('tags')
@UseGuards(AuthGuard('jwt'))
class TagsController {
  constructor(private readonly svc: TagsService) {}
  @Get() list() { return this.svc.list(); }
  @Post() create(@Body() dto: CreateTagDto) { return this.svc.create(dto.tag); }
  @Patch(':tag') rename(@Param('tag') tag: string, @Body() dto: RenameTagDto) { return this.svc.rename(tag, dto.to); }
  // ?withCustomers=1 también la quita de los clientes.
  @Delete(':tag') remove(@Param('tag') tag: string, @Body() body: { removeFromCustomers?: boolean }) {
    return this.svc.remove(tag, !!body?.removeFromCustomers);
  }
}

@Module({ controllers: [TagsController], providers: [TagsService] })
export class TagsModule {}
