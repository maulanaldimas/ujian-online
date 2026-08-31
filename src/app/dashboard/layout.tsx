'use client';

import { Sidebar } from '@/app/components/Sidebar';
import { useEffect, useState } from 'react';
import type { AuthUser } from '@/app/components/LoginGate';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => setUser(d.user))
      .catch(() => setUser(null))
      .finally(() => setChecking(false));
  }, []);

  function handleLogout() {
    fetch('/api/auth/logout', { method: 'POST' }).then(() => window.location.reload());
  }

  if (checking) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-bg-start to-bg-end flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-bg-start to-bg-end flex items-center justify-center">
        <p className="text-sm text-slate-500">Sesi berakhir. <a href="/" className="text-teal-600 font-semibold hover:underline">Login ulang</a></p>
      </div>
    );
  }

  return (
    <div className="min-h-screen overflow-hidden bg-gradient-to-b from-bg-start to-bg-end">
      <div className="pointer-events-none fixed -top-32 -right-32 h-96 w-96 rounded-full bg-teal-600/10 blur-3xl" />
      <div className="pointer-events-none fixed -bottom-40 -left-40 h-[28rem] w-[28rem] rounded-full bg-amber-400/10 blur-3xl" />

      <Sidebar onLogout={handleLogout} />

      <main className="lg:ml-64 p-5 relative animate-fade-in">
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
