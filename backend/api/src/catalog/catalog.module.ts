import { PartialType } from '@nestjs/mapped-types';
import { Module } from '@nestjs/common';
import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards, Injectable, NotFoundException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { IsArray, IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { PackageStatus } from '@prisma/client';
import { PrismaService } from '../shared/prisma.service';

class CreatePackageDto {
  @IsString() code: string;
  @IsString() name: string;
  @IsString() destination: string;
  @IsOptional() @IsString() slug?: string;
  @IsOptional() @IsString() category?: string;
  @IsOptional() @IsString() description?: string;
  @IsInt() @Min(1) durationDays: number;
  @IsInt() @Min(0) durationNights: number;
  @IsInt() @Min(0) priceCents: number;
  @IsOptional() @IsInt() @Min(0) priceBeforeCents?: number;
  @IsOptional() @IsString() discountLabel?: string;
  @IsOptional() @IsString() tag?: string;
  @IsOptional() @IsString() currency?: string;
  @IsOptional() @IsString() imageUrl?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) gallery?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) includes?: string[];
  @IsOptional() @IsEnum(PackageStatus) status?: PackageStatus;
}
class UpdatePackageDto extends PartialType(CreatePackageDto) {}

@Injectable()
class CatalogService {
  constructor(private readonly prisma: PrismaService) {}
  findAll() { return this.prisma.package.findMany({ orderBy: { createdAt: 'desc' } }); }
  async findOne(id: string) {
    const p = await this.prisma.package.findUnique({ where: { id } });
    if (!p) throw new NotFoundException();
    return p;
  }
  create(dto: CreatePackageDto) { return this.prisma.package.create({ data: dto }); }
  async update(id: string, dto: UpdatePackageDto) {
    await this.findOne(id);
    return this.prisma.package.update({ where: { id }, data: dto });
  }
  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.package.delete({ where: { id } });
  }
}

@Controller('packages')
@UseGuards(AuthGuard('jwt'))
class CatalogController {
  constructor(private readonly svc: CatalogService) {}
  @Get() findAll() { return this.svc.findAll(); }
  @Get(':id') findOne(@Param('id') id: string) { return this.svc.findOne(id); }
  @Post() create(@Body() dto: CreatePackageDto) { return this.svc.create(dto); }
  @Patch(':id') update(@Param('id') id: string, @Body() dto: UpdatePackageDto) { return this.svc.update(id, dto); }
  @Delete(':id') remove(@Param('id') id: string) { return this.svc.remove(id); }
}

@Module({
  controllers: [CatalogController],
  providers: [CatalogService],
  exports: [CatalogService],
})
export class CatalogModule {}
