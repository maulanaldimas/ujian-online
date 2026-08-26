'use client';
import { useState, useEffect, useCallback, type FormEvent, type ReactNode } from 'react';
import { PageBackground, Card, Label, Input, Button, Spinner } from './ui';
import Image from 'next/image';
import { LOGO_SRC } from '@/lib/constants';

const MAX_percobaan = 5;
const LOCKOUT_DETIK = 300;

function sanitizeInput(teks: string): string {
  return teks.replace(/<[^>]*>/g, '').trim();
}

export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  role: string;
}

export default function LoginGate({ children }: { children: (user: AuthUser) => ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [cekSelesai, setCekSelesai] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [percobaanGagal, setPercobaanGagal] = useState(0);
  const [sisaLockout, setSisaLockout] = useState(0);

  useEffect(() => {
    if (sisaLockout <= 0) return;
    const timer = setInterval(() => {
      setSisaLockout((s) => {
        if (s <= 1) { setPercobaanGagal(0); return 0; }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [sisaLockout]);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then(({ user: u }) => {
        if (u && u.role === 'admin') {
          setUser(u);
        }
        setCekSelesai(true);
      })
      .catch(() => setCekSelesai(true));
  }, []);

  const handleLogin = useCallback(async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (sisaLockout > 0) return;
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: sanitizeInput(email), password }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Login gagal');
      }
      const { user: u } = await res.json();
      if (u.role !== 'admin') {
        setError('Akun ini bukan admin.');
        await fetch('/api/auth/logout', { method: 'POST' });
        setLoading(false);
        return;
      }
      setUser(u);
      setPercobaanGagal(0);
    } catch (err: any) {
      const next = percobaanGagal + 1;
      setPercobaanGagal(next);
      if (next >= MAX_percobaan) {
        setSisaLockout(LOCKOUT_DETIK);
        setError(`Terlalu banyak percobaan gagal. Coba lagi dalam ${LOCKOUT_DETIK / 60} menit.`);
      } else {
        setError(err.message || `Email atau password salah. Sisa percobaan: ${MAX_percobaan - next}.`);
      }
    }
    setLoading(false);
  }, [email, password, percobaanGagal, sisaLockout]);

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
            <Image src={LOGO_SRC} alt="Logo" width={72} height={72} />
          </div>
          <h1 className="font-display text-xl font-bold text-navy-900 text-center mb-1">Admin Login</h1>
          <p className="text-sm text-slate-500 text-center mb-6">Masuk untuk mengelola ujian rekrutmen</p>
          <form onSubmit={handleLogin}>
            <Label>Email</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mb-4" placeholder="nama@perusahaan.com" />
            <Label>Password</Label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="mb-4" placeholder="••••••••" />
            {error && <p className="text-red-600 text-sm mb-4">{error}</p>}
            <Button type="submit" fullWidth isLoading={loading} disabled={sisaLockout > 0}>
              {sisaLockout > 0 ? `Tunggu ${Math.ceil(sisaLockout / 60)}m` : 'Masuk'}
            </Button>
          </form>
        </Card>
      </PageBackground>
    );
  }

  return children(user);
}
