import { Module } from '@nestjs/common';
import { AesGcmService } from './aes-gcm.service.js';

@Module({
  providers: [AesGcmService],
  exports: [AesGcmService],
})
export class CryptoModule {}
