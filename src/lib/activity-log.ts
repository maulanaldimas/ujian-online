import { prisma } from '@/lib/prisma';

export type AktivitasAksi =
  | 'login'
  | 'logout'
  | 'update_pengaturan'
  | 'tambah_kelompok'
  | 'edit_kelompok'
  | 'hapus_kelompok'
  | 'tambah_soal'
  | 'hapus_soal'
  | 'reorder_soal'
  | 'ubah_penetapan_kelompok'
  | 'simpan_penilaian_esai'
  | 'export_excel'
  | 'mulai_ujian'
  | 'selesai_ujian'
  | 'pelanggaran'
  | 'force_submit'
  | 'tambah_waktu'
  | 'kirim_pesan'
  | 'resume_ujian';

export interface LogOption {
  aksi: AktivitasAksi;
  entitas?: string;
  entitasId?: string;
  detail?: string;
  adminEmail?: string;
}

export async function logAktivitas(opt: LogOption) {
  try {
    await prisma.activityLog.create({
      data: {
        aksi: opt.aksi,
        entitas: opt.entitas ?? null,
        entitasId: opt.entitasId ?? null,
        detail: opt.detail ?? null,
        adminEmail: opt.adminEmail ?? null,
      },
    });
  } catch (err) {
    console.error('Gagal menulis activity log:', err);
  }
}
