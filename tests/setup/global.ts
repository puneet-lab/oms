// tests/setup/global.ts
import { randomUUID } from 'node:crypto';
import { execSync } from 'node:child_process';
import { PrismaClient } from '@prisma/client';

function waitPush(env: NodeJS.ProcessEnv) {
  const tries = 10;
  for (let i = 1; i <= tries; i++) {
    try {
      execSync('npx prisma db push --skip-generate', { stdio: 'inherit', env });
      return;
    } catch {
      if (i === tries) throw new Error('prisma db push failed after retries');
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 1000 * i); // backoff
    }
  }
}

export async function setup() {
  process.env.NODE_ENV = 'test';

  const schema = `test_${randomUUID().replace(/-/g, '')}`;
  const base = process.env.DATABASE_URL!;
  const [url, q] = base.split('?');
  const env = { ...process.env, DATABASE_URL: `${url}?schema=${schema}${q ? '&' + q : ''}` };

  // Create fresh schema from current Prisma schema, with retries until PG is ready
  waitPush(env);

  // Teardown: drop schema
  return async () => {
    const prisma = new PrismaClient({ datasources: { db: { url: env.DATABASE_URL! } } });
    await prisma.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schema}" CASCADE;`);
    await prisma.$disconnect();
  };
}
