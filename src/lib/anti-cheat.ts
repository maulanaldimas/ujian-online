export type BrowserDeteksi = 'chrome' | 'firefox' | 'safari' | 'edge' | 'opera' | 'lainnya';
export type PerangkatDeteksi = 'mobile' | 'tablet' | 'desktop';

export function deteksiBrowser(): BrowserDeteksi {
  if (typeof navigator === 'undefined') return 'lainnya';
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes('edg/')) return 'edge';
  if (ua.includes('opr/') || ua.includes('opera')) return 'opera';
  if (ua.includes('firefox')) return 'firefox';
  if (ua.includes('safari') && !ua.includes('chrome')) return 'safari';
  if (ua.includes('chrome')) return 'chrome';
  return 'lainnya';
}

export function deteksiPerangkat(): PerangkatDeteksi {
  if (typeof navigator === 'undefined') return 'desktop';
  const ua = navigator.userAgent;
  if (/iPad|Tablet|PlayBook/i.test(ua)) return 'tablet';
  if (/Mobi|Android|iPhone|iPod/i.test(ua)) return 'mobile';
  return 'desktop';
}

export async function deteksiPrivatMode(): Promise<boolean> {
  try {
    if (typeof navigator === 'undefined') return false;
    if (navigator.storage && navigator.storage.estimate) {
      const { quota } = await navigator.storage.estimate();
      if (quota !== undefined && quota < 120 * 1024 * 1024) return true;
    }
  } catch {}
  return false;
}

export const NAMA_BROWSER: Record<BrowserDeteksi, string> = {
  chrome: 'Google Chrome',
  firefox: 'Mozilla Firefox',
  safari: 'Safari',
  edge: 'Microsoft Edge',
  opera: 'Opera',
  lainnya: 'Browser lain',
};

export const NAMA_PERANGKAT: Record<PerangkatDeteksi, string> = {
  mobile: 'ponsel (mobile)',
  tablet: 'tablet',
  desktop: 'desktop',
};

export function peringatanAntiCheat(): {
  peringatan: string[];
  blokir: boolean;
} {
  const peringatan: string[] = [];
  let blokir = false;

  const browser = deteksiBrowser();
  if (browser === 'firefox') {
    peringatan.push('Anda menggunakan Mozilla Firefox. Mode layar penuh dan deteksi pelanggaran lebih lemah di browser ini. Disarankan memakai Google Chrome atau Microsoft Edge.');
  }

  const perangkat = deteksiPerangkat();
  if (perangkat !== 'desktop') {
    blokir = true;
    peringatan.push(`Ujian ini wajib dikerjakan di perangkat desktop/laptop, tetapi terdeteksi perangkat ${NAMA_PERANGKAT[perangkat]}. Silakan ganti ke komputer.`);
  }

  return { peringatan, blokir };
}

const KUNCI_TAB = 'ujian_tab_locked';
const KUNCI_ID = 'ujian_tab_id';
const KUNCI_AKTIF = 'ujian_tab_aktif';

export function buatIdTab(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function idTabSesi(): string {
  try {
    let id = sessionStorage.getItem(KUNCI_ID) || '';
    if (!id) {
      id = buatIdTab();
      sessionStorage.setItem(KUNCI_ID, id);
    }
    return id;
  } catch {
    return '';
  }
}

export function kunciTab(): { tabId: string; sudahAda: boolean } {
  const tabId = idTabSesi();
  let sudahAda = false;
  try {
    const tertulis = localStorage.getItem(KUNCI_TAB);
    if (tertulis && tertulis !== tabId) {
      sudahAda = true;
      localStorage.setItem(KUNCI_TAB, tabId);
    } else if (!tertulis) {
      localStorage.setItem(KUNCI_TAB, tabId);
    }
    localStorage.setItem(KUNCI_ID, tabId);
    localStorage.setItem(KUNCI_AKTIF, String(Date.now()));
  } catch {}
  return { tabId, sudahAda };
}

export function cekTabAktif(): boolean {
  try {
    return localStorage.getItem(KUNCI_AKTIF) !== null;
  } catch {
    return false;
  }
}

export function bebaskanKunci() {
  try {
    localStorage.removeItem(KUNCI_AKTIF);
    localStorage.removeItem(KUNCI_ID);
    localStorage.removeItem(KUNCI_TAB);
  } catch {}
}

export function deteksiSelisihWaktu(local: string | null, server: string | null): number {
  if (!local || !server) return 0;
  const selisih = new Date(local).getTime() - new Date(server).getTime();
  return Math.abs(selisih);
}