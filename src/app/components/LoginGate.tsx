'use client';
import { useState, useEffect, useCallback, type FormEvent, type ReactNode } from 'react';
import { PageBackground, Card, Label, Input, Button, Spinner } from './ui';
import Image from 'next/image';
import { LOGO_SRC } from '@/lib/constants';
import { Shield } from 'lucide-react';
import { ThemeToggle } from '@/app/components/ThemeToggle';

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
  const [showPassword, setShowPassword] = useState(false);

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
        <div className="text-center animate-fade-in">
          <Spinner className="mx-auto h-8 w-8" />
          <p className="text-slate-500 font-display mt-3">Memuat...</p>
        </div>
      </PageBackground>
    );
  }

  if (!user) {
    return (
      <PageBackground className="flex items-center justify-center p-5">
        <div className="absolute top-4 right-4">
          <ThemeToggle />
        </div>
        <div className="w-full max-w-md animate-fade-in">
          <Card className="p-8 sm:p-10 shadow-xl">
            <div className="flex flex-col items-center mb-8">
              <div className="relative mb-4">
                <div className="absolute inset-0 rounded-2xl bg-teal-600/10 blur-xl" />
                <div className="relative bg-white rounded-2xl p-3 shadow-soft">
                  <Image src={LOGO_SRC} alt="Logo" width={56} height={56} />
                </div>
              </div>
              <h1 className="font-display text-2xl font-bold text-navy-900">Admin Login</h1>
              <p className="text-sm text-slate-500 mt-1">Masuk untuk mengelola ujian rekrutmen</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <Label htmlFor="login-email">Email</Label>
                <Input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@perusahaan.com"
                  autoComplete="email"
                  required
                />
              </div>
              <div>
                <Label htmlFor="login-password">Password</Label>
                <div className="relative">
                  <Input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Masukkan password"
                    autoComplete="current-password"
                    required
                    className="!pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                    )}
                  </button>
                </div>
              </div>

              {error && (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-200">
                  <Shield size={16} className="text-red-500 mt-0.5 shrink-0" />
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              <Button type="submit" fullWidth isLoading={loading} disabled={sisaLockout > 0} className="!py-3 !text-sm !font-bold">
                {sisaLockout > 0 ? `Tunggu ${Math.ceil(sisaLockout / 60)}m` : 'Masuk'}
              </Button>
            </form>
          </Card>

          <p className="text-center text-xs text-slate-400 mt-6">
            Ujian Online Rekrutmen &middot; Sistem Pengawasan Terpadu
          </p>
        </div>
      </PageBackground>
    );
  }

  return children(user);
}
