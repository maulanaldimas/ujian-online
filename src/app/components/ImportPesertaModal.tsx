'use client';

import { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Button, Card } from '@/app/components/ui';
import { Upload, X, FileSpreadsheet, Check, AlertTriangle } from 'lucide-react';

type Props = {
  open: boolean;
  onClose: () => void;
  onDone: () => void;
};

export default function ImportPesertaModal({ open, onClose, onDone }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<Array<Record<string, any>>>([]);
  const [sedangImport, setSedangImport] = useState(false);
  const [hasil, setHasil] = useState<{ sukses: number; gagal: number; errors: string[] } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  if (!open) return null;

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setHasil(null);
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const wb = XLSX.read(ev.target?.result, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json<Record<string, any>>(ws, { defval: '' });
        setPreview(data.slice(0, 10));
      } catch {
        setPreview([]);
      }
    };
    reader.readAsArrayBuffer(f);
  }

  async function handleImport() {
    if (!file) return;
    setSedangImport(true);
    setHasil(null);
    try {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, any>>(ws, { defval: '' });

      const peserta = rows.map((r) => {
        const namaKey = Object.keys(r).find((k) => /nama/i.test(k));
        const emailKey = Object.keys(r).find((k) => /email/i.test(k));
        const hpKey = Object.keys(r).find((k) => /hp|telp|phone|no[\s._]?hp/i.test(k));
        const lokasiKey = Object.keys(r).find((k) => /lokasi|location|cabang/i.test(k));
        const nikKey = Object.keys(r).find((k) => /nik|ktp/i.test(k));

        return {
          nama: namaKey ? String(r[namaKey]).trim() : '',
          email: emailKey ? String(r[emailKey]).trim() : '',
          noHp: hpKey ? String(r[hpKey]).trim() : '',
          lokasiKerja: lokasiKey ? String(r[lokasiKey]).trim() : '',
          nikKtp: nikKey ? String(r[nikKey]).trim() : '',
        };
      }).filter((p) => p.nama);

      if (peserta.length === 0) {
        setHasil({ sukses: 0, gagal: 0, errors: ['Tidak ada data valid. Pastikan kolom "Nama" tersedia.'] });
        return;
      }

      const res = await fetch('/api/peserta/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ peserta }),
      });
      const data = await res.json();
      if (!res.ok) {
        setHasil({ sukses: 0, gagal: 0, errors: [data.error || 'Gagal import'] });
      } else {
        setHasil(data);
        if (data.sukses > 0) onDone();
      }
    } catch (err: any) {
      setHasil({ sukses: 0, gagal: 0, errors: [err.message || 'Gagal membaca file'] });
    }
    setSedangImport(false);
  }

  function downloadTemplate() {
    const template = [
      { 'Nama': 'Budi Santoso', 'Email': 'budi@email.com', 'No HP': '08123456789', 'Lokasi Kerja': 'Jakarta', 'NIK KTP': '3171234567890001' },
      { 'Nama': 'Siti Aminah', 'Email': 'siti@email.com', 'No HP': '08567890123', 'Lokasi Kerja': 'Surabaya', 'NIK KTP': '3571234567890002' },
    ];
    const ws = XLSX.utils.json_to_sheet(template);
    ws['!cols'] = [{ wch: 25 }, { wch: 25 }, { wch: 15 }, { wch: 20 }, { wch: 20 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template Peserta');
    XLSX.writeFile(wb, 'template-peserta.xlsx');
  }

  function reset() {
    setFile(null);
    setPreview([]);
    setHasil(null);
    if (fileRef.current) fileRef.current.value = '';
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-5">
      <Card className="w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display text-lg font-bold text-navy-900">Import Peserta dari Excel</h2>
          <button onClick={() => { reset(); onClose(); }} className="text-slate-400 hover:text-slate-600 cursor-pointer"><X size={20} /></button>
        </div>

        <div className="flex gap-2 mb-4">
          <Button variant="secondary" onClick={downloadTemplate} className="!px-3 !py-1.5 text-xs">
            <FileSpreadsheet size={14} className="inline mr-1" />Download Template
          </Button>
        </div>

        <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center mb-4 hover:border-teal-400 transition-colors">
          <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleFile} className="hidden" />
          <Upload size={24} className="mx-auto text-slate-400 mb-2" />
          {file ? (
            <p className="text-sm text-navy-900 font-semibold">{file.name}</p>
          ) : (
            <p className="text-sm text-slate-500">Klik untuk memilih file .xlsx atau .csv</p>
          )}
          <Button variant="secondary" onClick={() => fileRef.current?.click()} className="mt-3 !px-4 !py-1.5 text-xs">
            Pilih File
          </Button>
        </div>

        {preview.length > 0 && (
          <div className="mb-4">
            <p className="text-xs text-slate-500 mb-2">Preview ({preview.length} baris pertama):</p>
            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-50">
                    {Object.keys(preview[0]).slice(0, 5).map((k) => (
                      <th key={k} className="px-2 py-1.5 text-left font-semibold text-slate-600">{k}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.map((row, i) => (
                    <tr key={i} className="border-t border-slate-100">
                      {Object.values(row).slice(0, 5).map((v, j) => (
                        <td key={j} className="px-2 py-1.5 text-slate-700">{String(v || '-')}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {hasil && (
          <div className={`p-3 rounded-xl mb-4 text-sm ${hasil.sukses > 0 ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
            {hasil.sukses > 0 && (
              <p className="text-green-700 flex items-center gap-1"><Check size={14} /> {hasil.sukses} peserta berhasil diimport</p>
            )}
            {hasil.gagal > 0 && (
              <p className="text-red-600 flex items-center gap-1 mt-1"><AlertTriangle size={14} /> {hasil.gagal} gagal</p>
            )}
            {hasil.errors.length > 0 && (
              <ul className="mt-2 text-xs text-red-500 list-disc list-inside">
                {hasil.errors.map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            )}
          </div>
        )}

        <div className="flex gap-2">
          <Button onClick={handleImport} disabled={!file || sedangImport}>
            {sedangImport ? 'Mengimport...' : 'Import Sekarang'}
          </Button>
          <Button variant="secondary" onClick={() => { reset(); onClose(); }}>Batal</Button>
        </div>
      </Card>
    </div>
  );
}
