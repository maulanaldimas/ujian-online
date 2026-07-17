'use client';
import { useState, useEffect } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/firebase';
import { PageBackground, Card, Label, Input, Button } from './ui';
import Image from 'next/image';

export default function LoginGate({ children }) {
  const [user, setUser] = useState(null);
  const [cekSelesai, setCekSelesai] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setCekSelesai(true);
    });
    return () => unsub();
  }, []);

  async function handleLogin(e) {
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
        <p className="text-slate-500 font-display">Memuat...</p>
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

  return children(user);
}