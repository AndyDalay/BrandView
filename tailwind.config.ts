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
        terracota: 'var(--terracota)',
        superficie: 'var(--superficie)',
      },
      fontFamily: {
        display: ['Syndra', 'Exo 2', 'system-ui', 'sans-serif'], // titulares
        label: ['Michroma', 'system-ui', 'sans-serif'],
        text: ['Josefin Sans', 'system-ui', 'sans-serif'],
      },
      spacing: {
        's1': 'var(--space-1)', 's2': 'var(--space-2)', 's3': 'var(--space-3)', 's4': 'var(--space-4)',
        's5': 'var(--space-5)', 's6': 'var(--space-6)', 's8': 'var(--space-8)', 's10': 'var(--space-10)', 's12': 'var(--space-12)',
      },
      borderRadius: {
        sm: 'var(--radius-sm)', md: 'var(--radius-md)', lg: 'var(--radius-lg)', xl: 'var(--radius-xl)',
        '2xl': 'var(--radius-2xl)', full: 'var(--radius-full)',
      },
      boxShadow: {
        sm: 'var(--shadow-sm)', md: 'var(--shadow-md)', lg: 'var(--shadow-lg)', xl: 'var(--shadow-xl)',
      },
      fontSize: {
        xs: 'var(--text-xs)', sm: 'var(--text-sm)', base: 'var(--text-base)', lg: 'var(--text-lg)',
        xl: 'var(--text-xl)', '2xl': 'var(--text-2xl)', '3xl': 'var(--text-3xl)',
      },
      transitionTimingFunction: {
        out: 'cubic-bezier(0.16, 1, 0.3, 1)',
        'in-out': 'cubic-bezier(0.65, 0, 0.35, 1)',
      },
    },
  },
  plugins: [],
} satisfies Config;
