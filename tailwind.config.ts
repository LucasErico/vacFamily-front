import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        display: ['Nunito', 'sans-serif'],
        body:    ['Inter', 'sans-serif'],
      },
      colors: {
        brand: {
          50:  '#e8f5ee',
          100: '#c8e6d8',
          200: '#92cdaf',
          300: '#5cb387',
          400: '#2d9460',
          500: '#006B3F',
          600: '#005530',
          700: '#003d22',
          800: '#002814',
          900: '#001509',
        },
      },
    },
  },
  plugins: [],
} satisfies Config
