import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const soalList = await prisma.soal.findMany({
      where: { kelompokId: id },
      orderBy: { urutan: 'asc' },
      include: { kunci: true },
    });
    const result = soalList.map((s) => ({
      id: s.id,
      teks: s.teks,
      tipe: s.tipe,
      pilihan: (() => { try { return JSON.parse(s.pilihan || '[]'); } catch { return []; } })(),
      urutan: s.urutan,
      kunci: s.kunci?.jawabanBenar || '',
    }));
    return NextResponse.json(result);
  } catch (err) {
    console.error('GET /api/kelompok/[id]/soal error:', err);
    return NextResponse.json({ error: 'Gagal mengambil data soal' }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const soal = await prisma.soal.create({
      data: {
        kelompokId: id,
        teks: body.teks,
        tipe: body.tipe || 'esai',
        pilihan: body.pilihan ? JSON.stringify(body.pilihan) : '[]',
        urutan: body.urutan || 0,
      },
    });

    if (body.tipe === 'pilihan_ganda' && body.kunci) {
      await prisma.kunciJawaban.create({
        data: { soalId: soal.id, jawabanBenar: body.kunci },
      });
    }

    return NextResponse.json(soal, { status: 201 });
  } catch (err) {
    console.error('POST /api/kelompok/[id]/soal error:', err);
    return NextResponse.json({ error: 'Gagal menambah soal' }, { status: 500 });
  }
}
