import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logAktivitas } from '@/lib/activity-log';

function parseFields(record: Record<string, any>) {
  const r = { ...record };
  try { r.jawaban = JSON.parse(r.jawaban || '{}'); } catch { r.jawaban = {}; }
  try { r.logPelanggaran = JSON.parse(r.logPelanggaran || '[]'); } catch { r.logPelanggaran = []; }
  return r;
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const peserta = await prisma.pesertaUjian.findUnique({
      where: { id },
      include: { kelompok: true, penilaian: true },
    });
    if (!peserta) return NextResponse.json({ error: 'Peserta tidak ditemukan' }, { status: 404 });
    return NextResponse.json(parseFields(peserta));
  } catch (err) {
    console.error('GET /api/peserta/[id] error:', err);
    return NextResponse.json({ error: 'Gagal mengambil data' }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();

    const data: Record<string, any> = {};
    const allowed = ['nama', 'email', 'noHp', 'lokasiKerja', 'nikKtp', 'status', 'consentDiberikan',
      'waktuConsent', 'waktuMulai', 'waktuSelesai', 'kelompokId', 'level', 'divisi', 'departemen',
      'totalPelanggaran', 'terakhirDisimpan'];

    for (const key of allowed) {
      if (body[key] !== undefined) data[key] = body[key];
    }
    if (body.jawaban !== undefined) data.jawaban = JSON.stringify(body.jawaban);
    if (body.logPelanggaran !== undefined) data.logPelanggaran = JSON.stringify(body.logPelanggaran);

    const updated = await prisma.pesertaUjian.update({ where: { id }, data });

    if (body.status === 'sedang_ujian' && !body.terakhirDisimpan) {
      logAktivitas({ aksi: 'mulai_ujian', entitas: 'peserta', entitasId: id, detail: `${updated.nama} memulai ujian` });
    }
    if (body.status === 'selesai') {
      logAktivitas({ aksi: 'selesai_ujian', entitas: 'peserta', entitasId: id, detail: `${updated.nama} menyelesaikan ujian` });
    }
    if (body.totalPelanggaran !== undefined && body.totalPelanggaran > 0) {
      logAktivitas({ aksi: 'pelanggaran', entitas: 'peserta', entitasId: id, detail: `${updated.nama}: ${body.totalPelanggaran} pelanggaran` });
    }

    return NextResponse.json(parseFields(updated));
  } catch (err) {
    console.error('PUT /api/peserta/[id] error:', err);
    return NextResponse.json({ error: 'Gagal memperbarui peserta' }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await prisma.pesertaUjian.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('DELETE /api/peserta/[id] error:', err);
    return NextResponse.json({ error: 'Gagal menghapus peserta' }, { status: 500 });
  }
}
