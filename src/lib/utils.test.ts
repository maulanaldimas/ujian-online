import { describe, it, expect } from 'vitest';
import {
  acakUrutan,
  formatWaktuDetik,
  hitungSkor,
  hitungTerjawab,
  hitungGrade,
  hitungPersenSkor,
  parseBarisSoal,
} from './utils';
import { sanitizeHtml } from './constants';

describe('acakUrutan', () => {
  it('mengembalikan elemen yang sama dengan panjang sama', () => {
    const asli = [1, 2, 3, 4, 5];
    const hasil = acakUrutan(asli);
    expect(hasil).toHaveLength(asli.length);
    expect([...hasil].sort()).toEqual([...asli].sort());
  });

  it('tidak mengubah array asli', () => {
    const asli = [1, 2, 3];
    acakUrutan(asli);
    expect(asli).toEqual([1, 2, 3]);
  });
});

describe('formatWaktuDetik', () => {
  it('memformat detik menjadi menit:ss', () => {
    expect(formatWaktuDetik(0)).toBe('0:00');
    expect(formatWaktuDetik(61)).toBe('1:01');
    expect(formatWaktuDetik(3600)).toBe('60:00');
    expect(formatWaktuDetik(3599)).toBe('59:59');
  });
});

describe('hitungSkor', () => {
  const soal = {
    a: { tipe: 'pilihan_ganda' },
    b: { tipe: 'pilihan_ganda' },
    c: { tipe: 'esai' },
  };
  const kunci = { a: 'X', b: 'Y' };

  it('menghitung benar dan total pilihan ganda', () => {
    const peserta = { jawaban: { a: 'X', b: 'Salah', c: 'jawaban esai' } };
    expect(hitungSkor(peserta, soal, kunci)).toEqual({ benar: 1, totalPG: 2 });
  });

  it('menghitung kosong bila tidak ada PG', () => {
    expect(hitungSkor({ jawaban: {} }, {}, {})).toEqual({ benar: 0, totalPG: 0 });
  });
});

describe('hitungTerjawab', () => {
  it('menghitung jawaban yang terisi', () => {
    const peserta = { jawaban: { a: 'X', b: '', c: '  ', d: 'isi' } };
    expect(hitungTerjawab(peserta, 5)).toEqual({ terjawab: 2, totalSoal: 5 });
  });
});

describe('hitungGrade', () => {
  const soal = {
    a: { tipe: 'pilihan_ganda' },
    b: { tipe: 'pilihan_ganda' },
    c: { tipe: 'pilihan_ganda' },
    d: { tipe: 'pilihan_ganda' },
  };
  const kunci = { a: 'A', b: 'B', c: 'C', d: 'D' };

  it('mengembalikan slate bila tidak ada PG', () => {
    expect(hitungGrade({ jawaban: {} }, {}, {})).toEqual({ label: '—', tone: 'slate' });
  });

  it('memberi Review untuk skor rendah', () => {
    const peserta = { jawaban: { a: 'A', b: 'X', c: 'X', d: 'X' } };
    expect(hitungGrade(peserta, soal, kunci).label).toBe('Review');
  });

  it('memberi Grade C untuk skor sangat tinggi', () => {
    const peserta = { jawaban: { a: 'A', b: 'B', c: 'C', d: 'D' } };
    expect(hitungGrade(peserta, soal, kunci).label).toBe('Grade C');
  });
});

describe('hitungPersenSkor', () => {
  const soal = { a: { tipe: 'pilihan_ganda' } };
  const kunci = { a: 'A' };

  it('menghitung persen PG saja tanpa esai', () => {
    const peserta = { jawaban: { a: 'A' } };
    expect(hitungPersenSkor(peserta, soal, kunci, undefined)).toBe(100);
  });

  it('merata-rata dengan esai bila ada', () => {
    const peserta = { jawaban: { a: 'A' } };
    expect(hitungPersenSkor(peserta, soal, kunci, 80)).toBe(90);
  });

  it('mengembalikan null bila tidak ada PG', () => {
    expect(hitungPersenSkor({ jawaban: {} }, {}, {}, undefined)).toBeNull();
  });
});

describe('parseBarisSoal', () => {
  it('mem-parse soal esai yang valid', () => {
    const hasil = parseBarisSoal({ Pertanyaan: 'Ceritakan pengalaman', Tipe: 'esai', Opsi: '', Kunci: '' }, 1);
    expect(hasil).toMatchObject({ teks: 'Ceritakan pengalaman', tipe: 'esai', valid: true, urutan: 1 });
  });

  it('mem-parse pilihan ganda yang valid', () => {
    const hasil = parseBarisSoal(
      { Pertanyaan: 'Berapa?', Tipe: 'pilihan_ganda', Opsi: 'A;B;C', Kunci: 'B' },
      2
    );
    expect(hasil).toMatchObject({ tipe: 'pilihan_ganda', pilihan: ['A', 'B', 'C'], kunci: 'B', valid: true });
  });

  it('menolak pilihan ganda tanpa kunci yang cocok', () => {
    const hasil = parseBarisSoal(
      { Pertanyaan: 'Berapa?', Tipe: 'pilihan_ganda', Opsi: 'A;B', Kunci: 'Z' },
      1
    );
    expect(hasil.valid).toBe(false);
  });

  it('menolak baris tanpa pertanyaan', () => {
    const hasil = parseBarisSoal({ Pertanyaan: '  ', Tipe: 'esai' }, 1);
    expect(hasil.valid).toBe(false);
  });

  it('memisahkan opsi dengan newline', () => {
    const hasil = parseBarisSoal(
      { Pertanyaan: 'X?', Tipe: 'pilihan_ganda', Opsi: 'A\nB\nC', Kunci: 'A' },
      1
    );
    expect(hasil.pilihan).toEqual(['A', 'B', 'C']);
    expect(hasil.valid).toBe(true);
  });

  it('memisahkan opsi dengan pipe', () => {
    const hasil = parseBarisSoal(
      { Pertanyaan: 'X?', Tipe: 'pilihan_ganda', Opsi: 'A|B|C', Kunci: 'C' },
      1
    );
    expect(hasil.pilihan).toEqual(['A', 'B', 'C']);
    expect(hasil.valid).toBe(true);
  });

  it('menolak PG dengan kurang dari 2 opsi', () => {
    const hasil = parseBarisSoal(
      { Pertanyaan: 'X?', Tipe: 'pilihan_ganda', Opsi: 'A', Kunci: 'A' },
      1
    );
    expect(hasil.valid).toBe(false);
  });
});

describe('hitungGrade boundary cases', () => {
  const soal: Record<string, any> = {};
  const kunci: Record<string, string> = {};
  for (let i = 0; i < 100; i++) {
    const id = `q${i}`;
    soal[id] = { tipe: 'pilihan_ganda' };
    kunci[id] = 'A';
  }

  it('43% = Review', () => {
    const jawaban: Record<string, string> = {};
    for (let i = 0; i < 43; i++) jawaban[`q${i}`] = 'A';
    expect(hitungGrade({ jawaban }, soal, kunci).label).toBe('Review');
  });

  it('44% = Grade A', () => {
    const jawaban: Record<string, string> = {};
    for (let i = 0; i < 44; i++) jawaban[`q${i}`] = 'A';
    expect(hitungGrade({ jawaban }, soal, kunci).label).toBe('Grade A');
  });

  it('79% = Grade A', () => {
    const jawaban: Record<string, string> = {};
    for (let i = 0; i < 79; i++) jawaban[`q${i}`] = 'A';
    expect(hitungGrade({ jawaban }, soal, kunci).label).toBe('Grade A');
  });

  it('80% = Grade B', () => {
    const jawaban: Record<string, string> = {};
    for (let i = 0; i < 80; i++) jawaban[`q${i}`] = 'A';
    expect(hitungGrade({ jawaban }, soal, kunci).label).toBe('Grade B');
  });

  it('89% = Grade B', () => {
    const jawaban: Record<string, string> = {};
    for (let i = 0; i < 89; i++) jawaban[`q${i}`] = 'A';
    expect(hitungGrade({ jawaban }, soal, kunci).label).toBe('Grade B');
  });

  it('90% = Grade C', () => {
    const jawaban: Record<string, string> = {};
    for (let i = 0; i < 90; i++) jawaban[`q${i}`] = 'A';
    expect(hitungGrade({ jawaban }, soal, kunci).label).toBe('Grade C');
  });

  it('100% = Grade C', () => {
    const jawaban: Record<string, string> = {};
    for (let i = 0; i < 100; i++) jawaban[`q${i}`] = 'A';
    expect(hitungGrade({ jawaban }, soal, kunci).label).toBe('Grade C');
  });
});

describe('sanitizeHtml', () => {
  it('menghapus tag HTML', () => {
    expect(sanitizeHtml('<p>Hello <b>world</b></p>')).toBe('Hello world');
  });

  it('menghapus tag self-closing', () => {
    expect(sanitizeHtml('Line<br/>break')).toBe('Linebreak');
  });

  it('trim spasi', () => {
    expect(sanitizeHtml('  <a>test</a>  ')).toBe('test');
  });

  it('teks tanpa tag tetap sama', () => {
    expect(sanitizeHtml('plain text')).toBe('plain text');
  });

  it('string kosong mengembalikan kosong', () => {
    expect(sanitizeHtml('')).toBe('');
  });
});
