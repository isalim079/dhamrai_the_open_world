import { UserRecord } from './user.entity.js';

export const USER_REPOSITORY_TOKEN = Symbol('IUserRepository');

export interface IUserRepository {
  findById(id: string): Promise<UserRecord | null>;
  findByGoogleSub(googleSub: string): Promise<UserRecord | null>;
  save(user: UserRecord): Promise<UserRecord>;
  update(id: string, partial: Partial<UserRecord>): Promise<UserRecord | null>;
  delete(id: string): Promise<boolean>;
  clearAll?(): Promise<void>;
}
