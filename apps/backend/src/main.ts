import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import * as express from 'express';
import { Express } from 'express';

let cachedApp: Express | null = null;

export async function getApp(): Promise<Express> {
  if (cachedApp) return cachedApp;

  const expressApp = express();

  const nestApp = await NestFactory.create(
    AppModule,
    new ExpressAdapter(expressApp),
    { logger: ['error', 'warn', 'log'] }
  );

  nestApp.setGlobalPrefix('api');
  nestApp.useGlobalPipes(new ValidationPipe({ whitelist: true }));

  await nestApp.init();

  cachedApp = expressApp;
  return cachedApp;
}