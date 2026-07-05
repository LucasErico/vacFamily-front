import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary:         'var(--color-primary)',
        'primary-hover': 'var(--color-primary-hover)',
        surface:         'var(--color-surface)',
        'surface-2':     'var(--color-surface-2)',
        border:          'var(--color-border)',
        text:            'var(--color-text)',
        muted:           'var(--color-text-muted)',
        faint:           'var(--color-text-faint)',
        error:           'var(--color-error)',
        success:         'var(--color-success)',
        warning:         'var(--color-warning)',
      },
      fontFamily: {
        display: ['Nunito', 'sans-serif'],
        body:    ['Inter', 'sans-serif'],
      },
      borderRadius: {
        sm:   'var(--radius-sm)',
        md:   'var(--radius-md)',
        lg:   'var(--radius-lg)',
        xl:   'var(--radius-xl)',
        full: 'var(--radius-full)',
      },
      boxShadow: {
        sm: 'var(--shadow-sm)',
        md: 'var(--shadow-md)',
        lg: 'var(--shadow-lg)',
      }
    }
  },
  plugins: [],
  darkMode: ['selector', '[data-theme="dark"]']
}

export default config
