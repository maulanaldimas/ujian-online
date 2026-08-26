import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { PrismaClient } from '@prisma/client';
import { hashSync } from 'bcryptjs';
import path from 'node:path';

const dbUrl = process.env.DATABASE_URL || `file:${path.resolve(process.cwd(), 'dev.db')}`;

const adapter = new PrismaBetterSqlite3({ url: dbUrl });
const prisma = new PrismaClient({ adapter });

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
