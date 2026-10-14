/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#fff7ed',
          100: '#ffedd5',
          200: '#fed7aa',
          300: '#fdba74',
          400: '#fb923c',
          500: '#f97316', // Core KTM / Moto Blaze Orange
          600: '#ea580c',
          700: '#c2410c',
          800: '#9a3412',
          900: '#7c2d12',
          950: '#431407',
        },
        moto: {
          flame: '#ff5500',
          amber: '#f59e0b',
          sun: '#fbbf24',
          cyan: '#06b6d4',
        },
        asphalt: {
          950: '#070B12',
          900: '#0B0F17', // Main deep road asphalt
          850: '#0F1624',
          800: '#141D2D', // Card surface
          750: '#1A2438', // Card hover
          700: '#222E45', // Border & divider
        },
        dark: {
          base: '#0B0F17',
          card: '#111827',
          cardHover: '#172236',
          border: '#233048',
          input: '#0F1726',
        }
      },
      fontFamily: {
        sans: ['"Be Vietnam Pro"', 'Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'brand-glow': '0 0 25px -5px rgba(249, 115, 22, 0.35)',
        'moto-glow': '0 0 35px -5px rgba(255, 85, 0, 0.45)',
        'card-soft': '0 4px 20px -2px rgba(0, 0, 0, 0.25)',
      }
    },
  },
  plugins: [],
};
