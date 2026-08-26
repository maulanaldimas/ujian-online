import Image from 'next/image';
import { LOGO_SRC } from '@/lib/constants';

type Props = {
  title: string;
  subtitle?: string;
  showLogo?: boolean;
  logoSize?: number;
};

export default function CardHeader({ title, subtitle, showLogo = false, logoSize = 80 }: Props) {
  return (
    <div className="bg-navy-900 px-8 pt-8 pb-6 text-center">
      {showLogo && (
        <div className="flex justify-center mb-3">
          <Image src={LOGO_SRC} alt="Logo" width={logoSize} height={logoSize} priority />
        </div>
      )}
      <h1 className="font-display text-2xl font-bold text-white">{title}</h1>
      {subtitle && <p className="text-sm text-slate-300 mt-2">{subtitle}</p>}
    </div>
  );
}
