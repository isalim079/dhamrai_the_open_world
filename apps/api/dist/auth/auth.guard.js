var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { Injectable, UnauthorizedException, } from '@nestjs/common';
import { SessionService } from './session.service.js';
let AuthGuard = class AuthGuard {
    _sessionService;
    constructor(_sessionService) {
        this._sessionService = _sessionService;
    }
    canActivate(context) {
        const request = context.switchToHttp().getRequest();
        const authHeader = request.headers['authorization'];
        if (!authHeader || typeof authHeader !== 'string') {
            throw new UnauthorizedException('Authorization header missing.');
        }
        const [scheme, token] = authHeader.split(' ');
        if (scheme?.toLowerCase() !== 'bearer' || !token) {
            throw new UnauthorizedException('Malformed Authorization header. Format: "Bearer <token>".');
        }
        const payload = this._sessionService.verifySessionToken(token);
        request.user = payload;
        return true;
    }
};
AuthGuard = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [SessionService])
], AuthGuard);
export { AuthGuard };
//# sourceMappingURL=auth.guard.js.map