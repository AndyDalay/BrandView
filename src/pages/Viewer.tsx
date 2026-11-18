import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Header } from '../components/Header';
import { AdBanner } from '../components/AdBanner';
import { BookViewer } from '../components/BookViewer';
import { ActionsStagger } from '../components/ActionsStagger';
import { ManualLoader } from '../components/ManualLoader';
import { loadGallery, markSeen, type Gallery } from '../lib/gallery';
import { ShareModal } from '../components/ShareModal';
import { CommentLayer } from '../components/CommentLayer';
import { useTransition } from '../lib/useTransition';
import { useAjustes } from '../lib/ajustes';
import { TopInfoManual } from '../components/TopInfoManual';
import { anchoPagina, TABLET_QUERY } from '../lib/bookSize';
import { useMediaQuery } from '../lib/useMediaQuery';
import { IconButton } from '../components/ui/Button';

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
  const ajustes = useAjustes();
  const isDesktop = useMediaQuery('(min-width: 768px)');
  const lateral = useMediaQuery(TABLET_QUERY);
  const muted = ajustes.volumen === 0; // el volumen se ajusta en Configuración
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

  const ready = phase === 'ready';
  const enterCls = exiting ? 'anim-out' : 'anim-in';

  return (
    <div className="relative flex min-h-screen flex-col">
      <Header>
        {ready && (
          <ActionsStagger exiting={exiting}>
            {/* V6: atrás va a la izquierda de todas las acciones, solo icono */}
            <IconButton icono="solar:undo-left-round-linear" label="Volver a la biblioteca" onClick={() => go('/', 350)} data-testid="back-button" />
            {manual && (
              <IconButton
                icono="solar:chat-round-linear"
                label={colocando ? 'Salir del modo comentario' : 'Comentarios'}
                onClick={() => setColocando((c) => !c)}
                aria-pressed={colocando}
                data-testid="comment-toggle-button"
                className={colocando ? 'bg-azul text-white hover:bg-azul-mid' : ''}
              />
            )}
            {manual && (
              <IconButton icono="solar:share-linear" label="Compartir" onClick={() => setSharing(true)} data-testid="share-button" />
            )}
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
          {/* V11: el banner solo aparece si el usuario lo activa en Configuración */}
          {ajustes.mostrarAnuncios && (
            <div className="pt-4">
              <div className={enterCls} style={exiting ? undefined : { animationDelay: '120ms' }}>
                <AdBanner ads={data?.ads ?? []} />
              </div>
            </div>
          )}

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
                <TopInfoManual manual={manual} ancho={anchoPagina(manual.paginaW / manual.paginaH, isDesktop, lateral)} />
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
