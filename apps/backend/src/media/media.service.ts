import {
    Injectable,
    Logger,
    NotFoundException,
} from '@nestjs/common';
import { CosmosService } from '../cosmos/cosmos.service';
import { CreateMediaDto } from './dto/create-media-dto';
import { MediaItem } from './media.types';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class MediaService {
    private readonly logger = new Logger(MediaService.name);

    constructor(private readonly cosmos: CosmosService) {}

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
        limit= 20,
        continuation?: string,
    ): Promise<{items: MediaItem[]; nextCursor: string | null }> {
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
