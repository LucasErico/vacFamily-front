import { useLocation } from 'react-router-dom'
import { Sun, Moon } from 'lucide-react'
import { useState, useEffect } from 'react'

const pageTitles: Record<string, string> = {
  '/':              'Início',
  '/membros':       'Membros',
  '/vacinas':       'Vacinas',
  '/lembretes':     'Lembretes',
  '/conteudo':      'Conteúdo',
  '/assistente':    'Assistente',
  '/configuracoes': 'Configurações',
}

export function TopBar() {
  const { pathname } = useLocation()
  const title = pageTitles[pathname] ?? 'VacFamily'

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (document.documentElement.getAttribute('data-theme') as 'light' | 'dark') ?? 'light'
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark')

  return (
    <header className="sticky top-0 z-10 h-[var(--topbar-height)] flex items-center justify-between px-4 bg-[var(--color-surface)] border-b border-[var(--color-border)]" role="banner">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-[var(--color-primary)] focus:text-white focus:rounded-md focus:text-sm">
        Pular para o conteúdo
      </a>
      <h1 className="font-display font-semibold text-base text-[var(--color-text)]">{title}</h1>
      <button
        onClick={toggleTheme}
        aria-label={`Alternar para modo ${theme === 'dark' ? 'claro' : 'escuro'}`}
        className="p-2 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-offset)] min-w-[44px] min-h-[44px] flex items-center justify-center"
      >
        {theme === 'dark' ? <Sun size={20} aria-hidden="true" /> : <Moon size={20} aria-hidden="true" />}
      </button>
    </header>
  )
}
