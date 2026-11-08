import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { layoutHorizontal, type Lane, type Pin, type PlacedPin } from '../lib/masonryLayout';

// Los tipos siguen disponibles desde este módulo para no cambiar los consumidores.
export type { Lane, Pin, PlacedPin } from '../lib/masonryLayout';

const BUFFER = 400; // px extra fuera de pantalla para evitar parpadeos al desplazar
const PAD = 16; // margen vertical para que el hover (elevación) no se corte

// Arrastre
const DRAG_THRESHOLD = 6; // px de movimiento con ratón/lápiz para empezar a arrastrar
const TOUCH_HOLD_MS = 260; // pulsación sostenida en táctil (así no choca con el scroll horizontal)
const TOUCH_SLOP = 10; // si el dedo se mueve antes de esa pulsación, es un scroll
const EDGE = 90; // px desde el borde visible donde empieza el auto-desplazamiento
const MAX_SPEED = 22; // px por frame

interface DragState {
  id: string;
  pointerId: number;
  touch: boolean;
  sx: number;
  sy: number;
  cx: number;
  cy: number;
  grabX: number; // offset del puntero dentro de la tarjeta
  grabY: number;
  active: boolean;
  ids: string[]; // orden en curso
  snapshot: string[]; // orden al empezar (para cancelar)
  raf: number;
  timer: number;
  touchBlock?: (e: TouchEvent) => void;
  listeners?: Array<[string, EventListener]>;
}

function captureRects(el: HTMLElement): Map<string, DOMRect> {
  const m = new Map<string, DOMRect>();
  el.querySelectorAll<HTMLElement>('[data-pin-id]').forEach((node) => {
    m.set(node.dataset.pinId as string, node.getBoundingClientRect());
  });
  return m;
}

// Zona central de cada tarjeta (25 % de margen) para no intercambiar al rozar los bordes.
function findTarget(lay: { lanes: Lane[] }, x: number, y: number, id: string): string | null {
  for (const lane of lay.lanes) {
    if (x < lane.x || x > lane.x + lane.width) continue;
    for (const p of lane.pins) {
      if (p.id === id) continue;
      const left = lane.x + (lane.width - p.dw) / 2;
      const ix = p.dw * 0.25;
      const iy = p.dh * 0.25;
      if (x >= left + ix && x <= left + p.dw - ix && y >= p.y + iy && y <= p.y + p.dh - iy) return p.id;
    }
  }
  return null;
}

export function HorizontalMasonry({
  pins,
  height,
  renderPin,
  exiting = false,
  intro = false,
  stagger = 1200,
  inset = 0,
  onMove,
  onDrop,
}: {
  pins: Pin[];
  height: number;
  inset?: number; // padding lateral (px) para alinear el primer y último manual con los textos; el scroll sigue a borde a borde
  renderPin: (p: PlacedPin) => ReactNode;
  exiting?: boolean; // salida: columnas de derecha a izquierda
  intro?: boolean; // entrada: columnas de izquierda a derecha
  stagger?: number;
  onMove?: (ids: string[]) => void; // durante el arrastre (orden en vivo)
  onDrop?: (ids: string[]) => void; // al soltar o al reordenar con teclado (orden final)
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const ghost = useRef<HTMLDivElement>(null);
  const [scrollX, setScrollX] = useState(0);
  const [viewW, setViewW] = useState(0);
  const [dragging, setDragging] = useState<{ id: string; pin: PlacedPin } | null>(null);

  const layout = useMemo(() => layoutHorizontal(pins, height), [pins, height]);

  // Refs para que los manejadores de puntero/rAF vean siempre los datos actuales sin re-suscribirse
  const layoutRef = useRef(layout);
  const pinsRef = useRef(pins);
  const cbRef = useRef({ onMove, onDrop });
  const drag = useRef<DragState | null>(null);
  const flip = useRef<Map<string, DOMRect> | null>(null);
  const focusId = useRef<string | null>(null);
  const suppressClickUntil = useRef(0);

  useLayoutEffect(() => {
    layoutRef.current = layout;
    pinsRef.current = pins;
    cbRef.current = { onMove, onDrop };
  });

  // Tras reordenar: animación FLIP (cada tarjeta vuela desde su posición anterior) y foco si se movió con teclado
  useLayoutEffect(() => {
    const el = scroller.current;
    if (!el) return;
    if (flip.current) {
      const prev = flip.current;
      flip.current = null;
      if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        el.querySelectorAll<HTMLElement>('[data-pin-id]').forEach((node) => {
          const before = prev.get(node.dataset.pinId as string);
          if (!before) return;
          const now = node.getBoundingClientRect();
          const dx = before.left - now.left;
          const dy = before.top - now.top;
          if (!dx && !dy) return;
          node.style.transition = 'none';
          node.style.transform = `translate(${dx}px, ${dy}px)`;
          void node.offsetWidth; // fuerza reflow para que la transición arranque desde la posición previa
          node.style.transition = 'transform 260ms cubic-bezier(0.16, 1, 0.3, 1)';
          node.style.transform = '';
        });
      }
    }
    if (focusId.current) {
      const node = el.querySelector<HTMLElement>(`[data-pin-id="${CSS.escape(focusId.current)}"] a`);
      focusId.current = null;
      node?.focus({ preventScroll: true });
    }
  }, [pins]);

  // Medir el ancho visible
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const measure = () => setViewW(el.clientWidth);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Rueda del ratón: el scroll vertical mueve la galería hacia los lados
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        e.preventDefault();
        el.scrollLeft += e.deltaY;
      }
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  // Si el componente desaparece en mitad de un arrastre, limpiar listeners
  useEffect(() => {
    return () => {
      if (drag.current) endDrag(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const speedFor = (dist: number) => Math.max(2, Math.round((dist / EDGE) * MAX_SPEED));

  // Bucle por frame mientras se arrastra: auto-scroll, posición de la tarjeta fantasma y detección de destino
  const tick = () => {
    const d = drag.current;
    const el = scroller.current;
    if (!d || !d.active || !el) return;
    const rect = el.getBoundingClientRect();

    const fromLeft = d.cx - rect.left;
    const fromRight = rect.right - d.cx;
    if (fromLeft < EDGE) el.scrollLeft -= speedFor(EDGE - fromLeft);
    else if (fromRight < EDGE) el.scrollLeft += speedFor(EDGE - fromRight);

    if (ghost.current) ghost.current.style.transform = `translate3d(${d.cx - d.grabX}px, ${d.cy - d.grabY}px, 0)`;

    const x = d.cx - rect.left + el.scrollLeft - inset;
    const y = d.cy - rect.top - PAD;
    const target = findTarget(layoutRef.current, x, y, d.id);
    if (target) {
      const from = d.ids.indexOf(d.id);
      const to = d.ids.indexOf(target);
      if (from !== -1 && to !== -1 && from !== to) {
        const next = d.ids.slice();
        next.splice(from, 1);
        next.splice(to, 0, d.id);
        d.ids = next;
        flip.current = captureRects(el);
        cbRef.current.onMove?.(next);
      }
    }
    d.raf = requestAnimationFrame(tick);
  };

  function removeListeners(d: DragState) {
    d.listeners?.forEach(([type, fn]) => window.removeEventListener(type, fn));
    d.listeners = undefined;
    if (d.touchBlock) window.removeEventListener('touchmove', d.touchBlock);
    d.touchBlock = undefined;
  }

  function endDrag(commit: boolean) {
    const d = drag.current;
    if (!d) return;
    drag.current = null;
    if (d.raf) cancelAnimationFrame(d.raf);
    if (d.timer) window.clearTimeout(d.timer);
    removeListeners(d);
    document.body.classList.remove('gbv-dragging');
    if (!d.active) return;

    suppressClickUntil.current = performance.now() + 400; // el click que sigue al soltar no debe abrir el manual
    setDragging(null);
    if (commit) {
      if (d.ids.join('|') !== d.snapshot.join('|')) cbRef.current.onDrop?.(d.ids);
    } else {
      cbRef.current.onMove?.(d.snapshot);
    }
  }

  function startDrag(d: DragState) {
    if (d.active) return;
    const placed = (() => {
      for (const lane of layoutRef.current.lanes) {
        for (const p of lane.pins) if (p.id === d.id) return p;
      }
      return null;
    })();
    if (!placed) return;
    d.active = true;
    d.ids = pinsRef.current.map((p) => p.id);
    if (d.touch && 'vibrate' in navigator) navigator.vibrate(10);

    // En táctil, bloquear el scroll del navegador mientras dura el arrastre
    d.touchBlock = (e: TouchEvent) => {
      if (e.cancelable) e.preventDefault();
    };
    window.addEventListener('touchmove', d.touchBlock, { passive: false });
    document.body.classList.add('gbv-dragging');

    setDragging({ id: d.id, pin: placed });
    d.raf = requestAnimationFrame(tick);
  }

  const onPinDown = (e: ReactPointerEvent<HTMLDivElement>, p: PlacedPin) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (drag.current) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const d: DragState = {
      id: p.id,
      pointerId: e.pointerId,
      touch: e.pointerType === 'touch',
      sx: e.clientX,
      sy: e.clientY,
      cx: e.clientX,
      cy: e.clientY,
      grabX: e.clientX - rect.left,
      grabY: e.clientY - rect.top,
      active: false,
      ids: [],
      snapshot: pinsRef.current.map((x) => x.id),
      raf: 0,
      timer: 0,
    };

    const onWinMove = (ev: Event) => {
      const pe = ev as PointerEvent;
      if (pe.pointerId !== d.pointerId) return;
      d.cx = pe.clientX;
      d.cy = pe.clientY;
      if (d.active) return;
      const dist = Math.hypot(d.cx - d.sx, d.cy - d.sy);
      if (d.touch) {
        // Si el dedo se mueve antes de la pulsación, es un scroll: no arrastrar
        if (dist > TOUCH_SLOP && d.timer) {
          window.clearTimeout(d.timer);
          d.timer = 0;
        }
      } else if (dist > DRAG_THRESHOLD) {
        startDrag(d);
      }
    };
    const onWinUp = (ev: Event) => {
      if ((ev as PointerEvent).pointerId === d.pointerId) endDrag(true);
    };
    const onWinCancel = (ev: Event) => {
      if ((ev as PointerEvent).pointerId === d.pointerId) endDrag(false);
    };
    const onWinKey = (ev: Event) => {
      if ((ev as KeyboardEvent).key === 'Escape' && d.active) endDrag(false); // Esc revierte el orden
    };

    d.listeners = [
      ['pointermove', onWinMove],
      ['pointerup', onWinUp],
      ['pointercancel', onWinCancel],
      ['keydown', onWinKey],
    ];
    d.listeners.forEach(([type, fn]) => window.addEventListener(type, fn));

    if (d.touch) {
      d.timer = window.setTimeout(() => {
        d.timer = 0;
        if (drag.current === d) startDrag(d);
      }, TOUCH_HOLD_MS);
    }
    drag.current = d;
  };

  // Teclado: Alt + flechas mueve la tarjeta enfocada una posición
  const onPinKey = (e: ReactKeyboardEvent<HTMLDivElement>, id: string) => {
    if (!e.altKey) return;
    const delta =
      e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : 0;
    if (!delta) return;
    const order = pinsRef.current.map((p) => p.id);
    const from = order.indexOf(id);
    const to = from + delta;
    if (from === -1 || to < 0 || to >= order.length) return;
    e.preventDefault();
    const next = order.slice();
    next.splice(from, 1);
    next.splice(to, 0, id);
    if (scroller.current) flip.current = captureRects(scroller.current);
    focusId.current = id;
    cbRef.current.onMove?.(next);
    cbRef.current.onDrop?.(next);
  };

  // Renderizar solo las columnas visibles (virtualización horizontal)
  const visible = layout.lanes.filter(
    (lane) => lane.x + lane.width >= scrollX - BUFFER && lane.x <= scrollX + viewW + BUFFER
  );

  const total = layout.width || 1;
  const laneAnim = (lane: Lane): CSSProperties | undefined => {
    if (exiting) {
      const d = Math.round(((total - lane.x) / total) * stagger);
      return { animation: `pinOut 420ms cubic-bezier(0.4, 0, 0.2, 1) ${d}ms both` };
    }
    if (intro) {
      const d = Math.round((lane.x / total) * 700);
      return { animation: `pinIn 600ms cubic-bezier(0.16, 1, 0.3, 1) ${d}ms both` };
    }
    return undefined;
  };

  const ghostPin = dragging?.pin;

  return (
    <div
      ref={scroller}
      onScroll={(e) => setScrollX(e.currentTarget.scrollLeft)}
      onClickCapture={(e) => {
        // Tras arrastrar no debe abrirse el manual
        if (performance.now() < suppressClickUntil.current) {
          e.preventDefault();
          e.stopPropagation();
        }
      }}
      className="overflow-x-auto overflow-y-hidden"
      style={{ height: height + PAD * 2, paddingTop: PAD, paddingBottom: PAD, paddingLeft: inset, paddingRight: inset }}
    >
      <div className="relative" style={{ width: layout.width, height }}>
        {visible.map((lane) => (
          <div key={lane.x} className="absolute top-0" style={{ left: lane.x, width: lane.width, height, ...laneAnim(lane) }}>
            {lane.pins.map((p) => (
              <div
                key={p.id}
                data-pin-id={p.id}
                className="absolute select-none [-webkit-touch-callout:none] [touch-action:pan-x_pan-y]"
                style={{
                  top: p.y,
                  left: (lane.width - p.dw) / 2,
                  width: p.dw,
                  height: p.dh,
                  opacity: dragging?.id === p.id ? 0.25 : 1,
                  transition: 'opacity 150ms ease',
                  cursor: 'grab',
                }}
                onPointerDown={(e) => onPinDown(e, p)}
                onDragStart={(e) => e.preventDefault()}
                onKeyDown={(e) => onPinKey(e, p.id)}
              >
                {renderPin(p)}
              </div>
            ))}
          </div>
        ))}
      </div>

      {ghostPin &&
        createPortal(
          <div
            ref={ghost}
            aria-hidden
            className="pointer-events-none fixed left-0 top-0 z-[60]"
            style={{
              width: ghostPin.dw,
              height: ghostPin.dh,
              transform: drag.current
                ? `translate3d(${drag.current.cx - drag.current.grabX}px, ${drag.current.cy - drag.current.grabY}px, 0)`
                : undefined,
            }}
          >
            <div className="h-full w-full scale-[1.04] drop-shadow-[0_24px_30px_rgba(18,34,79,0.35)]">
              {renderPin({ ...ghostPin })}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
