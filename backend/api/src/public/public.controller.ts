import { BadRequestException, Body, Controller, Get, NotFoundException, Param, Post } from '@nestjs/common';
import { IsOptional, IsString, MinLength } from 'class-validator';
import { PublicService } from './public.service';

class CreateLeadDto {
  @IsString() @MinLength(2)
  name: string;

  @IsString() @MinLength(6)
  phone: string;

  @IsOptional() @IsString()
  message?: string;

  @IsOptional() @IsString()
  packageSlug?: string;
}

// Endpoints PÚBLICOS (sin auth) que consume la landing Astro.
@Controller('public')
export class PublicController {
  constructor(private readonly svc: PublicService) {}

  @Get('packages')
  packages() {
    return this.svc.listPackages();
  }

  @Get('packages/:slug')
  async packageBySlug(@Param('slug') slug: string) {
    const pkg = await this.svc.getPackageBySlug(slug);
    if (!pkg) throw new NotFoundException('Paquete no encontrado');
    return pkg;
  }

  @Post('leads')
  async createLead(@Body() dto: CreateLeadDto) {
    try {
      return await this.svc.createLead(dto);
    } catch (err) {
      throw new BadRequestException((err as Error).message);
    }
  }
}
