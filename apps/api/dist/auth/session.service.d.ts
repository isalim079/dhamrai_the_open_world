/**
 * Dhamrai Life — Session Management Service
 * ==========================================
 * Issues and validates signed session bearer tokens for authenticated clients.
 */
export interface SessionPayload {
    userId: string;
    googleSub: string;
    email: string;
    exp: number;
}
export declare class SessionService {
    private readonly _sessionSecret;
    constructor();
    /**
     * Signs a new session bearer token valid for 7 days.
     */
    createSessionToken(userId: string, googleSub: string, email: string): string;
    /**
     * Validates a session bearer token and returns its payload.
     */
    verifySessionToken(token: string): SessionPayload;
}
//# sourceMappingURL=session.service.d.ts.map