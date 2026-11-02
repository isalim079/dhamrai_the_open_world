/**
 * Dhamrai Life — Backend API Entrypoint
 * =====================================
 * NestJS application bootstrap for OAuth gateway and Google Drive Cloud Save Service.
 */

import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { Logger } from '@nestjs/common';

export async function bootstrap() {
  const logger = new Logger('DhamraiLifeApi');
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');
  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  const port = process.env['PORT'] ?? 3001;
  await app.listen(port);
  logger.log(`Dhamrai Life Backend API running on port ${port} (prefix: /api)`);
  return app;
}

if (process.env['NODE_ENV'] !== 'test') {
  bootstrap().catch((err) => {
    console.error('Fatal error during NestJS bootstrap:', err);
    process.exit(1);
  });
}
