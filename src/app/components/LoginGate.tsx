'use client';
import { useState, useEffect, type FormEvent, type ReactNode } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, type User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/firebase';
import { PageBackground, Card, Label, Input, Button, Spinner } from './ui';
import Image from 'next/image';

export default function LoginGate({ children }: { children: (user: User, role: string | null) => ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [cekSelesai, setCekSelesai] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        try {
          const snap = await getDoc(doc(db, 'adminUsers', u.uid));
          setRole(snap.exists() ? snap.data().role : null);
        } catch (err) {
          console.error('Gagal ambil role:', err);
          setRole(null);
        }
      } else {
        setRole(null);
      }
      setCekSelesai(true);
    });
    return () => unsub();
  }, []);

  async function handleLogin(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      setError('Email atau password salah.');
    }
    setLoading(false);
  }

  if (!cekSelesai) {
    return (
      <PageBackground className="flex items-center justify-center">
        <div className="text-center">
          <Spinner className="mx-auto h-8 w-8" />
          <p className="text-slate-500 font-display mt-3">Memuat...</p>
        </div>
      </PageBackground>
    );
  }

  if (!user) {
    return (
      <PageBackground className="flex items-center justify-center p-5">
        <Card className="w-full max-w-sm p-8">
          <div className="flex justify-center mb-4">
            <Image src="/logo.png" alt="Logo" width={72} height={72} />
          </div>
          <h1 className="font-display text-xl font-bold text-[#10192E] text-center mb-1">Login HR</h1>
          <p className="text-sm text-slate-500 text-center mb-6">Masuk untuk mengelola ujian rekrutmen</p>
          <form onSubmit={handleLogin}>
            <Label>Email</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mb-4" placeholder="nama@perusahaan.com" />
            <Label>Password</Label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="mb-4" placeholder="••••••••" />
            {error && <p className="text-red-600 text-sm mb-4">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Memproses...' : 'Masuk'}
            </Button>
          </form>
        </Card>
      </PageBackground>
    );
  }

  // Sudah login tapi tidak terdaftar sebagai staff HR sama sekali
  if (!role) {
    return (
      <PageBackground className="flex items-center justify-center p-5">
        <Card className="w-full max-w-sm p-8 text-center">
          <p className="text-4xl mb-3">🚫</p>
          <h1 className="font-display text-lg font-bold text-[#10192E] mb-2">Akses Ditolak</h1>
          <p className="text-sm text-slate-500 mb-5">
            Akun <b>{user.email}</b> belum terdaftar sebagai staff HR. Hubungi admin sistem untuk diberikan akses.
          </p>
          <Button variant="secondary" onClick={() => signOut(auth)} className="w-full">
            Logout
          </Button>
        </Card>
      </PageBackground>
    );
  }

  return children(user, role);
}