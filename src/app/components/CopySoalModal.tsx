'use client';

import { useState, useEffect } from 'react';
import { Card, Button, Select, Label } from '@/app/components/ui';
import { Copy, X, Check } from 'lucide-react';

type KelompokItem = { id?: string; nama?: string; level?: string; divisi?: string; departemen?: string; jumlahSoal?: number };

type Props = {
  open: boolean;
  targetKelompokId: string;
  targetNama: string;
  kelompokList: KelompokItem[];
  onClose: () => void;
  onDone: () => void;
};

export default function CopySoalModal({ open, targetKelompokId, targetNama, kelompokList, onClose, onDone }: Props) {
  const [sumberId, setSumberId] = useState('');
  const [sedangSalin, setSedangSalin] = useState(false);
  const [hasil, setHasil] = useState<{ sukses: boolean; pesan: string } | null>(null);

  useEffect(() => {
    if (open) {
      setSumberId('');
      setHasil(null);
    }
  }, [open]);

  if (!open) return null;

  const sumberOptions = kelompokList.filter((k) => k.id !== targetKelompokId && k.jumlahSoal && k.jumlahSoal > 0);

  async function handleSalin() {
    if (!sumberId) return;
    setSedangSalin(true);
    setHasil(null);
    try {
      const res = await fetch(`/api/kelompok/${targetKelompokId}/copy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sumberKelompokId: sumberId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setHasil({ sukses: false, pesan: data.error || 'Gagal menyalin' });
      } else {
        setHasil({ sukses: true, pesan: `${data.disalin} soal berhasil disalin dari "${data.dari}" ke "${data.ke}"` });
        setTimeout(() => onDone(), 1500);
      }
    } catch (err: any) {
      setHasil({ sukses: false, pesan: err.message || 'Gagal menyalin' });
    }
    setSedangSalin(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-5">
      <Card className="w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display text-lg font-bold text-navy-900">Salin Soal ke &ldquo;{targetNama}&rdquo;</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 cursor-pointer"><X size={20} /></button>
        </div>

        <p className="text-sm text-slate-500 mb-4">
          Pilih kelompok sumber untuk menyalin soal. Semua soal + kunci jawaban akan diduplikasi ke kelompok ini.
        </p>

        <Label>Kelompok Sumber</Label>
        <Select value={sumberId} onChange={(e) => { setSumberId(e.target.value); setHasil(null); }} className="mb-4">
          <option value="">Pilih kelompok sumber...</option>
          {sumberOptions.map((k) => (
            <option key={k.id} value={k.id}>{k.nama} ({k.jumlahSoal ?? 0} soal · {k.level ?? '-'}/{k.divisi ?? '-'}/{k.departemen ?? '-'})</option>
          ))}
        </Select>

        {sumberOptions.length === 0 && (
          <p className="text-xs text-slate-400 mb-4">Tidak ada kelompok lain yang memiliki soal untuk disalin.</p>
        )}

        {hasil && (
          <div className={`p-3 rounded-xl mb-4 text-sm ${hasil.sukses ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-600 border border-red-200'}`}>
            {hasil.sukses && <Check size={14} className="inline mr-1" />}
            {hasil.pesan}
          </div>
        )}

        <div className="flex gap-2">
          <Button onClick={handleSalin} disabled={!sumberId || sedangSalin}>
            <Copy size={14} className="inline mr-1" />
            {sedangSalin ? 'Menyalin...' : 'Salin Sekarang'}
          </Button>
          <Button variant="secondary" onClick={onClose}>Batal</Button>
        </div>
      </Card>
    </div>
  );
}
