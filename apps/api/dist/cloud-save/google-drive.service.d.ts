/**
 * Dhamrai Life — Google Drive REST API v3 Client
 * ===============================================
 * Interacts with Google Drive hidden `appDataFolder` (`drive.appdata` scope)
 * using standard HTTPS REST endpoints.
 */
import { IGoogleDriveClient, DriveUploadResult } from './google-drive.interface.js';
export declare class GoogleDriveService implements IGoogleDriveClient {
    getAppDataFile(accessToken: string, fileName: string): Promise<string | null>;
    uploadAppDataFile(accessToken: string, fileName: string, contentJson: string): Promise<DriveUploadResult>;
    deleteAppDataFile(accessToken: string, fileName: string): Promise<boolean>;
    private findFileIdByName;
}
//# sourceMappingURL=google-drive.service.d.ts.map