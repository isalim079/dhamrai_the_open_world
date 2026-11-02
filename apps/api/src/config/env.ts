/**
 * Dhamrai Life — Environment Configuration Loader & Production Validator
 * =======================================================================
 * Locates and loads `apps/api/.env` whether started from the monorepo root
 * or the `apps/api` directory. Validates required production secrets at startup.
 */

import { validateProductionEncryptionKey } from '../crypto/aes-gcm.service.js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface LoadedEnvInfo {
  loaded: boolean;
  filePath?: string;
  keysLoaded: string[];
}

/**
 * Searches candidates for the API .env file.
 */
export function findEnvPath(): string | null {
  const candidates = [
    // 1. Monorepo root cwd: ./apps/api/.env
    path.resolve(process.cwd(), 'apps/api/.env'),
    // 2. apps/api cwd: ./.env
    path.resolve(process.cwd(), '.env'),
    // 3. Relative to compiled / source file location (src/config -> apps/api/.env)
    path.resolve(__dirname, '../../.env'),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return candidate;
    }
  }

  return null;
}

/**
 * Parses simple dotenv format (KEY=VALUE) without external dependencies.
 */
export function parseDotenv(content: string): Record<string, string> {
  const result: Record<string, string> = {};
  const lines = content.split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const equalIndex = trimmed.indexOf('=');
    if (equalIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, equalIndex).trim();
    let value = trimmed.slice(equalIndex + 1).trim();

    // Strip wrapping quotes
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    result[key] = value;
  }

  return result;
}

/**
 * Loads apps/api/.env into process.env if present.
 */
export function loadEnv(): LoadedEnvInfo {
  const envPath = findEnvPath();
  if (!envPath) {
    return { loaded: false, keysLoaded: [] };
  }

  const content = fs.readFileSync(envPath, 'utf8');
  const parsed = parseDotenv(content);
  const keysLoaded: string[] = [];

  for (const [key, val] of Object.entries(parsed)) {
    // Only set if value is non-empty and not already overridden by process environment
    if (val !== '' && process.env[key] === undefined) {
      process.env[key] = val;
      keysLoaded.push(key);
    }
  }

  return {
    loaded: true,
    filePath: envPath,
    keysLoaded,
  };
}

/**
 * Validates required production secrets at startup.
 * Throws a descriptive Error if running in production with missing or insecure credentials.
 */
export function validateEnv(): void {
  const isProd = process.env['NODE_ENV'] === 'production';

  if (isProd) {
    const missing: string[] = [];

    if (!process.env['DATABASE_URL']) {
      missing.push('DATABASE_URL');
    }
    if (!process.env['GOOGLE_CLIENT_ID']) {
      missing.push('GOOGLE_CLIENT_ID');
    }
    if (!process.env['GOOGLE_REDIRECT_URI']) missing.push('GOOGLE_REDIRECT_URI');
    if (!process.env['GOOGLE_CLIENT_SECRET']) {
      missing.push('GOOGLE_CLIENT_SECRET');
    }
    if (!process.env['TOKEN_ENCRYPTION_KEY_HEX']) {
      missing.push('TOKEN_ENCRYPTION_KEY_HEX');
    } else {
      validateProductionEncryptionKey(process.env['TOKEN_ENCRYPTION_KEY_HEX']);
    }

    if (!process.env['SESSION_SECRET']) {
      missing.push('SESSION_SECRET');
    } else if (process.env['SESSION_SECRET'].length < 32) {
      throw new Error(
        `Production Error: SESSION_SECRET must be at least 32 characters long for HMAC-SHA256 session integrity.`
      );
    }

    if (process.env['GOOGLE_REDIRECT_URI']) {
      const redirect = new URL(process.env['GOOGLE_REDIRECT_URI']);
      if (redirect.protocol !== 'https:' || redirect.username || redirect.password || redirect.hash) throw new Error('Production requires a valid HTTPS GOOGLE_REDIRECT_URI.');
    }
    if (process.env['SESSION_SECRET'] === 'dhamrai_life_session_signing_secret_key_32_bytes!' || process.env['SESSION_SECRET']?.startsWith('example-')) throw new Error('Production requires a non-development SESSION_SECRET.');
    if (missing.length > 0) {
      throw new Error(
        `Production Error: Missing required environment variables: ${missing.join(
          ', '
        )}. Please configure them in apps/api/.env or system environment.`
      );
    }
    if (process.env['USE_REAL_GOOGLE_DRIVE'] !== 'true') throw new Error('Production requires real Google Drive; mocks are disabled.');
  }
}
