import { describe, it, expect, beforeEach } from 'vitest';
import { UnauthorizedException, BadRequestException } from '@nestjs/common';
import {
  GoogleAuthService,
  SessionService,
  AuthController,
  AuthGuard,
  AesGcmService,
  InMemoryUserRepository,
} from '../src/index.js';

describe('API Auth — Google OAuth & Session Gateway', () => {
  let googleAuthService: GoogleAuthService;
  let sessionService: SessionService;
  let aesGcmService: AesGcmService;
  let userRepository: InMemoryUserRepository;
  let authController: AuthController;
  let authGuard: AuthGuard;

  beforeEach(() => {
    googleAuthService = new GoogleAuthService();
    sessionService = new SessionService();
    aesGcmService = new AesGcmService();
    userRepository = new InMemoryUserRepository();
    authController = new AuthController(
      googleAuthService,
      sessionService,
      aesGcmService,
      userRepository
    );
    authGuard = new AuthGuard(sessionService);
  });

  describe('Google ID Token & Code Verification', () => {
    it('verifies valid mock ID token and extracts stable Google sub identifier', async () => {
      const token = 'mock_token_sub_10203040';
      const payload = await googleAuthService.verifyIdToken(token);

      expect(payload.sub).toBe('sub_10203040');
      expect(payload.email).toBe('sub_10203040@example.com');
      expect(payload.iss).toBe('https://accounts.google.com');
    });

    it('rejects malformed or empty ID token strings', async () => {
      await expect(googleAuthService.verifyIdToken('')).rejects.toThrowError(UnauthorizedException);
      await expect(googleAuthService.verifyIdToken('not.a.valid.jwt.string')).rejects.toThrowError(
        UnauthorizedException
      );
    });

    it('exchanges OAuth authorization code for tokens with drive.appdata scope', async () => {
      const code = 'mock_code_sub_556677';
      const result = await googleAuthService.exchangeAuthorizationCode(code);

      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(result.scope).toContain('drive.appdata');
    });
  });

  describe('AuthController POST /auth/google', () => {
    it('authenticates new user with code, creates account, encrypts refresh token at rest, and returns session', async () => {
      const response = await authController.authenticateGoogle({
        code: 'mock_code_user_alpha_99',
      });

      expect(response.sessionToken).toBeDefined();
      expect(response.user.googleSub).toBe('user_alpha_99');
      expect(response.user.id).toMatch(/^usr_/);

      // Verify user was stored in repository with encrypted refresh token
      const stored = await userRepository.findByGoogleSub('user_alpha_99');
      expect(stored).not.toBeNull();
      expect(stored?.googleSub).toBe('user_alpha_99');

      // Crucial: Refresh token must be encrypted, NEVER stored in plaintext
      expect(stored?.encryptedRefreshToken).not.toContain('mock_refresh_token');
      expect(stored?.encryptionIv.length).toBe(24);
      expect(stored?.encryptionTag.length).toBe(32);

      // Verify that decryption produces the original refresh token
      const decrypted = aesGcmService.decrypt({
        ciphertextHex: stored!.encryptedRefreshToken,
        ivHex: stored!.encryptionIv,
        tagHex: stored!.encryptionTag,
      });
      expect(decrypted).toContain('mock_refresh_token_user_alpha_99');
    });

    it('updates existing user on subsequent logins without duplicating accounts', async () => {
      // First login
      const resp1 = await authController.authenticateGoogle({
        code: 'mock_code_user_beta_88',
      });

      // Second login with ID token
      const resp2 = await authController.authenticateGoogle({
        idToken: 'mock_token_user_beta_88',
      });

      // Same user ID
      expect(resp2.user.id).toBe(resp1.user.id);
      expect(resp2.user.googleSub).toBe('user_beta_88');
    });

    it('rejects empty authentication payload with BadRequestException', async () => {
      await expect(authController.authenticateGoogle({})).rejects.toThrowError(BadRequestException);
    });
  });

  describe('Session Token & AuthGuard Protection', () => {
    it('creates and verifies session bearer tokens', () => {
      const token = sessionService.createSessionToken('usr_01', 'sub_01', 'user@dhamrai.bd');
      expect(typeof token).toBe('string');

      const verified = sessionService.verifySessionToken(token);
      expect(verified.userId).toBe('usr_01');
      expect(verified.googleSub).toBe('sub_01');
      expect(verified.email).toBe('user@dhamrai.bd');
      expect(verified.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
    });

    it('rejects tampered session tokens', () => {
      const token = sessionService.createSessionToken('usr_01', 'sub_01', 'user@dhamrai.bd');
      const tampered = token.slice(0, -2) + 'aa';

      expect(() => sessionService.verifySessionToken(tampered)).toThrowError(UnauthorizedException);
    });

    it('AuthGuard permits valid bearer requests and attaches user payload', () => {
      const token = sessionService.createSessionToken('usr_01', 'sub_01', 'user@dhamrai.bd');
      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => ({
            headers: { authorization: `Bearer ${token}` },
          }),
        }),
      } as any;

      const canActivate = authGuard.canActivate(mockContext);
      expect(canActivate).toBe(true);
    });

    it('AuthGuard throws UnauthorizedException on missing or invalid header', () => {
      const missingContext = {
        switchToHttp: () => ({
          getRequest: () => ({ headers: {} }),
        }),
      } as any;

      expect(() => authGuard.canActivate(missingContext)).toThrowError(UnauthorizedException);

      const invalidSchemeContext = {
        switchToHttp: () => ({
          getRequest: () => ({ headers: { authorization: 'Basic 12345' } }),
        }),
      } as any;

      expect(() => authGuard.canActivate(invalidSchemeContext)).toThrowError(UnauthorizedException);
    });
  });
});
