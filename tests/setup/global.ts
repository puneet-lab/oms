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
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 1000 * i);
    }
  }
}

export async function setup() {
  process.env.NODE_ENV = 'test';

  const schema = `test_${randomUUID().replace(/-/g, '')}`;
  const base = process.env.DATABASE_URL!;
  const [url, q] = base.split('?');
  const testDbUrl = `${url}?schema=${schema}${q ? '&' + q : ''}`;

  process.env.DATABASE_URL = testDbUrl;

  const env = { ...process.env, DATABASE_URL: testDbUrl };

  waitPush(env);

  return async () => {
    const prisma = new PrismaClient({ datasources: { db: { url: testDbUrl } } });
    await prisma.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schema}" CASCADE;`);
    await prisma.$disconnect();
  };
}
