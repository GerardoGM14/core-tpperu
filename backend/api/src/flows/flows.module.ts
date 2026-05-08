import { Module, Body, Controller, Delete, Get, Injectable, NotFoundException, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { IsEnum, IsObject, IsOptional, IsString } from 'class-validator';
import { FlowStatus, FlowTriggerType, Prisma } from '@prisma/client';
import { PrismaService } from '../shared/prisma.service';

class CreateFlowDto {
  @IsString() code: string;
  @IsString() name: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsEnum(FlowStatus) status?: FlowStatus;
  @IsEnum(FlowTriggerType) triggerType: FlowTriggerType;
  @IsOptional() @IsObject() triggerConfig?: Record<string, unknown>;
}
class UpdateFlowDto extends CreateFlowDto {}

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
}

@Controller('flows')
@UseGuards(AuthGuard('jwt'))
class FlowsController {
  constructor(private readonly svc: FlowsService) {}
  @Get() findAll() { return this.svc.findAll(); }
  @Get(':id') findOne(@Param('id') id: string) { return this.svc.findOne(id); }
  @Post() create(@Body() dto: CreateFlowDto) { return this.svc.create(dto); }
  @Patch(':id') update(@Param('id') id: string, @Body() dto: UpdateFlowDto) { return this.svc.update(id, dto); }
  @Delete(':id') remove(@Param('id') id: string) { return this.svc.remove(id); }
}

@Module({ controllers: [FlowsController], providers: [FlowsService] })
export class FlowsModule {}
