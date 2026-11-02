import { describe, it, expect } from 'vitest';
import * as crypto from 'crypto';
import { AesGcmService, DecryptionFailedError } from '../src/index.js';

describe('API Crypto — AES-256-GCM Token Encryption Service', () => {
  const testKeyHex = crypto.randomBytes(32).toString('hex');
  const service = new AesGcmService(testKeyHex);

  it('successfully encrypts and decrypts OAuth refresh token string', () => {
    const rawRefreshToken = '1//04gTzAbc123_SecretGoogleRefreshToken_Dhamrai2026';
    const encrypted = service.encrypt(rawRefreshToken);

    expect(encrypted.ciphertextHex).toBeDefined();
    expect(encrypted.ivHex).toBeDefined();
    expect(encrypted.tagHex).toBeDefined();

    // 12 bytes IV = 24 hex characters
    expect(encrypted.ivHex.length).toBe(24);
    // 16 bytes Tag = 32 hex characters
    expect(encrypted.tagHex.length).toBe(32);

    const decrypted = service.decrypt(encrypted);
    expect(decrypted).toBe(rawRefreshToken);
  });

  it('generates unique random IVs on subsequent encryptions of the same plaintext', () => {
    const text = 'identical_secret_token';
    const enc1 = service.encrypt(text);
    const enc2 = service.encrypt(text);

    expect(enc1.ivHex).not.toBe(enc2.ivHex);
    expect(enc1.ciphertextHex).not.toBe(enc2.ciphertextHex);

    expect(service.decrypt(enc1)).toBe(text);
    expect(service.decrypt(enc2)).toBe(text);
  });

  it('rejects tampered ciphertext with DecryptionFailedError (GCM authentication check)', () => {
    const text = 'confidential_token';
    const encrypted = service.encrypt(text);

    // Tamper with ciphertext by flipping last hex character
    const tamperedCiphertext =
      encrypted.ciphertextHex.slice(0, -1) +
      (encrypted.ciphertextHex.slice(-1) === 'a' ? 'b' : 'a');

    expect(() =>
      service.decrypt({
        ...encrypted,
        ciphertextHex: tamperedCiphertext,
      })
    ).toThrowError(DecryptionFailedError);
  });

  it('rejects tampered authentication tag with DecryptionFailedError', () => {
    const text = 'confidential_token';
    const encrypted = service.encrypt(text);

    // Tamper with authentication tag
    const tamperedTag =
      encrypted.tagHex.slice(0, -2) + (encrypted.tagHex.slice(-2) === 'ff' ? '00' : 'ff');

    expect(() =>
      service.decrypt({
        ...encrypted,
        tagHex: tamperedTag,
      })
    ).toThrowError(DecryptionFailedError);
  });

  it('rejects decryption when using a different 32-byte key', () => {
    const otherService = new AesGcmService(crypto.randomBytes(32).toString('hex'));
    const text = 'token_for_service_one';
    const encrypted = service.encrypt(text);

    expect(() => otherService.decrypt(encrypted)).toThrowError(DecryptionFailedError);
  });

  it('throws when initialized with invalid key length', () => {
    expect(() => new AesGcmService('short_key')).toThrowError(/32-byte/);
  });
});
