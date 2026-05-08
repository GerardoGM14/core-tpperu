import { Module, Body, Controller, Delete, Get, Injectable, NotFoundException, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { IsArray, IsEnum, IsOptional, IsString } from 'class-validator';
import { TemplateStatus } from '@prisma/client';
import { PrismaService } from '../shared/prisma.service';

class CreateTemplateDto {
  @IsString() code: string;
  @IsString() name: string;
  @IsString() body: string;
  @IsOptional() @IsArray() @IsString({ each: true }) variables?: string[];
  @IsOptional() @IsString() language?: string;
  @IsOptional() @IsEnum(TemplateStatus) status?: TemplateStatus;
}
class UpdateTemplateDto extends CreateTemplateDto {}

@Injectable()
class TemplatesService {
  constructor(private readonly prisma: PrismaService) {}
  findAll() { return this.prisma.template.findMany({ orderBy: { createdAt: 'desc' } }); }
  async findOne(id: string) {
    const t = await this.prisma.template.findUnique({ where: { id } });
    if (!t) throw new NotFoundException();
    return t;
  }
  create(dto: CreateTemplateDto) { return this.prisma.template.create({ data: dto }); }
  async update(id: string, dto: UpdateTemplateDto) {
    await this.findOne(id);
    return this.prisma.template.update({ where: { id }, data: dto });
  }
  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.template.delete({ where: { id } });
  }
}

@Controller('templates')
@UseGuards(AuthGuard('jwt'))
class TemplatesController {
  constructor(private readonly svc: TemplatesService) {}
  @Get() findAll() { return this.svc.findAll(); }
  @Get(':id') findOne(@Param('id') id: string) { return this.svc.findOne(id); }
  @Post() create(@Body() dto: CreateTemplateDto) { return this.svc.create(dto); }
  @Patch(':id') update(@Param('id') id: string, @Body() dto: UpdateTemplateDto) { return this.svc.update(id, dto); }
  @Delete(':id') remove(@Param('id') id: string) { return this.svc.remove(id); }
}

@Module({ controllers: [TemplatesController], providers: [TemplatesService] })
export class TemplatesModule {}
