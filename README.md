# Ujian Online Rekrutmen

Aplikasi ujian online untuk proses rekrutmen dan evaluasi karyawan, dibangun dengan **Next.js 16 (App Router)**, **Prisma ORM**, **SQLite** (dev) / **PostgreSQL** (produksi), dan **JWT authentication**. Sistem dilengkapi pengawasan proctoring (kamera, mikrofon, dan aktivitas layar) serta dashboard admin untuk memantau hasil.

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
- **Kelompok Soal** (khusus admin) — buat/edit/hapus kelompok soal, tambah soal di dalamnya, atur urutan, impor dari Excel, kelola kunci jawaban pilihan ganda.
- **Pengaturan** — aktif/nonaktifkan deteksi kamera & mikrofon untuk ujian berikutnya.
- **Logout** dan kontrol akses berbasis peran (`admin` / lainnya).

## Teknologi

| Lapisan | Teknologi |
| --- | --- |
| Framework | Next.js 16 (App Router, Turbopack) |
| UI | React 19 + Tailwind CSS 4 |
| ORM | Prisma 7 (SQLite dev / PostgreSQL prod) |
| Database | SQLite 3 (dev) / PostgreSQL 16 (Docker & Railway) |
| Auth | JWT (jose) + bcryptjs |
| Proctoring | MediaPipe Tasks Vision (deteksi wajah) |
| Ekspor | SheetJS (`xlsx`) |
| Deploy | Docker + Railway + GitHub Actions CI/CD |

## Persyaratan

- Node.js 20 atau lebih baru.

## Menjalankan Proyek

### Development (SQLite)

1. **Install dependensi**

   ```bash
   npm install
   ```

2. **Siapkan variabel lingkungan**

   ```bash
   cp .env.example .env
   ```

3. **Jalankan migrasi database & seed**

   ```bash
   npx prisma migrate dev --name init
   npx prisma db seed
   ```

   Login admin default: `admin@ujian.com` / `admin123`

4. **Jalankan mode pengembangan**

   ```bash
   npm run dev
   ```

   Buka [http://localhost:3000](http://localhost:3000). Halaman peserta di `/ujian`, dashboard admin di `/dashboard`.

### Docker (PostgreSQL)

1. **Buat file `.env` dari template**

   ```bash
   cp .env.example .env
   # Edit .env: set DATABASE_URL dan JWT_SECRET
   ```

2. **Jalankan dengan Docker Compose**

   ```bash
   docker compose up -d --build
   ```

   Aplikasi berjalan di `http://localhost:3000` dengan PostgreSQL di port 5432.

### Deploy ke Railway

1. Push repo ke GitHub
2. Hubungkan repo ke Railway
3. Set environment variables di Railway dashboard:
   - `DATABASE_URL` — Railway PostgreSQL connection string (otomatis dari service PostgreSQL)
   - `JWT_SECRET` — secret key yang kuat
4. Deploy otomatis via GitHub Actions atau Railway auto-deploy

## Struktur Database (Prisma)

| Model | Keterangan |
| --- | --- |
| `User` | Admin users (email, password hash, role) |
| `KelompokSoal` | Kelompok soal (nama, level, divisi, departemen) |
| `Soal` | Soal ujian (teks, tipe, pilihan, urutan) |
| `KunciJawaban` | Kunci jawaban pilihan ganda |
| `PesertaUjian` | Data peserta, jawaban, status, log pelanggaran |
| `PenilaianEsai` | Skor esai manual per peserta |
| `Pengaturan` | Pengaturan proctoring (kamera & audio) |

## Struktur Kode

```
src/
├── app/
│   ├── api/                    # API routes (REST)
│   │   ├── auth/               # Login, me, logout
│   │   ├── peserta/            # CRUD peserta + status
│   │   ├── kelompok/           # CRUD kelompok + soal + reorder
│   │   ├── pengaturan/         # Pengaturan proctoring
│   │   └── penilaian/          # Penilaian esai
│   ├── components/
│   │   ├── ui.tsx              # Komponen UI dasar
│   │   ├── LoginGate.tsx       # Gerbang autentikasi JWT
│   │   └── peserta/            # Komponen alur peserta
│   │       ├── ConsentStep.tsx
│   │       ├── FormStep.tsx
│   │       ├── InstruksiStep.tsx
│   │       ├── MenungguStep.tsx
│   │       ├── UjianScreen.tsx
│   │       └── SelesaiScreen.tsx
│   ├── dashboard/
│   │   ├── page.tsx            # Dashboard hasil ujian
│   │   ├── kelompok/page.tsx   # Kelola kelompok soal
│   │   └── pengaturan/page.tsx # Pengaturan proctoring
│   ├── ujian/page.tsx          # Halaman peserta
│   ├── layout.tsx
│   ├── globals.css
│   ├── error.tsx
│   └── not-found.tsx
├── lib/
│   ├── auth.ts                 # JWT utilities (jose)
│   ├── prisma.ts               # Prisma client singleton
│   ├── constants.ts            # Konstanta bersama
│   └── utils.ts                # Fungsi utilitas & tipe data
├── prisma/
│   ├── schema.prisma           # Database schema
│   ├── config.ts               # Prisma config
│   ├── seed.ts                 # Seed admin user
│   └── migrations/             # Database migrations
├── Dockerfile                  # Multi-stage Node.js build
├── docker-compose.yml          # App + PostgreSQL
├── railway.json                # Railway deploy config
└── .github/workflows/ci.yml   # CI/CD pipeline
```

## Script

| Script | Fungsi |
| --- | --- |
| `npm run dev` | Menjalankan server pengembangan |
| `npm run build` | Membuat build produksi |
| `npm start` | Menjalankan build produksi |
| `npm run lint` | Menjalankan ESLint |
| `npx prisma migrate dev` | Jalankan migrasi database |
| `npx prisma db seed` | Seed data awal |
| `npx vitest run` | Jalankan tests |

## API Routes

| Endpoint | Method | Keterangan |
| --- | --- | --- |
| `/api/auth/login` | POST | Login admin |
| `/api/auth/me` | GET | Cek sesi aktif |
| `/api/auth/logout` | POST | Logout |
| `/api/peserta` | GET/POST | List & buat peserta |
| `/api/peserta/[id]` | GET/PUT/DELETE | Detail, update, hapus peserta |
| `/api/peserta/[id]/status` | GET | Cek status peserta |
| `/api/kelompok` | GET/POST | List & buat kelompok soal |
| `/api/kelompok/[id]` | GET/PUT/DELETE | Detail, update, hapus kelompok |
| `/api/kelompok/[id]/soal` | GET/POST | List & tambah soal |
| `/api/kelompok/[id]/soal/[soalId]` | PUT/DELETE | Update & hapus soal |
| `/api/kelompok/[id]/soal/reorder` | POST | Ubah urutan soal |
| `/api/pengaturan` | GET/PUT | Pengaturan proctoring |
| `/api/penilaian` | GET/POST | Penilaian esai |

## Kontribusi

Bagi tim pengembangan: buat branch fitur, lakukan perubahan, lalu ajukan pull request. Seluruh perubahan harus lolos `npx tsc --noEmit`, `npx vitest run`, dan `npx next build` sebelum di-merge.
