/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
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
        background: '#0f172a',
        card: '#1e293b',
        primary: {
          DEFAULT: '#7c3aed',
          hover: '#6d28d9',
          dark: '#581c87'
        },
        text: {
          DEFAULT: '#f8fafc',
          muted: '#94a3b8'
        }
      }
    },
  },
  plugins: [],
};
