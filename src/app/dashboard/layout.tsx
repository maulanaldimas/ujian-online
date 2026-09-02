'use client';

import { Sidebar } from '@/app/components/Sidebar';
import LoginGate from '@/app/components/LoginGate';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <LoginGate>
      {() => <DashboardShell>{children}</DashboardShell>}
    </LoginGate>
  );
}

function DashboardShell({ children }: { children: React.ReactNode }) {
  function handleLogout() {
    fetch('/api/auth/logout', { method: 'POST' }).then(() => window.location.reload());
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
