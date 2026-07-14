'use client';
import { useState, useEffect, useRef } from 'react';
import { FaceDetector, FilesetResolver } from '@mediapipe/tasks-vision';
import { collection, addDoc, updateDoc, doc, serverTimestamp, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';

const DURASI_UJIAN_DETIK = 15 * 60; // BARU: 15 menit, ubah sesuai kebutuhan

export default function Home() {
  const [step, setStep] = useState('form');
  const [dataDiri, setDataDiri] = useState({ nama: '', email: '', noHp: '' });
  const [pelanggaran, setPelanggaran] = useState(0);
  const [errorKamera, setErrorKamera] = useState('');
  const [statusWajah, setStatusWajah] = useState('Memuat AI deteksi wajah...');
  const [statusAudio, setStatusAudio] = useState('Memantau suara...');
  const [sedangMenyimpan, setSedangMenyimpan] = useState(false);

  // BARU: state untuk banyak soal
  const [daftarSoal, setDaftarSoal] = useState([]);
  const [soalIndex, setSoalIndex] = useState(0);
  const [jawabanMap, setJawabanMap] = useState({}); // { soalId: "jawaban teks" }
  const [waktuTersisa, setWaktuTersisa] = useState(DURASI_UJIAN_DETIK);

  const videoRef = useRef(null);
  const faceDetectorRef = useRef(null);
  const frameBurukWajahRef = useRef(0);
  const frameBurukAudioRef = useRef(0);
  const animasiRef = useRef(null);
  const analyserRef = useRef(null);
  const audioContextRef = useRef(null);
  const docIdRef = useRef(null);
  const pelanggaranRef = useRef(0);
  const jawabanMapRef = useRef({}); // BARU: salinan terbaru untuk dipakai saat auto-submit
  const sudahSubmitRef = useRef(false); // BARU: cegah submit dobel

  useEffect(() => {
    pelanggaranRef.current = pelanggaran;
  }, [pelanggaran]);

  useEffect(() => {
    jawabanMapRef.current = jawabanMap;
  }, [jawabanMap]);

  // BARU: ambil daftar soal dari Firestore saat masuk halaman ujian
  useEffect(() => {
    if (step !== 'ujian') return;
    async function ambilSoal() {
      try {
        const q = query(collection(db, 'soalUjian'), orderBy('urutan', 'asc'));
        const snapshot = await getDocs(q);
        console.log('Jumlah soal ditemukan:', snapshot.docs.length);
        const data = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
        console.log('Isi soal:', data);
        setDaftarSoal(data);
      } catch (err) {
        console.error('Gagal ambil soal:', err);
      }
    }
    ambilSoal();
  }, [step]);

  // BARU: timer hitung mundur
  useEffect(() => {
    if (step !== 'ujian') return;
    const interval = setInterval(() => {
      setWaktuTersisa((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          if (!sudahSubmitRef.current) {
            submitAkhir(); // waktu habis, otomatis submit
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [step]);

  // Deteksi kalau peserta pindah tab / minimize window selama ujian
  useEffect(() => {
    if (step !== 'ujian') return;
    const handleVisibility = () => {
      if (document.hidden) {
        setPelanggaran((prev) => prev + 1);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [step]);

  // Nyalakan webcam + mic + load AI + mulai deteksi
  useEffect(() => {
    if (step !== 'ujian') return;
    let stream;

    async function setup() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
      } catch (err) {
        setErrorKamera('Akses kamera/mikrofon ditolak atau tidak tersedia. Ujian tidak bisa dilanjutkan.');
        return;
      }

      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser);
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;

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
      deteksiLoop();
    }

    function cekAudio() {
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
      if (!videoRef.current || !faceDetectorRef.current) return;
      cekAudio();
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
  }, [step]);

  async function handleFormSubmit(e) {
    e.preventDefault();
    if (!dataDiri.nama || !dataDiri.email) {
      alert('Nama dan email wajib diisi');
      return;
    }
    setSedangMenyimpan(true);
    try {
      const docRef = await addDoc(collection(db, 'pesertaUjian'), {
        nama: dataDiri.nama,
        email: dataDiri.email,
        noHp: dataDiri.noHp,
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

  // BARU: ganti jawaban soal yang sedang aktif
  function handleJawabanChange(soalId, teks) {
    setJawabanMap((prev) => ({ ...prev, [soalId]: teks }));
  }

  // BARU: pindah ke soal berikutnya, atau submit kalau ini soal terakhir
  function handleLanjut() {
    if (soalIndex < daftarSoal.length - 1) {
      setSoalIndex((prev) => prev + 1);
    } else {
      submitAkhir();
    }
  }

  // BARU: fungsi submit dipisah supaya bisa dipanggil manual ATAU otomatis saat waktu habis
  async function submitAkhir() {
    if (sudahSubmitRef.current) return; // cegah submit dobel
    sudahSubmitRef.current = true;
    setSedangMenyimpan(true);
    try {
      await updateDoc(doc(db, 'pesertaUjian', docIdRef.current), {
        jawaban: jawabanMapRef.current,
        totalPelanggaran: pelanggaranRef.current,
        status: 'selesai',
        waktuSelesai: serverTimestamp(),
      });
      setStep('selesai');
    } catch (err) {
      alert('Gagal menyimpan jawaban ke server. Cek koneksi internet lalu coba lagi.');
      console.error(err);
      sudahSubmitRef.current = false; // biar bisa dicoba lagi kalau gagal
    }
    setSedangMenyimpan(false);
  }

  function formatWaktu(detik) {
    const menit = Math.floor(detik / 60);
    const sisaDetik = detik % 60;
    return `${menit}:${sisaDetik.toString().padStart(2, '0')}`;
  }

  const kotak = { maxWidth: 500, margin: '40px auto', fontFamily: 'Arial', padding: 20 };
  const inputStyle = { width: '100%', padding: 8, marginBottom: 12, boxSizing: 'border-box' };
  const btnStyle = { padding: '10px 20px', background: '#2c3e50', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' };

  if (step === 'form') {
    return (
      <main style={kotak}>
        <h1>Data Diri Peserta</h1>
        <form onSubmit={handleFormSubmit}>
          <label>Nama Lengkap</label>
          <input style={inputStyle} value={dataDiri.nama}
            onChange={(e) => setDataDiri({ ...dataDiri, nama: e.target.value })} />
          <label>Email</label>
          <input type="email" style={inputStyle} value={dataDiri.email}
            onChange={(e) => setDataDiri({ ...dataDiri, email: e.target.value })} />
          <label>No HP</label>
          <input type="tel" style={inputStyle} value={dataDiri.noHp}
            onChange={(e) => {
              const hanyaAngka = e.target.value.replace(/[^0-9]/g, '');
              setDataDiri({ ...dataDiri, noHp: hanyaAngka });
            }} />
          <button type="submit" style={btnStyle} disabled={sedangMenyimpan}>
            {sedangMenyimpan ? 'Menyimpan...' : 'Mulai Ujian'}
          </button>
        </form>
      </main>
    );
  }

  if (step === 'ujian') {
    // BARU: tunggu soal selesai dimuat
    if (daftarSoal.length === 0) {
      return <p style={{ textAlign: 'center', marginTop: 40 }}>Memuat soal...</p>;
    }

    const soalSekarang = daftarSoal[soalIndex];

    return (
      <main style={kotak}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1>Ujian Rekrutmen</h1>
          <span style={{ fontWeight: 'bold', color: waktuTersisa < 60 ? 'red' : 'inherit' }}>
            ⏱ {formatWaktu(waktuTersisa)}
          </span>
        </div>
        <p>Peserta: <b>{dataDiri.nama}</b></p>

        {errorKamera && <p style={{ color: 'red' }}>{errorKamera}</p>}

        <video ref={videoRef} autoPlay muted playsInline
          style={{ width: 200, borderRadius: 8, background: '#000' }} />
        <p style={{ fontSize: 14, color: statusWajah.includes('⚠') ? 'red' : 'green' }}>{statusWajah}</p>
        <p style={{ fontSize: 14, color: statusAudio.includes('⚠') ? 'red' : 'green' }}>{statusAudio}</p>

        {pelanggaran > 0 && (
          <p style={{ color: 'red' }}>⚠ Total pelanggaran terdeteksi: {pelanggaran}</p>
        )}

        {/* BARU: progress soal */}
        <p style={{ color: '#666', fontSize: 14 }}>Soal {soalIndex + 1} dari {daftarSoal.length}</p>
        <p>{soalSekarang.teks}</p>
        <textarea
          rows={4}
          style={{ ...inputStyle, resize: 'vertical' }}
          value={jawabanMap[soalSekarang.id] || ''}
          onChange={(e) => handleJawabanChange(soalSekarang.id, e.target.value)}
        />
        <button onClick={handleLanjut} style={btnStyle} disabled={sedangMenyimpan}>
          {sedangMenyimpan
            ? 'Menyimpan...'
            : soalIndex < daftarSoal.length - 1
            ? 'Soal Berikutnya'
            : 'Selesai & Kirim'}
        </button>
      </main>
    );
  }

  return (
    <main style={kotak}>
      <h1>Ujian Selesai</h1>
      <p>Terima kasih, {dataDiri.nama}. Jawaban kamu sudah kami terima.</p>
      <p>Hasil akan diumumkan oleh tim HR melalui email.</p>
    </main>
  );
}