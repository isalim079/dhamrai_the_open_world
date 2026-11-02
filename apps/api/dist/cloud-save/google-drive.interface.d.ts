/**
 * Dhamrai Life — Google Drive AppData Client Interface
 * =====================================================
 * Declares contracts for interacting with Google Drive's hidden `appDataFolder`.
 * Used for storing and retrieving encrypted player saves across devices.
 */
export declare const GOOGLE_DRIVE_CLIENT_TOKEN: unique symbol;
export interface DriveUploadResult {
    fileId: string;
    name: string;
    modifiedTime: string;
    sizeBytes: number;
}
export interface IGoogleDriveClient {
    /**
     * Retrieves file content from Google Drive appDataFolder by file name.
     * Returns string content if found, or null if no file exists.
     */
    getAppDataFile(accessToken: string, fileName: string): Promise<string | null>;
    /**
     * Uploads or updates a file in Google Drive appDataFolder.
     */
    uploadAppDataFile(accessToken: string, fileName: string, contentJson: string): Promise<DriveUploadResult>;
    /**
     * Deletes a file from appDataFolder by name.
     */
    deleteAppDataFile(accessToken: string, fileName: string): Promise<boolean>;
}
//# sourceMappingURL=google-drive.interface.d.ts.map