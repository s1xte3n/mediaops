import {
    Injectable,
    Logger,
    NotFoundException,
    ConflictException,
    PayloadTooLargeException,
} from '@nestjs/common';
import { CosmosService } from '../cosmos/cosmos.service';
import { StorageService } from 'src/storage/storage.service';
import { CreateMediaDto } from './dto/create-media-dto';
import { MediaItem } from './media.types';
import { v4 as uuidv4 } from 'uuid';

const MAX_BYTES = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = [
    'image/png',
    'image/jpeg',
    'image/gif',
    'image/webp',
    'application/json'
];

@Injectable()
export class MediaService {
    private readonly logger = new Logger(MediaService.name);

    constructor(
        private readonly cosmos: CosmosService,
        private readonly storage: StorageService,
    ) { }

    async create(dto: CreateMediaDto, ownerId: string): Promise<MediaItem> {
        const id = uuidv4();
        const now = new Date().toISOString();

        const item: MediaItem = {
            id,
            ownerId,
            filename: dto.filename,
            contentType: dto.contentType,
            rawBlobPath: null,
            thumbBlobPath: null,
            status: 'Created',
            tags: [],
            sha256: null,
            createdAt: now,
            processedAt: null,
            error: null,
            attempt: 0,
        };

        await this.cosmos.getContainer().items.create(item);
        this.logger.log({ message: 'Media item created', mediaId: id, ownerId });

        return item;
    }

    async uploadContent(
        id: string,
        ownerId: string,
        file: Express.Multer.File,
    ): Promise<MediaItem> {
        // 1. Load existing record
        const item = await this.findById(id, ownerId);

        // 2. Guard: already uploaded
        if (item.status !== 'Created') {
            throw new ConflictException(
                `Item is already in status ${item.status}. Cannot re-upload.`,
            );
        }

        // 3. Guard: file size
        if (file.size > MAX_BYTES) {
            throw new PayloadTooLargeException(
                `File exceeds maximum size of ${MAX_BYTES} bytes`,
            );
        }

        // 4. Guard content type
        if (!ALLOWED_TYPES.includes(file.mimetype)) {
            throw new ConflictException(
                `Unsupported content type: ${file.mimetype}`,
            );
        }

        // 5. Build blob path
        const blobPath = `raw/${ownerId}/${id}/${file.originalname}`;

        // 6. Upload to Blob Storage
        await this.storage.uploadBuffer(
            'raw',
            blobPath,
            file.buffer,
            file.mimetype,
        );

        // 7. Update Cosmos record
        const now = new Date().toISOString();
        const updated: MediaItem = {
            ...item,
            status: 'Uploaded',
            rawBlobPath: blobPath,
            createdAt: item.createdAt ?? now,
        };

        await this.cosmos.getContainer().items.upsert(updated);

        this.logger.log({
            message: 'Media content uploaded',
            mediaId: id,
            ownerId,
            blobPath,
        });

        return updated;
    }

    async findById(id: string, ownerId: string): Promise<MediaItem> {
        const { resource } = await this.cosmos
            .getContainer()
            .item(id, ownerId)
            .read<MediaItem>();

        if (!resource) {
            throw new NotFoundException(`Media item ${id} not found`);
        }

        return resource;
    }

    async list(
        ownerId: string,
        limit = 20,
        continuation?: string,
    ): Promise<{ items: MediaItem[]; nextCursor: string | null }> {
        const querySpec = {
            query: 'SELECT * FROM c WHERE c.ownerId = @ownerId ORDER BY c.createdAt DESC OFFSET 0 LIMIT @limit',
            parameters: [
                { name: '@ownerId', value: ownerId },
                { name: '@limit', value: limit },
            ],
        };

        const response = await this.cosmos
            .getContainer()
            .items.query<MediaItem>(querySpec, {
                maxItemCount: limit,
                continuationToken: continuation,
            })
            .fetchNext();

        return {
            items: response.resources,
            nextCursor: response.continuationToken ?? null,
        };
    }
}
