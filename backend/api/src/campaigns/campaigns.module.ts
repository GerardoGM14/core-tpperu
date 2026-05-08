import { Module, Body, Controller, Delete, Get, Injectable, NotFoundException, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { IsDateString, IsEnum, IsObject, IsOptional, IsString } from 'class-validator';
import { CampaignStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../shared/prisma.service';

class CreateCampaignDto {
  @IsString() name: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() templateId?: string;
  @IsOptional() @IsEnum(CampaignStatus) status?: CampaignStatus;
  @IsOptional() @IsDateString() scheduledAt?: string;
  @IsOptional() @IsObject() audience?: Record<string, unknown>;
}
class UpdateCampaignDto extends CreateCampaignDto {}

@Injectable()
class CampaignsService {
  constructor(private readonly prisma: PrismaService) {}
  findAll() { return this.prisma.campaign.findMany({ orderBy: { createdAt: 'desc' } }); }
  async findOne(id: string) {
    const c = await this.prisma.campaign.findUnique({ where: { id } });
    if (!c) throw new NotFoundException();
    return c;
  }
  create(dto: CreateCampaignDto) {
    const { scheduledAt, audience, ...rest } = dto;
    return this.prisma.campaign.create({
      data: {
        ...rest,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        audience: audience as Prisma.InputJsonValue,
      },
    });
  }
  async update(id: string, dto: UpdateCampaignDto) {
    await this.findOne(id);
    const { scheduledAt, audience, ...rest } = dto;
    return this.prisma.campaign.update({
      where: { id },
      data: {
        ...rest,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
        audience: audience as Prisma.InputJsonValue,
      },
    });
  }
  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.campaign.delete({ where: { id } });
  }
}

@Controller('campaigns')
@UseGuards(AuthGuard('jwt'))
class CampaignsController {
  constructor(private readonly svc: CampaignsService) {}
  @Get() findAll() { return this.svc.findAll(); }
  @Get(':id') findOne(@Param('id') id: string) { return this.svc.findOne(id); }
  @Post() create(@Body() dto: CreateCampaignDto) { return this.svc.create(dto); }
  @Patch(':id') update(@Param('id') id: string, @Body() dto: UpdateCampaignDto) { return this.svc.update(id, dto); }
  @Delete(':id') remove(@Param('id') id: string) { return this.svc.remove(id); }
}

@Module({ controllers: [CampaignsController], providers: [CampaignsService] })
export class CampaignsModule {}
