import { useLocation } from 'react-router-dom'
import { Sun, Moon, Accessibility } from 'lucide-react'
import { useState } from 'react'
import { useA11y } from '@/contexts/AccessibilityContext'
import { AccessibilityPanel } from '@/components/ui/AccessibilityPanel'

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
  const baseRoute = '/' + pathname.split('/')[1]
  const title = pageTitles[baseRoute] ?? 'VacFamily'

  const { theme, toggleTheme } = useA11y()
  const [painelAberto, setPainelAberto] = useState(false)

  return (
    <>
      <header className="topbar" role="banner">
        {/* skip link */}
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

        {/* logo + título */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <div style={{
            width: 28, height: 28, borderRadius: 'var(--radius-md)',
            background: 'var(--color-primary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white"
              strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M9 12h6m-3-3v6"/><circle cx="12" cy="12" r="9"/>
            </svg>
          </div>
          <span className="topbar-title">{title}</span>
        </div>

        {/* controles */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}>
          {/* dark mode */}
          <button
            className="theme-toggle"
            onClick={toggleTheme}
            aria-label={`Alternar para modo ${theme === 'dark' ? 'claro' : 'escuro'}`}
            title={`Modo ${theme === 'dark' ? 'claro' : 'escuro'}`}
          >
            {theme === 'dark'
              ? <Sun size={20} aria-hidden />
              : <Moon size={20} aria-hidden />}
          </button>

          {/* acessibilidade */}
          <button
            className="theme-toggle"
            onClick={() => setPainelAberto(v => !v)}
            aria-label="Opções de acessibilidade"
            aria-expanded={painelAberto}
            aria-haspopup="dialog"
            title="Acessibilidade"
          >
            <Accessibility size={20} aria-hidden />
          </button>
        </div>
      </header>

      {/* painel */}
      {painelAberto && (
        <AccessibilityPanel onClose={() => setPainelAberto(false)} />
      )}
    </>
  )
}
