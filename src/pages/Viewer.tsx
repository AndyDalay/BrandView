import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Icon } from '@iconify/react';
import { Header } from '../components/Header';
import { AdBanner } from '../components/AdBanner';
import { BookViewer } from '../components/BookViewer';
import { ActionsStagger } from '../components/ActionsStagger';
import { ManualLoader } from '../components/ManualLoader';
import { loadGallery, markSeen, type Gallery } from '../lib/gallery';
import { useTransition } from '../lib/transition';

const MIN_LOADER_MS = 2000;
const FADE_MS = 500;

function preloadImages(urls: string[]) {
  return Promise.all(
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
}

export function Viewer() {
  const { id } = useParams();
  const { exiting, go } = useTransition();
  const [data, setData] = useState<Gallery | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);
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

  const toggleFullscreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void document.documentElement.requestFullscreen?.();
  };

  const btn = 'grid h-10 w-10 place-items-center rounded-lg text-gris-txt-oscuro hover:bg-azul-tint';
  const ready = phase === 'ready';
  const enterCls = exiting ? 'anim-out' : 'anim-in';

  return (
    <div className="relative flex min-h-screen flex-col">
      <Header>
        {ready && (
          <ActionsStagger exiting={exiting}>
            <button onClick={() => setMuted((m) => !m)} aria-label={muted ? 'Activar sonido' : 'Silenciar'} className={btn}>
              <Icon icon={muted ? 'solar:volume-cross-linear' : 'solar:volume-loud-linear'} width={22} />
            </button>
            <button onClick={toggleFullscreen} aria-label="Pantalla completa" className={btn}>
              <Icon icon="solar:maximize-linear" width={22} />
            </button>
            <button
              onClick={() => go('/', 350)}
              className="ml-2 flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-gris-txt-oscuro hover:bg-azul-tint"
            >
              <Icon icon="solar:arrow-left-linear" width={20} />
              <span className="hidden sm:inline">Biblioteca</span>
            </button>
          </ActionsStagger>
        )}
      </Header>

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
                <div className={enterCls} style={exiting ? undefined : { animationDelay: '320ms' }}>
                  <BookViewer pages={manual.paginas} ratio={manual.paginaW / manual.paginaH} muted={muted} />
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
