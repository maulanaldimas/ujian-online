'use client';
import Image from 'next/image';
import { doc as docRef2, getDoc } from 'firebase/firestore';
import { useState, useEffect, useRef } from 'react';
import { FaceDetector, FilesetResolver } from '@mediapipe/tasks-vision';
import { collection, addDoc, updateDoc, doc, serverTimestamp, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';

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
        const teracak = acakUrutan(data);
        // DEBUG: cek di Console (F12) apakah urutan ini berubah tiap kali ujian dimulai
        console.log('Urutan soal sesi ini:', teracak.map((s) => s.teks));
        setDaftarSoal(teracak);
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
    if (step !== 'ujian' || !pengaturanSiap) return; // BARU: tunggu pengaturan siap dulu
    let stream;
    const { kameraAktif, audioAktif } = pengaturanProctoring;

    async function setup() {
      // BARU: kalau kamera & audio dua-duanya mati, tidak perlu minta izin apapun
      if (!kameraAktif && !audioAktif) return;

      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: kameraAktif,
          audio: audioAktif,
        });
        if (kameraAktif && videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
      } catch (err) {
        setErrorKamera('Akses kamera/mikrofon ditolak atau tidak tersedia. Ujian tidak bisa dilanjutkan.');
        return;
      }

      // BARU: hanya setup audio analyser kalau audio aktif
      if (audioAktif) {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const source = audioContext.createMediaStreamSource(stream);
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 512;
        source.connect(analyser);
        audioContextRef.current = audioContext;
        analyserRef.current = analyser;
      }

      // BARU: hanya load AI wajah kalau kamera aktif
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
      if (!audioAktif) return; // BARU
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
        // BARU: kalau kamera mati, tetap lanjut loop (untuk audio saja), tapi skip deteksi wajah
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

  // BARU: navigasi bebas, tidak lagi otomatis submit di soal terakhir
  function soalBerikutnya() {
    if (soalIndex < daftarSoal.length - 1) setSoalIndex((prev) => prev + 1);
  }
  function soalSebelumnya() {
    if (soalIndex > 0) setSoalIndex((prev) => prev - 1);
  }
  function lompatKeSoal(index) {
    setSoalIndex(index);
  }

  async function kembaliFullscreen() {
    try {
      await document.documentElement.requestFullscreen();
    } catch (err) {
      console.error('Gagal masuk fullscreen:', err);
    }
  }

  // BARU: submit sekarang bisa dipanggil dari soal manapun, dengan konfirmasi kalau ada yang belum dijawab
  function konfirmasiSubmit() {
    const jumlahBelumJawab = daftarSoal.filter((s) => !jawabanMap[s.id] || jawabanMap[s.id] === '').length;
    if (jumlahBelumJawab > 0) {
      const lanjut = confirm(
        `Masih ada ${jumlahBelumJawab} soal yang belum dijawab. Yakin ingin mengirim jawaban sekarang?`
      );
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

  const input = 'w-full p-2 mb-3 border border-gray-300 rounded text-gray-900 bg-white';
  const btnUtama = 'px-4 py-2 bg-slate-800 text-white rounded hover:bg-slate-900 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer';
  const btnSekunder = 'px-4 py-2 border border-gray-300 text-gray-900 rounded hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer';

  if (step === 'form') {
    return (
      <main className="max-w-md mx-auto mt-10 p-5">
        <div className="flex justify-center mb-4">
          <Image src="/logo.png" alt="Logo Sokka Fiber" width={300} height={300} priority />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2 text-center">Data Diri Peserta</h1>
        <p className="text-xs text-gray-700 mb-4">
          Ujian akan berjalan dalam mode layar penuh. Pastikan untuk tidak keluar dari mode layar penuh. Jika keluar dari mode layar penuh, ini akan tercatat sebagai pelanggaran.
        </p>
        <form onSubmit={handleFormSubmit}>
          <label className="block font-bold text-gray-900 mb-1">Nama Lengkap</label>
          <input className={input} value={dataDiri.nama}
            onChange={(e) => setDataDiri({ ...dataDiri, nama: e.target.value })} />

          <label className="block font-bold text-gray-900 mb-1">Email</label>
          <input type="email" className={input} value={dataDiri.email}
            onChange={(e) => setDataDiri({ ...dataDiri, email: e.target.value })} />

          <label className="block font-bold text-gray-900 mb-1">No HP</label>
          <input type="tel" className={input} value={dataDiri.noHp}
            onChange={(e) => {
              const hanyaAngka = e.target.value.replace(/[^0-9]/g, '');
              setDataDiri({ ...dataDiri, noHp: hanyaAngka });
            }} />

          <label className="block font-bold text-gray-900 mb-1">Lokasi Kerja</label>
          <input className={input} value={dataDiri.lokasiKerja}
            onChange={(e) => setDataDiri({ ...dataDiri, lokasiKerja: e.target.value })} />

          <label className="block font-bold text-gray-900 mb-1">NIK KTP</label>
          <input type="tel" className={input} value={dataDiri.nikKtp}
            onChange={(e) => {
              const hanyaAngka = e.target.value.replace(/[^0-9]/g, '');
              setDataDiri({ ...dataDiri, nikKtp: hanyaAngka });
            }} />

          <button type="submit" className={btnUtama} disabled={sedangMenyimpan}>
            {sedangMenyimpan ? 'Menyimpan...' : 'Mulai Ujian'}
          </button>
        </form>
      </main>
    );
  }

  if (step === 'ujian') {
    if (daftarSoal.length === 0) {
      return <p className="text-center mt-10 text-gray-900">Memuat soal...</p>;
    }

    const soalSekarang = daftarSoal[soalIndex];
    const isSoalTerakhir = soalIndex === daftarSoal.length - 1;
    const jumlahDijawab = daftarSoal.filter((s) => jawabanMap[s.id] && jawabanMap[s.id] !== '').length;

    return (
      <main className="min-h-screen">
        {keluarFullscreen && (
          <div className="max-w-2xl mx-auto mt-5 bg-red-50 border-2 border-red-500 p-4 rounded-lg text-center">
            <p className="text-red-600 font-bold">
              ⚠ Anda keluar dari mode layar penuh. Ini tercatat sebagai pelanggaran.
            </p>
            <button onClick={kembaliFullscreen} className={`${btnUtama} mt-2`}>
              Kembali ke Layar Penuh
            </button>
          </div>
        )}

        {/* PANEL KIRI: logo, fixed ke viewport, tidak bergerak sama sekali */}
        <div className="hidden lg:flex lg:flex-col lg:items-center lg:fixed lg:left-8 lg:top-6 lg:w-[430px]">
          <Image src="/logo.png" alt="Logo Sokka Fiber" width={1500} height={1500} priority />
        </div>

        {/* PANEL KANAN: navigasi soal, fixed ke viewport, tidak bergerak sama sekali */}
        <div className="hidden lg:block lg:fixed lg:right-8 lg:top-6 lg:w-[240px]">
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <p className="text-sm font-bold text-gray-900 mb-1">Navigasi Soal</p>
            <p className="text-xs text-gray-500 mb-3">{jumlahDijawab} dari {daftarSoal.length} terjawab</p>

            <div className="grid grid-cols-5 gap-2">
              {daftarSoal.map((s, i) => {
                const sudahDijawab = jawabanMap[s.id] && jawabanMap[s.id] !== '';
                const aktif = i === soalIndex;
                return (
                  <button
                    key={s.id}
                    onClick={() => lompatKeSoal(i)}
                    className={`w-9 h-9 rounded-full text-sm font-bold border-2 cursor-pointer
                      ${aktif ? 'bg-slate-800 text-white border-slate-800' : ''}
                      ${!aktif && sudahDijawab ? 'bg-green-100 text-green-800 border-green-400' : ''}
                      ${!aktif && !sudahDijawab ? 'bg-white text-gray-500 border-gray-300' : ''}
                    `}
                    title={sudahDijawab ? 'Sudah dijawab' : 'Belum dijawab'}
                  >
                    {i + 1}
                  </button>
                );
              })}
            </div>

            <div className="mt-4 pt-3 border-t border-gray-200 text-xs text-gray-500 space-y-1">
              <p className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-slate-800 inline-block" /> Sedang dilihat</p>
              <p className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-green-100 border border-green-400 inline-block" /> Sudah dijawab</p>
              <p className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-white border border-gray-300 inline-block" /> Belum dijawab</p>
            </div>
          </div>
        </div>

        {/* KOLOM TENGAH: konten soal — diberi jarak kiri/kanan supaya tidak ketiban panel fixed */}
        <div className="max-w-2xl mx-auto lg:mx-[260px] xl:mx-auto xl:max-w-2xl p-5">
          <div className="flex justify-between items-center mb-5">
            <h1 className="text-xl font-bold text-gray-900">Ujian Rekrutmen</h1>
            <span className={`font-bold ${waktuTersisa < 60 ? 'text-red-600' : 'text-gray-900'}`}>
              ⏱ {formatWaktu(waktuTersisa)}
            </span>
          </div>

          {/* Logo versi mobile (panel kiri fixed disembunyikan di layar sempit) */}
          <div className="flex justify-center mb-4 lg:hidden">
            <Image src="/logo.png" alt="Logo Sokka Fiber" width={64} height={64} priority />
          </div>

          <p className="text-gray-900 mb-2">Peserta: <b>{dataDiri.nama}</b></p>

          {errorKamera && <p className="text-red-600 mb-2">{errorKamera}</p>}

          {pengaturanProctoring.kameraAktif && (
            <>
              <video ref={videoRef} autoPlay muted playsInline
                className="w-[200px] rounded-lg bg-black mb-2" />
              <p className={`text-sm mb-1 ${statusWajah.includes('⚠') ? 'text-red-600' : 'text-green-600'}`}>{statusWajah}</p>
            </>
          )}
          {pengaturanProctoring.audioAktif && (
            <p className={`text-sm mb-2 ${statusAudio.includes('⚠') ? 'text-red-600' : 'text-green-600'}`}>{statusAudio}</p>
          )}

          {pelanggaran > 0 && (
            <p className="text-red-600 font-bold mb-2">⚠ Total pelanggaran terdeteksi: {pelanggaran}</p>
          )}

          <p className="text-gray-500 text-sm">Soal {soalIndex + 1} dari {daftarSoal.length}</p>
          <p className="text-gray-900 mb-2 break-words">{soalSekarang.teks}</p>

          {soalSekarang.tipe === 'pilihan_ganda' ? (
            <div className="mb-3">
              {(soalSekarang.pilihan || []).map((opsi, i) => (
                <label key={i} className="block p-2 mb-1 bg-gray-50 rounded cursor-pointer text-gray-900 break-words">
                  <input
                    type="radio"
                    name={`soal-${soalSekarang.id}`}
                    checked={jawabanMap[soalSekarang.id] === opsi}
                    onChange={() => handleJawabanChange(soalSekarang.id, opsi)}
                    className="mr-2"
                  />
                  {opsi}
                </label>
              ))}
            </div>
          ) : (
            <textarea
              rows={4}
              className={`${input} resize-y`}
              value={jawabanMap[soalSekarang.id] || ''}
              onChange={(e) => handleJawabanChange(soalSekarang.id, e.target.value)}
            />
          )}

          <div className="flex justify-between items-center mt-4">
            <button onClick={soalSebelumnya} className={btnSekunder} disabled={soalIndex === 0 || sedangMenyimpan}>
              ← Sebelumnya
            </button>
            <button onClick={soalBerikutnya} className={btnSekunder} disabled={isSoalTerakhir || sedangMenyimpan}>
              Berikutnya →
            </button>
          </div>

          <button onClick={konfirmasiSubmit} className={`${btnUtama} w-full mt-4`} disabled={sedangMenyimpan}>
            {sedangMenyimpan ? 'Menyimpan...' : 'Kirim Semua Jawaban'}
          </button>

          {/* Navigasi soal versi mobile (panel kanan fixed disembunyikan di layar sempit) */}
          <div className="lg:hidden mt-6 bg-gray-50 border border-gray-200 rounded-lg p-4">
            <p className="text-sm font-bold text-gray-900 mb-1">Navigasi Soal</p>
            <p className="text-xs text-gray-500 mb-3">{jumlahDijawab} dari {daftarSoal.length} terjawab</p>
            <div className="grid grid-cols-5 gap-2">
              {daftarSoal.map((s, i) => {
                const sudahDijawab = jawabanMap[s.id] && jawabanMap[s.id] !== '';
                const aktif = i === soalIndex;
                return (
                  <button
                    key={s.id}
                    onClick={() => lompatKeSoal(i)}
                    className={`w-9 h-9 rounded-full text-sm font-bold border-2 cursor-pointer
                      ${aktif ? 'bg-slate-800 text-white border-slate-800' : ''}
                      ${!aktif && sudahDijawab ? 'bg-green-100 text-green-800 border-green-400' : ''}
                      ${!aktif && !sudahDijawab ? 'bg-white text-gray-500 border-gray-300' : ''}
                    `}
                  >
                    {i + 1}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-4xl mx-auto mt-10 p-5">
      <h1 className="text-2xl font-bold text-gray-900 mb-2 text-center">ASSESSMENT SELESAI</h1>
      <br />
      <p className="text-gray-900">Terima kasih {dataDiri.nama}, atas partisipasi dan waktu yang telah Anda luangkan untuk mengikuti Assessment Online PT Sokkatama.</p>
      <br />
      <p className="text-gray-900">Jawaban Anda telah berhasil tersimpan dalam sistem dan akan diproses oleh tim Human Resources sesuai dengan tahapan rekrutmen maupun evaluasi yang berlaku.</p>
      <br />
      <p className="text-gray-900">Seluruh hasil assessment akan dijaga kerahasiaannya dan digunakan sebagai salah satu bahan pertimbangan dalam proses penilaian kompetensi.</p>
      <br />
      <p className="text-gray-900">Kami mengucapkan terima kasih atas komitmen, kejujuran, dan profesionalisme Anda selama mengikuti assessment.</p>
    </main>
  );
}