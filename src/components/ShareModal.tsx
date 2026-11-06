import { useEffect, useState } from 'react';
import { Icon } from '@iconify/react';
import type { Manual } from '../lib/gallery';
import { getSession, publishManual, sendLoginLink, supabaseReady } from '../lib/share';
import { supabaseEnvStatus } from '../lib/supabase';
import type { Session } from '@supabase/supabase-js';

export function ShareModal({ manual, onClose }: { manual: Manual; onClose: () => void }) {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [link, setLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    getSession().then((s) => setSession(s));
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !busy && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [busy, onClose]);

  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await sendLoginLink(email.trim());
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo enviar el enlace.');
    } finally {
      setBusy(false);
    }
  };

  const publish = async () => {
    setError(null);
    setBusy(true);
    setProgress(0);
    try {
      setLink(await publishManual(manual, setProgress));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo compartir el manual.');
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    if (!link) return;
    await navigator.clipboard?.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const nativeShare = () => {
    if (link && navigator.share) void navigator.share({ title: manual.nombre, url: link }).catch(() => {});
  };

  const btn = 'flex w-full items-center justify-center gap-2 rounded-lg bg-azul px-4 py-2.5 text-white shadow hover:bg-azul-mid disabled:opacity-50';

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-azul-dark/35 p-4 backdrop-blur-sm"
      onMouseDown={(e) => e.target === e.currentTarget && !busy && onClose()}
    >
      <div className="anim-in w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl text-azul-dark">Compartir manual</h2>
            <p className="mt-1 text-sm text-gris-txt-oscuro">«{manual.nombre}» aparecerá en la galería de quien tenga el enlace.</p>
          </div>
          <button onClick={onClose} disabled={busy} aria-label="Cerrar" className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-gris-txt-oscuro hover:bg-azul-tint disabled:opacity-40">
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

        {supabaseReady && session === undefined && <p className="text-sm text-gris-txt">Comprobando sesión…</p>}

        {supabaseReady && session === null && (
          sent ? (
            <p className="rounded-lg bg-azul-tint/60 p-4 text-sm text-azul-dark">
              Te hemos enviado un enlace de acceso a <strong>{email}</strong>. Ábrelo desde este dispositivo y vuelve a pulsar Compartir.
            </p>
          ) : (
            <form onSubmit={login} className="flex flex-col gap-3">
              <p className="text-sm text-gris-txt-oscuro">Para compartir necesitas iniciar sesión. Te enviaremos un enlace al correo.</p>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@correo.com"
                className="rounded-lg border border-gris-line px-3 py-2.5 outline-none focus:border-azul"
              />
              <button type="submit" disabled={busy || !email} className={btn}>
                <Icon icon="solar:letter-linear" width={20} /> Enviar enlace de acceso
              </button>
            </form>
          )
        )}

        {supabaseReady && session && !link && (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-gris-txt-oscuro">
              Sesión: <strong>{session.user.email}</strong>. Se subirán {manual.paginas.length} páginas a Supabase.
            </p>
            {busy ? (
              <div>
                <p className="font-label text-xs tracking-[0.16em] text-azul-dark">SUBIENDO…</p>
                <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-gris-bg">
                  <div className="h-full rounded-full bg-azul transition-[width] duration-300" style={{ width: `${Math.max(6, Math.round(progress * 100))}%` }} />
                </div>
              </div>
            ) : (
              <button onClick={publish} className={btn}>
                <Icon icon="solar:share-linear" width={20} /> Publicar y obtener enlace
              </button>
            )}
          </div>
        )}

        {link && (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-gris-txt-oscuro">Enlace público listo. Cualquiera con el enlace puede abrirlo.</p>
            <div className="flex items-center gap-2 rounded-lg border border-gris-line bg-gris-bg/60 p-2">
              <input readOnly value={link} onFocus={(e) => e.currentTarget.select()} className="min-w-0 flex-1 bg-transparent px-1 text-sm outline-none" />
              <button onClick={copy} className="shrink-0 rounded-md bg-white px-3 py-1.5 text-sm text-azul-dark shadow hover:bg-azul-tint">
                {copied ? '¡Copiado!' : 'Copiar'}
              </button>
            </div>
            {typeof navigator !== 'undefined' && 'share' in navigator && (
              <button onClick={nativeShare} className={btn}>
                <Icon icon="solar:share-linear" width={20} /> Compartir con…
              </button>
            )}
          </div>
        )}

        {error && <p className="mt-4 text-sm text-terracota">{error}</p>}
      </div>
    </div>
  );
}
