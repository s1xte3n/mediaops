import { Module } from '@nestjs/common';
import { ConfigModule } from './config/config.module';
import { CosmosModule } from './cosmos/cosmos.module';
import { StorageModule } from './storage/storage.module';
import { HealthModule } from './health/health.module';
import { MediaModule } from './media/media.module';
import { EventBridgeModule } from './eventbridge/eventbridge.module';

@Module({
  imports: [
    ConfigModule,
    CosmosModule,
    StorageModule,
    HealthModule,
    MediaModule,
    EventBridgeModule,
  ],
})
export class AppModule {}
