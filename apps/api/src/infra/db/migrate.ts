import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import path from 'node:path';
import postgres from 'postgres';

async function main(): Promise<void> {
  const url = process.env.DATABASE_URL ?? 'postgresql://pay:pay@localhost:5432/payments';
  const client = postgres(url, { max: 1 });

  try {
    await migrate(drizzle(client), {
      migrationsFolder: process.env.MIGRATIONS_DIR ?? path.join(process.cwd(), 'drizzle'),
    });
    console.log('Migrations applied');
  } finally {
    await client.end();
  }
}

main().catch((error: unknown) => {
  console.error('Migration failed', error);
  process.exitCode = 1;
});
