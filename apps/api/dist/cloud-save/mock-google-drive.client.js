/**
 * Dhamrai Life — Mock Google Drive AppData Client
 * =================================================
 * In-memory simulated Drive client for deterministic offline testing and CI suites.
 */
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Injectable } from '@nestjs/common';
let MockGoogleDriveClient = class MockGoogleDriveClient {
    // Map<userAccessToken, Map<fileName, StoredDriveFile>>
    _storage = new Map();
    async getAppDataFile(accessToken, fileName) {
        const userFiles = this._storage.get(accessToken);
        if (!userFiles)
            return null;
        const file = userFiles.get(fileName);
        return file ? file.content : null;
    }
    async uploadAppDataFile(accessToken, fileName, contentJson) {
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
    async deleteAppDataFile(accessToken, fileName) {
        const userFiles = this._storage.get(accessToken);
        if (!userFiles)
            return false;
        return userFiles.delete(fileName);
    }
    clearAll() {
        this._storage.clear();
    }
};
MockGoogleDriveClient = __decorate([
    Injectable()
], MockGoogleDriveClient);
export { MockGoogleDriveClient };
//# sourceMappingURL=mock-google-drive.client.js.map