import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logAktivitas } from '@/lib/activity-log';

export async function GET() {
  try {
    const setting = await prisma.pengaturan.findUnique({ where: { key: 'proctoring' } });
    if (!setting) return NextResponse.json({ kameraAktif: true, audioAktif: true });
    return NextResponse.json(JSON.parse(setting.value));
  } catch (err) {
    console.error('GET /api/pengaturan error:', err);
    return NextResponse.json({ error: 'Gagal mengambil pengaturan' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const value = JSON.stringify(body);
    await prisma.pengaturan.upsert({
      where: { key: 'proctoring' },
      update: { value },
      create: { key: 'proctoring', value },
    });
    logAktivitas({ aksi: 'update_pengaturan', entitas: 'pengaturan', detail: `Proctoring: ${JSON.stringify(body)}` });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('PUT /api/pengaturan error:', err);
    return NextResponse.json({ error: 'Gagal menyimpan pengaturan' }, { status: 500 });
  }
}
