import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

function parseFields(record: Record<string, any>) {
  const r = { ...record };
  try { r.jawaban = JSON.parse(r.jawaban || '{}'); } catch { r.jawaban = {}; }
  try { r.logPelanggaran = JSON.parse(r.logPelanggaran || '[]'); } catch { r.logPelanggaran = []; }
  return r;
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    if (url.searchParams.get('all') === '1') {
      const list = await prisma.pesertaUjian.findMany({
        orderBy: { createdAt: 'desc' },
        include: { kelompok: true },
      });
      return NextResponse.json(list.map(parseFields));
    }

    const authHeader = req.headers.get('authorization');
    const cookie = req.headers.get('cookie') || '';
    const tokenMatch = cookie.match(/token=([^;]+)/);
    const token = authHeader?.replace('Bearer ', '') || tokenMatch?.[1];

    if (!token) {
      const list = await prisma.pesertaUjian.findMany({
        orderBy: { createdAt: 'desc' },
        include: { kelompok: true },
      });
      return NextResponse.json(list.map(parseFields));
    }

    const list = await prisma.pesertaUjian.findMany({
      orderBy: { createdAt: 'desc' },
      include: { kelompok: true },
    });
    return NextResponse.json(list.map(parseFields));
  } catch (err) {
    console.error('GET /api/peserta error:', err);
    return NextResponse.json({ error: 'Gagal mengambil data peserta' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const peserta = await prisma.pesertaUjian.create({
      data: {
        nama: body.nama,
        email: body.email,
        noHp: body.noHp,
        lokasiKerja: body.lokasiKerja,
        nikKtp: body.nikKtp,
        authUid: body.authUid,
        status: body.status || 'belum_ujian',
        consentDiberikan: body.consentDiberikan || false,
        waktuConsent: body.waktuConsent,
      },
    });
    return NextResponse.json(peserta, { status: 201 });
  } catch (err) {
    console.error('POST /api/peserta error:', err);
    return NextResponse.json({ error: 'Gagal membuat peserta' }, { status: 500 });
  }
}
