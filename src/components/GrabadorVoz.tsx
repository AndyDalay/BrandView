import { useEffect, useRef, useState } from 'react';
import { Icon } from '@iconify/react';

// T5 — Grabación de nota de voz para un comentario.
// Arranca al montarse (el usuario ya pulsó el micrófono). Onda en vivo, tiempo y límite de 60 s.
// Safari puede no soportar webm: se elige el primer formato que el navegador acepte.

const MAX_SEG = 60;
const BARRAS = 18;
const SILENCIO = 0.08;

function elegirMime(): string | undefined {
  if (typeof MediaRecorder === 'undefined') return undefined;
  for (const m of ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4']) {
    if (MediaRecorder.isTypeSupported(m)) return m;
  }
  return undefined;
}

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

export function GrabadorVoz({
  onListo,
  onCancelar,
  onError,
}: {
  onListo: (audio: Blob) => void;
  onCancelar: () => void;
  onError: (mensaje: string) => void;
}) {
  const [segundos, setSegundos] = useState(0);
  const [niveles, setNiveles] = useState<number[]>(() => Array(BARRAS).fill(SILENCIO));

  const streamRef = useRef<MediaStream | null>(null);
  const recRef = useRef<MediaRecorder | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const descartarRef = useRef(false);
  // Callbacks en ref para que el efecto de arranque no se repita si el padre re-renderiza
  const cbRef = useRef({ onListo, onCancelar, onError });
  cbRef.current = { onListo, onCancelar, onError };

  useEffect(() => {
    let vivo = true;
    descartarRef.current = false; // StrictMode monta dos veces: cada arranque empieza limpio

    async function arrancar() {
      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
        cbRef.current.onError('Tu navegador no permite grabar audio.');
        cbRef.current.onCancelar();
        return;
      }
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch {
        if (vivo) {
          cbRef.current.onError('Necesitamos permiso para usar el micrófono. Puedes escribir el comentario.');
          cbRef.current.onCancelar();
        }
        return;
      }
      if (!vivo) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      streamRef.current = stream;

      const mime = elegirMime();
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      recRef.current = rec;
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      rec.onstop = () => {
        streamRef.current?.getTracks().forEach((t) => t.stop());
        ctxRef.current?.close().catch(() => undefined);
        if (descartarRef.current) return;
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || mime || 'audio/webm' });
        if (blob.size === 0) {
          cbRef.current.onError('No se grabó audio. Inténtalo de nuevo.');
          cbRef.current.onCancelar();
          return;
        }
        cbRef.current.onListo(blob);
      };

      // Analizador para la onda en vivo (si el navegador no lo soporta, la onda queda plana)
      try {
        const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const ctx = new AC();
        ctxRef.current = ctx;
        const an = ctx.createAnalyser();
        an.fftSize = 256;
        ctx.createMediaStreamSource(stream).connect(an);
        analyserRef.current = an;
      } catch {
        analyserRef.current = null;
      }

      rec.start(250);
    }

    void arrancar();
    return () => {
      vivo = false;
      descartarRef.current = true;
      if (recRef.current && recRef.current.state !== 'inactive') recRef.current.stop();
      streamRef.current?.getTracks().forEach((t) => t.stop());
      ctxRef.current?.close().catch(() => undefined);
    };
  }, []);

  // Tiempo, y parada automática al llegar al límite de 60 s
  useEffect(() => {
    const t = window.setInterval(() => setSegundos((s) => s + 1), 1000);
    return () => window.clearInterval(t);
  }, []);

  useEffect(() => {
    if (segundos >= MAX_SEG) detener();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [segundos]);

  // Onda: cada tick añade una barra con el volumen actual
  useEffect(() => {
    const t = window.setInterval(() => {
      const an = analyserRef.current;
      let nivel = SILENCIO;
      if (an) {
        const datos = new Uint8Array(an.fftSize);
        an.getByteTimeDomainData(datos);
        let suma = 0;
        for (const v of datos) {
          const c = (v - 128) / 128;
          suma += c * c;
        }
        nivel = Math.min(1, Math.max(SILENCIO, Math.sqrt(suma / datos.length) * 4));
      }
      setNiveles((prev) => [...prev.slice(1), nivel]);
    }, 110);
    return () => window.clearInterval(t);
  }, []);

  function detener() {
    const rec = recRef.current;
    if (rec && rec.state !== 'inactive') rec.stop(); // onstop entrega el audio
  }

  function cancelar() {
    descartarRef.current = true;
    const rec = recRef.current;
    if (rec && rec.state !== 'inactive') rec.stop();
    onCancelar();
  }

  return (
    <div data-testid="voice-recorder" role="group" aria-label="Grabando nota de voz" className="flex items-center gap-2 rounded-lg border border-gris-line bg-white p-2">
      <span className="flex h-7 min-w-0 flex-1 items-center justify-center gap-[3px] overflow-hidden" aria-hidden>
        {niveles.map((n, i) => (
          <span
            key={i}
            className="w-[3px] shrink-0 rounded-full bg-terracota transition-[height] duration-100 motion-reduce:transition-none"
            style={{ height: `${Math.round(n * 26) + 3}px` }}
          />
        ))}
      </span>
      <span className="flex w-12 items-center gap-1 text-xs tabular-nums text-gris-txt-oscuro" data-testid="voice-timer">
        <span className="h-2 w-2 animate-pulse motion-reduce:animate-none rounded-full bg-terracota" aria-hidden />
        {mmss(segundos)}
      </span>
      <button
        type="button"
        data-testid="voice-stop"
        aria-label="Terminar y guardar la grabación"
        title="Terminar"
        onClick={detener}
        className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-azul text-white shadow hover:bg-azul-mid"
      >
        <Icon icon="solar:diskette-linear" width={16} />
      </button>
      <button
        type="button"
        data-testid="voice-cancel"
        aria-label="Cancelar grabación"
        title="Cancelar"
        onClick={cancelar}
        className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-gris-txt-oscuro hover:bg-azul-tint"
      >
        <Icon icon="solar:close-linear" width={16} />
      </button>
    </div>
  );
}
