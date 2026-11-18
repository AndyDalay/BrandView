import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimacionIA, type EstadoIA } from './AnimacionIA';
import { Button, CloseButton, IconButton } from './ui/Button';
import { redactarComentario } from '../lib/ia';

// C2 — Modal "Comentar con IA". Devuelve el texto generado con onUsar; el usuario decide si lo inserta.
const FRASES = [
  'Resume los puntos clave del trabajo documentado.',
  'Destaca un acierto y una mejora posible, en tono profesional.',
  'Escribe un comentario positivo y breve para el equipo.',
];

export function IaComentarioModal({ onCerrar, onUsar }: { onCerrar: () => void; onUsar: (texto: string) => void }) {
  const [prompt, setPrompt] = useState('');
  const [adjunto, setAdjunto] = useState<File | null>(null);
  const [resultado, setResultado] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const estado: EstadoIA = cargando ? 'pensando' : prompt.length > 0 || adjunto ? 'escribiendo' : resultado ? 'subiendo' : 'reposo';

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !cargando && onCerrar();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [cargando, onCerrar]);

  function elegirArchivo(f: File | null) {
    setError(null);
    if (!f) return setAdjunto(null);
    if (!f.type.startsWith('image/') && f.type !== 'application/pdf') {
      setError('Solo se pueden adjuntar imágenes o PDF.');
      return;
    }
    if (f.size > 3 * 1024 * 1024) {
      setError('El archivo supera los 3 MB.');
      return;
    }
    setAdjunto(f);
  }

  async function generar() {
    if (!prompt.trim() || cargando) return;
    setCargando(true);
    setError(null);
    try {
      setResultado(await redactarComentario(prompt.trim(), adjunto ?? undefined));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo redactar el comentario.');
    } finally {
      setCargando(false);
    }
  }

  return createPortal(
    <div
      data-testid="ia-modal"
      className="fixed inset-0 z-[60] grid place-items-center bg-azul-dark/35 p-s4 backdrop-blur-sm"
      onMouseDown={(e) => e.target === e.currentTarget && !cargando && onCerrar()}
    >
      <div role="dialog" aria-modal="true" aria-labelledby="ia-titulo" className="anim-in flex max-h-[90vh] w-full max-w-md flex-col gap-s4 overflow-y-auto rounded-2xl bg-white p-s6 shadow-2xl">
        <div className="flex items-center justify-between">
          <h2 id="ia-titulo" className="font-display text-2xl text-azul-dark">Comentar con IA</h2>
          <CloseButton onClick={onCerrar} disabled={cargando} data-testid="ia-close" />
        </div>

        <AnimacionIA estado={estado} />

        {resultado && (
          <div data-testid="ia-resultado" className="rounded-lg bg-gris-bg/60 p-s3 text-sm text-azul-dark whitespace-pre-wrap">
            {resultado.split(/(\*\*[^*]+\*\*)/).map((parte, i) =>
              parte.startsWith('**') ? <strong key={i}>{parte.slice(2, -2)}</strong> : <span key={i}>{parte}</span>,
            )}
          </div>
        )}

        <textarea
          data-testid="ia-prompt"
          aria-label="Qué quieres que escriba la IA"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          maxLength={600}
          rows={3}
          placeholder="Describe qué quieres comentar…"
          className="w-full resize-none rounded-lg border border-gris-line bg-white p-s3 text-sm text-azul-dark focus:border-azul focus:outline-none"
        />

        <div className="flex flex-wrap gap-s2" data-testid="ia-chips">
          {FRASES.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setPrompt(f)}
              className="rounded-full border border-gris-line bg-white px-s3 py-s1 text-xs text-azul-dark hover:bg-azul-tint"
            >
              {f}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-s2">
          <IconButton icono="solar:paperclip-linear" label="Adjuntar imagen o PDF" variante="secundaria" tamano="sm" onClick={() => fileRef.current?.click()} disabled={cargando} />
          <input ref={fileRef} type="file" accept="image/*,application/pdf" className="hidden" data-testid="ia-file-input" onChange={(e) => elegirArchivo(e.target.files?.[0] ?? null)} />
          {adjunto && (
            <span className="flex min-w-0 items-center gap-s2 text-xs text-gris-txt-oscuro">
              <span className="truncate">{adjunto.name}</span>
              <IconButton icono="solar:close-linear" label="Quitar adjunto" tamano="sm" onClick={() => setAdjunto(null)} />
            </span>
          )}
        </div>

        {error && <p role="alert" data-testid="ia-error" className="text-sm text-terracota">{error}</p>}

        <div className="flex justify-end gap-s2">
          {resultado ? (
            <>
              <Button variante="secundaria" onClick={generar} disabled={cargando}>Otra versión</Button>
              <Button variante="primaria" data-testid="ia-usar" onClick={() => onUsar(resultado)}>Usar este texto</Button>
            </>
          ) : (
            <Button variante="primaria" data-testid="ia-generar" icono="solar:magic-stick-3-linear" cargando={cargando} disabled={!prompt.trim()} onClick={generar}>
              Redactar
            </Button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
