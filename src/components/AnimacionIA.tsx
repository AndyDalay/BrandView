// C2 — Visor animado de la IA. Trazo con gradiente que recorre el contorno (gris 60 %, azul 30 %, azul eléctrico 10 %),
// brillo que se desplaza y reaparece, fondo radial con grano y estrellas de 4 puntas. Se acelera según `estado`.
// Es provisional: el diseño final lo aportará el equipo.

export type EstadoIA = 'reposo' | 'escribiendo' | 'pensando' | 'subiendo';

const VELOCIDAD: Record<EstadoIA, number> = { reposo: 4.2, escribiendo: 2.2, pensando: 1.4, subiendo: 1.8 };
const ESTRELLAS = [
  { dx: -70, dy: -46, delay: 0 },
  { dx: 66, dy: -52, delay: 0.7 },
  { dx: -58, dy: 56, delay: 1.3 },
  { dx: 72, dy: 40, delay: 1.9 },
];
// Contorno de burbuja de chat (estilo Solar, trazo redondeado), normalizado a pathLength 100
const CONTORNO = 'M30 36c0-6 4-10 10-10h40c6 0 10 4 10 10v28c0 6-4 10-10 10H52l-14 12V74h-2c-6 0-6-4-6-10V36z';

function Estrella({ dx, dy, delay, dur }: { dx: number; dy: number; delay: number; dur: number }) {
  return (
    <svg
      aria-hidden
      viewBox="-8 -8 16 16"
      className="absolute left-1/2 top-1/2 h-4 w-4 text-azul"
      style={{
        ['--dx' as string]: `${dx}px`,
        ['--dy' as string]: `${dy}px`,
        animation: `ia-estrella ${dur}s ease-in-out ${delay}s infinite`,
      }}
    >
      <path d="M0-7 1.6-1.6 7 0 1.6 1.6 0 7-1.6 1.6-7 0-1.6-1.6Z" fill="currentColor" />
    </svg>
  );
}

export function AnimacionIA({ estado = 'reposo' }: { estado?: EstadoIA }) {
  const dur = VELOCIDAD[estado];
  return (
    <div data-testid="ia-animacion" data-estado={estado} className="relative mx-auto h-40 w-full overflow-hidden rounded-xl">
      {/* Fondo: degradado radial azul y gris, suave, con grano */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(circle at 50% 50%, rgba(53,177,255,0.28) 0%, rgba(91,108,132,0.12) 45%, transparent 75%)',
          animation: `ia-respira ${dur + 1}s ease-in-out infinite`,
        }}
      />
      <div aria-hidden className="grain absolute inset-0 opacity-30" />

      {ESTRELLAS.map((e) => (
        <Estrella key={`${e.dx}-${e.dy}`} dx={e.dx} dy={e.dy} delay={e.delay} dur={dur + 0.8} />
      ))}

      <svg viewBox="0 0 120 120" className="absolute inset-0 m-auto h-28 w-28" style={{ animation: `ia-flota 3.2s ease-in-out infinite` }}>
        <defs>
          <linearGradient id="ia-trazo" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="120" y2="0">
            <stop offset="0" stopColor="#C9CED8" />
            <stop offset="0.6" stopColor="#C9CED8" />
            <stop offset="0.9" stopColor="#35B1FF" />
            <stop offset="1" stopColor="#7FE7FF" />
            <animateTransform attributeName="gradientTransform" type="translate" values="-120 0;120 0" dur={`${dur}s`} repeatCount="indefinite" />
          </linearGradient>
          <filter id="ia-brillo" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="2.4" />
          </filter>
        </defs>

        <path d={CONTORNO} pathLength={100} fill="none" stroke="url(#ia-trazo)" strokeWidth={3} strokeLinejoin="round" strokeLinecap="round" />

        {/* Brillo eléctrico: un tramo del trazo que se desplaza por el contorno y reaparece */}
        <path
          d={CONTORNO}
          pathLength={100}
          fill="none"
          stroke="#7FE7FF"
          strokeWidth={5}
          strokeLinecap="round"
          strokeDasharray="12 88"
          filter="url(#ia-brillo)"
        >
          <animate attributeName="stroke-dashoffset" values="0;-100" dur={`${dur}s`} repeatCount="indefinite" />
          <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.15;0.8;1" dur={`${dur}s`} repeatCount="indefinite" />
        </path>
      </svg>
    </div>
  );
}
