export const TEMA_KEY = 'ujian-tema';

export type Tema = 'light' | 'dark';

export function preferensiSistem(): Tema {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function dapatkanTema(): Tema {
  if (typeof window === 'undefined') return 'light';
  const tersimpan = window.localStorage.getItem(TEMA_KEY);
  if (tersimpan === 'light' || tersimpan === 'dark') return tersimpan;
  return preferensiSistem();
}

export function terapkanTema(tema: Tema) {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.toggle('dark', tema === 'dark');
  document.documentElement.style.colorScheme = tema;
}

export function simpanTema(tema: Tema) {
  try {
    window.localStorage.setItem(TEMA_KEY, tema);
  } catch {
    // abaikan (mis. mode privat) — tema tetap berlaku sesi ini
  }
}