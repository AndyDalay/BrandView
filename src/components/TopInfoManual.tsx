import { useEffect, useRef, useState } from 'react';
import { Icon } from '@iconify/react';
import { getCurrentUser } from '@/lib/auth';
import { getPerfil, urlAvatar, type Perfil } from '@/lib/perfiles';
import { listarValoraciones, votar, type Valoraciones, type Voto } from '@/lib/valoraciones';
import type { Manual } from '@/lib/gallery';
import { UserAvatar } from './UserAvatar';
import { IconButton } from './ui/Button';

// V4 — Barra de información del manual, encima del libro.
// Sin contenedor ni fondo: solo una fila con el ancho de una página, centrada.
// Izquierda: autor y fecha. Derecha: contador de me gusta y, al acercar el cursor, los botones para votar.
// Los botones se ocultan 1,5 s después de salir del cursor si no se ha votado. Tras votar, desaparecen.

const RETARDO_OCULTAR_MS = 1500;

const FORMATO_FECHA: Intl.DateTimeFormatOptions = {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
};

export function TopInfoManual({ manual, ancho }: { manual: Manual; ancho: string }) {
  const [uid, setUid] = useState<string | null>(null);
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [val, setVal] = useState<Valoraciones | null>(null);
  const [abierto, setAbierto] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ocultarTimer = useRef<number | null>(null);

  useEffect(() => {
    getCurrentUser().then((u) => setUid(u?.id ?? null));
  }, []);

  useEffect(() => {
    if (!manual.ownerId) {
      setPerfil(null);
      return;
    }
    getPerfil(manual.ownerId).then(setPerfil).catch(() => setPerfil(null));
  }, [manual.ownerId]);

  useEffect(() => {
    let vigente = true;
    listarValoraciones(manual.id, uid)
      .then((v) => vigente && setVal(v))
      .catch((e: Error) => vigente && setError(e.message));
    return () => {
      vigente = false;
    };
  }, [manual.id, uid]);

  // Limpia el temporizador al desmontar
  useEffect(() => {
    const timer = ocultarTimer;
    return () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    };
  }, []);

  function cancelarOcultar() {
    if (ocultarTimer.current !== null) {
      window.clearTimeout(ocultarTimer.current);
      ocultarTimer.current = null;
    }
  }

  const yaVoto = Boolean(val?.miVoto);

  function abrir() {
    cancelarOcultar();
    setAbierto(true);
  }

  function cerrarConRetardo() {
    if (yaVoto) return;
    cancelarOcultar();
    ocultarTimer.current = window.setTimeout(() => setAbierto(false), RETARDO_OCULTAR_MS);
  }

  async function onVotar(tipo: Voto) {
    if (busy || yaVoto) return;
    setBusy(true);
    setError(null);
    try {
      await votar(manual.id, tipo);
      setVal(await listarValoraciones(manual.id, uid));
      cancelarOcultar();
      setAbierto(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo votar.');
    } finally {
      setBusy(false);
    }
  }

  // Autor: «ti» si lo subiste tú (compartido por ti o local en este equipo);
  // «GrandBrandView» en los manuales de /public; si no, el nombre del perfil que lo compartió.
  const esMio = Boolean((uid && manual.ownerId === uid) || manual.local);
  const esBase = !manual.remoto && !manual.local;
  const autor = esMio ? 'ti' : esBase ? 'GrandBrandView' : perfil?.nombre || 'Alguien';
  const fechaIso = manual.compartidoEn ?? manual.subidoEn;
  const fecha = fechaIso ? new Date(fechaIso).toLocaleString(undefined, FORMATO_FECHA) : '';
  const url = perfil ? urlAvatar(perfil, 'mini') : null;

  return (
    <div
      data-testid="top-info-manual"
      className="mx-auto mb-s6 flex flex-wrap items-center justify-between gap-x-s3 gap-y-s1"
      style={{ width: ancho }}
      onPointerEnter={abrir}
      onPointerLeave={cerrarConRetardo}
      onFocus={abrir}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) cerrarConRetardo();
      }}
    >
      <div className="flex min-w-0 items-center gap-s3">
        <UserAvatar url={url} nombre={autor} size={36} />
        <div className="min-w-0">
          <p data-testid="manual-author" className="truncate text-sm font-medium text-azul-dark">
            Subido por {autor}
          </p>
          {fecha && (
            <p data-testid="manual-date" className="truncate text-xs text-gris-txt-oscuro">
              {fecha}
            </p>
          )}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-s1">
        {/* Botones de voto: visibles al acercar el cursor, desaparecen tras votar */}
        {!yaVoto && (
          <div
            data-testid="share-votes"
            className={`flex items-center gap-s1 transition-opacity duration-150 motion-reduce:transition-none ${
              abierto ? 'opacity-100' : 'pointer-events-none opacity-0'
            }`}
          >
            <IconButton
              icono="solar:like-linear"
              label="Me gusta"
              tamano="sm"
              data-testid="vote-like"
              onClick={() => onVotar('like')}
            />
            <IconButton
              icono="solar:dislike-linear"
              label="No me gusta"
              tamano="sm"
              data-testid="vote-dislike"
              onClick={() => onVotar('dislike')}
            />
          </div>
        )}

        {val && (
          <span
            data-testid="share-like-count"
            className="flex items-center gap-s1 text-sm tabular-nums text-azul-dark"
            aria-label={`${val.likes} me gusta`}
          >
            <Icon icon={val.miVoto === 'like' ? 'solar:like-bold' : 'solar:like-linear'} width={16} aria-hidden />
            {val.likes}
          </span>
        )}
      </div>

      {error && (
        <p role="alert" className="basis-full text-right text-xs text-terracota">
          {error}
        </p>
      )}
    </div>
  );
}
