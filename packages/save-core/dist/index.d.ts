/**
 * Dhamrai Life — Save Core Package
 * =================================
 * High-reliability local save persistence, Zod validation, SHA-256 integrity,
 * schema migration pipeline, and Dexie/IndexedDB storage for Dhamrai Life.
 */
export * from './errors.js';
export * from './types.js';
export * from './crypto/checksum.js';
export * from './schemas/v1.schema.js';
export * from './schemas/v2.schema.js';
export * from './migrations/migration-pipeline.js';
export * from './migrations/v1-to-v2.step.js';
export * from './storage/indexeddb-adapter.js';
export * from './storage/memory-adapter.js';
export * from './storage/save-orchestrator.js';
//# sourceMappingURL=index.d.ts.map