import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { WhatsappBridgeService } from './whatsapp-bridge.service';

@Controller('whatsapp')
@UseGuards(AuthGuard('jwt'))
export class WhatsappBridgeController {
  constructor(private readonly bridge: WhatsappBridgeService) {}

  @Post('connect') connect() { return this.bridge.connect(); }
  @Post('disconnect') disconnect() { return this.bridge.disconnect(); }
  @Get('status') status() { return this.bridge.status(); }
}
