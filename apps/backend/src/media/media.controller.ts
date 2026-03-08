import {
    Controller,
    Post,
    Get,
    Param,
    Body,
    Query,
    Headers,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import { MediaService } from './media.service';
import { CreateMediaDto } from './dto/create-media-dto';

function getOwnerIdFromHeaders(headers: Record<string, string>): string {
    // In production, SWA sets x-ms-client-principal with a base64 encoded JSON
    // For local dev we accept a stub header x-dev-owner-id
    const devOwner = headers['x-dev-owner-id'];
    if (devOwner) return devOwner;

    const principal = headers['x-ms-client-principal'];
    if (principal) {
        const decoded = JSON.parse(
            Buffer.from(principal, 'base64').toString('utf8'),
        );
        return decoded.userId ?? decoded.objectidentifier ?? 'annonymous';
    }

    return 'annonymous';
}

@Controller('media')
export class MediaController {
    constructor(private readonly media: MediaService) {}

    @Post()
    @HttpCode(HttpStatus.CREATED)
    async create(
        @Body() dto: CreateMediaDto,
        @Headers() headers: Record<string, string>,
    ) {
        const ownerId = getOwnerIdFromHeaders(headers);
        const item = await this.media.create(dto, ownerId);

        return {
            id: item.id,
            status: item.status,
            rawBlobPath: item.rawBlobPath,
            upload: {
                method: 'PUT',
                url: `/api/media/${item.id}/content`,
                contentType: item.contentType,
                maxBytes: 10 * 1024 * 1024 // 10MB
            },
        };
    }

    @Get()
    async list(
        @Headers() headers: Record<string, string>,
        @Query('limit') limit?: string,
        @Query('cursor') cursor?: string,
    ) {
        const ownerId = getOwnerIdFromHeaders(headers);
        return this.media.list(ownerId, limit ? parseInt(limit) : 20, cursor);
    }

    @Get(':id')
    async findOne(
        @Param('id') id: string,
        @Headers() headers: Record<string, string>,
    ) {
        const ownerId = getOwnerIdFromHeaders(headers);
        return this.media.findById(id, ownerId);
    }
}
