import { Controller, Get, Post, Param, Res, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Response } from 'express';
import { WhatsappBridgeService } from './whatsapp-bridge.service';

@Controller('whatsapp')
export class WhatsappBridgeController {
  constructor(private readonly bridge: WhatsappBridgeService) {}

  @Post('connect') @UseGuards(AuthGuard('jwt')) connect() { return this.bridge.connect(); }
  @Post('disconnect') @UseGuards(AuthGuard('jwt')) disconnect() { return this.bridge.disconnect(); }
  @Get('status') @UseGuards(AuthGuard('jwt')) status() { return this.bridge.status(); }

  // Proxy de media del daemon. Sin guard para que <img src> funcione directo;
  // el nombre de archivo es un hash impredecible (capability URL).
  @Get('media/:file')
  async media(@Param('file') file: string, @Res() res: Response) {
    const { buffer, contentType } = await this.bridge.fetchMedia(`/media/${file}`);
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'private, max-age=86400');
    res.send(buffer);
  }
}
