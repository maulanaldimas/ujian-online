import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logAktivitas } from '@/lib/activity-log';

const MAKS_MENIT_TAMBAH = 60;
const MAKS_PESAN = 500;

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const aksi: string = body.aksi;
    const nilai: number | string = body.nilai;

    const peserta = await prisma.pesertaUjian.findUnique({ where: { id } });
    if (!peserta) {
      return NextResponse.json({ error: 'Peserta tidak ditemukan' }, { status: 404 });
    }

    if (peserta.status !== 'sedang_ujian') {
      return NextResponse.json({ error: 'Peserta tidak sedang mengerjakan ujian' }, { status: 400 });
    }

    if (aksi === 'force_submit') {
      await prisma.pesertaUjian.update({
        where: { id },
        data: { status: 'selesai', waktuSelesai: new Date() },
      });
      logAktivitas({
        aksi: 'force_submit',
        entitas: 'peserta',
        entitasId: id,
        detail: `Ujian ${peserta.nama} diakhiri paksa oleh admin`,
      });
      return NextResponse.json({ ok: true, status: 'selesai' });
    }

    if (aksi === 'tambah_waktu') {
      const menit = Math.min(MAKS_MENIT_TAMBAH, Math.max(1, Number(nilai) || 0));
      if (!peserta.waktuMulai) {
        return NextResponse.json({ error: 'Peserta belum mulai ujian' }, { status: 400 });
      }
      const waktuMulaiBaru = new Date(peserta.waktuMulai.getTime() - menit * 60000);
      await prisma.pesertaUjian.update({
        where: { id },
        data: { waktuMulai: waktuMulaiBaru },
      });
      logAktivitas({
        aksi: 'tambah_waktu',
        entitas: 'peserta',
        entitasId: id,
        detail: `Waktu ujian ${peserta.nama} ditambah ${menit} menit`,
      });
      return NextResponse.json({ ok: true, waktuMulai: waktuMulaiBaru.toISOString() });
    }

    if (aksi === 'kirim_pesan') {
      const pesan = String(nilai ?? '').trim().slice(0, MAKS_PESAN);
      if (!pesan) {
        return NextResponse.json({ error: 'Pesan tidak boleh kosong' }, { status: 400 });
      }
      await prisma.pesertaUjian.update({
        where: { id },
        data: { pesanAdmin: pesan },
      });
      logAktivitas({
        aksi: 'kirim_pesan',
        entitas: 'peserta',
        entitasId: id,
        detail: `Pesan dikirim ke ${peserta.nama}`,
      });
      return NextResponse.json({ ok: true, pesan });
    }

    return NextResponse.json({ error: 'Aksi tidak dikenal' }, { status: 400 });
  } catch (err) {
    console.error('POST /api/peserta/[id]/kontrol error:', err);
    return NextResponse.json({ error: 'Gagal menjalankan aksi kontrol' }, { status: 500 });
  }
}