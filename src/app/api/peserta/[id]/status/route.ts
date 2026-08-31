import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const peserta = await prisma.pesertaUjian.findUnique({
      where: { id },
      include: { kelompok: true },
    });
    if (!peserta) return NextResponse.json({ error: 'Peserta tidak ditemukan' }, { status: 404 });

    return NextResponse.json({
      status: peserta.status,
      waktuMulai: peserta.waktuMulai,
      kelompokId: peserta.kelompokId,
      level: peserta.level,
      divisi: peserta.divisi,
      departemen: peserta.departemen,
      kelompok: peserta.kelompok,
    });
  } catch (err) {
    console.error('GET /api/peserta/[id]/status error:', err);
    return NextResponse.json({ error: 'Gagal memeriksa status' }, { status: 500 });
  }
}
