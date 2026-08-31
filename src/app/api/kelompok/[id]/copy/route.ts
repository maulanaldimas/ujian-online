import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logAktivitas } from '@/lib/activity-log';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const sumberKelompokId: string = body.sumberKelompokId;

    if (!sumberKelompokId) {
      return NextResponse.json({ error: 'Kelompok sumber wajib dipilih' }, { status: 400 });
    }

    const sumber = await prisma.kelompokSoal.findUnique({ where: { id: sumberKelompokId } });
    if (!sumber) {
      return NextResponse.json({ error: 'Kelompok sumber tidak ditemukan' }, { status: 404 });
    }

    const target = await prisma.kelompokSoal.findUnique({ where: { id } });
    if (!target) {
      return NextResponse.json({ error: 'Kelompok target tidak ditemukan' }, { status: 404 });
    }

    const sumberSoal = await prisma.soal.findMany({
      where: { kelompokId: sumberKelompokId },
      orderBy: { urutan: 'asc' },
      include: { kunci: true },
    });

    if (sumberSoal.length === 0) {
      return NextResponse.json({ error: 'Kelompok sumber tidak memiliki soal' }, { status: 400 });
    }

    const targetSoal = await prisma.soal.findMany({
      where: { kelompokId: id },
    });
    const maxUrutan = targetSoal.reduce((max, s) => Math.max(max, s.urutan || 0), 0);

    let disalin = 0;
    for (let i = 0; i < sumberSoal.length; i++) {
      const s = sumberSoal[i];
      const newSoal = await prisma.soal.create({
        data: {
          kelompokId: id,
          teks: s.teks,
          tipe: s.tipe,
          pilihan: s.pilihan,
          gambar: s.gambar,
          urutan: maxUrutan + i + 1,
        },
      });
      if (s.kunci && s.kunci.jawabanBenar) {
        await prisma.kunciJawaban.create({
          data: { soalId: newSoal.id, jawabanBenar: s.kunci.jawabanBenar },
        });
      }
      disalin++;
    }

    logAktivitas({
      aksi: 'tambah_soal',
      entitas: 'kelompok_soal',
      entitasId: id,
      detail: `Disalin ${disalin} soal dari "${sumber.nama}" ke "${target.nama}"`,
    });

    return NextResponse.json({ disalin, dari: sumber.nama, ke: target.nama });
  } catch (err) {
    console.error('POST /api/kelompok/[id]/copy error:', err);
    return NextResponse.json({ error: 'Gagal menyalin soal' }, { status: 500 });
  }
}
