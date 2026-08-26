'use client';
import { useState, useEffect, useRef, useCallback, type FormEvent } from 'react';
import { FaceDetector, FilesetResolver } from '@mediapipe/tasks-vision';
import { acakUrutan, type SoalData, type PesertaData } from '@/lib/utils';
import {
  DURASI_UJIAN_DETIK,
  FRAMES_SEBELUM_PELANGGARAN,
  SNAPSHOT_QUALITY,
  DEBOUNCE_SIMPAN_MS,
  AMBANG_AUDIO,
  STATUS,
  sanitizeHtml,
} from '@/lib/constants';
import { useRouter } from 'next/navigation';
import { useToast, ConfirmModal } from '@/app/components/ui';
import MenungguStep from '@/app/components/peserta/MenungguStep';
import ConsentStep from '@/app/components/peserta/ConsentStep';
import FormStep, { type DataDiri } from '@/app/components/peserta/FormStep';
import InstruksiStep from '@/app/components/peserta/InstruksiStep';
import UjianScreen from '@/app/components/peserta/UjianScreen';
import SelesaiScreen from '@/app/components/peserta/SelesaiScreen';

const SESSION_KEY = 'ujian_pesertaId';

function readSessionId(): string | null {
  try { return localStorage.getItem(SESSION_KEY); } catch { return null; }
}
function writeSessionId(id: string) {
  try { localStorage.setItem(SESSION_KEY, id); } catch {}
}

async function apiFetch(url: string, init?: RequestInit) {
  const res = await fetch(url, init);
  return res;
}

export default function Home() {
  const router = useRouter();
  const { toast, toastEl } = useToast();
  const [step, setStep] = useState('consent');
  const [sudahSetuju, setSudahSetuju] = useState(false);
  const [dataDiri, setDataDiri] = useState<DataDiri>({ nama: '', email: '', noHp: '', lokasiKerja: '', nikKtp: '' });
  const [pelanggaran, setPelanggaran] = useState(0);
  const [errorKamera, setErrorKamera] = useState('');
  const [statusWajah, setStatusWajah] = useState<{ pesan: string; ok: boolean }>({ pesan: 'Memuat AI deteksi wajah...', ok: true });
  const [statusAudio, setStatusAudio] = useState<{ pesan: string; ok: boolean }>({ pesan: 'Memantau suara...', ok: true });
  const [sedangMenyimpan, setSedangMenyimpan] = useState(false);
  const [daftarSoal, setDaftarSoal] = useState<SoalData[]>([]);
  const [soalIndex, setSoalIndex] = useState(0);
  const [jawabanMap, setJawabanMap] = useState<Record<string, string>>({});
  const [waktuTersisa, setWaktuTersisa] = useState(DURASI_UJIAN_DETIK);
  const [keluarFullscreen, setKeluarFullscreen] = useState(false);
  const [pengaturanProctoring, setPengaturanProctoring] = useState({ kameraAktif: true, audioAktif: true });
  const [pengaturanSiap, setPengaturanSiap] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [sessionResume, setSessionResume] = useState<PesertaData | null>(null);
  const [menungguKelompok, setMenungguKelompok] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<(() => void) | null>(null);
  const [confirmMessage, setConfirmMessage] = useState('');

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const faceDetectorRef = useRef<FaceDetector | null>(null);
  const frameBurukWajahRef = useRef(0);
  const frameBurukAudioRef = useRef(0);
  const animasiRef = useRef<number | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const docIdRef = useRef<string | null>(null);
  const pelanggaranRef = useRef(0);
  const jawabanMapRef = useRef<Record<string, string>>({});
  const sudahSubmitRef = useRef(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const debounceSimpanRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function tanya(pesan: string, onYa: () => void) {
    setConfirmMessage(pesan);
    setConfirmAction(() => onYa);
    setConfirmOpen(true);
  }

  const muatSoalKelompok = useCallback(async (kelompokId: string): Promise<SoalData[]> => {
    try {
      const res = await apiFetch(`/api/kelompok/${kelompokId}/soal`);
      if (!res.ok) {
        toast('Kelompok soal tidak ditemukan. Hubungi admin.', 'red');
        return [];
      }
      const data: SoalData[] = await res.json();
      if (data.length === 0) {
        setDaftarSoal([]);
        return [];
      }
      data.sort((a, b) => (a.urutan ?? 0) - (b.urutan ?? 0));
      const daftarAcak = acakUrutan(data);
      setDaftarSoal(daftarAcak);
      return daftarAcak;
    } catch (err) {
      console.error('Gagal ambil soal kelompok:', err);
      toast('Gagal memuat soal. Cek koneksi.', 'red');
      return [];
    }
  }, []);

  const lanjutkanUjianSekarang = useCallback(async (sesiArg?: PesertaData) => {
    const sesi = sesiArg || sessionResume;
    if (!sesi) return;
    setSedangMenyimpan(true);
    try {
      await document.documentElement.requestFullscreen();
    } catch (err) {
      console.error('Gagal masuk fullscreen:', err);
    }
    docIdRef.current = sesi.id ?? null;
    setDataDiri({
      nama: sesi.nama || '',
      email: sesi.email || '',
      noHp: sesi.noHp || '',
      lokasiKerja: sesi.lokasiKerja || '',
      nikKtp: sesi.nikKtp || '',
    });
    const jawabanTersimpan = sesi.jawaban || {};
    setJawabanMap(jawabanTersimpan);
    setPelanggaran(sesi.totalPelanggaran ?? 0);

    let daftarUntukUjian = daftarSoal;
    if (sesi.kelompokId && daftarSoal.length === 0) {
      daftarUntukUjian = await muatSoalKelompok(sesi.kelompokId);
    }

    const elapsedDetik = sesi.waktuMulai ? Math.floor((Date.now() - new Date(sesi.waktuMulai).getTime()) / 1000) : 0;
    setWaktuTersisa(Math.max(0, DURASI_UJIAN_DETIK - elapsedDetik));

    const indexBelum = daftarUntukUjian.findIndex((s) => !jawabanTersimpan[s.id ?? ''] || jawabanTersimpan[s.id ?? ''] === '');
    setSoalIndex(indexBelum >= 0 ? indexBelum : 0);

    setSessionResume(null);
    setStep('ujian');
    setSedangMenyimpan(false);
  }, [daftarSoal, muatSoalKelompok, sessionResume]);

  useEffect(() => {
    if (step !== 'consent') return;
    let aktif = true;

    async function cekSesi() {
      const savedId = readSessionId();
      if (savedId) {
        try {
          const res = await apiFetch(`/api/peserta/${savedId}`);
          if (!aktif) return;
          if (res.ok) {
            const sesi = await res.json();
            if (sesi.status === STATUS.SEDANG_UJIAN) {
              docIdRef.current = savedId;
              setSessionResume(sesi);
              lanjutkanUjianSekarang(sesi);
              return;
            }
            if (sesi.status === STATUS.BELUM_UJIAN) {
              docIdRef.current = savedId;
              setMenungguKelompok(true);
              setStep('menunggu');
              return;
            }
          }
        } catch {}
      }
    }
    cekSesi();
    return () => { aktif = false; };
  }, [step, router, lanjutkanUjianSekarang]);

  useEffect(() => { pelanggaranRef.current = pelanggaran; }, [pelanggaran]);
  useEffect(() => { jawabanMapRef.current = jawabanMap; }, [jawabanMap]);

  const ambilSnapshotBlob = useCallback(() => {
    return new Promise<Blob | null>((resolve) => {
      if (!pengaturanProctoring.kameraAktif || !videoRef.current || videoRef.current.readyState < 2) {
        resolve(null);
        return;
      }
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas) { resolve(null); return; }
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) { resolve(null); return; }
      ctx.drawImage(video, 0, 0);
      canvas.toBlob((blob: Blob | null) => resolve(blob), 'image/jpeg', SNAPSHOT_QUALITY);
    });
  }, [pengaturanProctoring]);

  const catatPelanggaran = useCallback(async (tipe: string) => {
    setPelanggaran((prev) => prev + 1);
    if (!docIdRef.current) return;

    try {
      const blob = await ambilSnapshotBlob();
      let snapshotUrl: string | null = null;

      if (blob) {
        snapshotUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = () => resolve('');
          reader.readAsDataURL(blob);
        });
      }

      const currentSesi = await apiFetch(`/api/peserta/${docIdRef.current}`).then(r => r.json()).catch(() => null);
      const currentLogs = currentSesi?.logPelanggaran || [];
      await apiFetch(`/api/peserta/${docIdRef.current}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          logPelanggaran: [...currentLogs, { tipe, waktu: Date.now(), snapshotUrl }],
        }),
      });
    } catch (err) {
      console.error('Gagal catat pelanggaran:', err);
    }
  }, [ambilSnapshotBlob]);

  const simpanProgres = useCallback(async () => {
    if (!docIdRef.current || sudahSubmitRef.current) return;
    try {
      await apiFetch(`/api/peserta/${docIdRef.current}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jawaban: jawabanMapRef.current,
          totalPelanggaran: pelanggaranRef.current,
          terakhirDisimpan: new Date().toISOString(),
        }),
      });
    } catch (err) {
      console.error('Gagal auto-save:', err);
    }
  }, []);

  const submitAkhir = useCallback(async () => {
    if (sudahSubmitRef.current) return;
    if (!docIdRef.current) return;
    sudahSubmitRef.current = true;
    setSedangMenyimpan(true);
    try {
      await apiFetch(`/api/peserta/${docIdRef.current}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jawaban: jawabanMapRef.current,
          totalPelanggaran: pelanggaranRef.current,
          status: STATUS.SELESAI,
          waktuSelesai: new Date().toISOString(),
        }),
      });
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
      setStep(STATUS.SELESAI);
    } catch (err) {
      toast('Gagal menyimpan jawaban. Cek koneksi.', 'red');
      console.error(err);
      sudahSubmitRef.current = false;
    }
    setSedangMenyimpan(false);
  }, []);

  useEffect(() => {
    if (step !== 'ujian') return;
    if (debounceSimpanRef.current) clearTimeout(debounceSimpanRef.current);
    debounceSimpanRef.current = setTimeout(() => {
      simpanProgres();
    }, DEBOUNCE_SIMPAN_MS);
    return () => { if (debounceSimpanRef.current) clearTimeout(debounceSimpanRef.current); };
  }, [jawabanMap, step, simpanProgres]);

  useEffect(() => {
    if (step !== 'consent') return;
    async function ambilPengaturan() {
      try {
        const res = await apiFetch('/api/pengaturan');
        if (res.ok) {
          const data = await res.json();
          setPengaturanProctoring({
            kameraAktif: data.kameraAktif ?? true,
            audioAktif: data.audioAktif ?? true,
          });
        }
      } catch (err) {
        console.error('Gagal ambil pengaturan proctoring:', err);
      } finally {
        setPengaturanSiap(true);
      }
    }
    ambilPengaturan();
  }, [step]);

  useEffect(() => {
    if (step !== 'ujian') return;
    const interval = setInterval(() => {
      setWaktuTersisa((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          if (!sudahSubmitRef.current) submitAkhir();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [step, submitAkhir]);

  useEffect(() => {
    if (step !== 'ujian') return;
    const handleVisibility = () => {
      if (document.hidden) catatPelanggaran('Pindah tab/window');
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [step, catatPelanggaran]);

  useEffect(() => {
    if (step !== 'ujian') return;
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        setKeluarFullscreen(true);
        catatPelanggaran('Keluar dari layar penuh');
      } else {
        setKeluarFullscreen(false);
      }
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [step, catatPelanggaran]);

  useEffect(() => {
    if (step !== 'ujian') return;
    const cegah = (e: Event) => e.preventDefault();
    const handlePaste = (e: ClipboardEvent) => { e.preventDefault(); catatPelanggaran('Menyalin-tempel teks'); };
    const handleKeyDown = (e: KeyboardEvent) => {
      const kombinasiTerlarang =
        (e.ctrlKey && ['c', 'v', 'x', 'u', 'p', 'f'].includes(e.key.toLowerCase())) ||
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && ['i', 'j', 'c'].includes(e.key.toLowerCase()));
      if (kombinasiTerlarang) e.preventDefault();
    };
    document.addEventListener('contextmenu', cegah);
    document.addEventListener('copy', cegah);
    document.addEventListener('cut', cegah);
    document.addEventListener('paste', handlePaste);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('contextmenu', cegah);
      document.removeEventListener('copy', cegah);
      document.removeEventListener('cut', cegah);
      document.removeEventListener('paste', handlePaste);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [step, catatPelanggaran]);

  useEffect(() => {
    if (step !== 'ujian' || !pengaturanSiap) return;
    let stream: MediaStream | null = null;
    const { kameraAktif, audioAktif } = pengaturanProctoring;

    async function setup() {
      if (!kameraAktif && !audioAktif) return;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: kameraAktif, audio: audioAktif });
        if (kameraAktif && videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
      } catch (err) {
        setErrorKamera('Akses kamera/mikrofon ditolak atau tidak tersedia. Ujian tidak bisa dilanjutkan.');
        return;
      }

      if (audioAktif) {
        const AudioContextCtor = window.AudioContext || (window as any).webkitAudioContext;
        const audioContext = new AudioContextCtor();
        const source = audioContext.createMediaStreamSource(stream);
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 512;
        source.connect(analyser);
        audioContextRef.current = audioContext;
        analyserRef.current = analyser;
      }

      if (kameraAktif) {
        const vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm'
        );
        faceDetectorRef.current = await FaceDetector.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              'https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite',
          },
          runningMode: 'VIDEO',
        });
        setStatusWajah({ pesan: 'Memantau...', ok: true });
      }

      deteksiLoop();
    }

    function cekAudio() {
      if (!audioAktif) return;
      const analyser = analyserRef.current;
      if (!analyser) return;
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteFrequencyData(dataArray);
      const rataRata = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
      if (rataRata > AMBANG_AUDIO) {
        setStatusAudio({ pesan: 'Suara keras terdeteksi', ok: false });
        frameBurukAudioRef.current += 1;
        if (frameBurukAudioRef.current === FRAMES_SEBELUM_PELANGGARAN) catatPelanggaran('Suara keras terdeteksi');
      } else {
        setStatusAudio({ pesan: 'Suara normal', ok: true });
        frameBurukAudioRef.current = 0;
      }
    }

    function deteksiLoop() {
      cekAudio();
      if (!kameraAktif || !videoRef.current || !faceDetectorRef.current) {
        if (audioAktif) animasiRef.current = requestAnimationFrame(deteksiLoop);
        return;
      }
      if (videoRef.current.readyState < 2) {
        animasiRef.current = requestAnimationFrame(deteksiLoop);
        return;
      }
      const hasil = faceDetectorRef.current.detectForVideo(videoRef.current, performance.now());
      const jumlahWajah = hasil.detections.length;
      let bermasalah = false;
      if (jumlahWajah === 0) {
        setStatusWajah({ pesan: 'Wajah tidak terdeteksi', ok: false });
        bermasalah = true;
      } else if (jumlahWajah > 1) {
        setStatusWajah({ pesan: `Terdeteksi ${jumlahWajah} wajah`, ok: false });
        bermasalah = true;
      } else {
        setStatusWajah({ pesan: 'Wajah terdeteksi normal', ok: true });
      }
      if (bermasalah) {
        frameBurukWajahRef.current += 1;
        if (frameBurukWajahRef.current === FRAMES_SEBELUM_PELANGGARAN) {
          catatPelanggaran(jumlahWajah === 0 ? 'Wajah tidak terdeteksi' : 'Terdeteksi lebih dari satu wajah');
        }
      } else {
        frameBurukWajahRef.current = 0;
      }
      animasiRef.current = requestAnimationFrame(deteksiLoop);
    }

    setup();
    return () => {
      if (animasiRef.current) cancelAnimationFrame(animasiRef.current);
      if (audioContextRef.current) audioContextRef.current.close();
      if (stream) stream.getTracks().forEach((track) => track.stop());
    };
  }, [step, pengaturanSiap, pengaturanProctoring, catatPelanggaran]);

  useEffect(() => {
    if (step !== 'ujian') return;
    const handleBeforeUnload = () => {
      simpanProgres();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [step, simpanProgres]);

  async function handleFormSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!dataDiri.nama || !dataDiri.email || !dataDiri.noHp || !dataDiri.lokasiKerja || !dataDiri.nikKtp) {
      toast('Semua kolom wajib diisi.', 'amber');
      return;
    }
    setSedangMenyimpan(true);
    try {
      const res = await apiFetch('/api/peserta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nama: sanitizeHtml(dataDiri.nama),
          email: sanitizeHtml(dataDiri.email),
          noHp: dataDiri.noHp,
          lokasiKerja: sanitizeHtml(dataDiri.lokasiKerja),
          nikKtp: dataDiri.nikKtp,
          status: STATUS.BELUM_UJIAN,
          consentDiberikan: true,
          waktuConsent: new Date().toISOString(),
        }),
      });
      const data = await res.json();
      docIdRef.current = data.id;
      writeSessionId(data.id);
      setStep('menunggu');
    } catch (err) {
      toast('Gagal menyimpan data. Cek koneksi.', 'red');
      console.error(err);
    }
    setSedangMenyimpan(false);
  }

  async function mulaiUjianSekarang() {
    if (!docIdRef.current) {
      toast('Data belum tersimpan. Silakan daftar ulang.', 'red');
      return;
    }
    try {
      await document.documentElement.requestFullscreen();
    } catch (err) {
      console.error('Gagal masuk fullscreen:', err);
    }
    setSedangMenyimpan(true);
    try {
      await apiFetch(`/api/peserta/${docIdRef.current}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: STATUS.SEDANG_UJIAN,
          waktuMulai: new Date().toISOString(),
        }),
      });
      setStep('ujian');
    } catch (err) {
      toast('Gagal menyimpan data. Cek koneksi.', 'red');
      console.error(err);
    }
    setSedangMenyimpan(false);
  }

  async function cekStatusKelompok() {
    if (!docIdRef.current) {
      toast('Data belum tersimpan. Silakan daftar ulang.', 'red');
      return;
    }
    setSedangMenyimpan(true);
    try {
      const res = await apiFetch(`/api/peserta/${docIdRef.current}`);
      if (!res.ok) {
        toast('Data peserta tidak ditemukan.', 'red');
        return;
      }
      const sesi = await res.json();
      if (sesi.kelompokId) {
        setMenungguKelompok(false);
        await muatSoalKelompok(sesi.kelompokId);
        if (sesi.status === STATUS.SEDANG_UJIAN) {
          setSessionResume(sesi);
          lanjutkanUjianSekarang(sesi);
        } else {
          setStep('instruksi');
        }
      } else {
        setMenungguKelompok(true);
        setStep('menunggu');
      }
    } catch (err) {
      console.error('Gagal cek status kelompok:', err);
      toast('Gagal memeriksa status. Cek koneksi.', 'red');
    }
    setSedangMenyimpan(false);
  }

  function handleJawabanChange(soalId: string, teks: string) {
    setJawabanMap((prev) => ({ ...prev, [soalId]: teks }));
  }
  function soalBerikutnya() {
    if (soalIndex < daftarSoal.length - 1) setSoalIndex((prev) => prev + 1);
    simpanProgres();
  }
  function soalSebelumnya() {
    if (soalIndex > 0) setSoalIndex((prev) => prev - 1);
    simpanProgres();
  }
  function lompatKeSoal(index: number) {
    setSoalIndex(index);
    simpanProgres();
  }

  async function kembaliFullscreen() {
    try {
      await document.documentElement.requestFullscreen();
    } catch (err) {
      console.error('Gagal masuk fullscreen:', err);
    }
  }

  function konfirmasiSubmit() {
    setShowReview(true);
  }

  function tutupReviewDanKeSoal(index: number) {
    setShowReview(false);
    lompatKeSoal(index);
  }

  function keSoalBelumDijawab() {
    const index = daftarSoal.findIndex((s) => !jawabanMap[s.id ?? ''] || jawabanMap[s.id ?? ''] === '');
    if (index >= 0) tutupReviewDanKeSoal(index);
  }

  if (step === 'menunggu') {
    return (
      <>
        {toastEl}
        <ConfirmModal open={confirmOpen} onConfirm={() => { confirmAction?.(); setConfirmOpen(false); setConfirmAction(null); }} onCancel={() => { setConfirmOpen(false); setConfirmAction(null); }} title="Konfirmasi" message={confirmMessage} confirmLabel="Ya" />
        <MenungguStep
          menungguKelompok={menungguKelompok}
          sedangMenyimpan={sedangMenyimpan}
          onPeriksa={cekStatusKelompok}
        />
      </>
    );
  }

  if (step === 'consent') {
    return (
      <>
        {toastEl}
        <ConfirmModal open={confirmOpen} onConfirm={() => { confirmAction?.(); setConfirmOpen(false); setConfirmAction(null); }} onCancel={() => { setConfirmOpen(false); setConfirmAction(null); }} title="Konfirmasi" message={confirmMessage} confirmLabel="Ya" />
        <ConsentStep
          sessionResume={sessionResume}
          sedangMenyimpan={sedangMenyimpan}
          pengaturanProctoring={pengaturanProctoring}
          sudahSetuju={sudahSetuju}
          onSetuju={setSudahSetuju}
          onLanjutkanUjian={() => lanjutkanUjianSekarang()}
          onMulaiBaru={() => {
            tanya('Mulai sesi baru? Sesi sebelumnya yang belum selesai akan tetap tercatat untuk ditinjau HR.', () => setSessionResume(null));
          }}
          onPeriksaStatus={cekStatusKelompok}
          onLanjutConsent={() => setStep('form')}
        />
      </>
    );
  }

  if (step === 'form') {
    return (
      <>
        {toastEl}
        <ConfirmModal open={confirmOpen} onConfirm={() => { confirmAction?.(); setConfirmOpen(false); setConfirmAction(null); }} onCancel={() => { setConfirmOpen(false); setConfirmAction(null); }} title="Konfirmasi" message={confirmMessage} confirmLabel="Ya" />
        <FormStep
          dataDiri={dataDiri}
          sedangMenyimpan={sedangMenyimpan}
          onDataDiriChange={setDataDiri}
          onSubmit={handleFormSubmit}
        />
      </>
    );
  }

  if (step === 'instruksi') {
    return (
      <>
        {toastEl}
        <ConfirmModal open={confirmOpen} onConfirm={() => { confirmAction?.(); setConfirmOpen(false); setConfirmAction(null); }} onCancel={() => { setConfirmOpen(false); setConfirmAction(null); }} title="Konfirmasi" message={confirmMessage} confirmLabel="Ya" />
        <InstruksiStep
          jumlahSoal={daftarSoal.length}
          durasiDetik={DURASI_UJIAN_DETIK}
          sedangMenyimpan={sedangMenyimpan}
          onMulai={mulaiUjianSekarang}
        />
      </>
    );
  }

  if (step === 'ujian') {
    return (
      <>
        {toastEl}
        <ConfirmModal open={confirmOpen} onConfirm={() => { confirmAction?.(); setConfirmOpen(false); setConfirmAction(null); }} onCancel={() => { setConfirmOpen(false); setConfirmAction(null); }} title="Konfirmasi" message={confirmMessage} confirmLabel="Ya" />
        <UjianScreen
          daftarSoal={daftarSoal}
          soalIndex={soalIndex}
          jawabanMap={jawabanMap}
          waktuTersisa={waktuTersisa}
          keluarFullscreen={keluarFullscreen}
          namaPeserta={dataDiri.nama}
          errorKamera={errorKamera}
          statusWajah={statusWajah}
          statusAudio={statusAudio}
          pelanggaran={pelanggaran}
          pengaturanProctoring={pengaturanProctoring}
          sedangMenyimpan={sedangMenyimpan}
          showReview={showReview}
          videoRef={videoRef}
          canvasRef={canvasRef}
          onJawabanChange={handleJawabanChange}
          onSoalSebelumnya={soalSebelumnya}
          onSoalBerikutnya={soalBerikutnya}
          onLompatKeSoal={lompatKeSoal}
          onKembaliFullscreen={kembaliFullscreen}
          onKonfirmasiSubmit={konfirmasiSubmit}
          onTutupReview={() => setShowReview(false)}
          onKeSoalBelumDijawab={keSoalBelumDijawab}
          onTutupReviewDanKeSoal={tutupReviewDanKeSoal}
          onSubmitAkhir={submitAkhir}
        />
      </>
    );
  }

  return (
    <>
      {toastEl}
      <ConfirmModal open={confirmOpen} onConfirm={() => { confirmAction?.(); setConfirmOpen(false); setConfirmAction(null); }} onCancel={() => { setConfirmOpen(false); setConfirmAction(null); }} title="Konfirmasi" message={confirmMessage} confirmLabel="Ya" />
      <SelesaiScreen
        nama={dataDiri.nama}
        email={dataDiri.email}
        jumlahSoal={daftarSoal.length}
        jumlahDijawab={Object.values(jawabanMap).filter((v) => v.trim() !== '').length}
      />
    </>
  );
}
