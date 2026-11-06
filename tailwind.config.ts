import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        azul: 'var(--azul)',
        'azul-dark': 'var(--azul-dark)',
        'azul-mid': 'var(--azul-mid)',
        'azul-soft': 'var(--azul-soft)',
        'azul-tint': 'var(--azul-tint)',
        'gris-bg': 'var(--gris-bg)',
        'gris-line': 'var(--gris-line)',
        'gris-txt': 'var(--gris-txt)',
        'gris-txt-oscuro': 'var(--gris-txt-oscuro)',
        negro: 'var(--negro)',
        'paper-bg': 'var(--paper-bg)',
        'paper-edge': 'var(--paper-edge)',
        terracota: '#C8492E',
      },
      fontFamily: {
        display: ['Syndra', 'Exo 2', 'system-ui', 'sans-serif'], // titulares
        label: ['Michroma', 'system-ui', 'sans-serif'],
        text: ['Josefin Sans', 'system-ui', 'sans-serif'],
      },
      transitionTimingFunction: {
        out: 'cubic-bezier(0.16, 1, 0.3, 1)',
        'in-out': 'cubic-bezier(0.65, 0, 0.35, 1)',
      },
    },
  },
  plugins: [],
} satisfies Config;
