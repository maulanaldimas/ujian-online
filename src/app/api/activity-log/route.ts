import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '50')));
    const aksi = searchParams.get('aksi');
    const entitas = searchParams.get('entitas');

    const where: Record<string, any> = {};
    if (aksi) where.aksi = aksi;
    if (entitas) where.entitas = entitas;

    const [items, total] = await Promise.all([
      prisma.activityLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.activityLog.count({ where }),
    ]);

    return NextResponse.json({ items, total, page, limit });
  } catch (err) {
    console.error('GET /api/activity-log error:', err);
    return NextResponse.json({ error: 'Gagal mengambil log aktivitas' }, { status: 500 });
  }
}
