import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { SharedModule } from './shared/shared.module';
import { HealthController } from './common/health.controller';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { CustomersModule } from './customers/customers.module';
import { CatalogModule } from './catalog/catalog.module';
import { OrdersModule } from './orders/orders.module';
import { ConversationsModule } from './conversations/conversations.module';
import { FlowsModule } from './flows/flows.module';
import { CampaignsModule } from './campaigns/campaigns.module';
import { RemindersModule } from './reminders/reminders.module';
import { DocumentsModule } from './documents/documents.module';
import { TemplatesModule } from './templates/templates.module';
import { WhatsappBridgeModule } from './whatsapp-bridge/whatsapp-bridge.module';
import { QueuesModule } from './queues/queues.module';
import { PublicModule } from './public/public.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { ReportsModule } from './reports/reports.module';
import { SettingsModule } from './settings/settings.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    SharedModule,
    AuthModule,
    UsersModule,
    CustomersModule,
    CatalogModule,
    OrdersModule,
    ConversationsModule,
    FlowsModule,
    CampaignsModule,
    RemindersModule,
    DocumentsModule,
    TemplatesModule,
    WhatsappBridgeModule,
    QueuesModule,
    PublicModule,
    DashboardModule,
    ReportsModule,
    SettingsModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
