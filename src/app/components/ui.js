import Link from 'next/link';
import Image from 'next/image';

export function PageBackground({ children, className = '' }) {
  return (
    <div className={`min-h-screen bg-gradient-to-b from-[#EEF2F7] to-[#E3EAF1] ${className}`}>
      {children}
    </div>
  );
}

export function Card({ children, className = '' }) {
  return (
    <div className={`bg-white rounded-2xl shadow-sm border border-slate-200/70 ${className}`}>
      {children}
    </div>
  );
}

export function Label({ children, className = '' }) {
  return (
    <label className={`block font-display text-sm font-semibold text-[#10192E] mb-1.5 ${className}`}>
      {children}
    </label>
  );
}

const fieldBase =
  'w-full px-4 py-2.5 border border-slate-200 bg-[#F7F9FB] rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1F6F78] focus:border-transparent';

export function Input(props) {
  return <input {...props} className={`${fieldBase} ${props.className || ''}`} />;
}
export function Textarea(props) {
  return <textarea {...props} className={`${fieldBase} resize-y ${props.className || ''}`} />;
}
export function Select(props) {
  return <select {...props} className={`${fieldBase} ${props.className || ''}`} />;
}

const buttonVariants = {
  primary: 'text-white bg-gradient-to-r from-[#1F6F78] to-[#164F56] hover:from-[#195F67] hover:to-[#123F45]',
  secondary: 'text-[#10192E] bg-white border border-slate-300 hover:bg-slate-50',
  ghost: 'text-[#10192E] hover:bg-slate-100',
  danger: 'text-red-700 bg-white border border-red-200 hover:bg-red-50',
  dark: 'text-white bg-[#10192E] hover:bg-[#0A1120]',
};

export function Button({ variant = 'primary', className = '', children, ...props }) {
  return (
    <button
      {...props}
      className={`px-4 py-2.5 rounded-xl font-display font-semibold text-sm transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${buttonVariants[variant]} ${className}`}
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
};

export function Badge({ children, tone = 'slate' }) {
  return (
    <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold ${badgeTones[tone]}`}>
      {children}
    </span>
  );
}

export function TopNav({ title, links = [], onLogout }) {
  return (
    <div className="flex justify-between items-center mb-6 flex-wrap gap-3">
      <div className="flex items-center gap-3">
        <Image src="/logo.png" alt="Logo" width={40} height={40} />
        <h1 className="font-display text-xl font-bold text-[#10192E]">{title}</h1>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="text-sm font-semibold text-[#1F6F78] hover:text-[#164F56] px-3 py-2 rounded-lg hover:bg-slate-100"
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
    </div>
  );
}