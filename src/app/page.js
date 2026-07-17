'use client';
import { useState, useEffect, useRef } from 'react';
import { FaceDetector, FilesetResolver } from '@mediapipe/tasks-vision';
import { collection, addDoc, updateDoc, doc, doc as docRef2, getDoc, serverTimestamp, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import Image from 'next/image';
import { PageBackground, Card, Label, Input, Textarea, Button, Badge } from './components/ui';

const DURASI_UJIAN_DETIK = 60 * 60;

function acakUrutan(array) {
  const hasil = [...array];
  for (let i = hasil.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [hasil[i], hasil[j]] = [hasil[j], hasil[i]];
  }
  return hasil;
}

export default function Home() {
  const [step, setStep] = useState('form');
  const [dataDiri, setDataDiri] = useState({ nama: '', email: '', noHp: '', lokasiKerja: '', nikKtp: '' });
  const [pelanggaran, setPelanggaran] = useState(0);
  const [errorKamera, setErrorKamera] = useState('');
  const [statusWajah, setStatusWajah] = useState('Memuat AI deteksi wajah...');
  const [statusAudio, setStatusAudio] = useState('Memantau suara...');
  const [sedangMenyimpan, setSedangMenyimpan] = useState(false);
  const [daftarSoal, setDaftarSoal] = useState([]);
  const [soalIndex, setSoalIndex] = useState(0);
  const [jawabanMap, setJawabanMap] = useState({});
  const [waktuTersisa, setWaktuTersisa] = useState(DURASI_UJIAN_DETIK);
  const [keluarFullscreen, setKeluarFullscreen] = useState(false);
  const [pengaturanProctoring, setPengaturanProctoring] = useState({ kameraAktif: true, audioAktif: true });
  const [pengaturanSiap, setPengaturanSiap] = useState(false);

  const videoRef = useRef(null);
  const faceDetectorRef = useRef(null);
  const frameBurukWajahRef = useRef(0);
  const frameBurukAudioRef = useRef(0);
  const animasiRef = useRef(null);
  const analyserRef = useRef(null);
  const audioContextRef = useRef(null);
  const docIdRef = useRef(null);
  const pelanggaranRef = useRef(0);
  const jawabanMapRef = useRef({});
  const sudahSubmitRef = useRef(false);

  useEffect(() => { pelanggaranRef.current = pelanggaran; }, [pelanggaran]);
  useEffect(() => { jawabanMapRef.current = jawabanMap; }, [jawabanMap]);

  useEffect(() => {
    if (step !== 'ujian') return;
    async function ambilPengaturan() {
      try {
        const snap = await getDoc(docRef2(db, 'pengaturan', 'proctoring'));
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
    if (step !== 'ujian') return;
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
  }, [step]);

  useEffect(() => {
    if (step !== 'ujian') return;
    const handleVisibility = () => {
      if (document.hidden) setPelanggaran((prev) => prev + 1);
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [step]);

  useEffect(() => {
    if (step !== 'ujian') return;
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        setKeluarFullscreen(true);
        setPelanggaran((prev) => prev + 1);
      } else {
        setKeluarFullscreen(false);
      }
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [step]);

  useEffect(() => {
    if (step !== 'ujian') return;
    const cegah = (e) => e.preventDefault();
    const handlePaste = (e) => { e.preventDefault(); setPelanggaran((prev) => prev + 1); };
    const handleKeyDown = (e) => {
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
  }, [step]);

  useEffect(() => {
    if (step !== 'ujian' || !pengaturanSiap) return;
    let stream;
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
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
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
        if (frameBurukAudioRef.current === 45) setPelanggaran((prev) => prev + 1);
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
        if (frameBurukWajahRef.current === 45) setPelanggaran((prev) => prev + 1);
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
  }, [step, pengaturanSiap, pengaturanProctoring]);

  async function handleFormSubmit(e) {
    e.preventDefault();
    if (!dataDiri.nama || !dataDiri.email || !dataDiri.noHp || !dataDiri.lokasiKerja || !dataDiri.nikKtp) {
      alert('Semua kolom wajib diisi.');
      return;
    }
    try {
      await document.documentElement.requestFullscreen();
    } catch (err) {
      console.error('Gagal masuk fullscreen:', err);
    }
    setSedangMenyimpan(true);
    try {
      const docRef = await addDoc(collection(db, 'pesertaUjian'), {
        nama: dataDiri.nama,
        email: dataDiri.email,
        noHp: dataDiri.noHp,
        lokasiKerja: dataDiri.lokasiKerja,
        nikKtp: dataDiri.nikKtp,
        status: 'sedang_ujian',
        waktuMulai: serverTimestamp(),
      });
      docIdRef.current = docRef.id;
      setStep('ujian');
    } catch (err) {
      alert('Gagal menyimpan data ke server. Cek koneksi internet lalu coba lagi.');
      console.error(err);
    }
    setSedangMenyimpan(false);
  }

  function handleJawabanChange(soalId, teks) {
    setJawabanMap((prev) => ({ ...prev, [soalId]: teks }));
  }
  function soalBerikutnya() { if (soalIndex < daftarSoal.length - 1) setSoalIndex((prev) => prev + 1); }
  function soalSebelumnya() { if (soalIndex > 0) setSoalIndex((prev) => prev - 1); }
  function lompatKeSoal(index) { setSoalIndex(index); }

  async function kembaliFullscreen() {
    try {
      await document.documentElement.requestFullscreen();
    } catch (err) {
      console.error('Gagal masuk fullscreen:', err);
    }
  }

  function konfirmasiSubmit() {
    const jumlahBelumJawab = daftarSoal.filter((s) => !jawabanMap[s.id] || jawabanMap[s.id] === '').length;
    if (jumlahBelumJawab > 0) {
      const lanjut = confirm(`Masih ada ${jumlahBelumJawab} soal yang belum dijawab. Yakin ingin mengirim jawaban sekarang?`);
      if (!lanjut) return;
    }
    submitAkhir();
  }

  async function submitAkhir() {
    if (sudahSubmitRef.current) return;
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
  }

  function formatWaktu(detik) {
    const menit = Math.floor(detik / 60);
    const sisaDetik = detik % 60;
    return `${menit}:${sisaDetik.toString().padStart(2, '0')}`;
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

  // ===== TAMPILAN: UJIAN BERLANGSUNG =====
  if (step === 'ujian') {
    if (daftarSoal.length === 0) {
      return (
        <PageBackground className="flex items-center justify-center">
          <p className="text-slate-500 font-display">Memuat soal...</p>
        </PageBackground>
      );
    }

    const soalSekarang = daftarSoal[soalIndex];
    const isSoalTerakhir = soalIndex === daftarSoal.length - 1;
    const jumlahDijawab = daftarSoal.filter((s) => jawabanMap[s.id] && jawabanMap[s.id] !== '').length;

    const NavigasiSoal = (
      <Card className="p-4">
        <p className="font-display text-sm font-bold text-[#10192E] mb-1">Navigasi Soal</p>
        <p className="text-xs text-slate-500 mb-3">{jumlahDijawab} dari {daftarSoal.length} terjawab</p>
        <div className="grid grid-cols-5 gap-2">
          {daftarSoal.map((s, i) => {
            const sudahDijawab = jawabanMap[s.id] && jawabanMap[s.id] !== '';
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
              ⏱ {formatWaktu(waktuTersisa)}
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
                  <video ref={videoRef} autoPlay muted playsInline className="w-[140px] rounded-lg bg-black" />
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
                  const dipilih = jawabanMap[soalSekarang.id] === opsi;
                  return (
                    <label key={i} className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer border-2 transition break-words
                      ${dipilih ? 'bg-teal-50 border-[#1F6F78]' : 'bg-[#F7F9FB] border-transparent hover:border-slate-200'}`}>
                      <input
                        type="radio"
                        name={`soal-${soalSekarang.id}`}
                        checked={dipilih}
                        onChange={() => handleJawabanChange(soalSekarang.id, opsi)}
                        className="w-4 h-4 accent-[#1F6F78]"
                      />
                      <span className="text-[#10192E]">{opsi}</span>
                    </label>
                  );
                })}
              </div>
            ) : (
              <Textarea rows={5} className="mb-2"
                value={jawabanMap[soalSekarang.id] || ''}
                onChange={(e) => handleJawabanChange(soalSekarang.id, e.target.value)} />
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
              {sedangMenyimpan ? 'Menyimpan...' : '📤 Kirim Semua Jawaban'}
            </Button>
          </Card>

          <div className="lg:hidden mt-5">{NavigasiSoal}</div>
        </div>
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