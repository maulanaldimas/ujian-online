# Ujian Online Rekrutmen

[![Next.js](https://img.shields.io/badge/Next.js%2016-000000?logo=nextdotjs&logoColor=white)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS%204-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Prisma](https://img.shields.io/badge/Prisma-2D3748?logo=prisma&logoColor=white)](https://www.prisma.io)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org)
[![Railway](https://img.shields.io/badge/Railway-0B0D0E?logo=railway&logoColor=white)](https://railway.app)
[![Tests](https://img.shields.io/badge/tests-vitest-6DA13F?logo=vitest&logoColor=white)](https://vitest.dev)

Sistem **ujian online untuk rekrutmen & evaluasi karyawan** dengan pengawasan proctoring real-time (kamera, mikrofon, dan aktivitas layar), dashboard admin untuk memantau peserta, dan alur peserta yang lengkap — dari pendaftaran hingga hasil.

> **Demo live:** https://itsokkalink.tailbc5ae7.ts.net/ujian
>
> **Login admin demo:** `admin@ujian.com` / `admin123`
>
> - **Admin:** https://itsokkalink.tailbc5ae7.ts.net/ujian/dashboard
> - **Peserta:** `/ujian` (silakan daftar sebagai peserta, lalu diminta menunggu penugasan kelompok oleh admin).
>
> > Demo ini di-hosting dari komputer pribadi (Docker + Tailscale Funnel + Caddy) dan hanya aktif saat server daring.

## Fitur Unggulan

### Peserta

- Alur bertahap: **persetujuan (consent)** → data diri → instruksi → pengerjaan → selesai.
- **Proctoring real-time** (MediaPipe + Web Audio):
  - Deteksi wajah kosong / wajah ganda via kamera.
  - Deteksi suara keras via mikrofon.
  - Deteksi pindah tab, keluar layar penuh, salin-tempel, dan pintasan terlarang (F12, Ctrl+U, dll).
  - Anti-cheat multi-tab via `BroadcastChannel` + kunci sesi per tab.
- **Gambar pada soal** — soal PG/esai dapat menyertakan gambar.
- **Resume & grace period** — saat koneksi terputus, timer tidak merugikan peserta: waktu offline otomatis dipulihkan (diatur admin), dan indikator sinkronisasi real-time ditampilkan.
- Pengacakan urutan soal, navigasi bebas, auto-save berkala, dan submit otomatis saat waktu habis.
- Penerimaan **pesan real-time dari pengawas** selama ujian.

### Admin (HR)

- **Dashboard hasil** — pencarian, filter, urutan, statistik ringkas, grafik (skor, distribusi, pelanggaran/waktu), tampilan detail jawaban + log pelanggaran, ekspor PDF per peserta, dan ekspor Excel.
- **Kontrol ujian live** — tambah waktu (+5/+15 menit), akhiri ujian paksa, dan kirim pesan ke peserta saat sedang mengerjakan.
- **Kelompok soal** — kelola kelompok & soal, import dari Excel (header fleksibel + laporan baris gagal + kolom gambar), template download, gambar per soal, dan copy kelompok.
- **Aksi massal peserta** — import via Excel, ekspor, hapus/petakan kelompok secara bulk.
- **Log aktivitas** — jejak semua aksi admin & peristiwa ujian.
- **Dark mode + tema terang** — dua mode dengan preferensi tersimpan per pengguna.
- Kontrol akses berbasis peran (`admin`).

## Teknologi

| Lapisan | Teknologi |
| --- | --- |
| Framework | Next.js 16 (App Router, Turbopack, Server & Client Components) |
| Bahasa | TypeScript |
| UI | React 19, Tailwind CSS 4, lucide-react, Recharts |
| ORM / DB | Prisma 7 · PostgreSQL (produksi) · SQLite (dev) |
| Auth | JWT (jose, httpOnly cookie) + bcryptjs |
| Proctoring | MediaPipe Tasks Vision, Web Audio API, BroadcastChannel |
| Ekspor | SheetJS (`xlsx`), jsPDF + autotable |
| Integrasi | SSE (SSE stream), REST API |
| Infra | Docker multi-stage, Railway, GitHub Actions CI/CD |

## Menjalankan Proyek

### Prasyarat

- Node.js 20+
- (Opsional) Docker untuk mode PostgreSQL lokal.

### Development (SQLite)

```bash
npm install
cp .env.example .env
npx prisma db push
npx tsx prisma/seed.ts          # membuat user admin
npx tsx prisma/seed-demo.ts     # (opsional) data contoh untuk demo

npm run dev
```

- Peserta: `http://localhost:3000/ujian`
- Admin: `http://localhost:3000/dashboard` — login `admin@ujian.com` / `admin123`

### Docker (PostgreSQL)

```bash
cp .env.example .env   # isi DATABASE_URL & JWT_SECRET
docker compose up -d --build
```

### Deploy ke Railway

Repo ini sudah berisi **infrastructure-as-code** (`.railway/railway.ts`):

1. Push repo ke GitHub dan hubungkan sebagai sumber deploy.
2. Railway otomatis menyediakan PostgreSQL; `DATABASE_URL` & `JWT_SECRET` di-referensikan dari service config.
3. `Dockerfile` melakukan `prisma db push` + menjalankan build production saat start.

## Struktur Database

| Model | Keterangan |
| --- | --- |
| `User` | Admin users |
| `KelompokSoal` | Kelompok soal (level/divisi/departemen) |
| `Soal` | Soal: teks, tipe (PG/esai), pilihan, gambar, urutan |
| `KunciJawaban` | Kunci pilihan ganda |
| `PesertaUjian` | Data peserta, jawaban, status, waktu, pelanggaran, pesan admin, grace |
| `PenilaianEsai` | Skor esai manual per peserta |
| `Pengaturan` | Pengaturan proctoring & grace period |
| `ActivityLog` | Log aktivitas admin & sistem |

## API Routes

| Endpoint | Method | Keterangan |
| --- | --- | --- |
| `/api/auth/login` · `/me` · `/logout` | POST/GET | Autentikasi admin (JWT httpOnly cookie) |
| `/api/peserta` | GET/POST | List & daftar peserta |
| `/api/peserta/[id]` | GET/PUT/DELETE | Detail, update (jawaban/status), hapus |
| `/api/peserta/[id]/status` | GET | Cek status & grup |
| `/api/peserta/[id]/stream` | GET | SSE: sinkron timer, pesan admin, status |
| `/api/peserta/[id]/kontrol` | POST | Tambah waktu / akhiri ujian / kirim pesan |
| `/api/peserta/[id]/resume` | POST | Pulihkan waktu setelah terputus (grace) |
| `/api/peserta/bulk` | POST | Import peserta via Excel |
| `/api/peserta/bulk-action` | POST | Hapus / petakan kelompok massal |
| `/api/kelompok` | GET/POST | List & buat kelompok |
| `/api/kelompok/[id]` | GET/PUT/DELETE | Detail / update / hapus kelompok |
| `/api/kelompok/[id]/soal` | GET/POST | List & tambah soal |
| `/api/kelompok/[id]/soal/[soalId]` | PUT/DELETE | Update / hapus soal |
| `/api/kelompok/[id]/soal/reorder` | POST | Ubah urutan soal |
| `/api/kelompok/[id]/copy` | POST | Duplikasi kelompok + soal |
| `/api/pengaturan` | GET/PUT | Pengaturan proctoring & grace |
| `/api/penilaian` | GET/POST | Penilaian esai |
| `/api/activity-log` | GET | Log aktivitas admin |

## Struktur Kode

```
src/
├─ app/
│  ├─ api/                 # REST + SSE endpoints
│  │  ├─ auth/             # login, me, logout
│  │  ├─ peserta/          # CRUD + status + stream + kontrol + resume + bulk
│  │  ├─ kelompok/         # CRUD + soal + reorder + copy
│  │  ├─ pengaturan/       # proctoring & grace settings
│  │  ├─ penilaian/        # skor esai
│  │  └─ activity-log/     # log admin
│  ├─ components/          # UI, Sidebar, ThemeToggle, InputGambar, charts, modals
│  │  └─ peserta/          # ConsentStep, FormStep, InstruksiStep, UjianScreen, dll.
│  ├─ dashboard/           # Dashboard hasil, kelompok, pengaturan, aktivitas
│  ├─ ujian/page.tsx       # Halaman peserta (proctoring + SSE + resume)
│  ├─ layout.tsx           # Root layout + anti-FOUC theme script
│  └─ globals.css          # Tailwind 4 + dark-mode remap layer
├─ lib/
│  ├─ auth.ts              # JWT (jose)
│  ├─ prisma.ts            # Prisma client singleton
│  ├─ anti-cheat.ts        # kunci sesi multi-tab, peringatan
│  ├─ theme.ts             # manajemen tema (dark/light)
│  ├─ activity-log.ts      # pencatatan aktivitas
│  ├─ constants.ts         # konfigurasi ujian
│  └─ utils.ts             # parsing import Excel, scoring, dll.
└─ prisma/
   ├─ schema.prisma
   ├─ seed.ts              # user admin
   └─ seed-demo.ts         # data contoh
```

## CI/CD & Kualitas

- **GitHub Actions** (`.github/workflows/ci.yml`): `tsc`, `vitest`, `next build`, kemudian build & smoke-test image Docker.
- **Prasyarat kontribusi:** tiap perubahan harus lolos `npx tsc --noEmit`, `npx vitest run`, dan `npx next build`.

## Lisensi

[MIT](./LICENSE)