import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logAktivitas } from '@/lib/activity-log';
import { hitungGrace } from '@/lib/utils';

const GRACE_DEFAULT_DETIK = 120;

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const offlineDetik = Number(body.offlineDetik);

    const peserta = await prisma.pesertaUjian.findUnique({ where: { id } });
    if (!peserta) {
      return NextResponse.json({ error: 'Peserta tidak ditemukan' }, { status: 404 });
    }
    if (peserta.status !== 'sedang_ujian') {
      return NextResponse.json({ error: 'Peserta tidak sedang mengerjakan ujian' }, { status: 400 });
    }
    if (!peserta.waktuMulai) {
      return NextResponse.json({ error: 'Peserta belum mulai ujian' }, { status: 400 });
    }
    if (!Number.isFinite(offlineDetik) || offlineDetik <= 0) {
      return NextResponse.json({ granted: 0, sisaGrace: Math.max(0, GRACE_DEFAULT_DETIK - peserta.graceDipakai) });
    }

    const setting = await prisma.pengaturan.findUnique({ where: { key: 'proctoring' } });
    let maxGrace = GRACE_DEFAULT_DETIK;
    if (setting) {
      try {
        const parsed = JSON.parse(setting.value);
        if (Number.isFinite(Number(parsed.graceReconnectDetik))) {
          maxGrace = Math.max(0, Number(parsed.graceReconnectDetik));
        }
      } catch {}
    }

    const sisaGrace = Math.max(0, maxGrace - peserta.graceDipakai);
    const granted = hitungGrace(offlineDetik, sisaGrace);

    if (granted > 0) {
      const waktuMulaiBaru = new Date(peserta.waktuMulai.getTime() - granted * 1000);
      await prisma.pesertaUjian.update({
        where: { id },
        data: { waktuMulai: waktuMulaiBaru, graceDipakai: peserta.graceDipakai + granted },
      });
      logAktivitas({
        aksi: 'resume_ujian',
        entitas: 'peserta',
        entitasId: id,
        detail: `${peserta.nama} terputus dan resume, waktu dipulihkan ${granted} detik`,
      });
      return NextResponse.json({ ok: true, granted, sisaGrace: Math.max(0, sisaGrace - granted), waktuMulai: waktuMulaiBaru.toISOString() });
    }

    return NextResponse.json({ ok: true, granted: 0, sisaGrace });
  } catch (err) {
    console.error('POST /api/peserta/[id]/resume error:', err);
    return NextResponse.json({ error: 'Gagal memulihkan waktu ujian' }, { status: 500 });
  }
}