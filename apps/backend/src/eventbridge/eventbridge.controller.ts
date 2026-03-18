import {
    Controller,
    Post,
    Body,
    Headers,
    HttpCode,
    HttpStatus,
    Logger,
    BadRequestException,
} from '@nestjs/common';
import { EventBridgeService, QueueMessage } from './eventbridge.service';
import { v4 as uuidv4 } from 'uuid';

interface EventGridEvent {
    id: string;
    eventType: string;
    subject: string;
    data: {
        url?: string;
        contentType?: string;
    };
    dataVersion: string;
    metadataVersion: string;
    eventTime: string;
    topic: string;
}

@Controller('eventbridge')
export class EventBridgeController {
    private readonly logger = new Logger(EventBridgeController.name);

    constructor(private readonly eventBridge: EventBridgeService) {}

    @Post('blob')
    @HttpCode(HttpStatus.OK)
    async handleBlobEvent(
        @Headers('aeg-event-type') eventType: string,
        @Body() body: EventGridEvent[] | { validationCode: string },
    ) {
        // Handle Event Grid subscription validation handshake
        if (eventType === 'SubscriptionValidation') {
            const validationBody = body as { validationCode: string };
            this.logger.log('Event Grid subscription validation handshake');
            return { validationResponse: validationBody.validationCode };
        }

        // Handle actual events
        const events = body as EventGridEvent[];

        for (const event of events) {
            if (event.eventType !== 'Microsoft.Storage.BlobCreated') {
                this.logger.log(`Skipping event type: ${event.eventType}`);
                continue;
            }

            const blobUrl = event.data?.url;
            if (!blobUrl) {
                this.logger.warn('BlobCreated event missing url in data');
                continue;
            }

            const parsed = this.eventBridge.parseBlobPath(blobUrl);
            if(!parsed) {
                this.logger.warn(`Could not parse blob path from URL: ${blobUrl}`);
                continue;
            }

            const message: QueueMessage = {
                v: 1,
                correlationId: uuidv4(),
                mediaId: parsed.mediaId,
                ownerId: parsed.ownerId,
                rawBlobPath: parsed.rawBlobPath,
                contentType: event.data.contentType ?? 'application/octet-stream',
                enqueuedAt: new Date().toISOString(),
                attempt: 1,
            };

            await this.eventBridge.enqueue(message);
        }

        return { received: true };
    }
}