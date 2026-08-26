import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string; soalId: string }> }) {
  try {
    const { soalId } = await params;
    const body = await req.json();

    if (body.urutan !== undefined) {
      const soal = await prisma.soal.update({
        where: { id: soalId },
        data: { urutan: body.urutan },
      });
      return NextResponse.json(soal);
    }

    const soal = await prisma.soal.update({
      where: { id: soalId },
      data: {
        teks: body.teks,
        tipe: body.tipe,
        pilihan: body.pilihan ? JSON.stringify(body.pilihan) : undefined,
        urutan: body.urutan,
      },
    });

    if (body.tipe === 'pilihan_ganda' && body.kunci !== undefined) {
      await prisma.kunciJawaban.upsert({
        where: { soalId },
        update: { jawabanBenar: body.kunci },
        create: { soalId, jawabanBenar: body.kunci },
      });
    } else if (body.tipe === 'esai') {
      await prisma.kunciJawaban.deleteMany({ where: { soalId } }).catch(() => {});
    }

    return NextResponse.json(soal);
  } catch (err) {
    console.error('PUT /api/kelompok/[id]/soal/[soalId] error:', err);
    return NextResponse.json({ error: 'Gagal memperbarui soal' }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string; soalId: string }> }) {
  try {
    const { soalId } = await params;
    await prisma.soal.delete({ where: { id: soalId } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('DELETE /api/kelompok/[id]/soal/[soalId] error:', err);
    return NextResponse.json({ error: 'Gagal menghapus soal' }, { status: 500 });
  }
}
