/**
 * Dhamrai Life — AES-256-GCM Token Encryption Service
 * ====================================================
 * Cryptographically secure authenticated encryption at rest for OAuth tokens,
 * secrets, and sensitive credentials in PostgreSQL.
 *
 * Algorithm: AES-256-GCM (Galois/Counter Mode)
 * - Key length: 32 bytes (256 bits)
 * - IV length: 12 bytes (96 bits, standard recommended for GCM)
 * - Auth Tag length: 16 bytes (128 bits)
 * - Guarantees both confidentiality and ciphertext integrity.
 */
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { Injectable, Optional, Inject } from '@nestjs/common';
import * as crypto from 'crypto';
export function validateProductionEncryptionKey(value) {
    const legacyDefault = crypto.createHash('sha256').update('dhamrai_life_dev_encryption_seed').digest('hex');
    if (!value || !/^[a-fA-F0-9]{64}$/.test(value) || Buffer.from(value, 'hex').length !== 32 ||
        value.toLowerCase() === legacyDefault || value.toLowerCase() === '0123456789abcdef'.repeat(4) || /^(.)\1{63}$/.test(value)) {
        throw new Error('Production TOKEN_ENCRYPTION_KEY_HEX must be exactly 64 hexadecimal characters (32 bytes), excluding development/example keys.');
    }
}
export const TOKEN_ENCRYPTION_KEY_TOKEN = 'TOKEN_ENCRYPTION_KEY';
export class DecryptionFailedError extends Error {
    constructor(message) {
        super(`Decryption failed: ${message}`);
        this.name = 'DecryptionFailedError';
    }
}
let AesGcmService = class AesGcmService {
    _key;
    /**
     * Initializes the encryption service with a 32-byte key.
     * If a hex string is provided, it must be exactly 64 hex characters (32 bytes).
     */
    constructor(keyInput) {
        const isProduction = process.env['NODE_ENV'] === 'production';
        const raw = keyInput ?? process.env['TOKEN_ENCRYPTION_KEY_HEX'];
        if (isProduction && !process.env['TOKEN_ENCRYPTION_KEY_HEX']) {
            throw new Error('Production requires TOKEN_ENCRYPTION_KEY_HEX.');
        }
        if (isProduction)
            validateProductionEncryptionKey(process.env['TOKEN_ENCRYPTION_KEY_HEX']);
        if (raw === undefined) {
            // Ephemeral local development key; no published deterministic default exists.
            this._key = crypto.randomBytes(32);
        }
        else if (typeof raw === 'string') {
            if (!/^[0-9a-fA-F]{64}$/.test(raw))
                throw new Error('AES-256-GCM requires a 32-byte key encoded as exactly 64 hexadecimal characters.');
            this._key = Buffer.from(raw, 'hex');
        }
        else {
            this._key = Buffer.from(raw);
        }
        if (this._key.length !== 32)
            throw new Error('AES-256-GCM requires a 32-byte key.');
        if (isProduction)
            validateProductionEncryptionKey(this._key.toString('hex'));
    }
    /**
     * Encrypts plaintext string using AES-256-GCM with a fresh random 12-byte IV.
     */
    encrypt(plaintext) {
        if (typeof plaintext !== 'string') {
            throw new TypeError('Plaintext to encrypt must be a string.');
        }
        const iv = crypto.randomBytes(12);
        const cipher = crypto.createCipheriv('aes-256-gcm', this._key, iv);
        const ciphertextBuffer = Buffer.concat([
            cipher.update(plaintext, 'utf8'),
            cipher.final(),
        ]);
        const tag = cipher.getAuthTag();
        return {
            ciphertextHex: ciphertextBuffer.toString('hex'),
            ivHex: iv.toString('hex'),
            tagHex: tag.toString('hex'),
        };
    }
    /**
     * Decrypts an encrypted payload using AES-256-GCM.
     * Throws DecryptionFailedError if ciphertext, IV, or authentication tag has been tampered with.
     */
    decrypt(payload) {
        if (!payload || !payload.ciphertextHex || !payload.ivHex || !payload.tagHex) {
            throw new DecryptionFailedError('Missing ciphertextHex, ivHex, or tagHex in payload.');
        }
        try {
            const iv = Buffer.from(payload.ivHex, 'hex');
            const tag = Buffer.from(payload.tagHex, 'hex');
            const ciphertext = Buffer.from(payload.ciphertextHex, 'hex');
            const decipher = crypto.createDecipheriv('aes-256-gcm', this._key, iv);
            decipher.setAuthTag(tag);
            const decrypted = Buffer.concat([
                decipher.update(ciphertext),
                decipher.final(),
            ]);
            return decrypted.toString('utf8');
        }
        catch (err) {
            throw new DecryptionFailedError(`Authentication tag mismatch or corrupted ciphertext: ${err.message}`);
        }
    }
};
AesGcmService = __decorate([
    Injectable(),
    __param(0, Optional()),
    __param(0, Inject('TOKEN_ENCRYPTION_KEY')),
    __metadata("design:paramtypes", [Object])
], AesGcmService);
export { AesGcmService };
//# sourceMappingURL=aes-gcm.service.js.map