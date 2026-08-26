import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const list = await prisma.kelompokSoal.findMany({
      orderBy: { nama: 'asc' },
      include: { _count: { select: { soal: true } } },
    });
    return NextResponse.json(list.map((k) => ({
      ...k,
      jumlahSoal: k._count.soal,
    })));
  } catch (err) {
    console.error('GET /api/kelompok error:', err);
    return NextResponse.json({ error: 'Gagal mengambil data kelompok' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const kelompok = await prisma.kelompokSoal.create({
      data: {
        nama: body.nama,
        level: body.level,
        divisi: body.divisi,
        departemen: body.departemen,
      },
    });
    return NextResponse.json(kelompok, { status: 201 });
  } catch (err) {
    console.error('POST /api/kelompok error:', err);
    return NextResponse.json({ error: 'Gagal membuat kelompok' }, { status: 500 });
  }
}
