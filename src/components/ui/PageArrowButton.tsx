import type { PointerEvent as ReactPointerEvent } from 'react';
import { Icon } from '@iconify/react';

// Flecha de página del visor (V5b).
//
// Dos estados distintos, que no deben mezclarse:
//  - `inactivo`: no hay página en esa dirección (portada o contraportada).
//    Solo cambia el aspecto: sin contenedor blanco y con el trazo en un gris más claro.
//    Usa `aria-disabled` y NO el atributo `disabled`, porque un botón deshabilitado
//    deja de recibir eventos de puntero y el mantener pulsado se corta.
//  - Girando: el libro está animando. El botón NO cambia de aspecto ni de cursor;
//    las pulsaciones durante el giro simplemente las ignora el visor.
//
// El cursor nunca muestra el símbolo de "no permitido": en inactivo es `default`.

export type PageArrowProps = {
  direccion: 'prev' | 'next';
  /** Sin página en esa dirección: aspecto apagado y sin acción. */
  inactivo: boolean;
  /** Clic corto. */
  onPulsar: () => void;
  /** Inicio de pulsación prolongada (el visor decide si arranca el avance). */
  onPulsacionInicio: (e: ReactPointerEvent<HTMLButtonElement>) => void;
  /** Fin de la pulsación (soltar, salir del botón o cancelar). */
  onPulsacionFin: () => void;
};

const ETIQUETAS = {
  prev: { label: 'Página anterior', icono: 'solar:alt-arrow-left-linear', testId: 'prev-page' },
  next: { label: 'Página siguiente', icono: 'solar:alt-arrow-right-linear', testId: 'next-page' },
} as const;

const BASE =
  'grid h-11 w-11 select-none place-items-center rounded-full touch-manipulation ' +
  'transition-[background-color,box-shadow,color] duration-150 ' +
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-azul';

const ACTIVO = 'cursor-pointer bg-white text-azul-dark shadow hover:bg-azul-tint';
// Sin fondo, sin sombra y con el trazo en gris de texto (más claro que el azul activo en ambos temas)
const INACTIVO = 'cursor-default bg-transparent text-gris-txt shadow-none';

export function PageArrowButton({ direccion, inactivo, onPulsar, onPulsacionInicio, onPulsacionFin }: PageArrowProps) {
  const { label, icono, testId } = ETIQUETAS[direccion];

  return (
    <button
      type="button"
      data-testid={testId}
      aria-label={label}
      title={label}
      aria-disabled={inactivo || undefined}
      onPointerDown={(e) => {
        if (inactivo) return;
        onPulsacionInicio(e);
      }}
      onPointerUp={onPulsacionFin}
      onPointerLeave={onPulsacionFin}
      onPointerCancel={onPulsacionFin}
      onClick={() => {
        if (inactivo) return;
        onPulsar();
      }}
      onContextMenu={(e) => e.preventDefault()}
      className={`${BASE} ${inactivo ? INACTIVO : ACTIVO}`}
    >
      <Icon icon={icono} width={22} aria-hidden />
    </button>
  );
}
