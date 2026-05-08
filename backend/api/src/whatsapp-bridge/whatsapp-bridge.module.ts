import { Module } from '@nestjs/common';
import { WhatsappBridgeService } from './whatsapp-bridge.service';
import { WhatsappBridgeController } from './whatsapp-bridge.controller';

@Module({
  providers: [WhatsappBridgeService],
  controllers: [WhatsappBridgeController],
  exports: [WhatsappBridgeService],
})
export class WhatsappBridgeModule {}
