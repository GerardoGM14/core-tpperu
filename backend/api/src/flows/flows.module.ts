import { PartialType } from '@nestjs/mapped-types';
import { Module, Body, Controller, Delete, Get, Injectable, NotFoundException, Param, Patch, Post, Put, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { IsArray, IsEnum, IsInt, IsObject, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { FlowNodeType, FlowStatus, FlowTriggerType, Prisma } from '@prisma/client';
import { PrismaService } from '../shared/prisma.service';
import { WhatsappBridgeModule } from '../whatsapp-bridge/whatsapp-bridge.module';
import { FlowEngineService } from './flow-engine.service';

class CreateFlowDto {
  @IsString() code: string;
  @IsString() name: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsEnum(FlowStatus) status?: FlowStatus;
  @IsEnum(FlowTriggerType) triggerType: FlowTriggerType;
  @IsOptional() @IsObject() triggerConfig?: Record<string, unknown>;
}
class UpdateFlowDto extends PartialType(CreateFlowDto) {}

// ---- Canvas: nodos + conexiones del flujo (lo que dibuja el FlowBuilder) ----
class CanvasNodeDto {
  @IsString() key: string;                          // id local del frontend (n1, n2…)
  @IsEnum(FlowNodeType) type: FlowNodeType;
  @IsString() title: string;
  @IsOptional() @IsString() body?: string;
  @IsOptional() @IsObject() config?: Record<string, unknown>;
  @IsInt() posX: number;
  @IsInt() posY: number;
}
class CanvasEdgeDto {
  @IsString() from: string;                         // key del nodo origen
  @IsString() to: string;                           // key del nodo destino
  @IsOptional() @IsString() kind?: string;
}
class SaveCanvasDto {
  @IsArray() @ValidateNested({ each: true }) @Type(() => CanvasNodeDto) nodes: CanvasNodeDto[];
  @IsArray() @ValidateNested({ each: true }) @Type(() => CanvasEdgeDto) edges: CanvasEdgeDto[];
}

@Injectable()
class FlowsService {
  constructor(private readonly prisma: PrismaService) {}
  findAll() {
    return this.prisma.flow.findMany({
      include: { _count: { select: { runs: true, nodes: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }
  async findOne(id: string) {
    const f = await this.prisma.flow.findUnique({
      where: { id },
      include: { nodes: true, edges: true },
    });
    if (!f) throw new NotFoundException();
    return f;
  }
  create(dto: CreateFlowDto) {
    const { triggerConfig, ...rest } = dto;
    return this.prisma.flow.create({
      data: { ...rest, triggerConfig: triggerConfig as Prisma.InputJsonValue },
    });
  }
  async update(id: string, dto: UpdateFlowDto) {
    await this.findOne(id);
    const { triggerConfig, ...rest } = dto;
    return this.prisma.flow.update({
      where: { id },
      data: { ...rest, triggerConfig: triggerConfig as Prisma.InputJsonValue },
    });
  }
  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.flow.delete({ where: { id } });
  }

  // Reemplaza por completo los nodos + edges del flujo (en una transacción).
  // El frontend manda keys locales (n1, n2…); aquí se mapean a ids reales para los edges.
  async saveCanvas(id: string, dto: SaveCanvasDto) {
    await this.findOne(id);
    return this.prisma.$transaction(async (tx) => {
      // 1) Borrar el canvas anterior (edges primero por la FK, luego nodos)
      await tx.flowEdge.deleteMany({ where: { flowId: id } });
      await tx.flowNode.deleteMany({ where: { flowId: id } });

      // 2) Crear nodos nuevos, guardando el mapeo key local → id real
      const keyToId = new Map<string, string>();
      for (const n of dto.nodes) {
        const created = await tx.flowNode.create({
          data: {
            flowId: id,
            type: n.type,
            title: n.title,
            body: n.body ?? null,
            config: n.config as Prisma.InputJsonValue,
            posX: Math.round(n.posX),
            posY: Math.round(n.posY),
          },
        });
        keyToId.set(n.key, created.id);
      }

      // 3) Crear edges resolviendo las keys a ids reales (ignora edges colgantes)
      for (const e of dto.edges) {
        const fromNodeId = keyToId.get(e.from);
        const toNodeId = keyToId.get(e.to);
        if (!fromNodeId || !toNodeId) continue;
        await tx.flowEdge.create({
          data: { flowId: id, fromNodeId, toNodeId, kind: e.kind ?? null },
        });
      }

      // 4) Devolver el flujo con su canvas actualizado
      return tx.flow.findUnique({ where: { id }, include: { nodes: true, edges: true } });
    });
  }
}

@Controller('flows')
@UseGuards(AuthGuard('jwt'))
class FlowsController {
  constructor(private readonly svc: FlowsService) {}
  @Get() findAll() { return this.svc.findAll(); }
  @Get(':id') findOne(@Param('id') id: string) { return this.svc.findOne(id); }
  @Post() create(@Body() dto: CreateFlowDto) { return this.svc.create(dto); }
  @Put(':id/canvas') saveCanvas(@Param('id') id: string, @Body() dto: SaveCanvasDto) { return this.svc.saveCanvas(id, dto); }
  @Patch(':id') update(@Param('id') id: string, @Body() dto: UpdateFlowDto) { return this.svc.update(id, dto); }
  @Delete(':id') remove(@Param('id') id: string) { return this.svc.remove(id); }
}

@Module({
  imports: [WhatsappBridgeModule],
  controllers: [FlowsController],
  providers: [FlowsService, FlowEngineService],
  exports: [FlowEngineService],
})
export class FlowsModule {}
