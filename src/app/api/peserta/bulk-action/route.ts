import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logAktivitas } from '@/lib/activity-log';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, ids } = body as { action: string; ids: string[] };

    if (!ids || ids.length === 0) {
      return NextResponse.json({ error: 'Tidak ada peserta dipilih' }, { status: 400 });
    }

    if (!['assign_kelompok', 'delete', 'reset_status'].includes(action)) {
      return NextResponse.json({ error: 'Aksi tidak valid' }, { status: 400 });
    }

    let affected = 0;

    if (action === 'assign_kelompok') {
      const { kelompokId, level, divisi, departemen } = body;
      if (!kelompokId) {
        return NextResponse.json({ error: 'Kelompok tidak valid' }, { status: 400 });
      }
      const result = await prisma.pesertaUjian.updateMany({
        where: { id: { in: ids }, status: 'belum_ujian' },
        data: { kelompokId, level: level ?? null, divisi: divisi ?? null, departemen: departemen ?? null },
      });
      affected = result.count;
      logAktivitas({
        aksi: 'ubah_penetapan_kelompok',
        entitas: 'peserta',
        detail: `Bulk assign kelompok: ${affected} peserta`,
      });
    } else if (action === 'delete') {
      const result = await prisma.pesertaUjian.deleteMany({
        where: { id: { in: ids }, status: { not: 'sedang_ujian' } },
      });
      affected = result.count;
      logAktivitas({
        aksi: 'hapus_kelompok',
        entitas: 'peserta',
        detail: `Bulk hapus: ${affected} peserta`,
      });
    } else if (action === 'reset_status') {
      const result = await prisma.pesertaUjian.updateMany({
        where: { id: { in: ids }, status: { not: 'sedang_ujian' } },
        data: {
          status: 'belum_ujian',
          waktuMulai: null,
          waktuSelesai: null,
          jawaban: '{}',
          totalPelanggaran: 0,
          terakhirDisimpan: null,
        },
      });
      affected = result.count;
      logAktivitas({
        aksi: 'edit_kelompok',
        entitas: 'peserta',
        detail: `Bulk reset status: ${affected} peserta`,
      });
    }

    return NextResponse.json({ affected });
  } catch (err) {
    console.error('POST /api/peserta/bulk-action error:', err);
    return NextResponse.json({ error: 'Gagal melakukan aksi bulk' }, { status: 500 });
  }
}
