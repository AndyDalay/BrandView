import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { Header } from '../components/Header';
import { AdBanner } from '../components/AdBanner';
import { BookViewer } from '../components/BookViewer';
import { ActionsStagger } from '../components/ActionsStagger';
import { ManualLoader } from '../components/ManualLoader';
import { loadGallery, markSeen, type Gallery } from '../lib/gallery';
import { ShareModal } from '../components/ShareModal';
import { CommentLayer } from '../components/CommentLayer';
import { useTransition } from '../lib/useTransition';

const MIN_LOADER_MS = 2000;
const FADE_MS = 500;
const PRELOAD_TIMEOUT_MS = 5000;

function preloadImages(urls: string[]) {
  const load = Promise.all(
    urls.map(
      (u) =>
        new Promise<void>((resolve) => {
          const img = new Image();
          img.onload = () => resolve();
          img.onerror = () => resolve();
          img.src = u;
        })
    )
  );
  const timeout = new Promise<void>((resolve) => {
    window.setTimeout(resolve, PRELOAD_TIMEOUT_MS);
  });
  return Promise.race([load, timeout]);
}

export function Viewer() {
  const { id } = useParams();
  const { exiting, go } = useTransition();
  const [data, setData] = useState<Gallery | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [colocando, setColocando] = useState(false); // modo comentar: un clic en el libro añade un comentario
  const [phase, setPhase] = useState<'loading' | 'fading' | 'ready'>('loading');

  useEffect(() => {
    loadGallery()
      .then(setData)
      .catch((e: Error) => {
        setError(e.message);
        setPhase('ready');
      });
  }, []);

  // Precarga anuncio y páginas mientras se muestra el gif (mínimo 2 s)
  useEffect(() => {
    if (!data) return;
    let cancelled = false;
    const m = data.manuales.find((x) => x.id === id);
    const urls = [...(m ? m.paginas : []), ...data.ads];
    const minWait = new Promise((r) => window.setTimeout(r, MIN_LOADER_MS));

    Promise.all([preloadImages(urls), minWait]).then(() => {
      if (cancelled) return;
      setPhase('fading');
      window.setTimeout(() => {
        if (cancelled) return;
        if (m) markSeen(m.id);
        setPhase('ready');
      }, FADE_MS);
    });

    return () => {
      cancelled = true;
    };
  }, [data, id]);

  const manual = data?.manuales.find((m) => m.id === id);

  const btn = 'grid h-10 w-10 place-items-center rounded-lg text-gris-txt-oscuro hover:bg-azul-tint';
  const ready = phase === 'ready';
  const enterCls = exiting ? 'anim-out' : 'anim-in';

  return (
    <div className="relative flex min-h-screen flex-col">
      <Header>
        {ready && (
          <ActionsStagger exiting={exiting}>
            {manual && (
              <button
                onClick={() => setColocando((c) => !c)}
                aria-label="Comentarios"
                aria-pressed={colocando}
                title={colocando ? 'Salir del modo comentario' : 'Comentarios'}
                data-testid="comment-toggle-button"
                className={`${btn} ${colocando ? 'bg-azul text-white hover:bg-azul-mid' : ''}`}
              >
                <Icon icon="solar:chat-round-linear" width={22} />
              </button>
            )}
            {manual && (
              <button onClick={() => setSharing(true)} aria-label="Compartir" title="Compartir" data-testid="share-button" className={btn}>
                <Icon icon="solar:share-linear" width={22} />
              </button>
            )}
            <button onClick={() => setMuted((m) => !m)} aria-label={muted ? 'Activar sonido' : 'Silenciar'} data-testid="sound-toggle" className={btn}>
              <Icon icon={muted ? 'solar:volume-cross-linear' : 'solar:volume-loud-linear'} width={22} />
            </button>
            <button
              onClick={() => go('/', 350)}
              data-testid="back-button"
              className="ml-2 flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-gris-txt-oscuro hover:bg-azul-tint"
            >
              <Icon icon="solar:arrow-left-linear" width={20} />
              <span className="hidden sm:inline">Biblioteca</span>
            </button>
          </ActionsStagger>
        )}
      </Header>

      {sharing && manual && <ShareModal manual={manual} onClose={() => setSharing(false)} />}

      {!ready ? (
        <div className="flex flex-1 flex-col">
          <ManualLoader fading={phase === 'fading'} />
        </div>
      ) : (
        <>
          <div className="pt-4">
            <div className={enterCls} style={exiting ? undefined : { animationDelay: '120ms' }}>
              <AdBanner ads={data?.ads ?? []} />
            </div>
          </div>

          <div className="flex flex-1 flex-col items-center justify-center px-2 py-6">
            {error && <p className="text-terracota">{error}</p>}
            {data && !manual && !error && <p className="text-gris-txt-oscuro">Manual no encontrado.</p>}
            {manual && (
              <>
                <h1
                  className={`mb-6 font-display text-2xl text-azul-dark ${enterCls}`}
                  style={exiting ? undefined : { animationDelay: '200ms' }}
                >
                  {manual.nombre}
                </h1>
                <div className={`relative ${enterCls}`} style={exiting ? undefined : { animationDelay: '320ms' }}>
                  <BookViewer pages={manual.paginas} ratio={manual.paginaW / manual.paginaH} muted={muted} />
                  {manual && (
                    <CommentLayer manualId={manual.id} modo={colocando} onSalirModo={() => setColocando(false)} />
                  )}
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
