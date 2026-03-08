import { Module } from '@nestjs/common';
import { ConfigModule } from './config/config.module';
import { CosmosModule } from './cosmos/cosmos.module';
import { HealthModule } from './health/health.module';
import { MediaModule } from './media/media.module';

@Module({
  imports: [
    ConfigModule,
    CosmosModule,
    HealthModule,
    MediaModule,
  ],
})
export class AppModule {}
