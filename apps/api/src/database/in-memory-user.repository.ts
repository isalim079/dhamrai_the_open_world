import { Injectable } from '@nestjs/common';
import { IUserRepository } from './user.repository.interface.js';
import { UserRecord } from './user.entity.js';

@Injectable()
export class InMemoryUserRepository implements IUserRepository {
  private readonly _usersById: Map<string, UserRecord> = new Map();
  private readonly _idByGoogleSub: Map<string, string> = new Map();

  public async findById(id: string): Promise<UserRecord | null> {
    const user = this._usersById.get(id);
    return user ? { ...user } : null;
  }

  public async findByGoogleSub(googleSub: string): Promise<UserRecord | null> {
    const id = this._idByGoogleSub.get(googleSub);
    if (!id) return null;
    return this.findById(id);
  }

  public async save(user: UserRecord): Promise<UserRecord> {
    const cloned = { ...user };
    this._usersById.set(cloned.id, cloned);
    this._idByGoogleSub.set(cloned.googleSub, cloned.id);
    return { ...cloned };
  }

  public async update(id: string, partial: Partial<UserRecord>): Promise<UserRecord | null> {
    const existing = this._usersById.get(id);
    if (!existing) return null;

    const updated: UserRecord = {
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

  public async delete(id: string): Promise<boolean> {
    const existing = this._usersById.get(id);
    if (!existing) return false;

    this._idByGoogleSub.delete(existing.googleSub);
    this._usersById.delete(id);
    return true;
  }

  public async clearAll(): Promise<void> {
    this._usersById.clear();
    this._idByGoogleSub.clear();
  }
}
