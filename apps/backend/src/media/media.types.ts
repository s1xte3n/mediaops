export type MediaStatus =
    | 'Created'
    | 'Uploaded'
    | 'Processing'
    | 'Failed';

export interface MediaItem {
    id: string;
    ownerId: string;
    filename: string;
    contentType: string;
    rawBlobPath: string | null;
    thumbBlobPath: string | null;
    status: MediaStatus;
    tags: string[];
    sha256: string | null;
    createdAt: string;
    processedAt: string | null;
    error: string | null;
    attempt: number;
}
