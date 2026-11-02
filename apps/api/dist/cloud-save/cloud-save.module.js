var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Module } from '@nestjs/common';
import { CloudSaveController } from './cloud-save.controller.js';
import { LeaseLockService } from './lease-lock.service.js';
import { GoogleDriveService } from './google-drive.service.js';
import { MockGoogleDriveClient } from './mock-google-drive.client.js';
import { GOOGLE_DRIVE_CLIENT_TOKEN } from './google-drive.interface.js';
import { AuthModule } from '../auth/auth.module.js';
import { DatabaseModule } from '../database/database.module.js';
import { CryptoModule } from '../crypto/crypto.module.js';
let CloudSaveModule = class CloudSaveModule {
};
CloudSaveModule = __decorate([
    Module({
        imports: [AuthModule, DatabaseModule, CryptoModule],
        controllers: [CloudSaveController],
        providers: [
            LeaseLockService,
            MockGoogleDriveClient,
            GoogleDriveService,
            {
                provide: GOOGLE_DRIVE_CLIENT_TOKEN,
                // Default to MockGoogleDriveClient in test/dev environments or when GOOGLE_CLIENT_ID is not configured
                useFactory: (mockClient, realService) => {
                    if (process.env['NODE_ENV'] === 'production' || process.env['USE_REAL_GOOGLE_DRIVE'] === 'true') {
                        return realService;
                    }
                    return mockClient;
                },
                inject: [MockGoogleDriveClient, GoogleDriveService],
            },
        ],
        exports: [LeaseLockService, GOOGLE_DRIVE_CLIENT_TOKEN, MockGoogleDriveClient],
    })
], CloudSaveModule);
export { CloudSaveModule };
//# sourceMappingURL=cloud-save.module.js.map