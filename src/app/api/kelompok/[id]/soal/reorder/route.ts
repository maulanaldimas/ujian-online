import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const { items } = await req.json();
    if (!Array.isArray(items)) {
      return NextResponse.json({ error: 'items harus array' }, { status: 400 });
    }

    await Promise.all(
      items.map((item: { id: string; urutan: number }) =>
        prisma.soal.update({
          where: { id: item.id },
          data: { urutan: item.urutan },
        })
      )
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('POST /api/kelompok/[id]/soal/reorder error:', err);
    return NextResponse.json({ error: 'Gagal mengubah urutan' }, { status: 500 });
  }
}
