import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import {
    BlobServiceClient,
    BlockBlobClient,
} from '@azure/storage-blob';
import { ConfigService } from '../config/config.service';

@Injectable()
export class StorageService implements OnModuleInit {
    private readonly logger = new Logger(StorageService.name);
    private blobServiceClient!: BlobServiceClient;

    constructor(private readonly config: ConfigService) {}

    async onModuleInit() {
        this.blobServiceClient = BlobServiceClient.fromConnectionString(
            this.config.get('storageConnectionString'),
        );
        this.logger.log('Blob Storage client initialized');
    }

    getBlobClient(container: string, blobPath: string): BlockBlobClient {
        return this.blobServiceClient
            .getContainerClient(container)
            .getBlockBlobClient(blobPath);
    }

    async uploadBuffer(
        container: string,
        blobPath: string,
        buffer: Buffer,
        contextType: string,
    ): Promise<string> {
        const client = this.getBlobClient(container, blobPath);

        await client.uploadData(buffer, {
            blobHTTPHeaders: { blobContentType: contextType },
        });

        this.logger.log({ message: 'Blob uploaded', container, blobPath });
        return blobPath;
    }
}
