/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Palette Euromed Fès — Bleu marine + Vert émeraude
        euromed: {
          navy: '#0D3B6E',
          'navy-dark': '#0A1F3D',
          'navy-light': '#1B5E8A',
          gold: '#0D7A5F',
          'gold-light': '#10B981',
          'gold-dark': '#065F46',
          cream: '#EFF9F5',
          orange: '#E07B3A',
        },
        primary: {
          50: '#E8F4FF',
          100: '#C6E0F5',
          200: '#90C2E8',
          300: '#509ED8',
          400: '#1E78C2',
          500: '#0D3B6E',
          600: '#0A2F58',
          700: '#072342',
          800: '#05172C',
          900: '#020C16',
        },
        accent: {
          50: '#ECFDF5',
          100: '#D1FAE5',
          200: '#A7F3D0',
          300: '#6EE7B7',
          400: '#34D399',
          500: '#10B981',
          600: '#059669',
          700: '#0D7A5F',
          800: '#065F46',
          900: '#064E3B',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        arabic: ['Cairo', 'sans-serif'],
      },
      boxShadow: {
        card: '0 2px 8px rgba(13, 59, 110, 0.08), 0 1px 3px rgba(13, 59, 110, 0.05)',
        'card-hover': '0 8px 24px rgba(13, 59, 110, 0.15), 0 2px 8px rgba(13, 59, 110, 0.08)',
        sidebar: '4px 0 16px rgba(13, 59, 110, 0.15)',
      },
      backgroundImage: {
        'gradient-euromed': 'linear-gradient(135deg, #0D3B6E 0%, #0A1F3D 100%)',
        'gradient-gold': 'linear-gradient(135deg, #10B981 0%, #065F46 100%)',
        'gradient-card': 'linear-gradient(135deg, #ffffff 0%, #EFF9F5 100%)',
      },
    },
  },
  plugins: [],
};
