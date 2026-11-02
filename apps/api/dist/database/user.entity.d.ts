/**
 * Dhamrai Life — User Account Entity
 * ====================================
 * Represents an authenticated player's backend account record.
 * Stores Google OAuth identity and AES-256-GCM encrypted refresh tokens at rest.
 */
export interface UserRecord {
    id: string;
    googleSub: string;
    email: string;
    name?: string;
    encryptedRefreshToken: string;
    encryptionIv: string;
    encryptionTag: string;
    createdAtIso: string;
    updatedAtIso: string;
}
//# sourceMappingURL=user.entity.d.ts.map