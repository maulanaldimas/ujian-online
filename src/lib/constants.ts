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

export const AKTIVITAS_LABEL: Record<string, string> = {
  login: 'Login',
  logout: 'Logout',
  update_pengaturan: 'Update Pengaturan',
  tambah_kelompok: 'Tambah Kelompok Soal',
  edit_kelompok: 'Edit Kelompok Soal',
  hapus_kelompok: 'Hapus Kelompok Soal',
  tambah_soal: 'Tambah Soal',
  hapus_soal: 'Hapus Soal',
  reorder_soal: 'Ubah Urutan Soal',
  ubah_penetapan_kelompok: 'Ubah Penetapan Kelompok',
  simpan_penilaian_esai: 'Simpan Penilaian Esai',
  export_excel: 'Export Excel',
  mulai_ujian: 'Mulai Ujian',
  selesai_ujian: 'Selesai Ujian',
  pelanggaran: 'Pelanggaran Terdeteksi',
};

export const AKTIVITAS_ENTITAS: Record<string, string> = {
  peserta: 'Peserta',
  kelompok_soal: 'Kelompok Soal',
  soal: 'Soal',
  pengaturan: 'Pengaturan',
  user: 'User',
};

export const AKTIVITAS_ICON: Record<string, 'login' | 'settings' | 'plus' | 'edit' | 'trash' | 'eye' | 'download' | 'alert' | 'check' | 'arrow' | 'file' | 'users' | 'play'> = {
  login: 'login',
  logout: 'login',
  update_pengaturan: 'settings',
  tambah_kelompok: 'plus',
  edit_kelompok: 'edit',
  hapus_kelompok: 'trash',
  tambah_soal: 'plus',
  hapus_soal: 'trash',
  reorder_soal: 'arrow',
  ubah_penetapan_kelompok: 'edit',
  simpan_penilaian_esai: 'check',
  export_excel: 'download',
  mulai_ujian: 'play',
  selesai_ujian: 'check',
  pelanggaran: 'alert',
};
