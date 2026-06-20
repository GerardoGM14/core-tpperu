import { Module } from '@nestjs/common';
import { PublicController } from './public.controller';
import { PublicService } from './public.service';
import { WhatsappBridgeModule } from '../whatsapp-bridge/whatsapp-bridge.module';
import { EmailModule } from '../email/email.module';
import { FlowsModule } from '../flows/flows.module';

@Module({
  imports: [WhatsappBridgeModule, EmailModule, FlowsModule],
  controllers: [PublicController],
  providers: [PublicService],
})
export class PublicModule {}
