import { useCallback, useEffect, useMemo, useRef, useState, type AnimationEvent, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react';
import { Icon } from '@iconify/react';
import { useMediaQuery } from '../lib/useMediaQuery';
import { playFlipSound } from '../lib/sound';

type Spread = [string | null, string | null];
type Flip = 'next' | 'prev' | null;

const FLIP_MS = 800;
const SLOW_MS = 1150; // portada y contraportada: más lento y el libro se desplaza
const EASE = 'cubic-bezier(0.645, 0.045, 0.355, 1)';

/**
 * Escritorio:
 *  - Estado inicial: solo la portada a la derecha (el libro se muestra centrado).
 *  - Páginas interiores en pares.
 *  - Estado final: solo la contraportada a la izquierda (libro cerrado, centrado).
 */
function buildSpreads(pages: string[]): Spread[] {
  if (pages.length === 0) return [];
  const portada = pages[0];
  const contra = pages.length >= 2 ? pages[pages.length - 1] : null;
  const interior: (string | null)[] = pages.slice(1, contra ? -1 : undefined);
  if (interior.length % 2) interior.push(null); // página en blanco para cerrar pares

  const out: Spread[] = [[null, portada]];
  for (let i = 0; i < interior.length; i += 2) out.push([interior[i], interior[i + 1]]);
  if (contra) out.push([contra, null]);
  return out;
}

function Paper({ src }: { src: string | null }) {
  return (
    <div className={`relative h-full w-full overflow-hidden ${src ? 'bg-paper-bg' : ''}`}>
      {src && <img src={src} alt="" draggable={false} className="h-full w-full select-none object-contain" />}
    </div>
  );
}

// Hoja que gira. Frente = página que se levanta, reverso = página que queda debajo.
function Leaf({
  front,
  back,
  className,
  style,
  ms,
  onEnd,
}: {
  front: string | null;
  back: string | null;
  className: string;
  style: CSSProperties;
  ms: number;
  onEnd: (e: AnimationEvent<HTMLDivElement>) => void;
}) {
  const shade: CSSProperties = { animation: `leafShade ${ms}ms ease forwards` };
  return (
    <div className={`absolute z-20 ${className}`} style={{ transformStyle: 'preserve-3d', ...style }} onAnimationEnd={onEnd}>
      <div className="absolute inset-0" style={{ backfaceVisibility: 'hidden' }}>
        <Paper src={front} />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-l from-black/10 to-transparent" />
        <div className="pointer-events-none absolute inset-0 bg-black" style={shade} />
      </div>
      <div className="absolute inset-0" style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
        <Paper src={back} />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black/10 to-transparent" />
        <div className="pointer-events-none absolute inset-0 bg-black" style={shade} />
      </div>
    </div>
  );
}

/**
 * Calcula el tamaño del libro a partir de la proporción de sus páginas (ancho / alto).
 * El libro ocupa el máximo espacio disponible sin deformarse ni salirse de la pantalla.
 * En escritorio se muestran dos páginas (una doble), en móvil una sola.
 */
function bookSize(ratio: number, pagesAcross: number, maxVh: string, maxVw: string, maxPx: number) {
  const totalRatio = ratio * pagesAcross;
  const height = `min(${maxVh}, ${maxPx}px, calc(min(${maxVw}, ${maxPx * 1.5}px) / ${totalRatio.toFixed(4)}))`;
  return { height, width: `calc(${totalRatio.toFixed(4)} * ${height})` };
}

export function BookViewer({ pages, ratio, muted }: { pages: string[]; ratio: number; muted: boolean }) {
  const isDesktop = useMediaQuery('(min-width: 768px)');
  const safeRatio = ratio > 0 ? ratio : 0.7071;
  const spreads = useMemo(() => buildSpreads(pages), [pages]);
  // En móvil cada unidad es una sola página: [null, página]
  const singles = useMemo<Spread[]>(() => pages.map((p) => [null, p]), [pages]);
  const units = isDesktop ? spreads : singles;
  const count = units.length;

  const [idx, setIdx] = useState(0);
  const [flip, setFlip] = useState<Flip>(null);

  useEffect(() => {
    setIdx(0);
    setFlip(null);
  }, [pages]);

  useEffect(() => {
    setIdx((i) => Math.min(i, Math.max(0, count - 1)));
    setFlip(null);
  }, [count]);

  const cur = units[idx] ?? [null, null];
  const prevU = units[idx - 1];
  const nextU = units[idx + 1];
  const canNext = idx < count - 1 && flip === null;
  const canPrev = idx > 0 && flip === null;

  // Apertura y cierre del libro: giro más lento
  const slow = flip !== null && (flip === 'next' ? idx === 0 || idx + 1 === count - 1 : idx === count - 1 || idx - 1 === 0);
  const ms = isDesktop && slow ? SLOW_MS : FLIP_MS;

  // Posición visual del libro: cerrado por delante → centrado en la portada; cerrado por detrás → centrado en la contraportada
  const visual = flip === 'next' ? idx + 1 : flip === 'prev' ? idx - 1 : idx;
  const shift = visual === 0 ? '-25%' : visual === count - 1 ? '25%' : '0%';

  const goNext = useCallback(() => {
    if (!canNext) return;
    if (!muted) playFlipSound();
    setFlip('next');
  }, [canNext, muted]);

  const goPrev = useCallback(() => {
    if (!canPrev) return;
    if (!muted) playFlipSound();
    if (isDesktop) setFlip('prev');
    else setIdx((i) => i - 1);
  }, [canPrev, muted, isDesktop]);

  // Fin de la animación de la hoja: confirmar el cambio de página
  const onLeafEnd = (e: AnimationEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return;
    if (flip === 'next') setIdx((i) => i + 1);
    if (flip === 'prev') setIdx((i) => i - 1);
    setFlip(null);
  };

  // Teclado
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') goNext();
      if (e.key === 'ArrowLeft') goPrev();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [goNext, goPrev]);

  // Deslizar (móvil)
  const startX = useRef<number | null>(null);
  const onDown = (e: ReactPointerEvent) => {
    startX.current = e.clientX;
  };
  const onUp = (e: ReactPointerEvent) => {
    if (startX.current === null) return;
    const dx = e.clientX - startX.current;
    startX.current = null;
    if (Math.abs(dx) > 40) {
      if (dx < 0) goNext();
      else goPrev();
    }
  };

  const desktop = bookSize(safeRatio, 2, '74vh', '94vw', 720);
  const mobile = bookSize(safeRatio, 1, '72vh', '94vw', 820);

  const anim = (name: 'flipNext' | 'flipPrev', origin: string): CSSProperties => ({
    transformOrigin: origin,
    animation: `${name} ${ms}ms ${EASE} forwards`,
  });

  // Escritorio: lo que se ve en cada mitad (en reposo y durante el giro)
  const leftSrc = flip === 'prev' ? prevU?.[0] ?? null : cur[0];
  const rightSrc = flip === 'next' ? nextU?.[1] ?? null : cur[1];
  const leftOn = leftSrc !== null || flip !== null;
  const rightOn = rightSrc !== null || flip !== null;
  const both = leftOn && rightOn;

  return (
    <div className="flex w-full flex-col items-center">
      {isDesktop ? (
        <div
          className="relative mx-auto"
          style={{
            ...desktop,
            perspective: '2400px',
            transform: `translateX(${shift})`,
            transition: `transform ${ms}ms ${EASE}`,
          }}
        >
          <div className={`absolute inset-0 flex ${both ? 'shadow-book' : ''}`}>
            <div className={`relative h-full w-1/2 ${leftOn ? '' : 'opacity-0'} ${!both && leftOn ? 'shadow-book' : ''}`}>
              <Paper src={leftSrc} />
            </div>
            <div className={`relative h-full w-1/2 ${rightOn ? '' : 'opacity-0'} ${!both && rightOn ? 'shadow-book' : ''}`}>
              <Paper src={rightSrc} />
            </div>
          </div>
          {both && <div className="pointer-events-none absolute inset-y-0 left-1/2 z-10 w-8 -translate-x-1/2 bg-gradient-to-r from-transparent via-black/10 to-transparent" />}

          {/* Sombra sobre la página de debajo mientras se levanta la hoja */}
          {flip === 'next' && (
            <div
              className="pointer-events-none absolute inset-y-0 left-1/2 z-[5] w-1/2 bg-gradient-to-r from-black/35 to-transparent"
              style={{ animation: `shadeUnder ${ms}ms ease forwards` }}
            />
          )}
          {flip === 'prev' && (
            <div
              className="pointer-events-none absolute inset-y-0 left-0 z-[5] w-1/2 bg-gradient-to-l from-black/35 to-transparent"
              style={{ animation: `shadeUnder ${ms}ms ease forwards` }}
            />
          )}

          {/* Página nueva que aparece desde el lomo cuando la hoja se recoge */}
          {flip === 'next' && (
            <div
              className="absolute inset-y-0 left-0 z-[6] w-1/2"
              style={{ transformOrigin: 'right center', animation: `revealNext ${ms}ms ${EASE} forwards` }}
            >
              <Paper src={nextU?.[0] ?? null} />
            </div>
          )}
          {flip === 'prev' && (
            <div
              className="absolute inset-y-0 right-0 z-[6] w-1/2"
              style={{ transformOrigin: 'left center', animation: `revealPrev ${ms}ms ${EASE} forwards` }}
            >
              <Paper src={prevU?.[1] ?? null} />
            </div>
          )}

          {flip === 'next' && (
            <Leaf
              key={`next-${idx}`}
              className="right-0 top-0 h-full w-1/2"
              front={cur[1]}
              back={nextU?.[0] ?? null}
              style={anim('flipNext', 'left center')}
              ms={ms}
              onEnd={onLeafEnd}
            />
          )}
          {flip === 'prev' && (
            <Leaf
              key={`prev-${idx}`}
              className="left-0 top-0 h-full w-1/2"
              front={cur[0]}
              back={prevU?.[1] ?? null}
              style={anim('flipPrev', 'right center')}
              ms={ms}
              onEnd={onLeafEnd}
            />
          )}
        </div>
      ) : (
        <div
          className="relative mx-auto touch-pan-y"
          style={{ ...mobile, perspective: '2000px' }}
          onPointerDown={onDown}
          onPointerUp={onUp}
        >
          <div className="shadow-book absolute inset-0">
            <Paper src={flip === 'next' ? nextU?.[1] ?? null : cur[1]} />
          </div>
          {flip === 'next' && (
            <Leaf
              key={`next-${idx}`}
              className="inset-0"
              front={cur[1]}
              back={nextU?.[1] ?? null}
              style={anim('flipNext', 'left center')}
              ms={FLIP_MS}
              onEnd={onLeafEnd}
            />
          )}
        </div>
      )}

      <div className="mt-8 flex items-center gap-5">
        <button
          onClick={goPrev}
          disabled={!canPrev}
          aria-label="Página anterior"
          className="grid h-11 w-11 place-items-center rounded-full bg-white text-azul-dark shadow hover:bg-azul-tint disabled:opacity-40"
        >
          <Icon icon="solar:alt-arrow-left-linear" width={22} />
        </button>
        <span className="min-w-[70px] text-center font-label text-xs tracking-[0.16em] text-gris-txt-oscuro tnum">
          {idx + 1} / {count}
        </span>
        <button
          onClick={goNext}
          disabled={!canNext}
          aria-label="Página siguiente"
          className="grid h-11 w-11 place-items-center rounded-full bg-white text-azul-dark shadow hover:bg-azul-tint disabled:opacity-40"
        >
          <Icon icon="solar:alt-arrow-right-linear" width={22} />
        </button>
      </div>
      {!isDesktop && <p className="mt-3 text-sm text-gris-txt">Desliza para pasar la página</p>}
    </div>
  );
}
