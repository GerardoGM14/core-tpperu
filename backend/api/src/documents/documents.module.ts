import { Module, Body, Controller, Delete, Get, Injectable, NotFoundException, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString } from 'class-validator';
import { DocumentKind } from '@prisma/client';
import { PrismaService } from '../shared/prisma.service';

class CreateDocumentDto {
  @IsString() code: string;
  @IsString() name: string;
  @IsOptional() @IsEnum(DocumentKind) kind?: DocumentKind;
  @IsOptional() @IsString() packageId?: string;
  @IsString() fileUrl: string;
  @IsOptional() @IsInt() fileSize?: number;
  @IsOptional() @IsString() mimeType?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}
class UpdateDocumentDto extends CreateDocumentDto {}

@Injectable()
class DocumentsService {
  constructor(private readonly prisma: PrismaService) {}
  findAll() { return this.prisma.document.findMany({ orderBy: { createdAt: 'desc' } }); }
  async findOne(id: string) {
    const d = await this.prisma.document.findUnique({ where: { id } });
    if (!d) throw new NotFoundException();
    return d;
  }
  create(dto: CreateDocumentDto) { return this.prisma.document.create({ data: dto }); }
  async update(id: string, dto: UpdateDocumentDto) {
    await this.findOne(id);
    return this.prisma.document.update({ where: { id }, data: dto });
  }
  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.document.delete({ where: { id } });
  }
}

@Controller('documents')
@UseGuards(AuthGuard('jwt'))
class DocumentsController {
  constructor(private readonly svc: DocumentsService) {}
  @Get() findAll() { return this.svc.findAll(); }
  @Get(':id') findOne(@Param('id') id: string) { return this.svc.findOne(id); }
  @Post() create(@Body() dto: CreateDocumentDto) { return this.svc.create(dto); }
  @Patch(':id') update(@Param('id') id: string, @Body() dto: UpdateDocumentDto) { return this.svc.update(id, dto); }
  @Delete(':id') remove(@Param('id') id: string) { return this.svc.remove(id); }
}

@Module({ controllers: [DocumentsController], providers: [DocumentsService] })
export class DocumentsModule {}
