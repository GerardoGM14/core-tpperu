import { PartialType } from '@nestjs/mapped-types';
import { Module, Body, Controller, Delete, Get, Injectable, NotFoundException, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { ReminderStatus } from '@prisma/client';
import { PrismaService } from '../shared/prisma.service';

class CreateReminderDto {
  @IsOptional() @IsString() customerId?: string;
  @IsOptional() @IsString() orderId?: string;
  @IsOptional() @IsString() templateId?: string;
  @IsOptional() @IsString() body?: string;
  @IsDateString() scheduledAt: string;
  @IsOptional() @IsEnum(ReminderStatus) status?: ReminderStatus;
}
class UpdateReminderDto extends PartialType(CreateReminderDto) {}

@Injectable()
class RemindersService {
  constructor(private readonly prisma: PrismaService) {}
  findAll() { return this.prisma.reminder.findMany({ orderBy: { scheduledAt: 'asc' } }); }
  async findOne(id: string) {
    const r = await this.prisma.reminder.findUnique({ where: { id } });
    if (!r) throw new NotFoundException();
    return r;
  }
  create(dto: CreateReminderDto) {
    return this.prisma.reminder.create({
      data: { ...dto, scheduledAt: new Date(dto.scheduledAt) },
    });
  }
  async update(id: string, dto: UpdateReminderDto) {
    await this.findOne(id);
    const { scheduledAt, ...rest } = dto;
    return this.prisma.reminder.update({
      where: { id },
      data: { ...rest, scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined },
    });
  }
  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.reminder.delete({ where: { id } });
  }
}

@Controller('reminders')
@UseGuards(AuthGuard('jwt'))
class RemindersController {
  constructor(private readonly svc: RemindersService) {}
  @Get() findAll() { return this.svc.findAll(); }
  @Get(':id') findOne(@Param('id') id: string) { return this.svc.findOne(id); }
  @Post() create(@Body() dto: CreateReminderDto) { return this.svc.create(dto); }
  @Patch(':id') update(@Param('id') id: string, @Body() dto: UpdateReminderDto) { return this.svc.update(id, dto); }
  @Delete(':id') remove(@Param('id') id: string) { return this.svc.remove(id); }
}

@Module({ controllers: [RemindersController], providers: [RemindersService] })
export class RemindersModule {}
