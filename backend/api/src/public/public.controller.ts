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

class SubmitVoucherDto {
  @IsString() @MinLength(2)
  name: string;

  @IsString() @MinLength(6)
  phone: string;

  // 'yape' | 'transferencia'
  @IsString()
  method: string;

  // Imagen del comprobante en data URL base64 (data:image/...;base64,...)
  @IsString() @MinLength(20)
  voucherBase64: string;

  // Resumen del pedido (texto) y total mostrado.
  @IsOptional() @IsString()
  orderSummary?: string;

  @IsOptional() @IsString()
  total?: string;
}

class ConfirmReservationDto {
  @IsString() @MinLength(2)
  name: string;

  @IsString() @MinLength(6)
  phone: string;

  @IsString()
  email: string;

  @IsOptional() @IsString()
  document?: string;

  @IsOptional() @IsString()
  comments?: string;

  @IsOptional() @IsString()
  orderSummary?: string;

  @IsOptional() @IsString()
  total?: string;

  // Comprobante opcional (si lo subió antes). Data URL base64.
  @IsOptional() @IsString()
  voucherBase64?: string;
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

  @Post('voucher')
  async submitVoucher(@Body() dto: SubmitVoucherDto) {
    try {
      return await this.svc.submitVoucher(dto);
    } catch (err) {
      throw new BadRequestException((err as Error).message);
    }
  }

  @Post('reservation')
  async confirmReservation(@Body() dto: ConfirmReservationDto) {
    try {
      return await this.svc.confirmReservation(dto);
    } catch (err) {
      throw new BadRequestException((err as Error).message);
    }
  }
}
