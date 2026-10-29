import { Injectable, type OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import type { Env } from '../../config/env';
import * as schema from './schema';

export type Database = PostgresJsDatabase<typeof schema>;

@Injectable()
export class DatabaseService implements OnApplicationShutdown {
  private readonly client: ReturnType<typeof postgres>;
  readonly db: Database;

  constructor(config: ConfigService<Env, true>) {
    const url = config.get('DATABASE_URL', { infer: true });
    this.client = postgres(url, {
      max: 10,
      onnotice: () => undefined,
    });
    this.db = drizzle(this.client, { schema });
  }

  async ping(): Promise<void> {
    await this.client`select 1`;
  }

  async onApplicationShutdown(): Promise<void> {
    await this.client.end({ timeout: 5 });
  }
}
