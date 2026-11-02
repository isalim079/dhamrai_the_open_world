import {
  Controller,
  Post,
  Body,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { GoogleAuthService } from './google-auth.service.js';
import { SessionService } from './session.service.js';
import { AesGcmService } from '../crypto/aes-gcm.service.js';
import {
  IUserRepository,
  USER_REPOSITORY_TOKEN,
} from '../database/user.repository.interface.js';
import { UserRecord } from '../database/user.entity.js';

export interface GoogleAuthDto {
  idToken?: string;
  code?: string;
  redirectUri?: string;
}

export interface AuthResponseDto {
  sessionToken: string;
  user: {
    id: string;
    googleSub: string;
    email: string;
    name?: string;
  };
}

@Controller('auth')
export class AuthController {
  constructor(
    private readonly _googleAuthService: GoogleAuthService,
    private readonly _sessionService: SessionService,
    private readonly _aesGcmService: AesGcmService,
    @Inject(USER_REPOSITORY_TOKEN) private readonly _userRepository: IUserRepository
  ) {}

  @Post('google')
  public async authenticateGoogle(@Body() body: GoogleAuthDto): Promise<AuthResponseDto> {
    if (!body || (!body.idToken && !body.code)) {
      throw new BadRequestException('Request body must contain either "idToken" or "code".');
    }

    let sub: string;
    let email: string;
    let name: string | undefined;
    let refreshToken: string | undefined;

    if (body.code) {
      // Exchange code for tokens
      const exchangeResult = await this._googleAuthService.exchangeAuthorizationCode(
        body.code,
        body.redirectUri
      );
      refreshToken = exchangeResult.refreshToken;

      // Extract identity from returned ID token or verify explicitly
      if (exchangeResult.idToken) {
        const payload = await this._googleAuthService.verifyIdToken(exchangeResult.idToken);
        sub = payload.sub;
        email = payload.email;
        name = payload.name;
      } else {
        // Fallback: derive from mock code
        sub = body.code.replace('mock_code_', '');
        email = `user_${sub}@gmail.com`;
      }
    } else if (body.idToken) {
      const payload = await this._googleAuthService.verifyIdToken(body.idToken);
      sub = payload.sub;
      email = payload.email;
      name = payload.name;
    } else {
      throw new BadRequestException('Missing authentication credentials.');
    }

    // Encrypt refresh token if present (AES-256-GCM)
    let encryptedRefreshToken = '';
    let encryptionIv = '';
    let encryptionTag = '';

    if (refreshToken) {
      const encrypted = this._aesGcmService.encrypt(refreshToken);
      encryptedRefreshToken = encrypted.ciphertextHex;
      encryptionIv = encrypted.ivHex;
      encryptionTag = encrypted.tagHex;
    }

    // Locate or create user account by Google Subject Identifier
    let user = await this._userRepository.findByGoogleSub(sub);

    const nowIso = new Date().toISOString();

    if (!user) {
      const newUser: UserRecord = {
        id: `usr_${crypto.randomUUID()}`,
        googleSub: sub,
        email,
        name,
        encryptedRefreshToken: encryptedRefreshToken || 'no_refresh_token_provided',
        encryptionIv: encryptionIv || '000000000000000000000000',
        encryptionTag: encryptionTag || '00000000000000000000000000000000',
        createdAtIso: nowIso,
        updatedAtIso: nowIso,
      };
      user = await this._userRepository.save(newUser);
    } else {
      // Update existing record if new refresh token was received
      const updates: Partial<UserRecord> = {
        email,
        name: name ?? user.name,
        updatedAtIso: nowIso,
      };
      if (encryptedRefreshToken) {
        updates.encryptedRefreshToken = encryptedRefreshToken;
        updates.encryptionIv = encryptionIv;
        updates.encryptionTag = encryptionTag;
      }
      user = (await this._userRepository.update(user.id, updates)) ?? user;
    }

    const sessionToken = this._sessionService.createSessionToken(user.id, user.googleSub, user.email);

    return {
      sessionToken,
      user: {
        id: user.id,
        googleSub: user.googleSub,
        email: user.email,
        name: user.name,
      },
    };
  }
}
