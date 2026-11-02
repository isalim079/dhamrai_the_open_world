import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as path from 'path';
import { parseDotenv, findEnvPath, loadEnv, validateEnv } from '../src/config/env.js';

describe('Environment Configuration Loader', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe('parseDotenv', () => {
    it('should parse KEY=VALUE pairs', () => {
      const content = `
# Comment line
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://localhost:5432/test
`;
      const result = parseDotenv(content);
      expect(result['NODE_ENV']).toBe('development');
      expect(result['PORT']).toBe('3000');
      expect(result['DATABASE_URL']).toBe('postgresql://localhost:5432/test');
    });

    it('should strip double and single quotes', () => {
      const content = `
KEY_DOUBLE="hello world"
KEY_SINGLE='foo bar'
KEY_UNQUOTED=baz
`;
      const result = parseDotenv(content);
      expect(result['KEY_DOUBLE']).toBe('hello world');
      expect(result['KEY_SINGLE']).toBe('foo bar');
      expect(result['KEY_UNQUOTED']).toBe('baz');
    });

    it('should handle values with equal signs', () => {
      const content = `DATABASE_URL=postgresql://user:pass@host/db?sslmode=require`;
      const result = parseDotenv(content);
      expect(result['DATABASE_URL']).toBe('postgresql://user:pass@host/db?sslmode=require');
    });

    it('should ignore empty lines and full-line comments', () => {
      const content = `
# Just a comment

KEY=value
`;
      const result = parseDotenv(content);
      expect(Object.keys(result)).toEqual(['KEY']);
      expect(result['KEY']).toBe('value');
    });
  });

  describe('findEnvPath and loadEnv', () => {
    it('should locate apps/api/.env from monorepo root or package cwd', () => {
      const found = findEnvPath();
      expect(found).not.toBeNull();
      expect(found?.endsWith(path.join('apps', 'api', '.env'))).toBe(true);
    });

    it('should load variables without overriding existing environment variables', () => {
      process.env['TEST_PRE_EXISTING'] = 'already_set';
      const info = loadEnv();
      expect(info.loaded).toBe(true);
      expect(process.env['TEST_PRE_EXISTING']).toBe('already_set');
      // PORT was defined in .env as 3000
      expect(process.env['PORT']).toBe('3000');
    });
  });

  describe('validateEnv', () => {
    it('should pass silently in development even if production secrets are absent', () => {
      process.env['NODE_ENV'] = 'development';
      delete process.env['DATABASE_URL'];
      delete process.env['GOOGLE_CLIENT_ID'];
      delete process.env['GOOGLE_CLIENT_SECRET'];
      delete process.env['TOKEN_ENCRYPTION_KEY_HEX'];
      delete process.env['SESSION_SECRET'];

      expect(() => validateEnv()).not.toThrow();
    });

    it('should pass silently in test environment', () => {
      process.env['NODE_ENV'] = 'test';
      delete process.env['DATABASE_URL'];
      expect(() => validateEnv()).not.toThrow();
    });

    it('should throw an error in production when required variables are missing', () => {
      process.env['NODE_ENV'] = 'production';
      process.env['GOOGLE_REDIRECT_URI'] = 'https://game.example/api/auth/callback';
      process.env['USE_REAL_GOOGLE_DRIVE'] = 'true';
      delete process.env['DATABASE_URL'];
      delete process.env['GOOGLE_CLIENT_ID'];
      delete process.env['GOOGLE_CLIENT_SECRET'];
      delete process.env['TOKEN_ENCRYPTION_KEY_HEX'];
      delete process.env['SESSION_SECRET'];

      expect(() => validateEnv()).toThrow(/Missing required environment variables/);
    });

    it('should throw an error if TOKEN_ENCRYPTION_KEY_HEX is not 64 characters in production', () => {
      process.env['NODE_ENV'] = 'production';
      process.env['GOOGLE_REDIRECT_URI'] = 'https://game.example/api/auth/callback';
      process.env['USE_REAL_GOOGLE_DRIVE'] = 'true';
      process.env['DATABASE_URL'] = 'postgresql://localhost:5432/prod';
      process.env['GOOGLE_CLIENT_ID'] = 'client-id';
      process.env['GOOGLE_CLIENT_SECRET'] = 'client-secret';
      process.env['SESSION_SECRET'] = 'super-long-session-secret-over-32-chars-long';
      process.env['TOKEN_ENCRYPTION_KEY_HEX'] = 'too_short';

      expect(() => validateEnv()).toThrow(/must be exactly 64 hexadecimal characters/);
    });

    it('should throw an error if SESSION_SECRET is shorter than 32 characters in production', () => {
      process.env['NODE_ENV'] = 'production';
      process.env['GOOGLE_REDIRECT_URI'] = 'https://game.example/api/auth/callback';
      process.env['USE_REAL_GOOGLE_DRIVE'] = 'true';
      process.env['DATABASE_URL'] = 'postgresql://localhost:5432/prod';
      process.env['GOOGLE_CLIENT_ID'] = 'client-id';
      process.env['GOOGLE_CLIENT_SECRET'] = 'client-secret';
      process.env['TOKEN_ENCRYPTION_KEY_HEX'] = '71e4cf125dd81edaf0f2c22bbcba8db526ac6fae1af610bb86a88f574ca35e99';
      process.env['SESSION_SECRET'] = 'short_secret';

      expect(() => validateEnv()).toThrow(/must be at least 32 characters long/);
    });

    it('should succeed in production when all credentials meet requirements', () => {
      process.env['NODE_ENV'] = 'production';
      process.env['GOOGLE_REDIRECT_URI'] = 'https://game.example/api/auth/callback';
      process.env['USE_REAL_GOOGLE_DRIVE'] = 'true';
      process.env['DATABASE_URL'] = 'postgresql://localhost:5432/prod';
      process.env['GOOGLE_CLIENT_ID'] = 'valid-client-id';
      process.env['GOOGLE_CLIENT_SECRET'] = 'valid-client-secret';
      process.env['TOKEN_ENCRYPTION_KEY_HEX'] = '71e4cf125dd81edaf0f2c22bbcba8db526ac6fae1af610bb86a88f574ca35e99';
      process.env['SESSION_SECRET'] = 'super-secure-production-session-secret-32-chars';

      expect(() => validateEnv()).not.toThrow();
    });
  });
});
