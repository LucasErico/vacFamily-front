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

  // Corresponde rotas dinâmicas
  const baseRoute = '/' + pathname.split('/')[1]
  const title = pageTitles[baseRoute] ?? 'VacFamily'

  const [theme, setTheme] = useState<'light' | 'dark'>(
    () => (document.documentElement.getAttribute('data-theme') as 'light' | 'dark') ?? 'light'
  )

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  return (
    <header className="topbar" role="banner">
      <a
        href="#main-content"
        style={{
          position: 'absolute', left: '-9999px',
          background: 'var(--color-primary)', color: '#fff',
          padding: 'var(--space-2) var(--space-4)', borderRadius: 'var(--radius-md)',
          fontSize: 'var(--text-sm)', fontWeight: 600, zIndex: 100,
        }}
        onFocus={e => { e.currentTarget.style.left = 'var(--space-2)' }}
        onBlur={e => { e.currentTarget.style.left = '-9999px' }}
      >
        Pular para o conteúdo
      </a>

      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
        {/* Logo visível só no mobile */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <div style={{
            width: 28, height: 28, borderRadius: 'var(--radius-md)',
            background: 'var(--color-primary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M9 12h6m-3-3v6"/><circle cx="12" cy="12" r="9"/>
            </svg>
          </div>
          <span className="topbar-title">{title}</span>
        </div>
      </div>

      <button
        className="theme-toggle"
        onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
        aria-label={`Alternar para modo ${theme === 'dark' ? 'claro' : 'escuro'}`}
      >
        {theme === 'dark'
          ? <Sun size={20} aria-hidden />
          : <Moon size={20} aria-hidden />}
      </button>
    </header>
  )
}
