/**
 * Dhamrai Life — Mock Google Drive AppData Client
 * =================================================
 * In-memory simulated Drive client for deterministic offline testing and CI suites.
 */

import { Injectable } from '@nestjs/common';
import { IGoogleDriveClient, DriveUploadResult } from './google-drive.interface.js';

interface StoredDriveFile {
  id: string;
  name: string;
  content: string;
  modifiedTime: string;
}

@Injectable()
export class MockGoogleDriveClient implements IGoogleDriveClient {
  // Map<userAccessToken, Map<fileName, StoredDriveFile>>
  private readonly _storage: Map<string, Map<string, StoredDriveFile>> = new Map();

  public async getAppDataFile(accessToken: string, fileName: string): Promise<string | null> {
    const userFiles = this._storage.get(accessToken);
    if (!userFiles) return null;
    const file = userFiles.get(fileName);
    return file ? file.content : null;
  }

  public async uploadAppDataFile(
    accessToken: string,
    fileName: string,
    contentJson: string
  ): Promise<DriveUploadResult> {
    let userFiles = this._storage.get(accessToken);
    if (!userFiles) {
      userFiles = new Map();
      this._storage.set(accessToken, userFiles);
    }

    const modifiedTime = new Date().toISOString();
    const existing = userFiles.get(fileName);
    const id = existing ? existing.id : `mock_drive_file_${Date.now()}_${Math.random().toString(36).slice(2)}`;

    userFiles.set(fileName, {
      id,
      name: fileName,
      content: contentJson,
      modifiedTime,
    });

    return {
      fileId: id,
      name: fileName,
      modifiedTime,
      sizeBytes: Buffer.byteLength(contentJson, 'utf8'),
    };
  }

  public async deleteAppDataFile(accessToken: string, fileName: string): Promise<boolean> {
    const userFiles = this._storage.get(accessToken);
    if (!userFiles) return false;
    return userFiles.delete(fileName);
  }

  public clearAll(): void {
    this._storage.clear();
  }
}
