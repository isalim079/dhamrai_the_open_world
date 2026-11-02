import { Module } from '@nestjs/common';
import { InMemoryUserRepository } from './in-memory-user.repository.js';
import { USER_REPOSITORY_TOKEN } from './user.repository.interface.js';

@Module({
  providers: [
    {
      provide: USER_REPOSITORY_TOKEN,
      useClass: InMemoryUserRepository,
    },
    InMemoryUserRepository,
  ],
  exports: [USER_REPOSITORY_TOKEN, InMemoryUserRepository],
})
export class DatabaseModule {}
