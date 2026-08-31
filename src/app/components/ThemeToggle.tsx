'use client';

import { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';
import { dapatkanTema, terapkanTema, simpanTema, type Tema } from '@/lib/theme';

export function ThemeToggle({ className = '', variant = 'surface' }: { className?: string; variant?: 'surface' | 'navy' }) {
  const [tema, setTema] = useState<Tema>('light');

  useEffect(() => {
    setTema(dapatkanTema());
  }, []);

  function ganti() {
    const baru: Tema = tema === 'dark' ? 'light' : 'dark';
    setTema(baru);
    terapkanTema(baru);
    simpanTema(baru);
  }

  const gaya =
    variant === 'navy'
      ? tema === 'dark'
        ? 'text-amber-300 hover:bg-white/10'
        : 'text-teal-300 hover:bg-white/10'
      : tema === 'dark'
        ? 'text-amber-300 hover:bg-teal-600/20'
        : 'text-teal-700 hover:bg-teal-600/10';

  return (
    <button
      onClick={ganti}
      aria-label={tema === 'dark' ? 'Mode terang' : 'Mode gelap'}
      title={tema === 'dark' ? 'Mode terang' : 'Mode gelap'}
      className={`inline-flex items-center justify-center rounded-xl p-2 text-sm font-semibold transition-colors cursor-pointer ${gaya} ${className}`}
    >
      {tema === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}