import { useCallback, useEffect, useState, type MouseEvent } from 'react';
import { Icon } from '@iconify/react';
import {
  borrarComentario,
  crearComentario,
  crearComentarioVoz,
  listarComentarios,
  TEXTO_MAX,
  transcribirComentario,
  type Comentario,
} from '@/lib/comentarios';
import { getCurrentUser } from '@/lib/auth';
import { UserAvatar } from './UserAvatar';
import { GrabadorVoz } from './GrabadorVoz';

// Capa de comentarios sobre el libro (texto y voz). Se monta encima de BookViewer sin tocarlo.
// La página actual se lee del indicador "n / total" del visor.

function paginaActual(): number | null {
  const t = document.querySelector('[data-testid="page-indicator"]')?.textContent ?? '';
  const n = parseInt(t, 10);
  return Number.isFinite(n) ? n : null;
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const fecha = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
const enProceso = (c: Comentario) => c.estado === 'pendiente' || c.estado === 'transcribiendo';
// Una nota que lleva más de 90 s sin resolverse se considera atascada (el servidor no llegó a responder)
const LIMITE_ATASCO_MS = 90_000;
const atascado = (c: Comentario) => enProceso(c) && Date.now() - new Date(c.createdAt).getTime() > LIMITE_ATASCO_MS;
// Problema: error del servidor, fallo de la petición de este navegador, o nota atascada sin petición activa
const conProblema = (c: Comentario, fallos: Record<string, string>, enCurso: Record<string, number>) =>
  c.estado === 'error' || Boolean(fallos[c.id]) || (!enCurso[c.id] && atascado(c));
const SEG_LENTO = 45; // a partir de aquí se ofrece reintentar aunque la petición siga abierta

interface Borrador {
  x: number;
  y: number;
  pagina: number;
}

export function CommentLayer({
  manualId,
  modo,
  onSalirModo,
}: {
  manualId: string;
  modo: boolean; // true = modo colocar: un clic añade un comentario
  onSalirModo: () => void;
}) {
  const [comentarios, setComentarios] = useState<Comentario[]>([]);
  const [pagina, setPagina] = useState<number | null>(null);
  const [uid, setUid] = useState<string | null>(null);
  const [borrador, setBorrador] = useState<Borrador | null>(null);
  const [texto, setTexto] = useState('');
  const [grabando, setGrabando] = useState(false);
  const [abierto, setAbierto] = useState<string | null>(null);
  const [fallos, setFallos] = useState<Record<string, string>>({}); // motivo del último fallo de transcripción, por id
  const [enCurso, setEnCurso] = useState<Record<string, number>>({}); // petición abierta desde este navegador: id → hora de inicio
  const [ahora, setAhora] = useState(() => Date.now());
  const [fotoFallida, setFotoFallida] = useState<Record<string, true>>({}); // si la foto no carga, se muestra la inicial
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(() => {
    listarComentarios(manualId)
      .then(setComentarios)
      .catch((e: Error) => setError(e.message));
  }, [manualId]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  useEffect(() => {
    getCurrentUser().then((u) => setUid(u?.id ?? null));
  }, []);

  // Sigue la página que muestra el visor
  useEffect(() => {
    const t = window.setInterval(() => setPagina(paginaActual()), 300);
    return () => window.clearInterval(t);
  }, []);

  // Mientras haya notas transcribiéndose, reconsulta el estado cada 3 s (T6)
  const hayEnProceso = comentarios.some(enProceso);
  useEffect(() => {
    if (!hayEnProceso) return;
    const t = window.setInterval(cargar, 3000);
    return () => window.clearInterval(t);
  }, [hayEnProceso, cargar]);

  // Contador de segundos mientras hay peticiones de transcripción abiertas
  const hayEnCurso = Object.keys(enCurso).length > 0;
  useEffect(() => {
    if (!hayEnCurso) return;
    const t = window.setInterval(() => setAhora(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, [hayEnCurso]);

  // Al cerrar el borrador se para cualquier grabación
  useEffect(() => {
    if (!borrador) setGrabando(false);
  }, [borrador]);

  // Escape cierra lo que esté abierto
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || grabando) return;
      if (borrador) setBorrador(null);
      else if (abierto) setAbierto(null);
      else if (modo) onSalirModo();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [borrador, abierto, modo, grabando, onSalirModo]);

  function onClickCapa(e: MouseEvent<HTMLDivElement>) {
    if (!modo || busy) return;
    const r = e.currentTarget.getBoundingClientRect();
    const pag = paginaActual();
    if (pag == null) {
      setError('No se pudo identificar la página actual.');
      return;
    }
    setError(null);
    setAbierto(null);
    setTexto('');
    setBorrador({ x: clamp01((e.clientX - r.left) / r.width), y: clamp01((e.clientY - r.top) / r.height), pagina: pag });
  }

  async function guardar() {
    if (!borrador) return;
    setBusy(true);
    setError(null);
    try {
      await crearComentario({ manualId, pagina: borrador.pagina, x: borrador.x, y: borrador.y, texto });
      setBorrador(null);
      setTexto('');
      onSalirModo();
      cargar();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar el comentario.');
    } finally {
      setBusy(false);
    }
  }

  // Nota de voz: sube el audio, cierra el borrador y transcribe en segundo plano.
  async function guardarVoz(audio: Blob) {
    if (!borrador) return;
    setGrabando(false);
    setBusy(true);
    setError(null);
    try {
      const id = await crearComentarioVoz({ manualId, pagina: borrador.pagina, x: borrador.x, y: borrador.y, audio });
      setBorrador(null);
      setTexto('');
      onSalirModo();
      cargar();
      // La lágrima se queda con spinner hasta que el servidor responde; si falla, muestra el motivo y reintentar
      void lanzarTranscripcion(id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar la nota de voz.');
    } finally {
      setBusy(false);
    }
  }

  // Pide la transcripción. Si falla, guarda el motivo para mostrarlo; si tarda, la UI ofrece reintentar.
  async function lanzarTranscripcion(id: string) {
    setFallos((f) => {
      const copia = { ...f };
      delete copia[id];
      return copia;
    });
    setEnCurso((e) => ({ ...e, [id]: Date.now() }));
    try {
      await transcribirComentario(id);
    } catch (e) {
      const motivo = e instanceof Error ? e.message : 'No se pudo transcribir el audio.';
      setFallos((f) => ({ ...f, [id]: motivo }));
    } finally {
      setEnCurso((e) => {
        const copia = { ...e };
        delete copia[id];
        return copia;
      });
      cargar();
    }
  }

  async function reintentar(c: Comentario) {
    setBusy(true);
    setError(null);
    await lanzarTranscripcion(c.id);
    setBusy(false);
  }

  // Segundos que lleva abierta la petición de un comentario
  const segundos = (id: string) => (enCurso[id] ? Math.max(0, Math.round((ahora - enCurso[id]) / 1000)) : 0);

  async function borrar(c: Comentario) {
    setBusy(true);
    setError(null);
    try {
      await borrarComentario(c.id);
      setAbierto(null);
      cargar();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo borrar el comentario.');
    } finally {
      setBusy(false);
    }
  }

  const visibles = comentarios.filter((c) => c.pagina === pagina);
  const seleccionado = comentarios.find((c) => c.id === abierto) ?? null;
  const fotoDe = (c: Comentario) => (c.autorAvatar && !fotoFallida[c.id] ? c.autorAvatar : null);

  return (
    <div
      data-testid="comment-layer"
      onClick={onClickCapa}
      className={`absolute inset-0 z-10 ${modo ? 'pointer-events-auto cursor-crosshair' : 'pointer-events-none'}`}
    >
      {modo && !borrador && (
        <p className="pointer-events-none absolute left-1/2 top-3 -translate-x-1/2 rounded-full bg-azul-dark px-3 py-1 text-xs text-white shadow">
          Toca la página para dejar un comentario
        </p>
      )}

      {visibles.map((c) => {
        const foto = fotoDe(c);
        const problema = conProblema(c, fallos, enCurso);
        return (
          <button
            key={c.id}
            type="button"
            data-testid="comment-pin"
            data-estado={c.estado}
            title={`${c.autorNombre} · ${fecha(c.createdAt)}`}
            aria-label={`Comentario de ${c.autorNombre}`}
            onClick={(e) => {
              e.stopPropagation();
              setBorrador(null);
              setAbierto(abierto === c.id ? null : c.id);
            }}
            style={{ left: `${c.x * 100}%`, top: `${c.y * 100}%` }}
            className={`pointer-events-auto absolute grid h-8 w-8 -translate-x-1/2 -translate-y-full -rotate-45 place-items-center overflow-hidden rounded-[50%_50%_50%_0] border-2 border-white text-white shadow-lg transition-transform hover:scale-110 ${problema ? 'bg-terracota' : 'bg-azul'}`}
          >
            <span className="flex h-full w-full rotate-45 items-center justify-center">
              {foto ? (
                <img
                  src={foto}
                  alt=""
                  draggable={false}
                  onError={() => setFotoFallida((f) => ({ ...f, [c.id]: true }))}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-xs font-semibold">{c.autorNombre.charAt(0).toUpperCase()}</span>
              )}
            </span>
            {enProceso(c) && !problema && (
              <span data-testid="comment-pin-spinner" aria-hidden className="pointer-events-none absolute inset-0 animate-spin rounded-[50%] border-2 border-white/70 border-t-transparent" />
            )}
          </button>
        );
      })}

      {seleccionado && (
        <div
          data-testid="comment-panel"
          role="dialog"
          aria-label="Comentario"
          onClick={(e) => e.stopPropagation()}
          style={{ left: `${seleccionado.x * 100}%`, top: `${seleccionado.y * 100}%` }}
          className="group pointer-events-auto absolute z-20 w-64 max-w-[80vw] -translate-x-1/2 rounded-xl border border-gris-line bg-white p-4 shadow-xl"
        >
          <div className="flex items-start gap-3">
            <UserAvatar url={fotoDe(seleccionado)} nombre={seleccionado.autorNombre} size={32} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-azul-dark">{seleccionado.autorNombre}</p>
              <p className="text-[11px] leading-tight text-gris-txt">{fecha(seleccionado.createdAt)}</p>
            </div>
            <button type="button" aria-label="Cerrar" onClick={() => setAbierto(null)} className="grid h-7 w-7 shrink-0 place-items-center text-gris-txt-oscuro hover:text-azul-dark">
              <Icon icon="solar:close-linear" width={18} />
            </button>
          </div>

          {seleccionado.estado === 'listo' && (
            <p data-testid="comment-text" className="mt-3 whitespace-pre-wrap text-sm text-gris-txt-oscuro">
              {seleccionado.texto || (seleccionado.audioUrl ? 'Nota de voz sin texto.' : '')}
            </p>
          )}
          {enProceso(seleccionado) && !conProblema(seleccionado, fallos, enCurso) && (
            <div className="mt-3 text-sm">
              <p data-testid="comment-status" className="text-gris-txt-oscuro">
                Transcribiendo la nota de voz… {enCurso[seleccionado.id] ? `${segundos(seleccionado.id)} s` : ''}
              </p>
              {enCurso[seleccionado.id] && segundos(seleccionado.id) >= SEG_LENTO && (
                <div className="mt-1">
                  <p className="text-xs text-gris-txt">Tarda más de lo normal.</p>
                  {uid === seleccionado.autorId && (
                    <button
                      type="button"
                      data-testid="comment-retry"
                      onClick={() => reintentar(seleccionado)}
                      className="mt-2 rounded-lg border border-gris-line px-3 py-1 text-xs text-azul-dark hover:bg-azul-tint"
                    >
                      Reintentar
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
          {conProblema(seleccionado, fallos, enCurso) && (
            <div className="mt-3 text-sm">
              <p data-testid="comment-status" className="text-terracota">
                {fallos[seleccionado.id] ??
                  (atascado(seleccionado)
                    ? 'La transcripción no respondió a tiempo.'
                    : 'No se pudo transcribir el audio.')}
              </p>
              {seleccionado.errorMsg && !fallos[seleccionado.id] && (
                <p data-testid="comment-error-detail" className="mt-1 break-words text-[11px] text-gris-txt">{seleccionado.errorMsg}</p>
              )}
              {uid === seleccionado.autorId && (
                <button
                  type="button"
                  data-testid="comment-retry"
                  onClick={() => reintentar(seleccionado)}
                  disabled={busy}
                  className="mt-2 rounded-lg border border-gris-line px-3 py-1 text-xs text-azul-dark hover:bg-azul-tint disabled:opacity-50"
                >
                  Reintentar
                </button>
              )}
            </div>
          )}

          {seleccionado.audioUrl && (
            <audio
              data-testid="comment-audio"
              controls
              preload="none"
              src={seleccionado.audioUrl}
              className="mt-3 h-9 w-full"
            />
          )}

          {uid === seleccionado.autorId && (
            <button
              type="button"
              data-testid="comment-delete"
              aria-label="Borrar comentario"
              title="Borrar comentario"
              onClick={() => borrar(seleccionado)}
              disabled={busy}
              className="absolute bottom-2 right-2 grid h-8 w-8 place-items-center rounded-lg text-terracota opacity-0 transition-opacity hover:bg-azul-tint focus-visible:opacity-100 group-hover:opacity-100 disabled:opacity-40 [@media(hover:none)]:opacity-100"
            >
              <Icon icon="solar:trash-bin-minimalistic-linear" width={18} />
            </button>
          )}
        </div>
      )}

      {borrador && (
        <div
          data-testid="comment-composer"
          role="dialog"
          aria-label="Nuevo comentario"
          onClick={(e) => e.stopPropagation()}
          style={{ left: `${borrador.x * 100}%`, top: `${borrador.y * 100}%` }}
          className="pointer-events-auto absolute z-20 w-64 max-w-[80vw] -translate-x-1/2 rounded-xl border border-gris-line bg-white p-4 shadow-xl"
        >
          {grabando ? (
            <GrabadorVoz
              onListo={guardarVoz}
              onCancelar={() => setGrabando(false)}
              onError={(m) => setError(m)}
            />
          ) : (
            <label className="block text-sm text-gris-txt-oscuro">
              Comentario
              <textarea
                data-testid="comment-text-input"
                value={texto}
                maxLength={TEXTO_MAX}
                onChange={(e) => setTexto(e.target.value)}
                rows={3}
                autoFocus
                className="mt-1 w-full resize-none rounded-lg border border-gris-line bg-white p-2 text-sm text-azul-dark focus:border-azul focus:outline-none"
              />
            </label>
          )}

          <div className="mt-3 flex items-center justify-end gap-2">
            {!grabando && (
              <button
                type="button"
                data-testid="comment-record"
                aria-label="Grabar nota de voz"
                title="Grabar nota de voz"
                onClick={() => {
                  setError(null);
                  setGrabando(true);
                }}
                disabled={busy}
                className="mr-auto grid h-9 w-9 place-items-center rounded-full border border-gris-line text-azul-dark hover:bg-azul-tint disabled:opacity-50"
              >
                <Icon icon="solar:microphone-linear" width={18} />
              </button>
            )}
            {!grabando && (
              <>
                <button
                  type="button"
                  data-testid="comment-cancel"
                  onClick={() => {
                    setBorrador(null);
                    onSalirModo();
                  }}
                  disabled={busy}
                  className="rounded-lg border border-gris-line px-3 py-1.5 text-sm text-azul-dark hover:bg-azul-tint"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  data-testid="comment-save"
                  onClick={guardar}
                  disabled={busy || texto.trim().length === 0}
                  className="rounded-lg bg-azul px-3 py-1.5 text-sm text-white shadow hover:bg-azul-mid disabled:opacity-50"
                >
                  {busy ? 'Guardando…' : 'Guardar'}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {error && (
        <p role="alert" data-testid="comment-error" className="pointer-events-auto absolute bottom-3 left-1/2 -translate-x-1/2 rounded-lg bg-white px-3 py-2 text-xs text-terracota shadow">
          {error}
        </p>
      )}
    </div>
  );
}
