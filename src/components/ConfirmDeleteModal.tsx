import { useEffect } from 'react';
import { Icon } from '@iconify/react';

// Confirmación de borrado (local) u ocultado (manual de la galería base).
// Mismo lenguaje visual que ShareModal y AddManualModal.
export type TipoBorrado = 'local' | 'remoto' | 'base';

export function ConfirmDeleteModal({
  nombre,
  tipo,
  busy,
  onCancel,
  onConfirm,
}: {
  nombre: string;
  tipo: TipoBorrado;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [busy, onCancel]);

  return (
    <div
      data-testid="delete-confirm-modal"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="delete-confirm-title"
      aria-describedby="delete-confirm-desc"
      className="fixed inset-0 z-50 grid place-items-center bg-azul-dark/35 p-4 backdrop-blur-sm"
      onMouseDown={(e) => e.target === e.currentTarget && !busy && onCancel()}
    >
      <div className="anim-in w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <h2 id="delete-confirm-title" className="font-display text-2xl text-azul-dark">
          {tipo === 'base' ? 'Ocultar manual' : 'Borrar manual'}
        </h2>
        <p id="delete-confirm-desc" className="mt-3 text-sm text-gris-txt-oscuro">
          {tipo === 'local' && <>¿Borrar «<strong>{nombre}</strong>»? Se eliminará de este navegador y no se puede deshacer.</>}
          {tipo === 'remoto' && <>¿Borrar «<strong>{nombre}</strong>» de la galería compartida? Se eliminará de la base de datos para todos y no se puede deshacer.</>}
          {tipo === 'base' && <>¿Ocultar «<strong>{nombre}</strong>» de la galería? Podrás restaurarlo borrando la clave <code>gbv-ocultos</code> del almacenamiento del navegador.</>}
        </p>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            data-testid="delete-confirm-cancel"
            onClick={onCancel}
            disabled={busy}
            className="rounded-lg border border-gris-line bg-white px-4 py-2 text-sm text-azul-dark hover:bg-azul-tint disabled:opacity-40"
          >
            Cancelar
          </button>
          <button
            type="button"
            data-testid="delete-confirm-ok"
            onClick={onConfirm}
            disabled={busy}
            className="flex items-center gap-2 rounded-lg bg-terracota px-4 py-2 text-sm text-white shadow hover:opacity-90 disabled:opacity-50"
          >
            <Icon icon="solar:trash-bin-minimalistic-linear" width={18} />
            {busy ? 'Procesando…' : tipo === 'base' ? 'Ocultar' : 'Borrar'}
          </button>
        </div>
      </div>
    </div>
  );
}
