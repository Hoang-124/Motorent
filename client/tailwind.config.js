/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        forest: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#34d399',
          500: '#10b981',
          600: '#059669',
          700: '#047857',
          800: '#065f46',
          900: '#064e3b',
          950: '#022c22',
        },
        pine: {
          abyss: '#050D0A',
          card: '#0A1813',
          surface: '#0F241C',
          elevated: '#153026',
          border: 'rgba(52, 211, 153, 0.16)',
          glow: 'rgba(16, 185, 129, 0.22)',
        },
        moss: {
          300: '#bef264',
          400: '#a3e635',
          500: '#84cc16',
        },
        gold: {
          400: '#facc15',
          500: '#eab308',
        }
      },
      fontFamily: {
        sans: ['"Be Vietnam Pro"', '"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'forest-glow': '0 0 35px -5px rgba(16, 185, 129, 0.35)',
        'forest-soft': '0 10px 30px -10px rgba(16, 185, 129, 0.25)',
        'forest-card': '0 20px 40px -15px rgba(0, 0, 0, 0.8), inset 0 1px 0 rgba(52, 211, 153, 0.12)',
      }
    },
  },
  plugins: [],
};
