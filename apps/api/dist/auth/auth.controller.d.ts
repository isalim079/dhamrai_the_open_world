import type { Request, Response } from 'express';
import { GoogleAuthService } from './google-auth.service.js';
import { SessionService } from './session.service.js';
import { AesGcmService } from '../crypto/aes-gcm.service.js';
import { IUserRepository } from '../database/user.repository.interface.js';
export interface GoogleAuthDto {
    idToken?: string;
    code?: string;
    redirectUri?: string;
    state?: string;
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
export declare class AuthController {
    private readonly _googleAuthService;
    private readonly _sessionService;
    private readonly _aesGcmService;
    private readonly _userRepository;
    constructor(_googleAuthService: GoogleAuthService, _sessionService: SessionService, _aesGcmService: AesGcmService, _userRepository: IUserRepository);
    beginGoogle(res: Response): Promise<{
        authorizationUrl: string;
    }>;
    authenticateGoogle(body: GoogleAuthDto, req?: Request): Promise<AuthResponseDto>;
}
//# sourceMappingURL=auth.controller.d.ts.map