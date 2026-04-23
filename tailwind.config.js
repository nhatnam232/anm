/** @type {import('tailwindcss').Config} */

/**
 * Tailwind config — adopts CSS variables so we can swap palettes between
 * light/dark mode without duplicating `dark:` class on every element.
 *
 * Variables are defined in `src/index.css` for both `:root` (dark default)
 * and `:root.light` overrides.
 */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    container: {
      center: true,
      padding: '1rem',
      screens: {
        sm: '640px',
        md: '768px',
        lg: '1024px',
        xl: '1280px',
        '2xl': '1400px',
      },
    },
    extend: {
      colors: {
        // Themed via CSS variables → see src/index.css
        background: 'rgb(var(--color-bg) / <alpha-value>)',
        card: 'rgb(var(--color-card) / <alpha-value>)',
        primary: {
          DEFAULT: 'rgb(var(--color-primary) / <alpha-value>)',
          hover: 'rgb(var(--color-primary-hover) / <alpha-value>)',
          dark: 'rgb(var(--color-primary-dark) / <alpha-value>)',
        },
        text: {
          DEFAULT: 'rgb(var(--color-text) / <alpha-value>)',
          muted: 'rgb(var(--color-text-muted) / <alpha-value>)',
        },
        border: 'rgb(var(--color-border) / <alpha-value>)',
        surface: 'rgb(var(--color-surface) / <alpha-value>)',
      },
      boxShadow: {
        glow: '0 0 24px rgba(124, 58, 237, 0.35)',
        'glow-lg': '0 0 48px rgba(124, 58, 237, 0.4)',
      },
      keyframes: {
        spinSlow: {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
      },
      animation: {
        'spin-slow': 'spinSlow 6s linear infinite',
        'spin-slower': 'spinSlow 12s linear infinite',
      },
    },
  },
  plugins: [],
}
