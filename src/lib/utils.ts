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
  urutan?: number;
  [k: string]: any;
}

export interface LogPelanggaran {
  tipe: string;
  waktu: number;
  snapshotUrl?: string | null;
}

export interface PesertaData {
  id?: string;
  nama?: string;
  email?: string;
  noHp?: string;
  lokasiKerja?: string;
  nikKtp?: string;
  status?: string;
  jawaban?: Record<string, string>;
  totalPelanggaran?: number;
  logPelanggaran?: LogPelanggaran[];
  waktuMulai?: any;
  waktuSelesai?: any;
  terakhirDisimpan?: any;
  [k: string]: any;
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
): { label: string; tone: string } {
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
  const teks = String(row.Pertanyaan || '').trim();
  const tipeMentah = String(row.Tipe || 'esai').toLowerCase();
  const tipe = tipeMentah.includes('pilihan') ? 'pilihan_ganda' : 'esai';
  const kunci = String(row.Kunci || '').trim();
  const pilihan = String(row.Opsi || '')
    .split(/[;\n|]/)
    .map((p) => p.trim())
    .filter((p) => p !== '');

  let valid = true;
  if (!teks) valid = false;
  if (tipe === 'pilihan_ganda' && (pilihan.length < 2 || !pilihan.includes(kunci))) valid = false;

  return { teks, tipe, pilihan, kunci, urutan, valid };
}
