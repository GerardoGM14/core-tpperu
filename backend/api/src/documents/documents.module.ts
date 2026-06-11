import { Module, Body, Controller, Delete, Get, Injectable, NotFoundException, Param, Patch, Post, Res, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Response } from 'express';
import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';
import { DocumentKind } from '@prisma/client';
import { createHash } from 'crypto';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { PrismaService } from '../shared/prisma.service';

// Carpeta donde se guardan los archivos subidos de documentos.
const UPLOADS_DIR = join(process.cwd(), 'uploads', 'documents');

class CreateDocumentDto {
  @IsString() code: string;
  @IsString() name: string;
  @IsOptional() @IsEnum(DocumentKind) kind?: DocumentKind;
  @IsOptional() @IsString() packageId?: string;
  @IsString() fileUrl: string;
  @IsOptional() fileSize?: number;
  @IsOptional() @IsString() mimeType?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}
class UpdateDocumentDto extends CreateDocumentDto {}

class UploadDocumentDto {
  @IsString() data: string;       // base64
  @IsString() mime: string;
  @IsString() filename: string;
}

@Injectable()
class DocumentsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Guarda un archivo subido (base64) en disco y devuelve su URL servible. */
  async saveUpload(dto: UploadDocumentDto) {
    const buffer = Buffer.from(dto.data, 'base64');
    await mkdir(UPLOADS_DIR, { recursive: true });
    // nombre estable por contenido + extensión del filename original
    const hash = createHash('sha256').update(buffer).digest('hex').slice(0, 24);
    const ext = (dto.filename.match(/\.[a-z0-9]+$/i)?.[0] || '').toLowerCase();
    const name = hash + ext;
    await writeFile(join(UPLOADS_DIR, name), buffer);
    return {
      fileUrl: `/api/documents/file/${name}`,
      fileSize: buffer.length,
      mimeType: dto.mime,
    };
  }

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
class DocumentsController {
  constructor(private readonly svc: DocumentsService) {}

  // Servir un archivo subido. SIN auth: nombre = hash impredecible (capability url),
  // y así WhatsApp puede descargarlo para enviarlo.
  @Get('file/:name')
  serveFile(@Param('name') name: string, @Res() res: Response) {
    const safe = name.replace(/[^a-zA-Z0-9._-]/g, '');
    return res.sendFile(join(UPLOADS_DIR, safe), (err: any) => {
      if (err) res.status(404).send('not found');
    });
  }

  @Post('upload')
  @UseGuards(AuthGuard('jwt'))
  upload(@Body() dto: UploadDocumentDto) { return this.svc.saveUpload(dto); }

  @Get() @UseGuards(AuthGuard('jwt')) findAll() { return this.svc.findAll(); }
  @Get(':id') @UseGuards(AuthGuard('jwt')) findOne(@Param('id') id: string) { return this.svc.findOne(id); }
  @Post() @UseGuards(AuthGuard('jwt')) create(@Body() dto: CreateDocumentDto) { return this.svc.create(dto); }
  @Patch(':id') @UseGuards(AuthGuard('jwt')) update(@Param('id') id: string, @Body() dto: UpdateDocumentDto) { return this.svc.update(id, dto); }
  @Delete(':id') @UseGuards(AuthGuard('jwt')) remove(@Param('id') id: string) { return this.svc.remove(id); }
}

@Module({ controllers: [DocumentsController], providers: [DocumentsService] })
export class DocumentsModule {}
