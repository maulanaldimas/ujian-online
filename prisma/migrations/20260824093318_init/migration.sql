-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT,
    "role" TEXT NOT NULL DEFAULT 'admin',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "kelompok_soal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nama" TEXT NOT NULL,
    "level" TEXT,
    "divisi" TEXT,
    "departemen" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "soal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "kelompokId" TEXT NOT NULL,
    "teks" TEXT NOT NULL,
    "tipe" TEXT NOT NULL DEFAULT 'esai',
    "pilihan" TEXT DEFAULT '[]',
    "urutan" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "soal_kelompokId_fkey" FOREIGN KEY ("kelompokId") REFERENCES "kelompok_soal" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "kunci_jawaban" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "soalId" TEXT NOT NULL,
    "jawabanBenar" TEXT NOT NULL DEFAULT '',
    CONSTRAINT "kunci_jawaban_soalId_fkey" FOREIGN KEY ("soalId") REFERENCES "soal" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "peserta_ujian" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nama" TEXT NOT NULL,
    "email" TEXT,
    "noHp" TEXT,
    "lokasiKerja" TEXT,
    "nikKtp" TEXT,
    "authUid" TEXT,
    "status" TEXT NOT NULL DEFAULT 'belum_ujian',
    "consentDiberikan" BOOLEAN NOT NULL DEFAULT false,
    "waktuConsent" DATETIME,
    "waktuMulai" DATETIME,
    "waktuSelesai" DATETIME,
    "kelompokId" TEXT,
    "level" TEXT,
    "divisi" TEXT,
    "departemen" TEXT,
    "jawaban" TEXT NOT NULL DEFAULT '{}',
    "totalPelanggaran" INTEGER NOT NULL DEFAULT 0,
    "logPelanggaran" TEXT NOT NULL DEFAULT '[]',
    "terakhirDisimpan" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "peserta_ujian_kelompokId_fkey" FOREIGN KEY ("kelompokId") REFERENCES "kelompok_soal" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "penilaian_esai" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pesertaId" TEXT NOT NULL,
    "skorEsai" TEXT NOT NULL DEFAULT '{}',
    "totalEsai" INTEGER NOT NULL DEFAULT 0,
    "dinilaiOleh" TEXT,
    "waktuDinilai" DATETIME,
    CONSTRAINT "penilaian_esai_pesertaId_fkey" FOREIGN KEY ("pesertaId") REFERENCES "peserta_ujian" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "pengaturan" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "value" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "kunci_jawaban_soalId_key" ON "kunci_jawaban"("soalId");

-- CreateIndex
CREATE UNIQUE INDEX "penilaian_esai_pesertaId_key" ON "penilaian_esai"("pesertaId");
