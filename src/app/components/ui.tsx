'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useState, useEffect, useCallback, type ReactNode, type ComponentType, type InputHTMLAttributes, type TextareaHTMLAttributes, type SelectHTMLAttributes, type ButtonHTMLAttributes } from 'react';
import { Check, X, AlertTriangle, ArrowLeft, ArrowRight, Inbox } from 'lucide-react';
import { LOGO_SRC } from '@/lib/constants';
import type { BadgeTone } from '@/lib/constants';

export function PageBackground({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`relative min-h-screen overflow-hidden bg-gradient-to-b from-bg-start to-bg-end ${className}`}
    >
      <div className="pointer-events-none absolute -top-32 -right-32 h-96 w-96 rounded-full bg-teal-600/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -left-40 h-[28rem] w-[28rem] rounded-full bg-amber-400/10 blur-3xl" />
      <div className="relative animate-fade-in">{children}</div>
    </div>
  );
}

export function Card({ children, className = '', hover = false }: { children: ReactNode; className?: string; hover?: boolean }) {
  return (
    <div
      className={`bg-white rounded-2xl border border-slate-200/70 shadow-card ${
        hover ? 'transition-shadow duration-200 hover:shadow-card-hover' : ''
      } ${className}`}
    >
      {children}
    </div>
  );
}

export function Label({ children, className = '', htmlFor }: { children: ReactNode; className?: string; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className={`block font-display text-sm font-semibold text-navy-900 mb-1.5 ${className}`}>
      {children}
    </label>
  );
}

const fieldBase =
  'w-full px-4 py-2.5 border border-slate-200 bg-field-bg rounded-xl text-slate-900 placeholder:text-slate-400 transition-colors focus:outline-none focus:ring-2 focus:ring-teal-600/25 focus:border-teal-600 focus:bg-white';
const fieldError = 'border-red-300 focus:ring-red-300/25 focus:border-red-400';

export function Input({ error, className, ...props }: InputHTMLAttributes<HTMLInputElement> & { error?: string }) {
  return (
    <div className={className}>
      <input {...props} className={`${fieldBase} ${error ? fieldError : ''}`} />
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}
export function Textarea({ error, className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement> & { error?: string }) {
  return (
    <div className={className}>
      <textarea {...props} className={`${fieldBase} resize-y ${error ? fieldError : ''}`} />
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}
export function Select({ error, className, ...props }: SelectHTMLAttributes<HTMLSelectElement> & { error?: string }) {
  return (
    <div className={className}>
      <select {...props} className={`${fieldBase} ${error ? fieldError : ''}`} />
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}

const buttonVariants = {
  primary:
    'text-white bg-gradient-to-r from-teal-600 to-teal-700 shadow-sm hover:shadow-md hover:from-teal-650 hover:to-teal-800',
  secondary: 'text-navy-900 bg-white border border-slate-300 hover:bg-slate-50 hover:border-slate-400',
  ghost: 'text-navy-900 hover:bg-slate-100',
  danger: 'text-red-700 bg-white border border-red-200 hover:bg-red-50',
  dark: 'text-white bg-navy-900 hover:bg-navy-950',
};

const buttonSizes = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2.5 text-sm',
  lg: 'px-6 py-3 text-base',
};

export function Button({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  fullWidth = false,
  className = '',
  children,
  disabled,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof buttonVariants;
  size?: keyof typeof buttonSizes;
  isLoading?: boolean;
  fullWidth?: boolean;
}) {
  return (
    <button
      {...props}
      disabled={disabled || isLoading}
      className={`inline-flex items-center justify-center gap-2 rounded-xl font-display font-semibold transition-all duration-150 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 cursor-pointer ${buttonSizes[size]} ${buttonVariants[variant]} ${fullWidth ? 'w-full' : ''} ${className}`}
    >
      {isLoading && <Spinner className="h-4 w-4" />}
      {children}
    </button>
  );
}

const badgeTones = {
  slate: 'bg-slate-100 text-slate-700',
  green: 'bg-green-100 text-green-700',
  red: 'bg-red-100 text-red-700',
  amber: 'bg-amber-100 text-amber-700',
  teal: 'bg-teal-100 text-teal-700',
  blue: 'bg-blue-100 text-blue-700',
  purple: 'bg-purple-100 text-purple-700',
  orange: 'bg-orange-100 text-orange-700',
  navy: 'bg-navy-900 text-white',
};

export function Badge({ children, tone = 'slate', className = '' }: { children: ReactNode; tone?: BadgeTone; className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold whitespace-nowrap ${
        badgeTones[tone] ?? badgeTones.slate
      } ${className}`}
    >
      {children}
    </span>
  );
}

export function TopNav({
  title,
  subtitle,
  links = [],
  onLogout,
  currentPath,
}: {
  title: string;
  subtitle?: string;
  links?: { href: string; label: string }[];
  onLogout?: () => void;
  currentPath?: string;
}) {
  const hookPathname = usePathname();
  const pathname = currentPath ?? hookPathname ?? '';
  return (
    <header className="mb-6 rounded-2xl border border-slate-200/70 bg-white/90 backdrop-blur px-5 py-3.5 shadow-card flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <div className="bg-white rounded-xl p-1.5 shadow-soft">
          <Image src={LOGO_SRC} alt="Logo" width={32} height={32} />
        </div>
        <div>
          <h1 className="font-display text-lg font-bold text-navy-900 leading-tight">{title}</h1>
          {subtitle && <p className="text-xs text-slate-500 leading-tight mt-0.5">{subtitle}</p>}
        </div>
      </div>
      <div className="flex items-center gap-1 flex-wrap">
        {links.map((l) => {
          const isActive = pathname === l.href || pathname.startsWith(l.href + '/');
          return (
            <Link
              key={l.href}
              href={l.href}
              aria-current={isActive ? 'page' : undefined}
              className={`text-sm font-semibold px-3 py-2 rounded-lg transition-colors ${
                isActive
                  ? 'bg-teal-50 text-teal-700 ring-1 ring-teal-600/30'
                  : 'text-teal-700 hover:text-teal-800 hover:bg-teal-600/10'
              }`}
            >
              {l.label}
            </Link>
          );
        })}
        {onLogout && (
          <Button variant="secondary" onClick={onLogout} className="!py-2 !px-3">
            Logout
          </Button>
        )}
      </div>
    </header>
  );
}

const statTones = {
  navy: 'bg-navy-900 text-white',
  teal: 'bg-gradient-to-br from-teal-600 to-teal-700 text-white',
  amber: 'bg-amber-400 text-navy-900',
  slate: 'bg-slate-100 text-slate-600',
};

type StatTone = keyof typeof statTones;

export function StatCard({ label, value, icon: Icon, tone = 'navy' }: { label: string; value: ReactNode; icon: ComponentType<{ size?: number; className?: string }>; tone?: StatTone }) {
  return (
    <Card className="p-4 flex items-center gap-4">
      <div className={`w-11 h-11 shrink-0 rounded-xl flex items-center justify-center shadow-sm ${
        statTones[tone] ?? statTones.navy
      }`}>
        <Icon size={20} />
      </div>
      <div className="min-w-0">
        <p className="font-display text-2xl font-bold text-navy-900 leading-none">{value}</p>
        <p className="text-xs text-slate-500 mt-1 truncate">{label}</p>
      </div>
    </Card>
  );
}

export function Spinner({ className = '' }: { className?: string }) {
  return (
    <svg
      className={`animate-spin h-5 w-5 text-teal-600 ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      role="status"
      aria-label="Memuat"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
      />
    </svg>
  );
}

export function EmptyState({ icon: Icon = Inbox, title, description, children }: { icon?: ComponentType<{ size?: number; className?: string }>; title: string; description?: string; children?: ReactNode }) {
  return (
    <div className="py-12 px-6 text-center">
      <div className="flex justify-center mb-3 text-slate-300"><Icon size={48} /></div>
      <p className="font-display font-bold text-navy-900 mb-1">{title}</p>
      {description && <p className="text-sm text-slate-500 mx-auto max-w-sm">{description}</p>}
      {children}
    </div>
  );
}

type ToastItem = { id: number; message: string; tone: 'green' | 'red' | 'amber' };

let toastId = 0;

export function useToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const toast = useCallback((message: string, tone: ToastItem['tone'] = 'green') => {
    const id = ++toastId;
    setToasts((prev) => [...prev, { id, message, tone }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }, []);

  const toastEl = toasts.length > 0 ? (
    <div role="status" aria-live="polite" className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 animate-fade-in">
      {toasts.map((t) => (
        <div key={t.id} className={`flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-semibold text-white ${
          t.tone === 'green' ? 'bg-green-600' : t.tone === 'red' ? 'bg-red-600' : 'bg-amber-500'
        }`}>
          {t.tone === 'green' && <Check size={16} />} {t.tone === 'red' && <X size={16} />} {t.tone === 'amber' && <AlertTriangle size={16} />} {t.message}
        </div>
      ))}
    </div>
  ) : null;

  return { toast, toastEl };
}

export function Modal({ open, onClose, title, children, role = 'dialog' }: { open: boolean; onClose: () => void; title?: string; children: ReactNode; role?: string }) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-5">
      <div className="absolute inset-0 bg-navy-950/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[85vh] overflow-y-auto animate-fade-in" role={role} aria-modal="true">
        {title && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <h2 className="font-display font-bold text-navy-900">{title}</h2>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none cursor-pointer" aria-label="Tutup">&times;</button>
          </div>
        )}
        <div className="px-6 py-4">{children}</div>
      </div>
    </div>
  );
}

export function Pagination({ halaman, totalHalaman, onPindah }: { halaman: number; totalHalaman: number; onPindah: (h: number) => void }) {
  if (totalHalaman <= 1) return null;

  const tombol: (number | '...')[] = [];
  if (totalHalaman <= 7) {
    for (let i = 1; i <= totalHalaman; i++) tombol.push(i);
  } else {
    tombol.push(1);
    if (halaman > 3) tombol.push('...');
    for (let i = Math.max(2, halaman - 1); i <= Math.min(totalHalaman - 1, halaman + 1); i++) tombol.push(i);
    if (halaman < totalHalaman - 2) tombol.push('...');
    tombol.push(totalHalaman);
  }

  return (
    <div className="flex items-center justify-center gap-1 mt-4">
      <button
        disabled={halaman === 1}
        onClick={() => onPindah(halaman - 1)}
        className="px-3 py-1.5 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
      >
        <ArrowLeft size={14} />
      </button>
      {tombol.map((t, i) =>
        t === '...' ? (
          <span key={`e${i}`} className="px-2 py-1.5 text-sm text-slate-400">…</span>
        ) : (
          <button
            key={t}
            onClick={() => onPindah(t)}
            className={`px-3 py-1.5 rounded-lg text-sm font-semibold cursor-pointer transition ${
              t === halaman ? 'bg-teal-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {t}
          </button>
        )
      )}
      <button
        disabled={halaman === totalHalaman}
        onClick={() => onPindah(halaman + 1)}
        className="px-3 py-1.5 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
      >
        <ArrowRight size={14} />
      </button>
    </div>
  );
}

export function ConfirmModal({ open, onConfirm, onCancel, title, message, confirmLabel = 'Ya, Hapus', loading }: {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  loading?: boolean;
}) {
  return (
    <Modal open={open} onClose={onCancel} title={title}>
      <p className="text-sm text-slate-600 mb-5">{message}</p>
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onCancel}>Batal</Button>
        <Button variant="danger" onClick={onConfirm} isLoading={loading}>{confirmLabel}</Button>
      </div>
    </Modal>
  );
}

export function StatCardSkeleton() {
  return (
    <Card className="p-4 flex items-center gap-4">
      <div className="w-11 h-11 shrink-0 rounded-xl skeleton" />
      <div className="flex-1">
        <div className="h-6 w-16 skeleton mb-1.5" />
        <div className="h-3 w-24 skeleton" />
      </div>
    </Card>
  );
}

export function TableRowSkeleton({ columns = 8 }: { columns?: number }) {
  return (
    <tr className="border-b border-slate-100">
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="p-3"><div className="h-4 skeleton" style={{ width: `${50 + Math.random() * 40}%` }} /></td>
      ))}
    </tr>
  );
}

export function TableSkeleton({ rows = 5, columns = 8 }: { rows?: number; columns?: number }) {
  return (
    <table className="w-full text-sm text-left">
      <thead>
        <tr className="border-b border-slate-200">
          {Array.from({ length: columns }).map((_, i) => (
            <th key={i} className="p-3"><div className="h-3 w-20 skeleton" /></th>
          ))}
        </tr>
      </thead>
      <tbody>
        {Array.from({ length: rows }).map((_, i) => (
          <TableRowSkeleton key={i} columns={columns} />
        ))}
      </tbody>
    </table>
  );
}
