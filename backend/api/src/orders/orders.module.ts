import { Module } from '@nestjs/common';
import { Body, Controller, Delete, Get, Injectable, NotFoundException, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { IsDateString, IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { OrderChannel, OrderStatus } from '@prisma/client';
import { PrismaService } from '../shared/prisma.service';

class CreateOrderDto {
  @IsString() code: string;
  @IsString() customerId: string;
  @IsString() packageId: string;
  @IsOptional() @IsEnum(OrderStatus) status?: OrderStatus;
  @IsOptional() @IsEnum(OrderChannel) channel?: OrderChannel;
  @IsOptional() @IsDateString() travelDate?: string;
  @IsOptional() @IsInt() @Min(1) pax?: number;
  @IsInt() @Min(0) totalCents: number;
  @IsOptional() @IsInt() @Min(0) paidCents?: number;
  @IsOptional() @IsString() notes?: string;
}
// Update parcial: TODOS los campos opcionales (un PATCH no exige reenviar todo).
class UpdateOrderDto {
  @IsOptional() @IsString() code?: string;
  @IsOptional() @IsString() customerId?: string;
  @IsOptional() @IsString() packageId?: string;
  @IsOptional() @IsEnum(OrderStatus) status?: OrderStatus;
  @IsOptional() @IsEnum(OrderChannel) channel?: OrderChannel;
  @IsOptional() @IsDateString() travelDate?: string;
  @IsOptional() @IsInt() @Min(1) pax?: number;
  @IsOptional() @IsInt() @Min(0) totalCents?: number;
  @IsOptional() @IsInt() @Min(0) paidCents?: number;
  @IsOptional() @IsString() notes?: string;
}

@Injectable()
class OrdersService {
  constructor(private readonly prisma: PrismaService) {}
  findAll() {
    return this.prisma.order.findMany({
      include: { customer: true, package: true },
      orderBy: { createdAt: 'desc' },
    });
  }
  async findOne(id: string) {
    const o = await this.prisma.order.findUnique({
      where: { id },
      include: { customer: true, package: true, payments: true },
    });
    if (!o) throw new NotFoundException();
    return o;
  }
  create(dto: CreateOrderDto) {
    const { travelDate, ...rest } = dto;
    return this.prisma.order.create({
      data: { ...rest, travelDate: travelDate ? new Date(travelDate) : null },
    });
  }
  async update(id: string, dto: UpdateOrderDto) {
    await this.findOne(id);
    const { travelDate, ...rest } = dto;
    return this.prisma.order.update({
      where: { id },
      data: { ...rest, travelDate: travelDate ? new Date(travelDate) : undefined },
    });
  }
  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.order.delete({ where: { id } });
  }
}

@Controller('orders')
@UseGuards(AuthGuard('jwt'))
class OrdersController {
  constructor(private readonly svc: OrdersService) {}
  @Get() findAll() { return this.svc.findAll(); }
  @Get(':id') findOne(@Param('id') id: string) { return this.svc.findOne(id); }
  @Post() create(@Body() dto: CreateOrderDto) { return this.svc.create(dto); }
  @Patch(':id') update(@Param('id') id: string, @Body() dto: UpdateOrderDto) { return this.svc.update(id, dto); }
  @Delete(':id') remove(@Param('id') id: string) { return this.svc.remove(id); }
}

@Module({
  controllers: [OrdersController],
  providers: [OrdersService],
})
export class OrdersModule {}
