import { app, HttpRequest, InvocationContext, HttpResponseInit } from '@azure/functions';
import { getApp } from '../../main';
import * as http from 'http';
import { resolve } from 'path';
import { buffer } from 'stream/consumers';

app.http('nestjs', {
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'],
    authLevel: 'anonymous',
    route: '{*segments}',
    handler: async (req: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
        const expressApp = await getApp();

        return new Promise((resolve) => {
            // Convert Azure Functions v4 request to a Node.js IncomingMessage
            const url = new URL(req.url);

            const mockReq = Object.assign(
                new http.IncomingMessage(null as any),
                {
                    method: req.method,
                    url: url.pathname + url.search,
                    headers: Object.fromEntries(req.headers.entries()),
                }
            );

            // Convert Azure Functions v4 response to HttpResponseInit
            const mockRes = new http.ServerResponse(mockReq as any);
            const chunks: Buffer[] = [];

            mockRes.write = (chunk: any) => {
                chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
                return true;
            };

            mockRes.end = (chunk?: any) => {
                if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
                
                const headers: Record<string, string> = {};
                const rawHeaders = mockRes.getHeaders();
                for (const [key, value] of Object.entries(rawHeaders)) {
                    if (value !== undefined) headers[key] = String(value);
                }

                resolve({
                    status: mockRes.statusCode,
                    headers,
                    body: Buffer.concat(chunks),
                });

                return mockRes;
            };

            // Feed request body into the mock request 
            req.arrayBuffer().then((buffer) => {
                if (buffer.byteLength > 0) {
                    mockReq.push(Buffer.from(buffer));
                }
                mockReq.push(null); // signal end of stream
                expressApp(mockReq as any, mockRes as any);
            });
        });
    }
});