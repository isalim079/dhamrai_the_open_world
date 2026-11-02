/**
 * Dhamrai Life — Backend API Entrypoint
 * =====================================
 * NestJS application bootstrap for OAuth gateway and Google Drive Cloud Save Service.
 */

import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { Logger } from '@nestjs/common';
import { loadEnv, validateEnv } from './config/env.js';

export async function bootstrap() {
  const logger = new Logger('DhamraiLifeApi');

  // Load environment variables from apps/api/.env if available
  const envInfo = loadEnv();
  if (envInfo.loaded) {
    logger.log(`Loaded environment from ${envInfo.filePath} (${envInfo.keysLoaded.length} variables loaded)`);
  }

  // Validate production requirements
  validateEnv();

  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');
  app.enableCors({
    origin: process.env['BROWSER_ORIGIN'] ?? 'http://localhost:5173',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  const port = process.env['PORT'] ?? 3000;
  await app.listen(port);
  logger.log(`Dhamrai Life Backend API running on port ${port} (prefix: /api)`);
  return app;
}

if (process.env['NODE_ENV'] !== 'test') {
  bootstrap().catch(() => {
    console.error('API startup failed; check required configuration and service availability.');
    process.exit(1);
  });
}
