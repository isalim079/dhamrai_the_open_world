import { IUserRepository } from './user.repository.interface.js';
import { UserRecord } from './user.entity.js';
export declare class InMemoryUserRepository implements IUserRepository {
    private readonly _usersById;
    private readonly _idByGoogleSub;
    findById(id: string): Promise<UserRecord | null>;
    findByGoogleSub(googleSub: string): Promise<UserRecord | null>;
    save(user: UserRecord): Promise<UserRecord>;
    update(id: string, partial: Partial<UserRecord>): Promise<UserRecord | null>;
    delete(id: string): Promise<boolean>;
    clearAll(): Promise<void>;
}
//# sourceMappingURL=in-memory-user.repository.d.ts.map