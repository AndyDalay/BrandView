import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { CloseButton } from './ui/Button';
import { ThemeToggle } from './ThemeToggle';
import { guardarAjustes, useAjustes } from '../lib/ajustes';

// V1 — Configuración de la app: tema, notificaciones y volumen. Mismo modal en móvil, tablet y escritorio.
export function SettingsModal({ onClose }: { onClose: () => void }) {
  const ajustes = useAjustes();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return createPortal(
    <div
      data-testid="settings-modal"
      className="fixed inset-0 z-50 grid place-items-center bg-azul-dark/35 p-4 backdrop-blur-sm"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div role="dialog" aria-modal="true" aria-labelledby="settings-title" className="anim-in w-full max-w-md rounded-2xl bg-white p-s6 shadow-2xl">
        <div className="mb-s6 flex items-center justify-between">
          <h2 id="settings-title" className="font-display text-2xl text-azul-dark">Configuración</h2>
          <CloseButton onClick={onClose} data-testid="settings-close" />
        </div>

        <section className="flex flex-col gap-s6">
          <div className="flex items-center justify-between gap-s4">
            <span className="text-sm text-azul-dark">Modo oscuro</span>
            <ThemeToggle />
          </div>

          <div className="flex items-center justify-between gap-s4">
            <span className="text-sm text-azul-dark">Notificaciones</span>
            <button
              type="button"
              role="switch"
              aria-checked={ajustes.notificaciones}
              aria-label="Notificaciones"
              data-testid="notifications-switch"
              onClick={() => guardarAjustes({ notificaciones: !ajustes.notificaciones })}
              className={`relative flex h-8 w-16 shrink-0 items-center rounded-full border border-gris-line p-1 transition-colors ${
                ajustes.notificaciones ? 'bg-azul' : 'bg-azul-tint'
              }`}
            >
              <span
                aria-hidden
                className={`h-6 w-6 rounded-full bg-white shadow transition-transform duration-300 ease-out ${
                  ajustes.notificaciones ? 'translate-x-8' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between gap-s4">
            <span className="text-sm text-azul-dark">Mostrar anuncios</span>
            <button
              type="button"
              role="switch"
              aria-checked={ajustes.mostrarAnuncios}
              aria-label="Mostrar anuncios"
              data-testid="ads-switch"
              onClick={() => guardarAjustes({ mostrarAnuncios: !ajustes.mostrarAnuncios })}
              className={`relative flex h-8 w-16 shrink-0 items-center rounded-full border border-gris-line p-1 transition-colors ${
                ajustes.mostrarAnuncios ? 'bg-azul' : 'bg-azul-tint'
              }`}
            >
              <span
                aria-hidden
                className={`h-6 w-6 rounded-full bg-white shadow transition-transform duration-300 ease-out ${
                  ajustes.mostrarAnuncios ? 'translate-x-8' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <div className="flex flex-col gap-s2">
            <div className="flex items-center justify-between">
              <label htmlFor="volume-slider" className="text-sm text-azul-dark">Volumen</label>
              <output htmlFor="volume-slider" data-testid="volume-value" className="text-sm tabular-nums text-gris-txt-oscuro">
                {ajustes.volumen}%
              </output>
            </div>
            <input
              id="volume-slider"
              data-testid="volume-slider"
              type="range"
              min={0}
              max={200}
              step={1}
              value={ajustes.volumen}
              onChange={(e) => guardarAjustes({ volumen: Number(e.target.value) })}
              className="w-full accent-azul"
            />
          </div>
        </section>
      </div>
    </div>,
    document.body,
  );
}
