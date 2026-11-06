import { useEffect, useState } from 'react';

// Espacio publicitario: rota las imágenes de /public/ads (banner-add-xx).
// Más adelante aquí irá Google Ads.
export function AdBanner({ ads }: { ads: string[] }) {
  const [i, setI] = useState(0);

  useEffect(() => {
    if (ads.length < 2) return;
    const t = setInterval(() => setI((x) => (x + 1) % ads.length), 6000);
    return () => clearInterval(t);
  }, [ads.length]);

  if (!ads.length) return null;

  return (
    <div className="relative z-10 mx-auto w-full max-w-[1100px] px-4 md:px-0">
      <div className="relative overflow-hidden rounded-xl border border-gris-line bg-white/70 shadow-sm">
        <span className="absolute right-2 top-2 z-10 rounded bg-negro/70 px-2 py-0.5 font-label text-[10px] tracking-wider text-white">
          PUBLICIDAD
        </span>
        {ads.map((src, k) => (
          <img
            key={src}
            src={src}
            alt=""
            className={`mx-auto block max-h-[120px] w-full object-contain transition-opacity duration-700 ${
              k === i ? 'opacity-100' : 'pointer-events-none absolute inset-0 opacity-0'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
