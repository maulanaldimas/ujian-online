import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const list = await prisma.penilaianEsai.findMany();
    const result: Record<string, any> = {};
    for (const p of list) {
      result[p.pesertaId] = {
        skorEsai: (() => { try { return JSON.parse(p.skorEsai || '{}'); } catch { return {}; } })(),
        totalEsai: p.totalEsai,
        dinilaiOleh: p.dinilaiOleh,
        waktuDinilai: p.waktuDinilai,
      };
    }
    return NextResponse.json(result);
  } catch (err) {
    console.error('GET /api/penilaian error:', err);
    return NextResponse.json({ error: 'Gagal mengambil data penilaian' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const data = {
      skorEsai: JSON.stringify(body.skorEsai || {}),
      totalEsai: body.totalEsai || 0,
      dinilaiOleh: body.dinilaiOleh,
      waktuDinilai: body.waktuDinilai ? new Date(body.waktuDinilai) : new Date(),
    };

    await prisma.penilaianEsai.upsert({
      where: { pesertaId: body.pesertaId },
      update: data,
      create: { pesertaId: body.pesertaId, ...data },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('POST /api/penilaian error:', err);
    return NextResponse.json({ error: 'Gagal menyimpan penilaian' }, { status: 500 });
  }
}
