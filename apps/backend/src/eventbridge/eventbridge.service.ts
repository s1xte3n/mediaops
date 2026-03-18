import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { QueueServiceClient } from '@azure/storage-queue';
import { ConfigService } from '../config/config.service';
import { v4 as uuidv4 } from 'uuid';

export interface QueueMessage {
    v: number;
    correlationId: string;
    mediaId: string;
    ownerId: string;
    rawBlobPath: string;
    contentType: string;
    enqueuedAt: string;
    attempt: number;
}

@Injectable()
export class EventBridgeService {
    private readonly logger = new Logger(EventBridgeService.name);
    private queueClient: QueueServiceClient;

    constructor(private readonly config: ConfigService) {}

    onModuleInit() {
        this.queueClient = QueueServiceClient.fromConnectionString(
            this.config.get('storageConnectionString'),
        );
        this.logger.log('Queue client initialized');
    }

    async enqueue(message: QueueMessage): Promise<void> {
        const queue = this.queueClient.getQueueClient('process-queue');

        // Queue messages must be base64 encoded
        const encoded = Buffer.from(JSON.stringify(message)).toString('base64');
        await queue.sendMessage(encoded);

        this.logger.log({
            message: 'Enqueued procesing message',
            mediaId: message.mediaId,
            correlationId: message.correlationId,
        });
    }

    parseBlobPath(blobUrl: string): {
        ownerId: string;
        mediaId: string;
        filename: string;
        rawBlobPath: string;
    } | null {
        // URL format https://<account>.blob.core.windows.net/raw/<ownerId>/<mediaId>/<filename>
        try {
            const url = new URL(blobUrl);
            const parts = url.pathname.split('/').filter(Boolean);
            // parts: ['raw', '<ownerId>', '<mediaId>', '<filename>']
            if (parts.length < 4 || parts[0] !== 'raw') return null;

            return {
                ownerId: parts[1],
                mediaId: parts[2],
                filename: parts[3],
                rawBlobPath: parts.slice(0).join('/')
            };
        } catch {
            return null;
        }
    }
}
