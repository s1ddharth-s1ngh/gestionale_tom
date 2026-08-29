import type { Config } from 'tailwindcss';
// Import ESM e non `require()`: questo file è un modulo TypeScript, e il
// `require` ci stava solo perché è come lo scrive shadcn nei suoi esempi.
import animate from 'tailwindcss-animate';

export default {
  // `class` e non `media`: il tema è scuro sempre, e la classe la mette
  // index.css su <html>. Vedi docs/DESIGN_SYSTEM.md §1.1.
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  prefix: '',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Urbanist', 'sans-serif'],
        // Anche `font-mono` è Urbanist: i codici non cambiano famiglia, cambia
        // solo l'allineamento delle cifre dove serve (`tabular-nums`).
        mono: ['Urbanist', 'sans-serif'],
      },
      letterSpacing: {
        display: '-0.03em',
        heading: '-0.02em',
        body: '-0.01em',
        label: '0.04em',
      },
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
    },
  },
  plugins: [
    animate,
    // .scrollbar-hide — nasconde la scrollbar mantenendo lo scroll attivo.
    // Serve alle file di pill che scorrono in orizzontale sotto sm, dove una
    // scrollbar visibile sporcherebbe la barra.
    function ({ addUtilities }: { addUtilities: (u: Record<string, unknown>) => void }) {
      addUtilities({
        '.scrollbar-hide': {
          '-ms-overflow-style': 'none',
          'scrollbar-width': 'none',
          '&::-webkit-scrollbar': { display: 'none' },
        },
      });
    },
  ],
} satisfies Config;
