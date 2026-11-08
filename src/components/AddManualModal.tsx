import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { Icon } from '@iconify/react';
import { saveManual, type StoredManual } from '../lib/db';
import { manualFromFolder, manualFromPdf } from '../lib/manualBuilder';

export function AddManualModal({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
  const pdfRef = useRef<HTMLInputElement>(null);
  const dirRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Selector de carpeta (no soportado en el tipado de React)
  useEffect(() => {
    dirRef.current?.setAttribute('webkitdirectory', '');
    dirRef.current?.setAttribute('directory', '');
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [busy, onClose]);

  const run = async (fn: () => Promise<StoredManual>) => {
    setError(null);
    setBusy(true);
    setProgress(0);
    try {
      const m = await fn();
      await saveManual(m);
      onAdded();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo añadir el manual.');
      setBusy(false);
    }
  };

  const onPdf = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) void run(() => manualFromPdf(file, setProgress));
  };

  const onFolder = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    e.target.value = '';
    if (files.length) void run(() => manualFromFolder(files));
  };

  const option =
    'flex flex-1 flex-col items-start gap-3 rounded-xl border border-gris-line bg-white p-5 text-left transition hover:border-azul hover:bg-azul-tint/40 disabled:opacity-50';

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-azul-dark/35 p-4 backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !busy) onClose();
      }}
    >
      <div className="anim-in w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl text-azul-dark">Añadir manual</h2>
            <p className="mt-1 text-sm text-gris-txt-oscuro">
              La primera página será la portada y la última la contraportada.
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={busy}
            aria-label="Cerrar"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-gris-txt-oscuro hover:bg-azul-tint disabled:opacity-40"
          >
            <Icon icon="solar:close-linear" width={20} />
          </button>
        </div>

        {busy ? (
          <div className="py-8">
            <p className="font-label text-xs tracking-[0.16em] text-azul-dark">PROCESANDO MANUAL…</p>
            <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-gris-bg">
              <div
                className="h-full rounded-full bg-azul transition-[width] duration-300"
                style={{ width: `${Math.max(8, Math.round(progress * 100))}%` }}
              />
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3 sm:flex-row">
            <button className={option} onClick={() => pdfRef.current?.click()} disabled={busy}>
              <Icon icon="solar:document-text-linear" width={30} className="text-azul" />
              <span className="font-display text-lg text-azul-dark">Subir PDF</span>
              <span className="text-sm text-gris-txt-oscuro">Se convierte cada página en una imagen.</span>
            </button>
            <button className={option} onClick={() => dirRef.current?.click()} disabled={busy}>
              <Icon icon="solar:folder-open-linear" width={30} className="text-azul" />
              <span className="font-display text-lg text-azul-dark">Subir carpeta</span>
              <span className="text-sm text-gris-txt-oscuro">Imágenes ordenadas: portada, page-xx, contraportada.</span>
            </button>
          </div>
        )}

        {error && <p className="mt-4 text-sm text-terracota">{error}</p>}

        <input ref={pdfRef} type="file" accept="application/pdf,.pdf" className="hidden" onChange={onPdf} />
        <input ref={dirRef} type="file" multiple className="hidden" onChange={onFolder} />
      </div>
    </div>
  );
}
