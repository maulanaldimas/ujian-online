import { PrismaClient } from '@prisma/client';
import { hashSync } from 'bcryptjs';

function createPrismaClient() {
  if (process.env.DATABASE_URL?.startsWith('postgres')) {
    const { PrismaPg } = require('@prisma/adapter-pg') as typeof import('@prisma/adapter-pg');
    const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
    return new PrismaClient({ adapter });
  }
  const path = require('node:path') as typeof import('node:path');
  const { PrismaBetterSqlite3 } = require('@prisma/adapter-better-sqlite3') as typeof import('@prisma/adapter-better-sqlite3');
  const dbUrl = process.env.DATABASE_URL || `file:${path.resolve(process.cwd(), 'dev.db')}`;
  const adapter = new PrismaBetterSqlite3({ url: dbUrl });
  return new PrismaClient({ adapter });
}

const prisma = createPrismaClient();

async function main() {
  const adminPassword = hashSync('admin123', 10);
  await prisma.user.upsert({
    where: { email: 'admin@ujian.com' },
    update: {},
    create: {
      email: 'admin@ujian.com',
      password: adminPassword,
      name: 'Admin',
      role: 'admin',
    },
  });

  await prisma.pengaturan.upsert({
    where: { key: 'proctoring' },
    update: {},
    create: {
      key: 'proctoring',
      value: JSON.stringify({ kameraAktif: true, audioAktif: true }),
    },
  });

  console.log('Seed complete: admin@ujian.com / admin123');
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => { console.error(e); prisma.$disconnect(); process.exit(1); });
