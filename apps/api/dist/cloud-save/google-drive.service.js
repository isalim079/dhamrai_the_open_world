/**
 * Dhamrai Life — Google Drive REST API v3 Client
 * ===============================================
 * Interacts with Google Drive hidden `appDataFolder` (`drive.appdata` scope)
 * using standard HTTPS REST endpoints.
 */
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var GoogleDriveService_1;
import { Injectable, Logger } from '@nestjs/common';
let GoogleDriveService = GoogleDriveService_1 = class GoogleDriveService {
    _logger = new Logger(GoogleDriveService_1.name);
    async getAppDataFile(accessToken, fileName) {
        const fileId = await this.findFileIdByName(accessToken, fileName);
        if (!fileId) {
            return null;
        }
        const downloadUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
        const response = await fetch(downloadUrl, {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        });
        if (response.status === 404) {
            return null;
        }
        if (!response.ok) {
            const err = await response.text();
            throw new Error(`Drive download failed (${response.status}): ${err}`);
        }
        return response.text();
    }
    async uploadAppDataFile(accessToken, fileName, contentJson) {
        const existingFileId = await this.findFileIdByName(accessToken, fileName);
        if (existingFileId) {
            // Update existing file content: PATCH /upload/drive/v3/files/${fileId}?uploadType=media
            const updateUrl = `https://www.googleapis.com/upload/drive/v3/files/${existingFileId}?uploadType=media`;
            const response = await fetch(updateUrl, {
                method: 'PATCH',
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: contentJson,
            });
            if (!response.ok) {
                const err = await response.text();
                throw new Error(`Drive file update failed (${response.status}): ${err}`);
            }
            const data = (await response.json());
            return {
                fileId: existingFileId,
                name: fileName,
                modifiedTime: String(data['modifiedTime'] ?? new Date().toISOString()),
                sizeBytes: Buffer.byteLength(contentJson, 'utf8'),
            };
        }
        else {
            // Create new file inside appDataFolder: Multipart POST
            const metadata = {
                name: fileName,
                parents: ['appDataFolder'],
                mimeType: 'application/json',
            };
            const boundary = `-------314159265358979323846`;
            const delimiter = `\r\n--${boundary}\r\n`;
            const closeDelimiter = `\r\n--${boundary}--`;
            const multipartBody = delimiter +
                'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
                JSON.stringify(metadata) +
                delimiter +
                'Content-Type: application/json\r\n\r\n' +
                contentJson +
                closeDelimiter;
            const createUrl = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
            const response = await fetch(createUrl, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': `multipart/related; boundary=${boundary}`,
                },
                body: multipartBody,
            });
            if (!response.ok) {
                const err = await response.text();
                throw new Error(`Drive file create failed (${response.status}): ${err}`);
            }
            const data = (await response.json());
            return {
                fileId: String(data['id']),
                name: fileName,
                modifiedTime: String(data['modifiedTime'] ?? new Date().toISOString()),
                sizeBytes: Buffer.byteLength(contentJson, 'utf8'),
            };
        }
    }
    async deleteAppDataFile(accessToken, fileName) {
        const fileId = await this.findFileIdByName(accessToken, fileName);
        if (!fileId) {
            return false;
        }
        const deleteUrl = `https://www.googleapis.com/drive/v3/files/${fileId}`;
        const response = await fetch(deleteUrl, {
            method: 'DELETE',
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        });
        return response.ok;
    }
    async findFileIdByName(accessToken, fileName) {
        const query = encodeURIComponent(`name = '${fileName}' and 'appDataFolder' in parents and trashed = false`);
        const searchUrl = `https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=${query}&fields=files(id,name)`;
        const response = await fetch(searchUrl, {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        });
        if (!response.ok) {
            const err = await response.text();
            this._logger.warn(`Failed searching Drive files: ${err}`);
            return null;
        }
        const data = (await response.json());
        const files = data.files ?? [];
        return files[0]?.id ?? null;
    }
};
GoogleDriveService = GoogleDriveService_1 = __decorate([
    Injectable()
], GoogleDriveService);
export { GoogleDriveService };
//# sourceMappingURL=google-drive.service.js.map