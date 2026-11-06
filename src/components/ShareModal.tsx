import { useEffect, useRef, useState } from 'react';
import { Icon } from '@iconify/react';
import type { Manual } from '../lib/gallery';
import { publishManual, supabaseReady } from '../lib/share';
import { supabaseEnvStatus } from '../lib/supabase';

function shareText(nombre: string, link?: string) {
  const base = `Te comparto el manual «${nombre}» de GrandBrandView.`;
  return link ? `${base}\n${link}` : base;
}

export function ShareModal({ manual, onClose }: { manual: Manual; onClose: () => void }) {
  const [link, setLink] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const started = useRef(false);

  const run = async () => {
    setError(null);
    setLink(null);
    setProgress(0);
    try {
      setLink(await publishManual(manual, setProgress));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo preparar el enlace.');
    }
  };

  // Publica automáticamente al abrir el modal
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    if (supabaseReady) void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const copy = async () => {
    if (!link) return;
    await navigator.clipboard?.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const text = shareText(manual.nombre, link ?? undefined);
  const channels = [
    { label: 'WhatsApp', icon: 'solar:chat-round-dots-linear', href: `https://wa.me/?text=${encodeURIComponent(text)}` },
    { label: 'Telegram', icon: 'solar:plain-2-linear', href: `https://t.me/share/url?url=${encodeURIComponent(link ?? '')}&text=${encodeURIComponent(shareText(manual.nombre))}` },
    { label: 'Correo', icon: 'solar:letter-linear', href: `mailto:?subject=${encodeURIComponent('Manual: ' + manual.nombre)}&body=${encodeURIComponent(text)}` },
  ];

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-azul-dark/35 p-4 backdrop-blur-sm"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="anim-in w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl text-azul-dark">Compartir manual</h2>
            <p className="mt-1 text-sm text-gris-txt-oscuro">«{manual.nombre}» estará disponible para quien tenga el enlace.</p>
          </div>
          <button onClick={onClose} aria-label="Cerrar" className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-gris-txt-oscuro hover:bg-azul-tint">
            <Icon icon="solar:close-circle-linear" width={22} />
          </button>
        </div>

        {!supabaseReady && (
          <div className="text-sm text-terracota">
            <p>Falta configurar Supabase (VITE_SUPABASE_URL y VITE_SUPABASE_PUBLISHABLE_KEY).</p>
            <p className="mt-2 font-mono text-xs text-gris-txt-oscuro">
              modo: {supabaseEnvStatus.mode} · URL: {supabaseEnvStatus.url ? 'ok' : 'falta'} · clave: {supabaseEnvStatus.key ? 'ok' : 'falta'}
            </p>
          </div>
        )}

        {supabaseReady && !link && !error && (
          <div>
            <p className="font-label text-xs tracking-[0.16em] text-azul-dark">PREPARANDO ENLACE…</p>
            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-gris-bg">
              <div className="h-full rounded-full bg-azul transition-[width] duration-300" style={{ width: `${Math.max(6, Math.round(progress * 100))}%` }} />
            </div>
          </div>
        )}

        {error && (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-terracota">{error}</p>
            <button onClick={run} className="rounded-lg bg-azul px-4 py-2 text-sm text-white hover:bg-azul-mid">Reintentar</button>
          </div>
        )}

        {/* Enlace: visible cuando está listo */}
        {link && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-gris-line bg-gris-bg/60 p-2">
            <input readOnly value={link} onFocus={(e) => e.currentTarget.select()} className="min-w-0 flex-1 bg-transparent px-1 text-sm outline-none" />
            <button onClick={copy} className="shrink-0 rounded-md bg-white px-3 py-1.5 text-sm text-azul-dark shadow hover:bg-azul-tint">
              {copied ? '¡Copiado!' : 'Copiar'}
            </button>
          </div>
        )}

        {/* Botones de compartir: visibles desde el inicio, activos cuando el enlace está listo */}
        <div className="grid grid-cols-3 gap-2">
          {channels.map((c) => (
            <button
              key={c.label}
              disabled={!link}
              onClick={() => link && window.open(c.href, '_blank', 'noopener,noreferrer')}
              className="flex flex-col items-center gap-1 rounded-lg bg-gris-bg/60 px-2 py-3 text-xs text-azul-dark hover:bg-azul-tint disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Icon icon={c.icon} width={22} />
              {c.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
