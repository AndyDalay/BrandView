import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

export function Header({ children }: { children?: ReactNode }) {
  return (
    <header className="relative z-10 flex h-[72px] items-center justify-between gap-4 border-b border-gris-line bg-white/60 px-5 backdrop-blur md:px-10">
      <Link to="/" className="flex items-center gap-3 text-azul-dark">
        <img src="/brand/andybrand-logo.png" alt="Andy Brand" width={52} height={32} className="h-8 w-auto select-none" draggable={false} />
        <span className="font-display text-[16px] leading-none tracking-[0.02em]">
          GRAND<span className="text-azul">BRAND</span>VIEW
        </span>
      </Link>
      {children}
    </header>
  );
}
