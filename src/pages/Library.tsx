import { useCallback, useEffect, useMemo, useState } from 'react';
import { Icon } from '@iconify/react';
import { Header } from '../components/Header';
import { ActionsStagger } from '../components/ActionsStagger';
import { AddManualModal } from '../components/AddManualModal';
import { HorizontalMasonry, type Pin, type PlacedPin } from '../components/HorizontalMasonry';
import { deleteManual } from '../lib/db';
import { getOrden, hideManual, loadGallery, ordenar, saveOrden, type Gallery, type Manual } from '../lib/gallery';
import { useTransition } from '../lib/transition';

const PIN_EXIT_MS = 1400; // tiempo que tardan los manuales en caer + limpiar textos

function laneHeight() {
  return Math.max(280, Math.round(window.innerHeight * 0.67));
}

export function Library() {
  const { exiting, go } = useTransition();
  const [data, setData] = useState<Gallery | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lane, setLane] = useState(laneHeight);
  const [adding, setAdding] = useState(false);
  const [intro, setIntro] = useState(true);
  const [orden, setOrden] = useState<string[]>(getOrden);

  const reload = useCallback(() => {
    loadGallery()
      .then(setData)
      .catch((e: Error) => setError(e.message));
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  useEffect(() => {
    const onResize = () => setLane(laneHeight());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => setIntro(false), 1600);
    return () => window.clearTimeout(t);
  }, []);

  // Manuales en el orden que eligió el usuario arrastrando
  const manuales = useMemo(() => ordenar(data?.manuales ?? [], orden), [data, orden]);
  const byId = useMemo(() => new Map(manuales.map((m) => [m.id, m])), [manuales]);
  const pins: Pin[] = useMemo(() => manuales.map((m) => ({ id: m.id, w: m.portadaW, h: m.portadaH })), [manuales]);

  // En vivo mientras se arrastra (no se guarda hasta soltar)
  const handleMove = useCallback((ids: string[]) => setOrden(ids), []);
  const handleDrop = useCallback((ids: string[]) => {
    setOrden(ids);
    saveOrden(ids);
  }, []);

  const handleDelete = useCallback(
    async (m: Manual) => {
      const msg = m.local
        ? `¿Borrar «${m.nombre}»? Se eliminará de este navegador y no se puede deshacer.`
        : `¿Ocultar «${m.nombre}» de la galería?`;
      if (!window.confirm(msg)) return;
      try {
        if (m.local) await deleteManual(m.id);
        else hideManual(m.id);
        const next = orden.filter((id) => id !== m.id);
        setOrden(next);
        saveOrden(next);
        reload();
      } catch {
        setError('No se pudo borrar el manual.');
      }
    },
    [orden, reload]
  );

  const open = (m: Manual) => go(`/manual/${encodeURIComponent(m.id)}`, PIN_EXIT_MS);

  const textCls = exiting ? 'anim-out' : 'anim-in';
  const textDelay = exiting ? { animationDelay: '1100ms' } : { animationDelay: '150ms' };

  return (
    <>
      <Header>
        <ActionsStagger exiting={exiting}>
          <button
            onClick={() => setAdding(true)}
            className="flex items-center gap-2 rounded-lg bg-azul px-4 py-2 text-sm text-white shadow hover:bg-azul-mid"
          >
            <Icon icon="solar:add-circle-linear" width={20} />
            <span className="hidden sm:inline">Añadir manual</span>
          </button>
        </ActionsStagger>
      </Header>


      <main className="relative z-10 w-full px-5 py-10 md:px-10">
        <div className={textCls} style={textDelay}>
          <h1 className="font-display text-3xl text-azul-dark md:text-4xl">Manuales de marca</h1>
          <p className="mt-2 text-gris-txt-oscuro">
            Desliza hacia los lados o usa la rueda del ratón. Arrastra un manual para cambiar su orden.
          </p>

          {error && <p className="mt-8 text-terracota">{error}</p>}

          {data && data.manuales.length === 0 && (
            <p className="mt-8 rounded-lg border border-dashed border-gris-line bg-white/60 p-6 text-gris-txt-oscuro">
              No hay manuales todavía. Pulsa <strong>Añadir manual</strong> para subir un PDF o una carpeta.
            </p>
          )}
        </div>

        {pins.length > 0 && (
          <div className="mt-8">
            <HorizontalMasonry
              pins={pins}
              height={lane}
              exiting={exiting}
              intro={intro}
              onMove={handleMove}
              onDrop={handleDrop}
              renderPin={(p: PlacedPin) => (
                <PinCard
                  manual={byId.get(p.id) as Manual}
                  pin={p}
                  onOpen={open}
                  onDelete={handleDelete}
                />
              )}
            />
          </div>
        )}
      </main>

      {adding && (
        <AddManualModal
          onClose={() => setAdding(false)}
          onAdded={() => {
            setAdding(false);
            reload();
          }}
        />
      )}
    </>
  );
}

function PinCard({
  manual,
  pin,
  onOpen,
  onDelete,
}: {
  manual: Manual;
  pin: PlacedPin;
  onOpen: (m: Manual) => void;
  onDelete: (m: Manual) => void;
}) {
  return (
    <div className="group relative h-full w-full">
      <a
        href={`/manual/${encodeURIComponent(manual.id)}`}
        draggable={false}
        onClick={(e) => {
          e.preventDefault();
          onOpen(manual);
        }}
        className="block h-full w-full"
      >
        <div className="relative h-full w-full rounded-md transition-all duration-300 ease-out group-hover:-translate-y-2 group-hover:shadow-[0_22px_44px_-16px_rgba(18,34,79,0.55)]">
          <img
            src={manual.portada}
            alt={`Portada ${manual.nombre}`}
            width={pin.dw}
            height={pin.dh}
            loading="lazy"
            draggable={false}
            className="h-full w-full rounded-md bg-white object-cover"
          />

          {/* Degradado negro cenizo con grano: corto y translúcido, solo para que el texto blanco se lea */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-md opacity-0 transition-opacity duration-300 group-hover:opacity-100">
            <div className="absolute inset-x-0 bottom-0 h-[64px] bg-gradient-to-t from-[#14171C]/100 to-[#14171C]/40" />
            <div className="grain absolute inset-0" />
            <div className="absolute inset-x-0 bottom-0 p-3">
              <p className="font-display text-base text-white">{manual.nombre}</p>
              <p className="font-label text-[8px] tracking-[0.16em] text-white/80">{manual.paginas.length} PÁGINAS</p>
            </div>
          </div>

          {/* Punto azul brillante: manual subido y todavía no abierto */}
          {manual.nuevo && (
            <span className="pointer-events-none absolute right-2.5 top-2.5 z-10 h-3 w-3 animate-pulse rounded-full bg-azul shadow-[0_0_0_3px_rgb(255, 255, 255),0_0_14px_5px_rgb(34, 93, 255)]" />
          )}
        </div>
      </a>

      {/* Borrar: esquina superior derecha, pegada al borde; en táctil siempre visible */}
      <button
        type="button"
        title={manual.local ? 'Borrar manual' : 'Ocultar manual'}
        aria-label={`${manual.local ? 'Borrar' : 'Ocultar'} ${manual.nombre}`}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onDelete(manual);
        }}
        className="absolute right-0 top-0 z-20 grid h-9 w-9 place-items-center rounded-bl-xl rounded-tr-md bg-white text-terracota opacity-0 shadow-md transition-all duration-200 ease-out hover:bg-terracota hover:text-white focus-visible:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100"
      >
        <Icon icon="solar:trash-bin-minimalistic-linear" width={18} />
      </button>
    </div>
  );
}
