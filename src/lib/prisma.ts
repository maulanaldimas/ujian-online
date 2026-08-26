import { PrismaClient } from '@prisma/client';
import path from 'node:path';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

function getDbUrl(): string {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  if (process.env.NODE_ENV === 'production') {
    return process.env.DATABASE_URL || '';
  }
  return `file:${path.resolve(process.cwd(), 'dev.db')}`;
}

function createPrismaClient() {
  const url = getDbUrl();
  if (url.startsWith('postgres')) {
    return new PrismaClient();
  }
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { PrismaBetterSqlite3 } = require('@prisma/adapter-better-sqlite3');
  const adapter = new PrismaBetterSqlite3({ url });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma || createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
