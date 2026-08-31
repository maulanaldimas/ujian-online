'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { LayoutDashboard, Layers, Settings, Activity, Trophy, LogOut, Menu, X, ChevronRight } from 'lucide-react';
import { LOGO_SRC } from '@/lib/constants';
import { ThemeToggle } from '@/app/components/ThemeToggle';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/hasil', label: 'Hasil & Ranking', icon: Trophy },
  { href: '/dashboard/kelompok', label: 'Kelompok Soal', icon: Layers },
  { href: '/dashboard/pengaturan', label: 'Pengaturan', icon: Settings },
  { href: '/dashboard/aktivitas', label: 'Aktivitas', icon: Activity },
];

export function Sidebar({ onLogout }: { onLogout?: () => void }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed top-4 left-4 z-50 lg:hidden bg-navy-900 text-white p-2 rounded-xl shadow-lg cursor-pointer"
        aria-label="Buka menu"
      >
        <Menu size={20} />
      </button>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" onClick={() => setMobileOpen(false)}>
          <div className="absolute inset-0 bg-navy-950/50 backdrop-blur-sm" />
          <div className="relative w-64 h-full bg-navy-900 shadow-xl animate-fade-in" onClick={(e) => e.stopPropagation()}>
            <SidebarContent pathname={pathname} onLogout={onLogout} onClose={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      <aside className="hidden lg:flex lg:fixed lg:inset-y-0 lg:left-0 lg:z-40 lg:w-64 lg:flex-col">
        <div className="flex grow flex-col bg-navy-900 overflow-y-auto">
          <SidebarContent pathname={pathname} onLogout={onLogout} />
        </div>
      </aside>
    </>
  );
}

function SidebarContent({ pathname, onLogout, onClose }: { pathname: string; onLogout?: () => void; onClose?: () => void }) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-5 py-5 border-b border-white/10">
        <div className="bg-white rounded-xl p-1.5 shadow-soft">
          <Image src={LOGO_SRC} alt="Logo" width={28} height={28} />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="font-display text-sm font-bold text-white leading-tight truncate">Ujian Online</h1>
          <p className="text-[10px] text-teal-300 leading-tight">Panel Admin</p>
        </div>
        {onClose && (
          <button onClick={onClose} className="lg:hidden text-white/60 hover:text-white cursor-pointer" aria-label="Tutup menu">
            <X size={18} />
          </button>
        )}
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 ${
                isActive
                  ? 'bg-teal-600/20 text-teal-300 shadow-sm'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              <item.icon size={18} className={isActive ? 'text-teal-400' : 'text-white/40 group-hover:text-white/70'} />
              <span className="flex-1">{item.label}</span>
              {isActive && <ChevronRight size={14} className="text-teal-400/60" />}
            </Link>
          );
        })}
      </nav>

      <div className="px-3 pb-4">
        {onLogout && (
          <button
            onClick={onLogout}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-semibold text-white/50 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
          >
            <LogOut size={18} />
            <span>Logout</span>
          </button>
        )}
        <div className="mt-3 px-3 py-2 rounded-lg bg-white/5 border border-white/5 flex items-center justify-between gap-2">
          <div>
            <p className="text-[10px] text-white/30 leading-tight">Ujian Online v0.1.0</p>
            <p className="text-[10px] text-white/20 leading-tight mt-0.5">Rekrutmen Digital</p>
          </div>
          <ThemeToggle variant="navy" />
        </div>
      </div>
    </div>
  );
}
