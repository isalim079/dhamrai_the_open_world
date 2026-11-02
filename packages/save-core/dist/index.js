/**
 * Dhamrai Life — Save Core Package
 * =================================
 * High-reliability local save persistence, Zod validation, SHA-256 integrity,
 * schema migration pipeline, and Dexie/IndexedDB storage for Dhamrai Life.
 */
// Errors
export * from './errors.js';
// Types & Interfaces
export * from './types.js';
// Cryptographic Checksum & Canonical JSON
export * from './crypto/checksum.js';
// Zod Validation Schemas
export * from './schemas/v1.schema.js';
export * from './schemas/v2.schema.js';
// Schema Migration Pipeline & Steps
export * from './migrations/migration-pipeline.js';
export * from './migrations/v1-to-v2.step.js';
// Storage Adapters & Orchestration
export * from './storage/indexeddb-adapter.js';
export * from './storage/memory-adapter.js';
export * from './storage/save-orchestrator.js';
//# sourceMappingURL=index.js.map