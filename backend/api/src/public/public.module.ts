import { Module } from '@nestjs/common';
import { PublicController } from './public.controller';
import { PublicService } from './public.service';
import { WhatsappBridgeModule } from '../whatsapp-bridge/whatsapp-bridge.module';

@Module({
  imports: [WhatsappBridgeModule],
  controllers: [PublicController],
  providers: [PublicService],
})
export class PublicModule {}
