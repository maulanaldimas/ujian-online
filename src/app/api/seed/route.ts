import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashSync } from 'bcryptjs';

export async function POST(req: Request) {
  try {
    const { secret } = await req.json();
    if (secret !== process.env.JWT_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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

    return NextResponse.json({ ok: true, message: 'Seed complete: admin@ujian.com / admin123' });
  } catch (err) {
    console.error('Seed error:', err);
    return NextResponse.json({ error: 'Seed failed' }, { status: 500 });
  }
}
