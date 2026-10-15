/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        vesper: {
          canvas: '#101010',
          surface: '#161616',
          elevated: '#1E1E1E',
          hover: '#262626',
          well: '#0A0A0A',
          primary: '#F5F5F5',
          secondary: '#A0A0A0',
          muted: '#6E6E6E',
          accent: '#FFC799',
          accentHover: '#FFD6B3',
          mint: '#99FFE4',
          coral: '#FF8080',
        },
        forest: {
          50: '#FFF8F1',
          100: '#FFEEDB',
          200: '#FFE0BD',
          300: '#FFD6B3',
          400: '#FFC799',
          500: '#FFC799',
          600: '#E5A973',
          700: '#C48A55',
          800: '#262626',
          900: '#161616',
          950: '#101010',
        },
        pine: {
          abyss: '#101010',
          card: '#161616',
          surface: '#1E1E1E',
          elevated: '#262626',
          border: 'rgba(255, 199, 153, 0.25)',
          glow: 'rgba(255, 199, 153, 0.18)',
        },
        gold: {
          400: '#FFD6B3',
          500: '#FFC799',
        },
      },
      fontFamily: {
        sans: ['"Be Vietnam Pro"', '"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'forest-glow': '0 0 35px -5px rgba(255, 199, 153, 0.28)',
        'forest-soft': '0 10px 30px -10px rgba(255, 199, 153, 0.2)',
        'forest-card': '0 20px 40px -15px rgba(0, 0, 0, 0.85), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
      },
    },
  },
  plugins: [],
};
