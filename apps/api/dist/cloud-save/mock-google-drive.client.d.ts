/**
 * Dhamrai Life — Mock Google Drive AppData Client
 * =================================================
 * In-memory simulated Drive client for deterministic offline testing and CI suites.
 */
import { IGoogleDriveClient, DriveUploadResult } from './google-drive.interface.js';
export declare class MockGoogleDriveClient implements IGoogleDriveClient {
    private readonly _storage;
    getAppDataFile(accessToken: string, fileName: string): Promise<string | null>;
    uploadAppDataFile(accessToken: string, fileName: string, contentJson: string): Promise<DriveUploadResult>;
    deleteAppDataFile(accessToken: string, fileName: string): Promise<boolean>;
    clearAll(): void;
}
//# sourceMappingURL=mock-google-drive.client.d.ts.map