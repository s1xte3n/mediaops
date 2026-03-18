import { Module } from '@nestjs/common';
import { EventBridgeController } from './eventbridge.controller';
import { EventBridgeService } from './eventbridge.service';

@Module({
    controllers: [EventBridgeController],
    providers: [EventBridgeService],
})
export class EventBridgeModule {}