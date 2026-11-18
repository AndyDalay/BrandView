import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Icon } from '@iconify/react';

// Sistema de botones (D2). Colores, espaciados y radios salen de los tokens de src/index.css.
// Variantes: primaria (acción principal), secundaria (acción de apoyo), fantasma (acciones discretas).
// Tamaños: sm, md, lg. Estados: hover, focus-visible, disabled y cargando (`loading`).

export type Variante = 'primaria' | 'secundaria' | 'fantasma' | 'peligro';
export type Tamano = 'sm' | 'md' | 'lg';

const base =
  'inline-flex shrink-0 items-center justify-center font-text transition-colors duration-150 ' +
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-azul ' +
  'disabled:cursor-not-allowed disabled:opacity-40';

const variantes: Record<Variante, string> = {
  primaria: 'bg-azul text-white shadow-md hover:bg-azul-mid',
  secundaria: 'border border-gris-line bg-superficie text-azul-dark hover:bg-azul-tint',
  fantasma: 'text-gris-txt-oscuro hover:bg-azul-tint',
  peligro: 'bg-terracota text-white shadow-md hover:opacity-90',
};

const tamanosTexto: Record<Tamano, string> = {
  sm: 'h-8 gap-s2 px-s3 text-sm',
  md: 'h-10 gap-s2 px-s4 text-sm',
  lg: 'h-12 gap-s3 px-s6 text-base',
};
const radioTexto: Record<Tamano, string> = { sm: 'rounded-md', md: 'rounded-lg', lg: 'rounded-lg' };

const tamanosIcono: Record<Tamano, string> = {
  sm: 'h-8 w-8 rounded-md',
  md: 'h-10 w-10 rounded-lg',
  lg: 'h-12 w-12 rounded-lg',
};

const pxIcono: Record<Tamano, number> = { sm: 16, md: 18, lg: 20 };

// Spinner en CSS: no depende de iconos externos (solo se cargan los iconos Solar del bundle)
function Spinner({ tamano }: { tamano: Tamano }) {
  return (
    <span
      aria-hidden
      style={{ width: pxIcono[tamano], height: pxIcono[tamano] }}
      className="inline-block animate-spin motion-reduce:animate-none rounded-full border-2 border-current border-t-transparent"
    />
  );
}

type ComunProps = {
  variante?: Variante;
  tamano?: Tamano;
  cargando?: boolean;
  className?: string;
};

export type ButtonProps = ComunProps &
  ButtonHTMLAttributes<HTMLButtonElement> & {
    icono?: string; // icono Solar (p. ej. 'solar:add-circle-linear')
    pill?: boolean; // forma de píldora (botones flotantes)
    iconoDerecha?: string;
    children?: ReactNode;
  };

/** Botón con texto y, opcionalmente, icono. */
export function Button({
  variante = 'primaria',
  tamano = 'md',
  cargando = false,
  icono,
  iconoDerecha,
  pill = false,
  className = '',
  children,
  disabled,
  ...rest
}: ButtonProps) {
  return (
    <button
      type="button"
      {...rest}
      disabled={disabled || cargando}
      aria-busy={cargando || undefined}
      className={`${base} ${variantes[variante]} ${tamanosTexto[tamano]} ${pill ? 'rounded-full' : radioTexto[tamano]} ${className}`}
    >
      {cargando ? <Spinner tamano={tamano} /> : icono && <Icon icon={icono} width={pxIcono[tamano]} aria-hidden />}
      {children}
      {iconoDerecha && <Icon icon={iconoDerecha} width={pxIcono[tamano]} aria-hidden />}
    </button>
  );
}

export type IconButtonProps = ComunProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & {
    icono: string;
    /** Texto accesible: obligatorio, porque el botón no tiene texto visible. */
    label: string;
  };

/** Botón solo con icono. `label` se usa como aria-label y como título. */
export function IconButton({
  icono,
  label,
  variante = 'fantasma',
  tamano = 'md',
  cargando = false,
  className = '',
  disabled,
  ...rest
}: IconButtonProps) {
  return (
    <button
      type="button"
      title={label}
      {...rest}
      aria-label={label}
      disabled={disabled || cargando}
      aria-busy={cargando || undefined}
      className={`${base} ${variantes[variante]} ${tamanosIcono[tamano]} ${className}`}
    >
      {cargando ? <Spinner tamano={tamano} /> : <Icon icon={icono} width={pxIcono[tamano]} aria-hidden />}
    </button>
  );
}

/** Botón de cerrar: solo la cruz, sin círculo. Igual en todos los modales. */
export function CloseButton({
  label = 'Cerrar',
  tamano = 'md',
  ...rest
}: Omit<IconButtonProps, 'icono' | 'label'> & { label?: string }) {
  return <IconButton icono="solar:close-linear" label={label} variante="fantasma" tamano={tamano} {...rest} />;
}
