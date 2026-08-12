# Ujian Online Rekrutmen

Aplikasi ujian online untuk proses rekrutmen dan evaluasi karyawan **PT Sokka Tama Fiber**, dibangun dengan **Next.js (App Router)** dan **Firebase**. Sistem dilengkapi pengawasan proctoring (kamera, mikrofon, dan aktivitas layar) serta dashboard admin untuk memantau hasil.

## Fitur

### Peserta
- Alur ujian bertahap: persetujuan (consent) → data diri → instruksi → pengerjaan → selesai.
- Mode layar penuh selama ujian; keluar dari mode ini tercatat sebagai pelanggaran.
- Proctoring real-time:
  - Deteksi wajah (kosong / lebih dari satu wajah) via MediaPipe.
  - Deteksi suara keras via Web Audio API.
  - Deteksi berpindah tab, menyalin-tempel, dan pintasan keyboard terlarang.
- Pengacakan urutan soal dan navigasi bebas antar soal.
- Auto-save jawaban secara berkala + saat meninggalkan halaman.
- Submit otomatis saat waktu habis.

### Admin (HR)
- **Dashboard** — daftar peserta, pencarian, filter status, pengurutan, detail jawaban, log pelanggaran beserta foto, serta ekspor hasil ke Excel (`.xlsx`).
- **Kelola Soal** (khusus admin) — tambah/edit/hapus soal, atur urutan, kelola kunci jawaban pilihan ganda.
- **Pengaturan** — aktif/nonaktifkan deteksi kamera & mikrofon untuk ujian berikutnya.
- **Logout** dan kontrol akses berbasis peran (`admin` / lainnya).

## Teknologi

| Lapisan | Teknologi |
| --- | --- |
| Framework | Next.js 16 (App Router) |
| UI | React 19 + Tailwind CSS 4 |
| Backend & Auth | Firebase (Firestore, Auth, Storage) |
| Proctoring | MediaPipe Tasks Vision (deteksi wajah) |
| Ekspor | SheetJS (`xlsx`) |

## Persyaratan

- Node.js 18.18 atau lebih baru (disarankan 20+).
- Proyek Firebase aktif (Firestore, Authentication, Storage).

## Menjalankan Proyek

1. **Install dependensi**

   ```bash
   npm install
   ```

2. **Siapkan variabel lingkungan**

   Salin `.env.example` menjadi `.env.local` dan isi dengan kredensial Firebase Anda:

   ```bash
   cp .env.example .env.local
   ```

   Buka `.env.local` dan isi setiap nilai dari Firebase Console → *Project settings → Your apps → SDK setup*.

3. **Jalankan mode pengembangan**

   ```bash
   npm run dev
   ```

   Buka [http://localhost:3000](http://localhost:3000). Halaman peserta berada di `/`, sedangkan dashboard admin di `/dashboard`.

4. **Build & jalankan untuk produksi**

   ```bash
   npm run build
   npm start
   ```

## Struktur Firebase

Koleksi yang digunakan aplikasi:

- `pesertaUjian` — data peserta, jawaban, status, waktu mulai/selesai, dan log pelanggaran.
- `soalUjian` — daftar soal (tipe `esai` atau `pilihan_ganda`), diurutkan dengan kolom `urutan`.
- `kunciJawaban` — kunci jawaban untuk soal pilihan ganda (`{ jawabanBenar }`).
- `pengaturan/proctoring` — pengaturan `kameraAktif` dan `audioAktif`.
- `adminUsers` — akses admin HR: `{ uid: { role: "admin" } }`.

Storage: foto pelanggaran disimpan di `pelanggaran/{idPeserta}/{timestamp}.jpg`.

> **Catatan keamanan**: Terapkan aturan keamanan (Firestore Security Rules) sesuai kebutuhan agar peserta tidak dapat membaca/mengubah data peserta lain atau kunci jawaban.

## Struktur Kode

```
src/
├── app/
│   ├── components/
│   │   ├── ui.js          # Komponen UI dasar (Button, Card, Input, Badge, dsb.)
│   │   └── LoginGate.js   # Gerbang autentikasi & cek peran untuk halaman admin
│   ├── dashboard/
│   │   ├── page.js        # Dashboard hasil ujian (peserta, skor, ekspor Excel)
│   │   ├── pengaturan/    # Pengaturan proctoring
│   │   └── soal/          # Kelola soal & kunci jawaban
│   ├── layout.js          # Root layout (font, metadata)
│   ├── page.js            # Halaman peserta (alur ujian + proctoring)
│   ├── globals.css        # Tailwind + variabel tema
│   ├── error.js           # Error boundary
│   └── not-found.js       # Halaman 404
└── firebase.js            # Inisialisasi Firebase (db, auth, storage)
```

## Script

| Script | Fungsi |
| --- | --- |
| `npm run dev` | Menjalankan server pengembangan |
| `npm run build` | Membuat build produksi |
| `npm start` | Menjalankan build produksi |
| `npm run lint` | Menjalankan ESLint |

## Kontribusi

Bagi tim pengembangan: buat branch fitur, lakukan perubahan, lalu ajukan pull request. Seluruh perubahan harus lolos `npm run lint` sebelum di-merge.
