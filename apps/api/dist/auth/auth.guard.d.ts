import { CanActivate, ExecutionContext } from '@nestjs/common';
import { SessionService, SessionPayload } from './session.service.js';
export interface AuthenticatedRequest {
    user: SessionPayload;
    headers: Record<string, string | string[] | undefined>;
}
export declare class AuthGuard implements CanActivate {
    private readonly _sessionService;
    constructor(_sessionService: SessionService);
    canActivate(context: ExecutionContext): boolean;
}
//# sourceMappingURL=auth.guard.d.ts.map