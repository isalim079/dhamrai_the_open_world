/**
 * Dhamrai Life — Backend API Package
 * ===================================
 * NestJS Google OAuth gateway, Google Drive hidden appDataFolder sync service,
 * AES-256-GCM token encryption, and optimistic concurrency lease locking.
 */

export * from './crypto/aes-gcm.service.js';
export * from './crypto/crypto.module.js';

export * from './database/user.entity.js';
export * from './database/user.repository.interface.js';
export * from './database/in-memory-user.repository.js';
export * from './database/postgres-user.repository.js';
export * from './database/database.module.js';

export * from './auth/google-auth.service.js';
export * from './auth/session.service.js';
export * from './auth/auth.guard.js';
export * from './auth/auth.controller.js';
export * from './auth/auth.module.js';

export * from './cloud-save/google-drive.interface.js';
export * from './cloud-save/google-drive.service.js';
export * from './cloud-save/mock-google-drive.client.js';
export * from './cloud-save/lease-lock.service.js';
export * from './cloud-save/cloud-save.controller.js';
export * from './cloud-save/cloud-save.module.js';

export * from './app.module.js';
