import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logAktivitas } from '@/lib/activity-log';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const daftar: Array<{ nama: string; email?: string; noHp?: string; lokasiKerja?: string; nikKtp?: string }> = body.peserta || [];

    if (daftar.length === 0) {
      return NextResponse.json({ error: 'Tidak ada data peserta' }, { status: 400 });
    }

    let sukses = 0;
    let gagal = 0;
    const errors: string[] = [];

    for (const item of daftar) {
      if (!item.nama || !item.nama.trim()) {
        gagal++;
        errors.push(`Baris ${sukses + gagal}: nama kosong`);
        continue;
      }
      try {
        await prisma.pesertaUjian.create({
          data: {
            nama: item.nama.trim(),
            email: item.email?.trim() || null,
            noHp: item.noHp?.trim() || null,
            lokasiKerja: item.lokasiKerja?.trim() || null,
            nikKtp: item.nikKtp?.trim() || null,
            status: 'belum_ujian',
          },
        });
        sukses++;
      } catch (err: any) {
        gagal++;
        errors.push(`${item.nama}: ${err.message?.slice(0, 60) || 'gagal'}`);
      }
    }

    logAktivitas({
      aksi: 'tambah_kelompok',
      entitas: 'peserta',
      detail: `Import bulk: ${sukses} berhasil, ${gagal} gagal dari ${daftar.length} data`,
    });

    return NextResponse.json({ sukses, gagal, total: daftar.length, errors: errors.slice(0, 10) });
  } catch (err) {
    console.error('POST /api/peserta/bulk error:', err);
    return NextResponse.json({ error: 'Gagal import peserta' }, { status: 500 });
  }
}
