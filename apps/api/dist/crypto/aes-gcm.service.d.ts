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
export interface EncryptedPayload {
    ciphertextHex: string;
    ivHex: string;
    tagHex: string;
}
export declare class DecryptionFailedError extends Error {
    constructor(message: string);
}
export declare class AesGcmService {
    private readonly _key;
    /**
     * Initializes the encryption service with a 32-byte key.
     * If a hex string is provided, it must be exactly 64 hex characters (32 bytes).
     */
    constructor(keyInput?: string | Buffer);
    /**
     * Encrypts plaintext string using AES-256-GCM with a fresh random 12-byte IV.
     */
    encrypt(plaintext: string): EncryptedPayload;
    /**
     * Decrypts an encrypted payload using AES-256-GCM.
     * Throws DecryptionFailedError if ciphertext, IV, or authentication tag has been tampered with.
     */
    decrypt(payload: EncryptedPayload): string;
}
//# sourceMappingURL=aes-gcm.service.d.ts.map