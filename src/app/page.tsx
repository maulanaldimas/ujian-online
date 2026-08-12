'use client';
import { useState, useEffect, useRef, useCallback, type FormEvent } from 'react';
import { FaceDetector, FilesetResolver } from '@mediapipe/tasks-vision';
import {
  collection,
  addDoc,
  updateDoc,
  doc,
  getDoc,
  serverTimestamp,
  getDocs,
  query,
  orderBy,
  where,
  arrayUnion,
} from 'firebase/firestore';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { db, auth, storage } from '@/firebase';
import Image from 'next/image';
import { PageBackground, Card, Label, Input, Textarea, Button, Badge, Spinner } from '@/app/components/ui';
import { acakUrutan, formatWaktuDetik, type SoalData, type PesertaData } from '@/lib/utils';

const DURASI_UJIAN_DETIK = 60 * 60;

export default function Home() {
  const [step, setStep] = useState('consent');
  const [sudahSetuju, setSudahSetuju] = useState(false);
  const [dataDiri, setDataDiri] = useState({ nama: '', email: '', noHp: '', lokasiKerja: '', nikKtp: '' });
  const [pelanggaran, setPelanggaran] = useState(0);
  const [errorKamera, setErrorKamera] = useState('');
  const [statusWajah, setStatusWajah] = useState('Memuat AI deteksi wajah...');
  const [statusAudio, setStatusAudio] = useState('Memantau suara...');
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

  useEffect(() => {
    signInAnonymously(auth).catch((err) => {
      console.error('Gagal membuat sesi anonim:', err);
    });
  }, []);

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
      canvas.toBlob((blob: Blob | null) => resolve(blob), 'image/jpeg', 0.7);
    });
  }, [pengaturanProctoring]);

  const catatPelanggaran = useCallback(async (tipe: string) => {
    setPelanggaran((prev) => prev + 1);
    if (!docIdRef.current) return;

    try {
      const blob = await ambilSnapshotBlob();
      let snapshotUrl = null;

      if (blob) {
        const userId = auth.currentUser?.uid || 'anonim';
        const path = `pelanggaran/${userId}/${Date.now()}.jpg`;
        const fileRef = storageRef(storage, path);
        await uploadBytes(fileRef, blob);
        snapshotUrl = await getDownloadURL(fileRef);
      }

      await updateDoc(doc(db, 'pesertaUjian', docIdRef.current), {
        logPelanggaran: arrayUnion({ tipe, waktu: Date.now(), snapshotUrl }),
      });
    } catch (err) {
      console.error('Gagal catat pelanggaran:', err);
    }
  }, [ambilSnapshotBlob]);

  const simpanProgres = useCallback(async () => {
    if (!docIdRef.current || sudahSubmitRef.current) return;
    try {
      await updateDoc(doc(db, 'pesertaUjian', docIdRef.current), {
        jawaban: jawabanMapRef.current,
        totalPelanggaran: pelanggaranRef.current,
        terakhirDisimpan: serverTimestamp(),
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
      await updateDoc(doc(db, 'pesertaUjian', docIdRef.current), {
        jawaban: jawabanMapRef.current,
        totalPelanggaran: pelanggaranRef.current,
        status: 'selesai',
        waktuSelesai: serverTimestamp(),
      });
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
      setStep('selesai');
    } catch (err) {
      alert('Gagal menyimpan jawaban ke server. Cek koneksi internet lalu coba lagi.');
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
    }, 3000);
    return () => { if (debounceSimpanRef.current) clearTimeout(debounceSimpanRef.current); };
  }, [jawabanMap, step, simpanProgres]);

  useEffect(() => {
    if (step !== 'consent') return;
    async function ambilPengaturan() {
      try {
        const snap = await getDoc(doc(db, 'pengaturan', 'proctoring'));
        if (snap.exists()) {
          const data = snap.data();
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
    if (step !== 'consent') return;
    async function ambilSoal() {
      try {
        const q = query(collection(db, 'soalUjian'), orderBy('urutan', 'asc'));
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
        setDaftarSoal(acakUrutan(data));
      } catch (err) {
        console.error('Gagal ambil soal:', err);
      }
    }
    ambilSoal();
  }, [step]);

  useEffect(() => {
    if (step !== 'consent') return;
    let aktif = true;
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) return;
      try {
        const q = query(
          collection(db, 'pesertaUjian'),
          where('pesertaAuthUid', '==', user.uid)
        );
        const snapshot = await getDocs(q);
        if (!aktif) return;
        const sesiSedangUjian = snapshot.docs
          .filter((docSnap) => docSnap.data().status === 'sedang_ujian')
          .sort(
            (a, b) =>
              (b.data().waktuMulai?.toMillis?.() ?? 0) - (a.data().waktuMulai?.toMillis?.() ?? 0)
          );
        if (sesiSedangUjian.length > 0) {
          const docSnap = sesiSedangUjian[0];
          setSessionResume({ id: docSnap.id, ...docSnap.data() });
        }
      } catch (err) {
        console.error('Gagal cek sesi tersimpan:', err);
      }
    });
    return () => {
      aktif = false;
      unsubscribe();
    };
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
        setStatusWajah('Memantau...');
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
      const AMBANG_BATAS = 25;
      if (rataRata > AMBANG_BATAS) {
        setStatusAudio('⚠ Suara keras terdeteksi');
        frameBurukAudioRef.current += 1;
        if (frameBurukAudioRef.current === 45) catatPelanggaran('Suara keras terdeteksi');
      } else {
        setStatusAudio('✓ Suara normal');
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
        setStatusWajah('⚠ Wajah tidak terdeteksi');
        bermasalah = true;
      } else if (jumlahWajah > 1) {
        setStatusWajah(`⚠ Terdeteksi ${jumlahWajah} wajah`);
        bermasalah = true;
      } else {
        setStatusWajah('✓ Wajah terdeteksi normal');
      }
      if (bermasalah) {
        frameBurukWajahRef.current += 1;
        if (frameBurukWajahRef.current === 45) {
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

  function handleFormSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!dataDiri.nama || !dataDiri.email || !dataDiri.noHp || !dataDiri.lokasiKerja || !dataDiri.nikKtp) {
      alert('Semua kolom wajib diisi.');
      return;
    }
    setStep('instruksi');
  }

  async function mulaiUjianSekarang() {
    try {
      await document.documentElement.requestFullscreen();
    } catch (err) {
      console.error('Gagal masuk fullscreen:', err);
    }
    setSedangMenyimpan(true);
    try {
      if (!auth.currentUser) {
        await signInAnonymously(auth);
      }
      const docRef = await addDoc(collection(db, 'pesertaUjian'), {
        nama: dataDiri.nama,
        email: dataDiri.email,
        noHp: dataDiri.noHp,
        lokasiKerja: dataDiri.lokasiKerja,
        nikKtp: dataDiri.nikKtp,
        status: 'sedang_ujian',
        waktuMulai: serverTimestamp(),
        consentDiberikan: true,
        waktuConsent: serverTimestamp(),
        pesertaAuthUid: auth.currentUser?.uid || null,
      });
      docIdRef.current = docRef.id;
      setStep('ujian');
    } catch (err) {
      alert('Gagal menyimpan data ke server. Cek koneksi internet lalu coba lagi.');
      console.error(err);
    }
    setSedangMenyimpan(false);
  }

  async function lanjutkanUjianSekarang() {
    const sesi = sessionResume;
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

    const elapsedDetik = sesi.waktuMulai ? Math.floor((Date.now() - sesi.waktuMulai.toMillis()) / 1000) : 0;
    setWaktuTersisa(Math.max(0, DURASI_UJIAN_DETIK - elapsedDetik));

    const indexBelum = daftarSoal.findIndex((s) => !jawabanTersimpan[s.id ?? ''] || jawabanTersimpan[s.id ?? ''] === '');
    setSoalIndex(indexBelum >= 0 ? indexBelum : 0);

    setSessionResume(null);
    setStep('ujian');
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

  // ===== TAMPILAN: PERSETUJUAN (CONSENT) =====
  if (step === 'consent') {
    return (
      <PageBackground className="flex flex-col items-center justify-center p-5">
        {sessionResume && (
          <div className="w-full max-w-lg mb-4">
            <Card className="p-5 border-l-4 !border-l-[#E8A33D]">
              <p className="font-display font-bold text-[#10192E] mb-1">⏳ Ujian Belum Selesai</p>
              <p className="text-sm text-slate-600 mb-3">
                <b className="text-[#10192E]">{sessionResume.nama}</b> · progres terakhir{' '}
                {sessionResume.terakhirDisimpan
                  ? new Date(sessionResume.terakhirDisimpan.toMillis()).toLocaleString('id-ID')
                  : 'sebelumnya'}
              </p>
              <div className="flex gap-3">
                <Button onClick={lanjutkanUjianSekarang} disabled={sedangMenyimpan}>
                  {sedangMenyimpan ? 'Memuat...' : '▶ Lanjutkan Ujian'}
                </Button>
                <Button
                  variant="secondary"
                  disabled={sedangMenyimpan}
                  onClick={() => {
                    if (confirm('Mulai sesi baru? Sesi sebelumnya yang belum selesai akan tetap tercatat untuk ditinjau HR.')) {
                      setSessionResume(null);
                    }
                  }}
                >
                  Mulai Baru
                </Button>
              </div>
            </Card>
          </div>
        )}

        <Card className="w-full max-w-lg overflow-hidden">
          <div className="bg-[#10192E] px-8 pt-8 pb-6 text-center">
            <div className="flex justify-center mb-3">
              <div className="bg-white rounded-2xl p-2">
                <Image src="/logo.png" alt="Logo Sokka Fiber" width={80} height={80} priority />
              </div>
            </div>
            <h1 className="font-display text-2xl font-bold text-white">Sebelum Memulai</h1>
            <p className="text-sm text-slate-300 mt-2">Mohon baca informasi berikut sebelum melanjutkan</p>
          </div>

          <div className="px-8 py-6">
            <p className="text-sm text-slate-600 mb-4 leading-relaxed">
              Assessment online ini digunakan sebagai bagian dari proses evaluasi PT Sokka Tama Fiber. Untuk menjaga keadilan bagi seluruh kandidat, selama ujian berlangsung sistem akan:
            </p>

            <ul className="space-y-2.5 mb-5">
              {pengaturanProctoring.kameraAktif && (
                <li className="flex items-start gap-2.5 text-sm text-slate-700">
                  <span className="text-[#1F6F78] font-bold">•</span>
                  Mengaktifkan <b>kamera</b> untuk memantau kehadiran wajah Anda selama ujian.
                </li>
              )}
              {pengaturanProctoring.audioAktif && (
                <li className="flex items-start gap-2.5 text-sm text-slate-700">
                  <span className="text-[#1F6F78] font-bold">•</span>
                  Mengaktifkan <b>mikrofon</b> untuk memantau suara di sekitar Anda.
                </li>
              )}
              <li className="flex items-start gap-2.5 text-sm text-slate-700">
                <span className="text-[#1F6F78] font-bold">•</span>
                Mendeteksi aktivitas layar seperti <b>berpindah tab, keluar layar penuh, atau menyalin-tempel teks</b>.
              </li>
              <li className="flex items-start gap-2.5 text-sm text-slate-700">
                <span className="text-[#1F6F78] font-bold">•</span>
                Menyimpan data Anda (nama, email, NIK, dan hasil Assesment) untuk keperluan proses evaluasi.
              </li>
            </ul>

            <p className="text-xs text-slate-500 mb-5 leading-relaxed">
              Data yang dikumpulkan hanya digunakan untuk keperluan evaluasi rekrutmen dan dijaga kerahasiaannya oleh tim Human Capital PT Sokka Tama Fiber. Jika Anda tidak bersedia, Anda dapat menutup halaman ini tanpa melanjutkan ujian.
            </p>

            <label className="flex items-start gap-3 p-4 bg-[#F7F9FB] rounded-xl cursor-pointer mb-5">
              <input
                type="checkbox"
                checked={sudahSetuju}
                onChange={(e) => setSudahSetuju(e.target.checked)}
                className="mt-0.5 w-4 h-4 accent-[#1F6F78]"
              />
              <span className="text-sm text-[#10192E]">
                Saya memahami dan menyetujui bahwa saya akan dipantau sebagaimana dijelaskan di atas selama sesi ujian berlangsung.
              </span>
            </label>

            <Button
              className="w-full"
              disabled={!sudahSetuju}
              onClick={() => setStep('form')}
            >
              Saya Setuju & Lanjutkan
            </Button>
          </div>
        </Card>
      </PageBackground>
    );
  }

  // ===== TAMPILAN: FORM DATA DIRI =====
  if (step === 'form') {
    const langkah = [
      { label: 'Data Diri', aktif: true },
      { label: 'Ujian Berlangsung', aktif: false },
      { label: 'Selesai', aktif: false },
    ];

    return (
      <PageBackground className="flex items-center justify-center p-5">
        <Card className="w-full max-w-md overflow-hidden">
          <div className="bg-[#ffffff] px-8 pt-8 pb-6 text-center">
            <div className="flex justify-center mb-3">
              <div className="bg-[#ffffff00] rounded-2xl p-2">
                <Image src="/logo.png" alt="Logo Sokka Fiber" width={200} height={200} priority />
              </div>
            </div>
            <h1 className="font-display text-2xl font-bold text-[#10192E]">Ujian Rekrutmen</h1>
            <p className="text-sm text-slate-500 mt-2">
              Ujian akan berjalan dalam mode layar penuh. Keluar dari mode layar penuh akan tercatat sebagai pelanggaran.
            </p>
          </div>

          <div className="flex items-center justify-center gap-2 px-8 pt-5 text-xs">
            {langkah.map((l, i) => (
              <div key={l.label} className="flex items-center gap-2">
                <span className={`flex items-center gap-1 font-semibold ${l.aktif ? 'text-[#10192E]' : 'text-slate-400'}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${l.aktif ? 'bg-[#E8A33D]' : 'bg-slate-300'}`} />
                  {l.label}
                </span>
                {i < langkah.length - 1 && <span className="text-slate-300">—</span>}
              </div>
            ))}
          </div>

          <form onSubmit={handleFormSubmit} className="px-8 pt-6 pb-8">
            <Label>Nama Lengkap</Label>
            <Input className="mb-4" placeholder="Sesuai KTP/identitas resmi"
              value={dataDiri.nama} onChange={(e) => setDataDiri({ ...dataDiri, nama: e.target.value })} />

            <Label>Email</Label>
            <Input type="email" className="mb-4" placeholder="nama@email.com"
              value={dataDiri.email} onChange={(e) => setDataDiri({ ...dataDiri, email: e.target.value })} />

            <Label>No HP</Label>
            <Input type="tel" className="mb-4" placeholder="08xxxxxxxxxx"
              value={dataDiri.noHp}
              onChange={(e) => setDataDiri({ ...dataDiri, noHp: e.target.value.replace(/[^0-9]/g, '') })} />

            <Label>Lokasi Kerja</Label>
            <Input className="mb-4" placeholder="Contoh: Jakarta, Bandung, dst"
              value={dataDiri.lokasiKerja} onChange={(e) => setDataDiri({ ...dataDiri, lokasiKerja: e.target.value })} />

            <Label>NIK KTP</Label>
            <Input type="tel" className="mb-6" placeholder="16 digit NIK"
              value={dataDiri.nikKtp}
              onChange={(e) => setDataDiri({ ...dataDiri, nikKtp: e.target.value.replace(/[^0-9]/g, '') })} />

            <Button type="submit" className="w-full" disabled={sedangMenyimpan}>
              {sedangMenyimpan ? 'Menyimpan...' : 'Mulai Ujian'}
            </Button>

            <p className="flex items-center justify-center gap-1.5 text-xs text-slate-400 mt-5">
              ❓ Ada kendala? Hubungi tim HR
            </p>
          </form>
        </Card>
      </PageBackground>
    );
  }

  // ===== TAMPILAN: INSTRUKSI SEBELUM UJIAN =====
  if (step === 'instruksi') {
    return (
      <PageBackground className="flex items-center justify-center p-5">
        <Card className="w-full max-w-lg overflow-hidden">
          <div className="bg-[#10192E] px-8 pt-8 pb-6 text-center">
            <h1 className="font-display text-2xl font-bold text-white">Petunjuk Pengerjaan</h1>
            <p className="text-sm text-slate-300 mt-2">Baca dengan seksama sebelum memulai</p>
          </div>

          <div className="px-8 py-6">
            <div className="grid grid-cols-2 gap-3 mb-5">
              <div className="bg-[#F7F9FB] rounded-xl p-4 text-center">
                <p className="text-2xl font-display font-bold text-[#10192E]">{daftarSoal.length}</p>
                <p className="text-xs text-slate-500">Jumlah Soal</p>
              </div>
              <div className="bg-[#F7F9FB] rounded-xl p-4 text-center">
                <p className="text-2xl font-display font-bold text-[#10192E]">{Math.floor(DURASI_UJIAN_DETIK / 60)}</p>
                <p className="text-xs text-slate-500">Menit Pengerjaan</p>
              </div>
            </div>

            <p className="font-display font-bold text-[#10192E] mb-2 text-sm">Yang Perlu Anda Ketahui</p>
            <ul className="space-y-2.5 mb-5">
              <li className="flex items-start gap-2.5 text-sm text-slate-700">
                <span className="text-[#1F6F78] font-bold">•</span>
                Ujian akan berjalan dalam <b>mode layar penuh</b>. Sistem akan meminta izin layar penuh begitu Anda klik tombol di bawah.
              </li>
              <li className="flex items-start gap-2.5 text-sm text-slate-700">
                <span className="text-[#1F6F78] font-bold">•</span>
                Anda bisa <b>berpindah antar soal secara bebas</b> (maju, mundur, atau lompat ke nomor tertentu) sebelum mengirim jawaban akhir.
              </li>
              <li className="flex items-start gap-2.5 text-sm text-slate-700">
                <span className="text-[#1F6F78] font-bold">•</span>
                Jawaban Anda <b>tersimpan otomatis</b> setiap beberapa saat, jadi tidak akan hilang meskipun koneksi sempat terputus.
              </li>
              <li className="flex items-start gap-2.5 text-sm text-slate-700">
                <span className="text-[#1F6F78] font-bold">•</span>
                Keluar dari layar penuh, berpindah tab, atau menyalin-tempel teks akan <b>tercatat sebagai pelanggaran</b>.
              </li>
              <li className="flex items-start gap-2.5 text-sm text-slate-700">
                <span className="text-[#1F6F78] font-bold">•</span>
                Setelah waktu habis, jawaban akan <b>otomatis terkirim</b> apapun kondisinya saat itu.
              </li>
              <li className="flex items-start gap-2.5 text-sm text-slate-700">
                <span className="text-[#1F6F78] font-bold">•</span>
                Jawaban yang sudah dikirim <b>tidak dapat diubah kembali</b>.
              </li>
            </ul>

            <Button className="w-full" onClick={mulaiUjianSekarang} disabled={sedangMenyimpan}>
              {sedangMenyimpan ? 'Menyiapkan...' : 'Mulai Sekarang'}
            </Button>
          </div>
        </Card>
      </PageBackground>
    );
  }

  // ===== TAMPILAN: UJIAN BERLANGSUNG =====
  if (step === 'ujian') {
    if (daftarSoal.length === 0) {
      return (
        <PageBackground className="flex items-center justify-center">
          <div className="text-center">
            <Spinner className="mx-auto h-8 w-8" />
            <p className="text-slate-500 font-display mt-3">Memuat soal...</p>
          </div>
        </PageBackground>
      );
    }

    const soalSekarang = daftarSoal[soalIndex];
    const isSoalTerakhir = soalIndex === daftarSoal.length - 1;
    const jumlahDijawab = daftarSoal.filter((s) => jawabanMap[s.id ?? ''] && jawabanMap[s.id ?? ''] !== '').length;

    const NavigasiSoal = (
      <Card className="p-4">
        <p className="font-display text-sm font-bold text-[#10192E] mb-1">Navigasi Soal</p>
        <p className="text-xs text-slate-500 mb-3">{jumlahDijawab} dari {daftarSoal.length} terjawab</p>
        <div className="grid grid-cols-5 gap-2">
          {daftarSoal.map((s, i) => {
            const sudahDijawab = jawabanMap[s.id ?? ''] && jawabanMap[s.id ?? ''] !== '';
            const aktif = i === soalIndex;
            return (
              <button
                key={s.id}
                onClick={() => lompatKeSoal(i)}
                className={`w-9 h-9 rounded-full text-sm font-bold border-2 cursor-pointer transition
                  ${aktif ? 'bg-[#10192E] text-white border-[#10192E]' : ''}
                  ${!aktif && sudahDijawab ? 'bg-green-50 text-green-700 border-green-300' : ''}
                  ${!aktif && !sudahDijawab ? 'bg-white text-slate-400 border-slate-200' : ''}
                `}
              >
                {i + 1}
              </button>
            );
          })}
        </div>
        <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-500 space-y-1.5">
          <p className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-[#10192E] inline-block" /> Sedang dilihat</p>
          <p className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-green-50 border border-green-300 inline-block" /> Sudah dijawab</p>
          <p className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-white border border-slate-200 inline-block" /> Belum dijawab</p>
        </div>
      </Card>
    );

    return (
      <PageBackground>
        {keluarFullscreen && (
          <div className="max-w-2xl mx-auto pt-5 px-5">
            <Card className="!border-red-300 bg-red-50 p-4 text-center">
              <p className="text-red-700 font-bold flex items-center justify-center gap-2">
                ⚠️ Anda keluar dari mode layar penuh. Ini tercatat sebagai pelanggaran.
              </p>
              <Button onClick={kembaliFullscreen} className="mt-3">Kembali ke Layar Penuh</Button>
            </Card>
          </div>
        )}

        <div className="hidden lg:flex lg:flex-col lg:items-center lg:fixed lg:left-8 lg:top-6 lg:w-[400px]">
          <Image src="/logo.png" alt="Logo Sokka Fiber" width={700} height={700} priority />
        </div>

        <div className="hidden lg:block lg:fixed lg:right-8 lg:top-6 lg:w-[240px]">
          {NavigasiSoal}
        </div>

        <div className="max-w-2xl mx-auto lg:mx-[260px] xl:mx-auto xl:max-w-2xl p-5">
          <div className="flex justify-between items-center mb-5">
            <h1 className="font-display text-xl font-bold text-[#10192E]">Ujian Rekrutmen</h1>
            <span className={`flex items-center gap-1.5 font-display font-bold px-3 py-1.5 rounded-full text-sm ${waktuTersisa < 60 ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-[#10192E]'}`}>
              ⏱ {formatWaktuDetik(waktuTersisa)}
            </span>
          </div>

          <div className="flex justify-center mb-4 lg:hidden">
            <Image src="/logo.png" alt="Logo Sokka Fiber" width={64} height={64} priority />
          </div>

          <Card className="p-6">
            <p className="text-sm text-slate-500 mb-4">Peserta: <b className="text-[#10192E]">{dataDiri.nama}</b></p>

            {errorKamera && <p className="text-red-600 text-sm mb-3">{errorKamera}</p>}

            {(pengaturanProctoring.kameraAktif || pengaturanProctoring.audioAktif) && (
              <div className="flex items-center gap-4 mb-4 pb-4 border-b border-slate-100">
                {pengaturanProctoring.kameraAktif && (
                  <>
                    <video ref={videoRef} autoPlay muted playsInline className="w-[140px] rounded-lg bg-black" />
                    <canvas ref={canvasRef} className="hidden" />
                  </>
                )}
                <div className="space-y-1.5">
                  {pengaturanProctoring.kameraAktif && (
                    <Badge tone={statusWajah.includes('⚠') ? 'red' : 'green'}>{statusWajah.replace('⚠ ', '').replace('✓ ', '')}</Badge>
                  )}
                  {pengaturanProctoring.audioAktif && (
                    <div><Badge tone={statusAudio.includes('⚠') ? 'red' : 'green'}>{statusAudio.replace('⚠ ', '').replace('✓ ', '')}</Badge></div>
                  )}
                  {pelanggaran > 0 && (
                    <div><Badge tone="orange">⚠ {pelanggaran} pelanggaran terdeteksi</Badge></div>
                  )}
                </div>
              </div>
            )}

            <p className="text-slate-400 text-xs font-semibold uppercase tracking-wide mb-1">Soal {soalIndex + 1} dari {daftarSoal.length}</p>
            <p className="text-[#10192E] text-lg mb-4 break-words">{soalSekarang.teks}</p>

            {soalSekarang.tipe === 'pilihan_ganda' ? (
              <div className="mb-4 space-y-2">
                {(soalSekarang.pilihan || []).map((opsi, i) => {
                  const dipilih = jawabanMap[soalSekarang.id ?? ''] === opsi;
                  return (
                    <label key={i} className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer border-2 transition break-words
                      ${dipilih ? 'bg-teal-50 border-[#1F6F78]' : 'bg-[#F7F9FB] border-transparent hover:border-slate-200'}`}>
                      <input
                        type="radio"
                        name={`soal-${soalSekarang.id}`}
                        checked={dipilih}
                        onChange={() => handleJawabanChange(soalSekarang.id ?? '', opsi)}
                        className="w-4 h-4 accent-[#1F6F78]"
                      />
                      <span className="text-[#10192E]">{opsi}</span>
                    </label>
                  );
                })}
              </div>
            ) : (
              <Textarea rows={5} className="mb-2"
                value={jawabanMap[soalSekarang.id ?? ''] || ''}
                onChange={(e) => handleJawabanChange(soalSekarang.id ?? '', e.target.value)} />
            )}

            <div className="flex justify-between items-center mt-5">
              <Button variant="secondary" onClick={soalSebelumnya} disabled={soalIndex === 0 || sedangMenyimpan}>
                ← Sebelumnya
              </Button>
              <Button variant="secondary" onClick={soalBerikutnya} disabled={isSoalTerakhir || sedangMenyimpan}>
                → Berikutnya
              </Button>
            </div>

            <Button onClick={konfirmasiSubmit} className="w-full mt-4" disabled={sedangMenyimpan}>
              {sedangMenyimpan ? 'Menyimpan...' : '📤 Review & Kirim Jawaban'}
            </Button>
          </Card>

          <div className="lg:hidden mt-5">{NavigasiSoal}</div>
        </div>

        {showReview && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-5 overflow-y-auto">
            <Card className="w-full max-w-lg p-6 my-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display text-xl font-bold text-[#10192E]">Review Jawaban</h2>
                <button onClick={() => setShowReview(false)} className="text-slate-400 hover:text-slate-600 text-xl cursor-pointer">✕</button>
              </div>

              <p className="text-sm text-slate-500 mb-4">
                {jumlahDijawab} dari {daftarSoal.length} soal terjawab. Periksa kembali sebelum mengirim.
              </p>

              {jumlahDijawab < daftarSoal.length && (
                <div className="flex items-center justify-between gap-3 bg-amber-50 rounded-xl px-4 py-3 mb-4">
                  <p className="text-sm text-amber-700">
                    Masih ada <b>{daftarSoal.length - jumlahDijawab}</b> soal belum dijawab.
                  </p>
                  <Button variant="secondary" onClick={keSoalBelumDijawab} className="!px-3 !py-1.5 text-xs shrink-0">
                    Ke Soal
                  </Button>
                </div>
              )}

              <div className="space-y-2 max-h-80 overflow-y-auto mb-5 pr-1">
                {daftarSoal.map((s, i) => {
                  const terjawab = jawabanMap[s.id ?? ''] && jawabanMap[s.id ?? ''] !== '';
                  return (
                    <button
                      key={s.id}
                      onClick={() => tutupReviewDanKeSoal(i)}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left cursor-pointer transition ${terjawab ? 'bg-green-50 border-green-200' : 'bg-[#F7F9FB] border-transparent hover:border-slate-200'}`}
                    >
                      <span className={`w-7 h-7 shrink-0 rounded-full flex items-center justify-center text-xs font-bold ${terjawab ? 'bg-green-600 text-white' : 'bg-white text-slate-400 border border-slate-200'}`}>
                        {i + 1}
                      </span>
                      <span className="text-sm text-[#10192E] flex-1 truncate">{s.teks}</span>
                      <span className={`text-xs shrink-0 font-semibold ${terjawab ? 'text-green-700' : 'text-slate-400'}`}>
                        {terjawab ? 'Dijawab' : 'Belum'}
                      </span>
                    </button>
                  );
                })}
              </div>

              <Button className="w-full" onClick={submitAkhir} disabled={sedangMenyimpan}>
                {sedangMenyimpan ? 'Menyimpan...' : '📤 Kirim Semua Jawaban Sekarang'}
              </Button>
              <Button variant="secondary" className="w-full mt-3" onClick={() => setShowReview(false)}>
                Kembali ke Ujian
              </Button>
            </Card>
          </div>
        )}
      </PageBackground>
    );
  }

  // ===== TAMPILAN: SELESAI (pesan asli kamu, dipertahankan) =====
  return (
    <PageBackground className="flex items-center justify-center p-5">
      <Card className="w-full max-w-lg p-8">
        <div className="flex justify-center mb-4">
          <Image src="/logo.png" alt="Logo Sokka Fiber" width={250} height={250} priority />
        </div>
        <h1 className="font-display text-2xl font-bold text-[#10192E] mb-4 text-center">ASSESSMENT SELESAI</h1>
        <div className="space-y-3 text-slate-600 text-sm leading-relaxed">
          <p>Terima kasih <b className="text-[#10192E]">{dataDiri.nama}</b>, atas partisipasi dan waktu yang telah Anda luangkan untuk mengikuti Assessment Online PT Sokkatama.</p>
          <p>Jawaban Anda telah berhasil tersimpan dalam sistem dan akan diproses oleh tim Human Resources sesuai dengan tahapan rekrutmen maupun evaluasi yang berlaku.</p>
          <p>Seluruh hasil assessment akan dijaga kerahasiaannya dan digunakan sebagai salah satu bahan pertimbangan dalam proses penilaian kompetensi.</p>
          <p>Kami mengucapkan terima kasih atas komitmen, kejujuran, dan profesionalisme Anda selama mengikuti assessment.</p>
        </div>
      </Card>
    </PageBackground>
  );
}