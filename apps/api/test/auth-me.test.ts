import { describe, it, expect, beforeEach } from 'vitest';
import { UnauthorizedException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import {
  AuthController,
  AuthGuard,
  SessionService,
  GoogleAuthService,
  AesGcmService,
  InMemoryUserRepository,
  type AuthenticatedRequest,
} from '../src/index.js';

describe('Milestone 8 — GET /api/auth/me & AuthGuard Unit Tests', () => {
  let sessionService: SessionService;
  let authGuard: AuthGuard;
  let authController: AuthController;

  beforeEach(() => {
    sessionService = new SessionService();
    authGuard = new AuthGuard(sessionService);
    authController = new AuthController(
      new GoogleAuthService(),
      sessionService,
      new AesGcmService(),
      new InMemoryUserRepository()
    );
  });

  const createMockContext = (authHeader?: string): { context: ExecutionContext; req: AuthenticatedRequest } => {
    const req: AuthenticatedRequest = {
      user: null as any,
      headers: {
        authorization: authHeader,
      },
    };

    const context = {
      switchToHttp: () => ({
        getRequest: () => req,
      }),
    } as unknown as ExecutionContext;

    return { context, req };
  };

  it('rejects requests with missing Authorization header', () => {
    const { context } = createMockContext(undefined);
    expect(() => authGuard.canActivate(context)).toThrowError(UnauthorizedException);
  });

  it('rejects requests with malformed Authorization header', () => {
    const { context: ctx1 } = createMockContext('Basic dXNlcjpwYXNz');
    expect(() => authGuard.canActivate(ctx1)).toThrowError(UnauthorizedException);

    const { context: ctx2 } = createMockContext('Bearer');
    expect(() => authGuard.canActivate(ctx2)).toThrowError(UnauthorizedException);
  });

  it('rejects forged or tampered session bearer tokens', () => {
    const validToken = sessionService.createSessionToken('usr_1', 'sub_1', 'u1@test.com');
    const tampered = validToken.slice(0, -6) + 'abcdef';

    const { context } = createMockContext(`Bearer ${tampered}`);
    expect(() => authGuard.canActivate(context)).toThrowError(UnauthorizedException);
  });

  it('authenticates valid session token and sets request.user payload', () => {
    const token = sessionService.createSessionToken('usr_valid_42', 'sub_google_42', 'driver42@dhamrai.test');

    const { context, req } = createMockContext(`Bearer ${token}`);
    const canActivate = authGuard.canActivate(context);

    expect(canActivate).toBe(true);
    expect(req.user).toBeDefined();
    expect(req.user.userId).toBe('usr_valid_42');
    expect(req.user.googleSub).toBe('sub_google_42');
    expect(req.user.email).toBe('driver42@dhamrai.test');
  });

  it('AuthController.getMe returns current user payload', async () => {
    const token = sessionService.createSessionToken('usr_me_1', 'sub_me_1', 'me@dhamrai.test');
    const { context, req } = createMockContext(`Bearer ${token}`);
    authGuard.canActivate(context);

    const res = await authController.getMe(req as any);
    expect(res).toEqual({ user: req.user });
    expect(res.user?.email).toBe('me@dhamrai.test');
  });
});
