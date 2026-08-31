import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logAktivitas } from '@/lib/activity-log';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const kelompok = await prisma.kelompokSoal.findUnique({
      where: { id },
      include: { _count: { select: { soal: true } } },
    });
    if (!kelompok) return NextResponse.json({ error: 'Kelompok tidak ditemukan' }, { status: 404 });
    return NextResponse.json({ ...kelompok, jumlahSoal: kelompok._count.soal });
  } catch (err) {
    console.error('GET /api/kelompok/[id] error:', err);
    return NextResponse.json({ error: 'Gagal mengambil data' }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const updated = await prisma.kelompokSoal.update({
      where: { id },
      data: {
        nama: body.nama,
        level: body.level,
        divisi: body.divisi,
        departemen: body.departemen,
      },
    });
    logAktivitas({ aksi: 'edit_kelompok', entitas: 'kelompok_soal', entitasId: id, detail: `Kelompok "${updated.nama}" diperbarui` });
    return NextResponse.json(updated);
  } catch (err) {
    console.error('PUT /api/kelompok/[id] error:', err);
    return NextResponse.json({ error: 'Gagal memperbarui kelompok' }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await prisma.kelompokSoal.delete({ where: { id } });
    logAktivitas({ aksi: 'hapus_kelompok', entitas: 'kelompok_soal', entitasId: id, detail: `Kelompok ${id} dihapus` });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('DELETE /api/kelompok/[id] error:', err);
    return NextResponse.json({ error: 'Gagal menghapus kelompok' }, { status: 500 });
  }
}
