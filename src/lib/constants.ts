export const LOGO_SRC = '/logo.png?v=3';
export const NAMA_PERUSAHAAN = 'PT Sokka Tama Fiber';
export const NAMA_PERUSAHAAN_PENDEK = 'Sokkatama';

export const STATUS = {
  BELUM_UJIAN: 'belum_ujian',
  SEDANG_UJIAN: 'sedang_ujian',
  SELESAI: 'selesai',
} as const;

export type StatusPeserta = (typeof STATUS)[keyof typeof STATUS];

export const DURASI_UJIAN_DETIK = 60 * 60;
export const FRAMES_SEBELUM_PELANGGARAN = 45;
export const SNAPSHOT_QUALITY = 0.7;
export const DEBOUNCE_SIMPAN_MS = 3000;
export const AMBANG_AUDIO = 25;

export function sanitizeHtml(teks: string): string {
  return teks.replace(/<[^>]*>/g, '').trim();
}

export const BADGE_TONES = ['slate', 'green', 'red', 'amber', 'teal', 'blue', 'purple', 'orange', 'navy'] as const;
export type BadgeTone = (typeof BADGE_TONES)[number];

export const STATUS_LABEL: Record<string, string> = {
  [STATUS.BELUM_UJIAN]: 'Menunggu',
  [STATUS.SEDANG_UJIAN]: 'Sedang Ujian',
  [STATUS.SELESAI]: 'Selesai',
};

export const STATUS_TONE: Record<string, BadgeTone> = {
  [STATUS.BELUM_UJIAN]: 'slate',
  [STATUS.SEDANG_UJIAN]: 'amber',
  [STATUS.SELESAI]: 'green',
};

export const CHART_WARNA = {
  utama: '#1f6f78',
  sekunder: '#e8a33d',
  ketiga: '#10192e',
  success: '#16a34a',
  danger: '#dc2626',
} as const;
