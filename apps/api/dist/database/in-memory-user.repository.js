var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Injectable } from '@nestjs/common';
let InMemoryUserRepository = class InMemoryUserRepository {
    _usersById = new Map();
    _idByGoogleSub = new Map();
    async findById(id) {
        const user = this._usersById.get(id);
        return user ? { ...user } : null;
    }
    async findByGoogleSub(googleSub) {
        const id = this._idByGoogleSub.get(googleSub);
        if (!id)
            return null;
        return this.findById(id);
    }
    async save(user) {
        const cloned = { ...user };
        this._usersById.set(cloned.id, cloned);
        this._idByGoogleSub.set(cloned.googleSub, cloned.id);
        return { ...cloned };
    }
    async update(id, partial) {
        const existing = this._usersById.get(id);
        if (!existing)
            return null;
        const updated = {
            ...existing,
            ...partial,
            id: existing.id, // Immutable
            updatedAtIso: new Date().toISOString(),
        };
        if (partial.googleSub && partial.googleSub !== existing.googleSub) {
            this._idByGoogleSub.delete(existing.googleSub);
            this._idByGoogleSub.set(updated.googleSub, updated.id);
        }
        this._usersById.set(id, updated);
        return { ...updated };
    }
    async delete(id) {
        const existing = this._usersById.get(id);
        if (!existing)
            return false;
        this._idByGoogleSub.delete(existing.googleSub);
        this._usersById.delete(id);
        return true;
    }
    async clearAll() {
        this._usersById.clear();
        this._idByGoogleSub.clear();
    }
};
InMemoryUserRepository = __decorate([
    Injectable()
], InMemoryUserRepository);
export { InMemoryUserRepository };
//# sourceMappingURL=in-memory-user.repository.js.map