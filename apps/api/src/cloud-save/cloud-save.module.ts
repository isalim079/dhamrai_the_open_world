import { Module } from '@nestjs/common';
import { CloudSaveController } from './cloud-save.controller.js';
import { LeaseLockService } from './lease-lock.service.js';
import { GoogleDriveService } from './google-drive.service.js';
import { MockGoogleDriveClient } from './mock-google-drive.client.js';
import { GOOGLE_DRIVE_CLIENT_TOKEN } from './google-drive.interface.js';
import { AuthModule } from '../auth/auth.module.js';
import { DatabaseModule } from '../database/database.module.js';
import { CryptoModule } from '../crypto/crypto.module.js';

@Module({
  imports: [AuthModule, DatabaseModule, CryptoModule],
  controllers: [CloudSaveController],
  providers: [
    LeaseLockService,
    MockGoogleDriveClient,
    GoogleDriveService,
    {
      provide: GOOGLE_DRIVE_CLIENT_TOKEN,
      // Default to MockGoogleDriveClient in test/dev environments or when GOOGLE_CLIENT_ID is not configured
      useFactory: (mockClient: MockGoogleDriveClient, realService: GoogleDriveService) => {
        if (process.env['USE_REAL_GOOGLE_DRIVE'] === 'true') {
          return realService;
        }
        return mockClient;
      },
      inject: [MockGoogleDriveClient, GoogleDriveService],
    },
  ],
  exports: [LeaseLockService, GOOGLE_DRIVE_CLIENT_TOKEN, MockGoogleDriveClient],
})
export class CloudSaveModule {}
