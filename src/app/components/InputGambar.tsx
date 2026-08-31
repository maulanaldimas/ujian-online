'use client';

import { useState, useRef } from 'react';
import { ImagePlus, X, Loader2 } from 'lucide-react';

const MAX_BITA = 2 * 1024 * 1024;

function bacaDanPerkecil(file: File, maxUkuran = 1280, kualitas = 0.82): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Gagal membaca file'));
    reader.onload = () => {
      const src = reader.result as string;
      const img = new Image();
      img.onerror = () => reject(new Error('File bukan gambar valid'));
      img.onload = () => {
        let { width, height } = img;
        const rasio = Math.min(1, maxUkuran / Math.max(width, height));
        width = Math.round(width * rasio);
        height = Math.round(height * rasio);
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) { resolve(src); return; }
        ctx.drawImage(img, 0, 0, width, height);
        const tipe = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
        resolve(canvas.toDataURL(tipe, tipe === 'image/png' ? undefined : kualitas));
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  });
}

export default function InputGambar({ value, onChange, label = 'Gambar soal (opsional)' }: {
  value: string;
  onChange: (dataUrl: string) => void;
  label?: string;
}) {
  const [error, setError] = useState('');
  const [memuat, setMemuat] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function pilihFile(file: File | undefined) {
    if (!file) return;
    setError('');
    if (file.size > MAX_BITA) {
      setError('Ukuran gambar maksimal 2 MB.');
      return;
    }
    setMemuat(true);
    try {
      const dataUrl = await bacaDanPerkecil(file);
      onChange(dataUrl);
    } catch (err: any) {
      setError(err.message || 'Gagal memproses gambar.');
    } finally {
      setMemuat(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <div>
      <p className="block font-display text-sm font-semibold text-navy-900 mb-1.5">{label}</p>
      {value ? (
        <div className="relative rounded-xl overflow-hidden border border-slate-200 w-max max-w-full">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="Pratinjau gambar soal" className="max-h-48 object-contain bg-white" />
          <button
            type="button"
            onClick={() => onChange('')}
            className="absolute top-2 right-2 bg-navy-950/70 text-white p-1 rounded-lg hover:bg-navy-950 cursor-pointer"
            aria-label="Hapus gambar"
            title="Hapus gambar"
          >
            <X size={14} />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={memuat}
          className="w-full border-2 border-dashed border-slate-300 hover:border-teal-600 rounded-xl p-4 text-center text-sm text-slate-500 hover:text-teal-700 transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {memuat ? <Loader2 size={16} className="animate-spin" /> : <ImagePlus size={16} />}
          {memuat ? 'Memproses gambar...' : 'Pilih & unggah gambar'}
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={(e) => pilihFile(e.target.files?.[0])}
        className="hidden"
      />
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
      <p className="text-[11px] text-slate-400 mt-1">JPG/PNG, maks 2 MB — otomatis diperkecil.</p>
    </div>
  );
}