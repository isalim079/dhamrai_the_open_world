import { Module } from '@nestjs/common';
import { CryptoModule } from './crypto/crypto.module.js';
import { DatabaseModule } from './database/database.module.js';
import { AuthModule } from './auth/auth.module.js';
import { CloudSaveModule } from './cloud-save/cloud-save.module.js';

@Module({
  imports: [CryptoModule, DatabaseModule, AuthModule, CloudSaveModule],
})
export class AppModule {}
