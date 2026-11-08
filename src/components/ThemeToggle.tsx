import { useState } from 'react';
import { Icon } from '@iconify/react';

const KEY = 'gbv-tema';
type Tema = 'light' | 'dark';

// El tema inicial lo aplica index.html antes de pintar; aquí solo se lee y se cambia.
function temaActual(): Tema {
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
}

// Switch claro/oscuro del header. Guarda la elección en localStorage (con try/catch).
export function ThemeToggle() {
  const [tema, setTema] = useState<Tema>(temaActual);
  const oscuro = tema === 'dark';

  function cambiar() {
    const siguiente: Tema = oscuro ? 'light' : 'dark';
    document.documentElement.dataset.theme = siguiente;
    try {
      localStorage.setItem(KEY, siguiente);
    } catch {
      /* sin almacenamiento: el cambio dura solo esta sesión */
    }
    setTema(siguiente);
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={oscuro}
      aria-label="Modo oscuro"
      title={oscuro ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      data-testid="theme-switch"
      onClick={cambiar}
      className="relative flex h-8 w-16 shrink-0 items-center rounded-full border border-gris-line bg-azul-tint p-1 transition-colors hover:border-azul focus-visible:outline-azul"
    >
      <span
        aria-hidden
        className={`grid h-6 w-6 place-items-center rounded-full bg-white text-azul-dark shadow transition-transform duration-300 ease-out ${
          oscuro ? 'translate-x-8' : 'translate-x-0'
        }`}
      >
        <Icon icon={oscuro ? 'solar:moon-linear' : 'solar:sun-linear'} width={14} />
      </span>
    </button>
  );
}
