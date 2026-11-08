import { useCallback, useEffect, useMemo, useRef, useState, type AnimationEvent, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react';
import { Icon } from '@iconify/react';
import { useMediaQuery } from '../lib/useMediaQuery';
import { playFlipSound } from '../lib/sound';

type Spread = [string | null, string | null];
type Flip = 'next' | 'prev' | null;

const FLIP_MS = 800;
const SLOW_MS = 1150;
const HOLD_DELAY_MS = 350; // tiempo pulsado antes de empezar a pasar páginas
const HOLD_RAMP_MS = 1500; // tras este tiempo pulsado, el giro se acelera
const HOLD_FAST_MS = 360;
const HOLD_FASTEST_MS = 240; // portada y contraportada: más lento y el libro se desplaza
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
  // Si las páginas interiores son impares, la contraportada ocupa el hueco de la última doble página
  if (interior.length % 2) interior.push(contra);

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
  onEnd,
}: {
  front: string | null;
  back: string | null;
  className: string;
  style: CSSProperties;
  onEnd: (e: AnimationEvent<HTMLDivElement>) => void;
}) {
  return (
    <div className={`absolute z-20 ${className}`} style={{ transformStyle: 'preserve-3d', ...style }} onAnimationEnd={onEnd}>
      <div className="absolute inset-0" style={{ backfaceVisibility: 'hidden' }}>
        <Paper src={front} />
      </div>
      <div className="absolute inset-0" style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
        <Paper src={back} />
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
  const [flipMs, setFlipMs] = useState(FLIP_MS);
  const [holdDir, setHoldDir] = useState<'next' | 'prev' | null>(null);
  const [holdFast, setHoldFast] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const holdTimer = useRef<number | null>(null);
  const heldRef = useRef(false); // evita que el clic que sigue a mantener pulsado pase otra página

  // Duración de cada giro: portada/contraportada lentas; mientras se mantiene pulsado, más rápidas
  const durationFor = useCallback(
    (dir: 'next' | 'prev') => {
      if (isDesktop) {
        const isSlow = dir === 'next' ? idx === 0 || idx + 1 === count - 1 : idx === count - 1 || idx - 1 === 0;
        if (isSlow) return SLOW_MS;
      }
      if (holdDir) return holdFast ? HOLD_FASTEST_MS : HOLD_FAST_MS;
      return FLIP_MS;
    },
    [isDesktop, idx, count, holdDir, holdFast]
  );

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
  const ms = flip !== null ? flipMs : FLIP_MS;

  // Posición visual del libro: cerrado por delante → centrado en la portada; cerrado por detrás → centrado en la contraportada
  const visual = flip === 'next' ? idx + 1 : flip === 'prev' ? idx - 1 : idx;
  const shift = visual === 0 ? '-25%' : visual === count - 1 ? '25%' : '0%';

  const goNext = useCallback(() => {
    if (!canNext) return;
    if (!muted) playFlipSound();
    setFlipMs(durationFor('next'));
    setFlip('next');
  }, [canNext, muted, durationFor]);

  const goPrev = useCallback(() => {
    if (!canPrev) return;
    if (!muted) playFlipSound();
    if (isDesktop) {
      setFlipMs(durationFor('prev'));
      setFlip('prev');
    } else setIdx((i) => i - 1);
  }, [canPrev, muted, isDesktop, durationFor]);

  // Mantener pulsado: al cumplir el tiempo, pasa páginas al terminar cada giro
  useEffect(() => {
    if (!holdDir) {
      setHoldFast(false);
      return;
    }
    const t = window.setTimeout(() => setHoldFast(true), HOLD_RAMP_MS);
    return () => window.clearTimeout(t);
  }, [holdDir]);

  useEffect(() => {
    if (!holdDir || flip !== null) return;
    const pause = isDesktop ? 40 : holdFast ? 180 : 320; // en móvil no hay giro: la pausa marca el ritmo
    const t = window.setTimeout(() => {
      if (holdDir === 'next') goNext();
      else goPrev();
    }, pause);
    return () => window.clearTimeout(t);
  }, [holdDir, flip, idx, holdFast, isDesktop, goNext, goPrev]);

  const stopHold = useCallback(() => {
    if (holdTimer.current !== null) {
      window.clearTimeout(holdTimer.current);
      holdTimer.current = null;
    }
    setHoldDir(null);
  }, []);

  const startHold = (dir: 'next' | 'prev') => (e: ReactPointerEvent) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    heldRef.current = false;
    holdTimer.current = window.setTimeout(() => {
      holdTimer.current = null;
      heldRef.current = true;
      setHoldDir(dir);
    }, HOLD_DELAY_MS);
  };

  const clickPrev = () => {
    if (heldRef.current) {
      heldRef.current = false;
      return;
    }
    goPrev();
  };
  const clickNext = () => {
    if (heldRef.current) {
      heldRef.current = false;
      return;
    }
    goNext();
  };

  // Número de página editable: tocar "3 / 8" permite escribir la página
  const startEdit = () => {
    if (flip !== null) return;
    setDraft(String(idx + 1));
    setEditing(true);
  };
  const commitEdit = () => {
    const n = Number.parseInt(draft, 10);
    if (Number.isFinite(n)) setIdx(Math.min(Math.max(1, n), count) - 1);
    setEditing(false);
  };

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
      if ((e.target as HTMLElement | null)?.tagName === 'INPUT') return;
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
  // Franja central y sombras solo cuando hay una página real en cada lado (no durante aperturas/cierres vacíos)
  const rightPaper = rightSrc !== null;

  // Solo los giros que tocan la portada o la contraportada animan la sombra; los centrales la mantienen fija
  const targetIdx = flip === 'next' ? idx + 1 : flip === 'prev' ? idx - 1 : idx;
  const isEdgeFlip = flip !== null && (idx === 0 || idx === count - 1 || targetIdx === 0 || targetIdx === count - 1);

  // Sombra de la mitad derecha: en 'next' se desvanece en el primer 15 % del giro y reaparece en el último 5 %
  // (lo que llega a la derecha); en 'prev' no aparece hasta el último 5 %. Los extremos coinciden con el reposo.
  const rightShadowStyle = {
    '--shadow-start': (flip === 'next' ? cur[1] !== null : rightPaper) ? 1 : 0,
    '--shadow-end': (flip === 'next' ? nextU?.[1] : flip === 'prev' ? prevU?.[1] : cur[1]) ? 1 : 0,
    animation: isEdgeFlip
      ? flip === 'next'
        ? `shadowFadeOutNext ${ms}ms linear forwards`
        : `shadowFadeInPrev ${ms}ms linear forwards`
      : undefined,
    opacity: isEdgeFlip ? undefined : rightSrc !== null ? 1 : 0,
  } as CSSProperties;

  // Franja central (lomo): siempre montada. Si la página que llega tiene dos lados, aparece en el último
  // tramo del aterrizaje (80–88 %); si la que sale no los tenía, se desvanece al empezar el giro.
  const tgtUnit = units[targetIdx] ?? [null, null];
  const spineStart = cur[0] !== null && cur[1] !== null ? 1 : 0;
  const spineEnd = tgtUnit[0] !== null && tgtUnit[1] !== null ? 1 : 0;
  const spineChanges = flip !== null && isEdgeFlip && spineStart !== spineEnd;
  const spineStyle = {
    zIndex: flip !== null ? 30 : 10,
    '--shadow-start': spineStart,
    '--shadow-end': spineEnd,
    animation: spineChanges
      ? spineEnd > spineStart
        ? `shadowFadeInPrev ${ms}ms linear forwards`
        : `shadowFadeOutNext ${ms}ms linear forwards`
      : undefined,
    opacity: spineChanges ? undefined : spineStart,
  } as CSSProperties;

  // Sombra de la mitad izquierda: al avanzar aparece en el último 5 % del aterrizaje;
  // al retroceder se desvanece en el primer 15 % (igual que la derecha, pero en el lado opuesto)
  const has = (x: string | null | undefined) => (x ? 1 : 0);
  const leftShadowStyle = {
    '--shadow-start': has(cur[0]),
    '--shadow-end': has(flip === 'next' ? nextU?.[0] : flip === 'prev' ? prevU?.[0] : cur[0]),
    animation: isEdgeFlip
      ? flip === 'next'
        ? `shadowFadeInPrev ${ms}ms linear forwards`
        : `shadowFadeOutNext ${ms}ms linear forwards`
      : undefined,
    opacity: isEdgeFlip ? undefined : has(leftSrc),
  } as CSSProperties;

  return (
    <div data-testid="book-viewer" className="flex w-full flex-col items-center">
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
          <div className="absolute inset-0 flex">
            <div className={`relative h-full w-1/2 ${leftOn ? '' : 'opacity-0'}`}>
              <Paper src={leftSrc} />
            </div>
            <div className={`relative h-full w-1/2 ${rightPaper ? '' : 'opacity-0'}`}>
              <Paper src={rightSrc} />
            </div>
          </div>

          {/* Sombra de la hoja izquierda (se anima con el giro) */}
          <div aria-hidden className="shadow-book pointer-events-none absolute inset-y-0 left-0 w-1/2" style={leftShadowStyle} />

          {/* Sombra de la hoja derecha (se anima con el giro) */}
          <div aria-hidden className="shadow-book pointer-events-none absolute inset-y-0 right-0 w-1/2" style={rightShadowStyle} />

          {/* Sombra central: en reposo es fija; durante el giro se recoge hacia el centro
              cuando la hoja pasa el lomo y vuelve a expandirse por encima de la hoja al final */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 left-1/2 w-8 -translate-x-1/2 bg-gradient-to-r from-transparent via-black/10 to-transparent"
            style={spineStyle}
          />

          {/* Página nueva que aparece desde el lomo cuando la hoja se recoge */}
          {flip === 'next' && (
            <div
              className="absolute inset-y-0 left-0 z-[6] w-1/2"
              style={{ animation: `revealClipNext ${ms}ms ${EASE} forwards` }}
            >
              <Paper src={nextU?.[0] ?? null} />
            </div>
          )}
          {flip === 'prev' && (
            <div
              className="absolute inset-y-0 right-0 z-[6] w-1/2"
              style={{ animation: `revealClipPrev ${ms}ms ${EASE} forwards` }}
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
              onEnd={onLeafEnd}
            />
          )}
        </div>
      )}

      <div className="mt-8 flex items-center gap-5">
        <button
          onPointerDown={startHold('prev')}
          onPointerUp={stopHold}
          onPointerLeave={stopHold}
          onPointerCancel={stopHold}
          onClick={clickPrev}
          onContextMenu={(e) => e.preventDefault()}
          disabled={!canPrev}
          aria-label="Página anterior" data-testid="prev-page"
          className="grid h-11 w-11 place-items-center rounded-full bg-white text-azul-dark shadow hover:bg-azul-tint disabled:opacity-40"
        >
          <Icon icon="solar:alt-arrow-left-linear" width={22} />
        </button>
        {editing ? (
          <input
            data-testid="page-input"
            type="number"
            min={1}
            max={count}
            value={draft}
            autoFocus
            aria-label="Ir a la página"
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitEdit();
              if (e.key === 'Escape') setEditing(false);
            }}
            className="w-20 rounded-md border border-gris-line bg-white px-2 py-1 text-center font-label text-xs tracking-[0.16em] text-azul-dark tnum outline-none focus:border-azul"
          />
        ) : (
          <button
            type="button"
            data-testid="page-indicator"
            onClick={startEdit}
            aria-label="Ir a una página"
            title="Tocar para escribir la página"
            className="min-w-[70px] rounded-md px-2 py-1 text-center font-label text-xs tracking-[0.16em] text-gris-txt-oscuro hover:bg-azul-tint tnum"
          >
            {idx + 1} / {count}
          </button>
        )}
        <button
          onPointerDown={startHold('next')}
          onPointerUp={stopHold}
          onPointerLeave={stopHold}
          onPointerCancel={stopHold}
          onClick={clickNext}
          onContextMenu={(e) => e.preventDefault()}
          disabled={!canNext}
          aria-label="Página siguiente" data-testid="next-page"
          className="grid h-11 w-11 place-items-center rounded-full bg-white text-azul-dark shadow hover:bg-azul-tint disabled:opacity-40"
        >
          <Icon icon="solar:alt-arrow-right-linear" width={22} />
        </button>
      </div>
      {!isDesktop && <p className="mt-3 text-sm text-gris-txt">Desliza para pasar la página</p>}
    </div>
  );
}
