import { PrismaClient } from '@prisma/client';

function createPrismaClient() {
  if (process.env.DATABASE_URL?.startsWith('postgres')) {
    const { PrismaPg } = require('@prisma/adapter-pg') as typeof import('@prisma/adapter-pg');
    const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
    return new PrismaClient({ adapter });
  }
  const path = require('node:path') as typeof import('node:path');
  const { PrismaBetterSqlite3 } = require('@prisma/adapter-better-sqlite3') as typeof import('@prisma/adapter-better-sqlite3');
  const dbUrl = process.env.DATABASE_URL || `file:${path.resolve(process.cwd(), 'dev.db')}`;
  const adapter = new PrismaBetterSqlite3({ url: dbUrl });
  return new PrismaClient({ adapter });
}

const prisma = createPrismaClient();

const KELOMPOK_DEMO = 'Seleksi Kompetensi Dasar — Staf Administrasi';

const PRECOUNT_PG_SALAH = 1;

const EMAIL_DEMO = [
  'rina.kusuma@example.com',
  'budi.santoso@example.com',
  'sari.dewi@example.com',
  'andi.wijaya@example.com',
  'maya.putri@example.com',
  'dedi.firmansyah@example.com',
  'novi.rahayu@example.com',
  'arif.gunawan@example.com',
];

const SOAL_DEMO: { teks: string; tipe: string; pilihan?: string[]; kunci?: string; esai?: string[] }[] = [
  {
    teks: 'Apa kepanjangan dari SWOT?',
    tipe: 'pilihan_ganda',
    pilihan: [
      'Strengths, Weaknesses, Opportunities, Threats',
      'Strengths, Weaknesses, Options, Threats',
      'Strategy, Workflow, Organization, Teamwork',
      'System, Web, Output, Testing',
    ],
    kunci: 'Strengths, Weaknesses, Opportunities, Threats',
  },
  {
    teks: 'Berapa hasil dari 15 × 4?',
    tipe: 'pilihan_ganda',
    pilihan: ['60', '45', '50', '70'],
    kunci: '60',
  },
  {
    teks: 'Dalam komunikasi efektif, apa fungsi utama dari feedback?',
    tipe: 'pilihan_ganda',
    pilihan: [
      'Memastikan pesan dipahami dengan benar',
      'Memperpanjang percakapan',
      'Menggantikan bahasa tubuh',
      'Menghindari konflik',
    ],
    kunci: 'Memastikan pesan dipahami dengan benar',
  },
  {
    teks: 'Manakah yang termasuk sikap kerja profesional?',
    tipe: 'pilihan_ganda',
    pilihan: [
      'Menepati waktu dan bertanggung jawab',
      'Menyelesaikan pekerjaan besok-besok',
      'Menunda tugas sulit',
      'Mengabaikan arahan atasan',
    ],
    kunci: 'Menepati waktu dan bertanggung jawab',
  },
  {
    teks: 'Ceritakan pengalaman atau kemampuan Anda yang paling relevan dengan posisi yang dilamar.',
    tipe: 'esai',
  },
  {
    teks: 'Bagaimana Anda menghadapi tekanan saat menghadapi tenggat waktu yang ketat?',
    tipe: 'esai',
  },
];

function detikLalu(detik: number) {
  return new Date(Date.now() - detik * 1000);
}

const PESERTA_DEMO = [
  {
    nama: 'Rina Kusuma',
    email: 'rina.kusuma@example.com',
    noHp: '0812-3456-7801',
    lokasiKerja: 'Jakarta Selatan',
    nikKtp: '3174-0215-1112-0001',
    status: 'selesai',
    consentDiberikan: true,
    waktuConsent: detikLalu(5400),
    waktuMulai: detikLalu(3300),
    waktuSelesai: detikLalu(120),
    totalPelanggaran: 2,
    logPelanggaran: [
      { tipe: 'Pindah tab/window', waktu: Date.now() - 2000 * 1000, snapshotUrl: null },
      { tipe: 'Wajah tidak terdeteksi', waktu: Date.now() - 2500 * 1000, snapshotUrl: null },
    ],
    jawabanBenarSemua: true,
    esaiIsi: true,
  },
  {
    nama: 'Budi Santoso',
    email: 'budi.santoso@example.com',
    noHp: '0813-9876-5402',
    lokasiKerja: 'Tangerang',
    nikKtp: '3674-0321-3322-0002',
    status: 'selesai',
    consentDiberikan: true,
    waktuConsent: detikLalu(5000),
    waktuMulai: detikLalu(3000),
    waktuSelesai: detikLalu(80),
    totalPelanggaran: 3,
    logPelanggaran: [
      { tipe: 'Menyalin-tempel teks', waktu: Date.now() - 1500 * 1000, snapshotUrl: null },
      { tipe: 'Pindah tab/window', waktu: Date.now() - 1800 * 1000, snapshotUrl: null },
      { tipe: 'Keluar dari layar penuh', waktu: Date.now() - 2400 * 1000, snapshotUrl: null },
    ],
    jawabanBenarSemua: false,
    esaiIsi: true,
    dinilaiEsai: true,
  },
  {
    nama: 'Sari Dewi',
    email: 'sari.dewi@example.com',
    noHp: '0821-2233-4455',
    lokasiKerja: 'Depok',
    nikKtp: '3276-0412-9900-0003',
    status: 'selesai',
    consentDiberikan: true,
    waktuConsent: detikLalu(4800),
    waktuMulai: detikLalu(2800),
    waktuSelesai: detikLalu(60),
    totalPelanggaran: 0,
    logPelanggaran: [],
    jawabanBenarSemua: true,
    esaiIsi: true,
  },
  {
    nama: 'Andi Wijaya',
    email: 'andi.wijaya@example.com',
    noHp: '0857-1122-3344',
    lokasiKerja: 'Bekasi',
    nikKtp: '3216-0508-7711-0004',
    status: 'selesai',
    consentDiberikan: true,
    waktuConsent: detikLalu(4200),
    waktuMulai: detikLalu(2500),
    waktuSelesai: detikLalu(200),
    totalPelanggaran: 5,
    logPelanggaran: [
      { tipe: 'Pindah tab/window', waktu: Date.now() - 1000 * 1000, snapshotUrl: null },
      { tipe: 'Membuka ujian di lebih dari satu tab', waktu: Date.now() - 1100 * 1000, snapshotUrl: null },
      { tipe: 'Wajah tidak terdeteksi', waktu: Date.now() - 1300 * 1000, snapshotUrl: null },
      { tipe: 'Keluar dari layar penuh', waktu: Date.now() - 1600 * 1000, snapshotUrl: null },
      { tipe: 'Pindah tab/window', waktu: Date.now() - 2000 * 1000, snapshotUrl: null },
    ],
    jawabanBenarSemua: false,
    esaiIsi: false,
  },
  {
    nama: 'Maya Putri',
    email: 'maya.putri@example.com',
    noHp: '0819-5566-7788',
    lokasiKerja: 'Jakarta Pusat',
    nikKtp: '3171-0202-5566-0005',
    status: 'sedang_ujian',
    consentDiberikan: true,
    waktuConsent: detikLalu(1800),
    waktuMulai: detikLalu(900),
    totalPelanggaran: 1,
    logPelanggaran: [
      { tipe: 'Pindah tab/window', waktu: Date.now() - 600 * 1000, snapshotUrl: null },
    ],
    jawabanBenarSemua: false,
    esaiIsi: false,
    sebagian: true,
  },
  {
    nama: 'Dedi Firmansyah',
    email: 'dedi.firmansyah@example.com',
    noHp: '0838-9988-7766',
    lokasiKerja: 'Bogor',
    nikKtp: '3201-0310-8899-0006',
    status: 'sedang_ujian',
    consentDiberikan: true,
    waktuConsent: detikLalu(1500),
    waktuMulai: detikLalu(600),
    totalPelanggaran: 0,
    logPelanggaran: [],
    jawabanBenarSemua: false,
    esaiIsi: false,
    sebagian: true,
  },
  {
    nama: 'Novi Rahayu',
    email: 'novi.rahayu@example.com',
    noHp: '0856-7744-2211',
    lokasiKerja: 'Jakarta Timur',
    nikKtp: '3172-0404-1234-0007',
    status: 'belum_ujian',
    consentDiberikan: true,
    waktuConsent: detikLalu(3600),
    totalPelanggaran: 0,
    logPelanggaran: [],
    jawabanBenarSemua: false,
    esaiIsi: false,
    sudahDaftar: true,
  },
  {
    nama: 'Arif Gunawan',
    email: 'arif.gunawan@example.com',
    noHp: '0811-3322-1100',
    lokasiKerja: 'Jakarta Barat',
    nikKtp: '3173-0606-4321-0008',
    status: 'belum_ujian',
    consentDiberikan: true,
    waktuConsent: detikLalu(3000),
    totalPelanggaran: 0,
    logPelanggaran: [],
    jawabanBenarSemua: false,
    esaiIsi: false,
    sudahDaftar: false,
  },
];

async function main() {
  const emails = EMAIL_DEMO;
  await prisma.pesertaUjian.deleteMany({
    where: { email: { in: emails } },
  });
  await prisma.kelompokSoal.deleteMany({
    where: { nama: KELOMPOK_DEMO },
  });

  const kelompok = await prisma.kelompokSoal.create({
    data: {
      nama: KELOMPOK_DEMO,
      level: 'Staff',
      divisi: 'Administrasi',
      departemen: 'Umum',
      soal: {
        create: SOAL_DEMO.map((soal, i) => ({
          teks: soal.teks,
          tipe: soal.tipe,
          pilihan: soal.tipe === 'pilihan_ganda' ? JSON.stringify(soal.pilihan) : '[]',
          gambar: '',
          urutan: i + 1,
          kunci:
            soal.tipe === 'pilihan_ganda' && soal.kunci
              ? { create: { jawabanBenar: soal.kunci } }
              : undefined,
        })),
      },
    },
    include: { soal: true },
  });

  const idPertanyaan = new Map<string, string>();
  for (const soal of kelompok.soal) {
    idPertanyaan.set(soal.teks, soal.id);
  }

  const PG = kelompok.soal.filter((s) => s.tipe === 'pilihan_ganda');
  const ESAI = kelompok.soal.filter((s) => s.tipe === 'esai');
  const kunciPerSoal = new Map<string, { jawabanBenar: string }>();
  for (const s of PG) {
    const kunci = await prisma.kunciJawaban.findUnique({ where: { soalId: s.id } });
    if (kunci) kunciPerSoal.set(s.id, kunci);
  }

  const jawabanSemuaBenar = () => {
    const j: Record<string, string> = {};
    for (const s of PG) j[s.id] = kunciPerSoal.get(s.id)?.jawabanBenar ?? '';
    return j;
  };
  const jawabanSebagian = () => {
    const j: Record<string, string> = {};
    for (let i = 0; i < 2 && i < PG.length; i++) j[PG[i].id] = kunciPerSoal.get(PG[i].id)?.jawabanBenar ?? '';
    return j;
  };
  const jawabanKurangTepat = () => {
    const j = jawabanSemuaBenar();
    const s = PG[PRECOUNT_PG_SALAH] ?? PG[0];
    j[s.id] = 'Jawaban salah sengaja';
    return j;
  };

  for (const p of PESERTA_DEMO) {
    let jawaban: Record<string, string> = {};
    if (p.jawabanBenarSemua) jawaban = jawabanSemuaBenar();
    else if (p.sebagian) jawaban = jawabanSebagian();
    else if (p.status === 'selesai') jawaban = jawabanKurangTepat();

    if (p.esaiIsi) {
      const teksEsai = [
        'Saya memiliki pengalaman sebagai admin operasional selama 3 tahun, mengelola data, dokumen, serta koordinasi antar-divisi sehingga terbiasa dengan kerapian dan tenggat waktu.',
        'Saya biasanya menyusun prioritas, memecah pekerjaan besar menjadi tahapan kecil, dan menjaga komunikasi agar tim tetap sinkron meski waktunya ketat.',
      ];
      for (let e = 0; e < ESAI.length; e++) {
        jawaban[ESAI[e].id] = teksEsai[e % teksEsai.length] ?? '';
      }
    }

    const peserta = await prisma.pesertaUjian.create({
      data: {
        nama: p.nama,
        email: p.email,
        noHp: p.noHp,
        lokasiKerja: p.lokasiKerja,
        nikKtp: p.nikKtp,
        status: p.status,
        consentDiberikan: p.consentDiberikan,
        waktuConsent: p.waktuConsent,
        waktuMulai: p.waktuMulai ?? null,
        waktuSelesai: p.waktuSelesai ?? null,
        kelompokId: p.sudahDaftar || p.status !== 'belum_ujian' ? kelompok.id : null,
        level: 'Staff',
        divisi: 'Administrasi',
        departemen: 'Umum',
        jawaban: JSON.stringify(jawaban),
        totalPelanggaran: p.totalPelanggaran,
        logPelanggaran: JSON.stringify(p.logPelanggaran),
        terakhirDisimpan: p.waktuSelesai ?? p.waktuMulai ?? new Date(),
      },
    });

    if (p.dinilaiEsai && ESAI[0]) {
      const skor: Record<string, number> = {};
      let total = 0;
      for (const e of ESAI) {
        skor[e.id] = 80;
        total += 80;
      }
      await prisma.penilaianEsai.create({
        data: {
          pesertaId: peserta.id,
          skorEsai: JSON.stringify(skor),
          totalEsai: ESAI.length > 0 ? total / ESAI.length : 0,
          dinilaiOleh: 'Admin',
          waktuDinilai: detikLalu(100),
        },
      });
    }
  }

  console.log(
    `Seed demo selesai: 1 kelompok, ${kelompok.soal.length} soal, ${PESERTA_DEMO.length} peserta contoh.`
  );
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });