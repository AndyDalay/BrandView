import { useEffect, useState } from 'react';
import { Icon } from '@iconify/react';
import { getCurrentUser } from '@/lib/auth';
import { getPerfil, urlAvatar, type Perfil } from '@/lib/perfiles';
import { listarValoraciones, votar, type Valoraciones, type Voto } from '@/lib/valoraciones';
import { UserAvatar } from './UserAvatar';
import { IconButton } from './ui/Button';
import type { Manual } from '../lib/gallery';

// S1 + S2 — Aviso "te ha compartido este documento" encima del libro, con me gusta / no me gusta.
export function ShareNotice({ manual }: { manual: Manual }) {
  const [uid, setUid] = useState<string | null>(null);
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [val, setVal] = useState<Valoraciones | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getCurrentUser().then((u) => setUid(u?.id ?? null));
  }, []);

  useEffect(() => {
    if (!manual.ownerId) return;
    getPerfil(manual.ownerId).then(setPerfil).catch(() => setPerfil(null));
  }, [manual.ownerId]);

  useEffect(() => {
    listarValoraciones(manual.id, uid).then(setVal).catch((e: Error) => setError(e.message));
  }, [manual.id, uid]);

  async function onVotar(tipo: Voto) {
    setBusy(true);
    setError(null);
    try {
      await votar(manual.id, tipo);
      setVal(await listarValoraciones(manual.id, uid));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo votar.');
    } finally {
      setBusy(false);
    }
  }

  const nombre = perfil?.nombre || 'Alguien';
  const fecha = manual.compartidoEn
    ? new Date(manual.compartidoEn).toLocaleString(undefined, { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '';
  const yaVoto = Boolean(val?.miVoto);
  const url = perfil ? urlAvatar(perfil, 'mini') : null;

  // Solo aparece si el manual lo subió otra persona: en tus propios manuales no tiene sentido
  if (manual.ownerId && uid && manual.ownerId === uid) return null;

  return (
    <div data-testid="share-notice" className="mb-s6 flex w-full max-w-[640px] items-center gap-s3 rounded-xl border border-gris-line bg-white/60 px-s4 py-s3 backdrop-blur">
      <UserAvatar url={url} nombre={nombre} size={36} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-azul-dark">{nombre}</p>
        <p className="truncate text-xs text-gris-txt-oscuro">
          te ha compartido este documento{fecha && <> · {fecha}</>}
        </p>
        {error && <p role="alert" className="mt-s1 text-xs text-terracota">{error}</p>}
      </div>

      {/* Valoración: al votar, los botones desaparecen y queda el contador */}
      {val && !yaVoto && (
        <div className="flex items-center gap-s1" data-testid="share-votes">
          <IconButton icono="solar:like-linear" label="Me gusta" tamano="sm" data-testid="vote-like" disabled={busy} onClick={() => onVotar('like')} />
          <IconButton icono="solar:dislike-linear" label="No me gusta" tamano="sm" data-testid="vote-dislike" disabled={busy} onClick={() => onVotar('dislike')} />
        </div>
      )}
      {val && yaVoto && (
        <span data-testid="share-like-count" className="flex items-center gap-s1 text-sm tabular-nums text-azul-dark">
          <Icon icon="solar:like-bold" width={16} aria-hidden />
          {val.likes}
        </span>
      )}
    </div>
  );
}
