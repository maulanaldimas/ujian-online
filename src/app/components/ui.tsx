import Link from 'next/link';
import Image from 'next/image';
import type { ReactNode, InputHTMLAttributes, TextareaHTMLAttributes, SelectHTMLAttributes, ButtonHTMLAttributes } from 'react';

export function PageBackground({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`relative min-h-screen overflow-hidden bg-gradient-to-b from-[#F2F6FA] to-[#E3EAF1] ${className}`}
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
  'w-full px-4 py-2.5 border border-slate-200 bg-[#F7F9FB] rounded-xl text-slate-900 placeholder:text-slate-400 transition-colors focus:outline-none focus:ring-2 focus:ring-teal-600/25 focus:border-teal-600 focus:bg-white';

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${fieldBase} ${props.className || ''}`} />;
}
export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${fieldBase} resize-y ${props.className || ''}`} />;
}
export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${fieldBase} ${props.className || ''}`} />;
}

const buttonVariants = {
  primary:
    'text-white bg-gradient-to-r from-teal-600 to-teal-700 shadow-sm hover:shadow-md hover:from-[#195F67] hover:to-teal-800',
  secondary: 'text-navy-900 bg-white border border-slate-300 hover:bg-slate-50 hover:border-slate-400',
  ghost: 'text-navy-900 hover:bg-slate-100',
  danger: 'text-red-700 bg-white border border-red-200 hover:bg-red-50',
  dark: 'text-white bg-navy-900 hover:bg-navy-950',
};

export function Button({
  variant = 'primary',
  className = '',
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: keyof typeof buttonVariants }) {
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-display font-semibold text-sm transition-all duration-150 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 cursor-pointer ${buttonVariants[variant]} ${className}`}
    >
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

export function Badge({ children, tone = 'slate', className = '' }: { children: ReactNode; tone?: string; className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold whitespace-nowrap ${
        badgeTones[tone as keyof typeof badgeTones] ?? badgeTones.slate
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
}: {
  title: string;
  subtitle?: string;
  links?: { href: string; label: string }[];
  onLogout?: () => void;
}) {
  return (
    <header className="mb-6 rounded-2xl border border-slate-200/70 bg-white/90 backdrop-blur px-5 py-3.5 shadow-card flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <div className="bg-white rounded-xl p-1.5 shadow-soft">
          <Image src="/logo.png" alt="Logo" width={32} height={32} />
        </div>
        <div>
          <h1 className="font-display text-lg font-bold text-navy-900 leading-tight">{title}</h1>
          {subtitle && <p className="text-xs text-slate-500 leading-tight mt-0.5">{subtitle}</p>}
        </div>
      </div>
      <div className="flex items-center gap-1 flex-wrap">
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="text-sm font-semibold text-teal-700 hover:text-teal-800 px-3 py-2 rounded-lg hover:bg-teal-600/10 transition-colors"
          >
            {l.label}
          </Link>
        ))}
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

export function StatCard({ label, value, icon, tone = 'navy' }: { label: string; value: ReactNode; icon: string; tone?: string }) {
  return (
    <Card className="p-4 flex items-center gap-4">
      <div className={`w-11 h-11 shrink-0 rounded-xl flex items-center justify-center text-lg font-bold shadow-sm ${
        statTones[tone as keyof typeof statTones] ?? statTones.navy
      }`}>
        {icon}
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
      aria-hidden="true"
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

export function EmptyState({ icon = '📭', title, description, children }: { icon?: string; title: string; description?: string; children?: ReactNode }) {
  return (
    <div className="py-12 px-6 text-center">
      <div className="text-4xl mb-3">{icon}</div>
      <p className="font-display font-bold text-navy-900 mb-1">{title}</p>
      {description && <p className="text-sm text-slate-500 mx-auto max-w-sm">{description}</p>}
      {children}
    </div>
  );
}
