import { Module } from '@nestjs/common';
import { GoogleAuthService } from './google-auth.service.js';
import { SessionService } from './session.service.js';
import { AuthController } from './auth.controller.js';
import { AuthGuard } from './auth.guard.js';
import { CryptoModule } from '../crypto/crypto.module.js';
import { DatabaseModule } from '../database/database.module.js';

@Module({
  imports: [CryptoModule, DatabaseModule],
  controllers: [AuthController],
  providers: [GoogleAuthService, SessionService, AuthGuard],
  exports: [GoogleAuthService, SessionService, AuthGuard],
})
export class AuthModule {}
