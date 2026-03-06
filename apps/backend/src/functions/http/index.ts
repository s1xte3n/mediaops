import { AzureHttpAdapter } from '@nestjs/azure-func-http';
import { Context, HttpRequest } from '@azure/functions';
import { createApp } from '../../main';

export default async function(context: Context, req: HttpRequest): Promise<void> {
    await AzureHttpAdapter.handle(createApp, context, req);
}