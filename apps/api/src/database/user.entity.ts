/**
 * Dhamrai Life — User Account Entity
 * ====================================
 * Represents an authenticated player's backend account record.
 * Stores Google OAuth identity and AES-256-GCM encrypted refresh tokens at rest.
 */

export interface UserRecord {
  id: string; // Internal UUID
  googleSub: string; // Stable Google Subject Identifier
  email: string;
  name?: string;
  encryptedRefreshToken: string; // AES-256-GCM ciphertext hex
  encryptionIv: string; // 12-byte IV hex
  encryptionTag: string; // 16-byte Auth Tag hex
  createdAtIso: string;
  updatedAtIso: string;
}
