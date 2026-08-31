import type { BadgeTone } from './constants';

export function acakUrutan<T>(array: T[]): T[] {
  const hasil = [...array];
  for (let i = hasil.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [hasil[i], hasil[j]] = [hasil[j], hasil[i]];
  }
  return hasil;
}

export function formatWaktuDetik(detik: number): string {
  const menit = Math.floor(detik / 60);
  const sisaDetik = detik % 60;
  return `${menit}:${sisaDetik.toString().padStart(2, '0')}`;
}

export interface SoalData {
  id?: string;
  teks?: string;
  tipe?: string;
  pilihan?: string[];
  gambar?: string;
  urutan?: number;
}

export interface LogPelanggaran {
  tipe: string;
  waktu: number;
  snapshotUrl?: string | null;
}

export interface KelompokSoal {
  id?: string;
  nama?: string;
  level?: string;
  divisi?: string;
  departemen?: string;
}

export interface PesertaData {
  id?: string;
  nama?: string;
  email?: string;
  noHp?: string;
  lokasiKerja?: string;
  nikKtp?: string;
  level?: string;
  divisi?: string;
  departemen?: string;
  kelompokId?: string;
  status?: string;
  jawaban?: Record<string, string>;
  totalPelanggaran?: number;
  logPelanggaran?: LogPelanggaran[];
  waktuConsent?: string | Date | null;
  waktuMulai?: string | Date | null;
  waktuSelesai?: string | Date | null;
  terakhirDisimpan?: string | Date | null;
}

export function hitungSkor(peserta: PesertaData, soalFullMap: Record<string, SoalData>, kunciMap: Record<string, string>): { benar: number; totalPG: number } {
  let benar = 0;
  let totalPG = 0;
  Object.entries(soalFullMap).forEach(([soalId, soal]) => {
    if (soal.tipe === 'pilihan_ganda' && kunciMap[soalId]) {
      totalPG += 1;
      if (peserta.jawaban?.[soalId] === kunciMap[soalId]) benar += 1;
    }
  });
  return { benar, totalPG };
}

export function hitungTerjawab(peserta: PesertaData, jumlahSoal: number): { terjawab: number; totalSoal: number } {
  const terjawab = Object.values(peserta.jawaban || {}).filter((j) => j && j.trim() !== '').length;
  return { terjawab, totalSoal: jumlahSoal };
}

export function hitungGrade(
  peserta: PesertaData,
  soalFullMap: Record<string, SoalData>,
  kunciMap: Record<string, string>
): { label: string; tone: BadgeTone } {
  const { benar, totalPG } = hitungSkor(peserta, soalFullMap, kunciMap);
  if (totalPG === 0) return { label: '—', tone: 'slate' };
  const persen = (benar / totalPG) * 100;
  if (persen <= 43) return { label: 'Review', tone: 'orange' };
  if (persen <= 79) return { label: 'Grade A', tone: 'blue' };
  if (persen <= 89) return { label: 'Grade B', tone: 'green' };
  return { label: 'Grade C', tone: 'purple' };
}

export function hitungPersenSkor(
  peserta: PesertaData,
  soalFullMap: Record<string, SoalData>,
  kunciMap: Record<string, string>,
  totalEsai?: number
): number | null {
  const { benar, totalPG } = hitungSkor(peserta, soalFullMap, kunciMap);
  if (totalPG === 0) return null;
  const pg = Math.round((benar / totalPG) * 100);
  return totalEsai !== undefined ? Math.round((pg + totalEsai) / 2) : pg;
}

export function parseBarisSoal(row: Record<string, any>, urutan: number) {
  const r = normalisasiBaris(row);
  const teks = String(r.Pertanyaan ?? '').trim();
  const tipe = tipeSoalDariTeks(String(r.Tipe ?? 'esai'));
  const kunci = String(r.Kunci ?? '').trim();
  const pilihan = String(r.Opsi ?? '')
    .split(/[;\n|]/)
    .map((p) => p.trim())
    .filter((p) => p !== '');
  const gambar = String(r.Gambar ?? '').trim();

  let valid = true;
  let error = '';
  if (!teks) {
    valid = false;
    error = 'Pertanyaan kosong';
  } else if (tipe === 'pilihan_ganda' && pilihan.length < 2) {
    valid = false;
    error = 'Pilihan ganda butuh minimal 2 opsi';
  } else if (tipe === 'pilihan_ganda' && !pilihan.includes(kunci)) {
    valid = false;
    error = 'Kunci jawaban tidak ada di daftar opsi';
  } else if (gambar && !gambarValida(gambar)) {
    valid = false;
    error = 'Kolom Gambar harus berupa URL (http/https), data URL, atau base64';
  }

  return { teks, tipe, pilihan, kunci, gambar, urutan, valid, error };
}

const ALIAS_HEADER: Record<string, keyof ReturnType<typeof barisKosong>> = {
  pertanyaan: 'Pertanyaan',
  soal: 'Pertanyaan',
  question: 'Pertanyaan',
  tipe: 'Tipe',
  jenis: 'Tipe',
  type: 'Tipe',
  opsi: 'Opsi',
  pilihan: 'Opsi',
  options: 'Opsi',
  jawaban: 'Opsi',
  kunci: 'Kunci',
  'kunci jawaban': 'Kunci',
  'jawaban benar': 'Kunci',
  answer: 'Kunci',
  gambar: 'Gambar',
  image: 'Gambar',
  'gambar soal': 'Gambar',
  urlgambar: 'Gambar',
};

function barisKosong() {
  return { Pertanyaan: '', Tipe: '', Opsi: '', Kunci: '', Gambar: '' };
}

export function normalisasiBaris(row: Record<string, any>) {
  const hasil = barisKosong();
  for (const [kunci, nilai] of Object.entries(row)) {
    const k = String(kunci).trim().toLowerCase().replace(/\s+/g, ' ');
    const kanonik = ALIAS_HEADER[k];
    if (kanonik && nilai !== undefined && nilai !== null) {
      hasil[kanonik] = String(nilai);
    }
  }
  return hasil;
}

export function tipeSoalDariTeks(teks: string): 'pilihan_ganda' | 'esai' {
  const t = teks.toLowerCase().trim();
  if (
    t.includes('pilihan') ||
    t.includes('pg') ||
    t.includes('multiple') ||
    t.includes('objektif') ||
    t === 'ganda'
  ) {
    return 'pilihan_ganda';
  }
  return 'esai';
}

export function gambarValida(gambar: string): boolean {
  const g = gambar.trim();
  const gl = g.toLowerCase();
  if (gl.startsWith('http://') || gl.startsWith('https://')) return true;
  if (gl.startsWith('data:image/')) return true;
  if (g.length > 100) {
    try {
      atob(g);
      return true;
    } catch {
      return false;
    }
  }
  return false;
}

export function hitungGrace(offlineDetik: number, sisaGraceDetik: number): number {
  if (!Number.isFinite(offlineDetik) || offlineDetik <= 0) return 0;
  if (!Number.isFinite(sisaGraceDetik) || sisaGraceDetik <= 0) return 0;
  return Math.min(Math.floor(offlineDetik), Math.floor(sisaGraceDetik));
}
