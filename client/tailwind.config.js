/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        copper: {
          50: '#fff7ed',
          100: '#ffedd5',
          200: '#fed7aa',
          300: '#fdba74',
          400: '#fb923c',
          500: '#e28743',
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
          950: '#451a03',
        },
        twilight: {
          abyss: '#070A11',
          card: '#0D131F',
          surface: '#121A2A',
          elevated: '#172237',
          border: 'rgba(255, 255, 255, 0.08)',
          glow: 'rgba(226, 135, 67, 0.15)',
        },
        ocean: {
          deep: '#060913',
          mist: '#38BDF8',
          cyan: '#0EA5E9',
        },
      },
      fontFamily: {
        sans: ['"Be Vietnam Pro"', '"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'copper-glow': '0 0 35px -5px rgba(226, 135, 67, 0.3)',
        'copper-soft': '0 10px 30px -10px rgba(226, 135, 67, 0.25)',
        'ocean-mist': '0 0 30px -5px rgba(56, 189, 248, 0.2)',
        'gallery-card': '0 20px 40px -15px rgba(0, 0, 0, 0.7), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
      }
    },
  },
  plugins: [],
};
