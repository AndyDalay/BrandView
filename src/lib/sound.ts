import { leerAjustes } from './ajustes';

const SRC = '/sounds/page-flip.wav';
const NIVEL_BASE = 0.7; // nivel original del sonido de página; el 100 % de los ajustes equivale a este valor

// Web Audio permite ganancias por encima de 1 (hasta 200 % de volumen). El buffer se carga una vez.
let ctx: AudioContext | null = null;
let buffer: AudioBuffer | null = null;
let cargando: Promise<void> | null = null;

async function preparar(): Promise<void> {
  if (buffer) return;
  if (!cargando) {
    cargando = (async () => {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      ctx = new AC();
      const res = await fetch(SRC);
      buffer = await ctx.decodeAudioData(await res.arrayBuffer());
    })();
  }
  await cargando;
}

// Cada reproducción crea su propia fuente para que sonidos seguidos no se corten
export function playFlipSound() {
  const volumen = leerAjustes().volumen;
  if (volumen === 0) return;
  const ganancia = NIVEL_BASE * (volumen / 100);
  preparar()
    .then(() => {
      if (!ctx || !buffer) return;
      if (ctx.state === 'suspended') void ctx.resume();
      const fuente = ctx.createBufferSource();
      const gain = ctx.createGain();
      gain.gain.value = ganancia;
      fuente.buffer = buffer;
      fuente.connect(gain).connect(ctx.destination);
      fuente.start();
    })
    .catch(() => {
      /* sin audio disponible: el visor sigue funcionando sin sonido */
    });
}
