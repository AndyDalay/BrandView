import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent, type WheelEvent } from 'react';
import { clampEncuadre, computeCropRect, cargarImagen, procesarAvatar, validateImageFile, type Encuadre } from '@/lib/avatarImage';

// Recortador de la foto de perfil (P5). El cuadro no se mueve: se mueve la foto por debajo.
// El círculo central indica cómo quedará el avatar en el header y en los comentarios.
export function AvatarCropper({
  file,
  onCancel,
  onConfirm,
}: {
  file: File;
  onCancel: () => void;
  onConfirm: (grande: Blob, mini: Blob) => Promise<void>;
}) {
  // Diámetro del círculo y lado del cuadro, en píxeles de pantalla
  const [diametro] = useState(() => Math.max(160, Math.min(280, Math.floor(window.innerWidth - 96))));
  const lado = Math.round(diametro * 1.25);

  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [src, setSrc] = useState<string | null>(null);
  const [enc, setEnc] = useState<Encuadre>({ zoom: 1, ox: 0, oy: 0 });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const previewRef = useRef<HTMLCanvasElement>(null);
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

  // Carga y validación de la foto
  useEffect(() => {
    const err = validateImageFile(file);
    if (err) {
      setError(err);
      return;
    }
    let active = true;
    const url = URL.createObjectURL(file);
    setSrc(url);
    cargarImagen(file)
      .then((loaded) => active && setImg(loaded))
      .catch((e: Error) => active && setError(e.message));
    return () => {
      active = false;
      URL.revokeObjectURL(url);
    };
  }, [file]);

  // Cerrar con Escape (salvo mientras se sube)
  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [busy, onCancel]);

  // Vista previa en vivo del círculo final (96 px)
  useEffect(() => {
    const canvas = previewRef.current;
    if (!img || !canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = computeCropRect(img.naturalWidth, img.naturalHeight, diametro, enc);
    ctx.clearRect(0, 0, 96, 96);
    ctx.save();
    ctx.beginPath();
    ctx.arc(48, 48, 48, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(img, rect.sx, rect.sy, rect.side, rect.side, 0, 0, 96, 96);
    ctx.restore();
  }, [img, enc, diametro]);

  const natW = img?.naturalWidth ?? 1;
  const natH = img?.naturalHeight ?? 1;
  const escala = Math.max(diametro / natW, diametro / natH) * enc.zoom;
  const anchoFoto = natW * escala;
  const altoFoto = natH * escala;

  const ajustar = (next: Encuadre) => setEnc(clampEncuadre(next, natW, natH, diametro));

  // Arrastrar la foto (el cuadro no se mueve)
  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, ox: enc.ox, oy: enc.oy };
  };
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d) return;
    ajustar({ zoom: enc.zoom, ox: d.ox + (e.clientX - d.x), oy: d.oy + (e.clientY - d.y) });
  };
  const onPointerUp = () => {
    drag.current = null;
  };

  // Rueda: zoom
  const onWheel = (e: WheelEvent<HTMLDivElement>) => {
    ajustar({ ...enc, zoom: enc.zoom - e.deltaY * 0.002 });
  };

  // Teclado: flechas mueven la foto, + y - hacen zoom
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const paso = 4;
    const mover: Record<string, [number, number]> = {
      ArrowLeft: [-paso, 0],
      ArrowRight: [paso, 0],
      ArrowUp: [0, -paso],
      ArrowDown: [0, paso],
    };
    if (mover[e.key]) {
      e.preventDefault();
      const [dx, dy] = mover[e.key];
      ajustar({ zoom: enc.zoom, ox: enc.ox + dx, oy: enc.oy + dy });
    } else if (e.key === '+' || e.key === '=') {
      ajustar({ ...enc, zoom: enc.zoom + 0.1 });
    } else if (e.key === '-') {
      ajustar({ ...enc, zoom: enc.zoom - 0.1 });
    }
  };

  async function handleSubir() {
    if (!img) return;
    setBusy(true);
    setError(null);
    try {
      const rect = computeCropRect(img.naturalWidth, img.naturalHeight, diametro, enc);
      const { grande, mini } = await procesarAvatar(img, rect);
      await onConfirm(grande, mini);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo procesar la foto.');
      setBusy(false);
    }
  }

  return (
    <div
      data-testid="avatar-cropper"
      role="dialog"
      aria-modal="true"
      aria-labelledby="avatar-cropper-title"
      className="fixed inset-0 z-50 grid place-items-center bg-azul-dark/35 p-4 backdrop-blur-sm"
      onMouseDown={(e) => e.target === e.currentTarget && !busy && onCancel()}
    >
      <div className="anim-in w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <h2 id="avatar-cropper-title" className="font-display text-2xl text-azul-dark">
          Foto de perfil
        </h2>
        <p className="mt-2 text-sm text-gris-txt-oscuro">Arrastra la foto para encuadrarla. La zona circular es el resultado.</p>

        <div
          data-testid="avatar-cropper-frame"
          role="group"
          tabIndex={0}
          aria-label="Encuadre de la foto. Usa las flechas para mover y + o - para hacer zoom."
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onWheel={onWheel}
          onKeyDown={onKeyDown}
          style={{ width: lado, height: lado, touchAction: 'none' }}
          className="relative mx-auto mt-5 cursor-grab overflow-hidden rounded-md bg-gris-bg select-none active:cursor-grabbing focus-visible:outline-2 focus-visible:outline-azul"
        >
          {src && img && (
            <img
              src={src}
              alt=""
              draggable={false}
              data-testid="avatar-cropper-image"
              className="pointer-events-none absolute max-w-none"
              style={{
                width: anchoFoto,
                height: altoFoto,
                left: lado / 2 + enc.ox - anchoFoto / 2,
                top: lado / 2 + enc.oy - altoFoto / 2,
              }}
            />
          )}

          {/* Máscara: oscurece todo fuera del círculo que queda como avatar */}
          <div
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-1/2 rounded-full border-2 border-white"
            style={{ width: diametro, height: diametro, transform: 'translate(-50%, -50%)', boxShadow: '0 0 0 9999px rgba(18,34,79,0.55)' }}
          />

          {/* Marcas de esquina del cuadro */}
          {['left-1 top-1 border-l-2 border-t-2', 'right-1 top-1 border-r-2 border-t-2', 'left-1 bottom-1 border-l-2 border-b-2', 'right-1 bottom-1 border-r-2 border-b-2'].map((c) => (
            <span key={c} aria-hidden className={`pointer-events-none absolute h-4 w-4 border-white ${c}`} />
          ))}
        </div>

        <div className="mt-5 flex items-center gap-4">
          <canvas ref={previewRef} width={96} height={96} data-testid="avatar-cropper-preview" aria-label="Vista previa del avatar" className="h-24 w-24 shrink-0" />
          <label className="flex flex-1 flex-col gap-1 text-sm text-gris-txt-oscuro">
            Zoom
            <input
              type="range"
              min={1}
              max={3}
              step={0.01}
              value={enc.zoom}
              onChange={(e) => ajustar({ ...enc, zoom: Number(e.target.value) })}
              data-testid="avatar-cropper-zoom"
              className="accent-azul"
            />
          </label>
        </div>

        {error && (
          <p role="alert" data-testid="avatar-cropper-error" className="mt-4 text-sm text-terracota">
            {error}
          </p>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            data-testid="avatar-cropper-cancel"
            onClick={onCancel}
            disabled={busy}
            className="rounded-lg border border-gris-line bg-white px-4 py-2 text-sm text-azul-dark hover:bg-azul-tint disabled:opacity-40"
          >
            Cancelar
          </button>
          <button
            type="button"
            data-testid="avatar-cropper-save"
            onClick={handleSubir}
            disabled={busy || !img}
            className="rounded-lg bg-azul px-4 py-2 text-sm text-white shadow hover:bg-azul-mid disabled:opacity-50"
          >
            {busy ? 'Subiendo…' : 'Subir'}
          </button>
        </div>
      </div>
    </div>
  );
}
