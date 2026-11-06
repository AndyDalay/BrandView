import { useState } from 'react';

// Gifs de carga para manuales (se elige uno al azar en cada apertura)
const LOADERS = ['astronomy', 'book', 'geography', 'glasses', 'growth', 'math', 'science'].map(
  (n) => `/loaders/manual/${n}.gif`
);

function pickLoader() {
  return LOADERS[Math.floor(Math.random() * LOADERS.length)];
}

// Tamaño mostrado: la mitad que antes (antes 320 px máx., ahora 160 px máx.)
export function ManualLoader({ fading }: { fading: boolean }) {
  const [src] = useState(pickLoader);
  return (
    <div className={`flex flex-1 items-center justify-center py-10 ${fading ? 'anim-fade-out' : ''}`}>
      <img
        src={src}
        alt="Cargando manual"
        className="max-h-[80px] w-auto max-w-[min(35vw,160px)] select-none"
        draggable={false}
      />
    </div>
  );
}
