import { useLocation, useNavigate } from 'react-router-dom'
import { Sun, Moon, Accessibility, LogOut } from 'lucide-react'
import { useState } from 'react'
import { useA11y } from '@/contexts/AccessibilityContext'
import { useAuth } from '@/contexts/AuthContext'
import { AccessibilityPanel } from '@/components/ui/AccessibilityPanel'

const pageTitles: Record<string, string> = {
  '/':           'Início',
  '/membros':    'Família',
  '/vacinas':    'Vacinas',
  '/agenda':     'Agenda',
  '/historico':  'Histórico',
  '/assistente': 'Assistente',
}

/** Botão da TopBar com ícone + label texto */
function TopBarBtn({
  icon, label, onClick, ariaLabel, ariaExpanded, ariaHasPopup,
}: {
  icon: React.ReactNode
  label: string
  onClick: () => void
  ariaLabel: string
  ariaExpanded?: boolean
  ariaHasPopup?: 'dialog' | 'true' | 'false'
}) {
  return (
    <button
      onClick={onClick}
      aria-label={ariaLabel}
      aria-expanded={ariaExpanded}
      aria-haspopup={ariaHasPopup}
      title={ariaLabel}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-1)',
        padding: 'var(--space-2) var(--space-3)',
        borderRadius: 'var(--radius-md)',
        background: 'transparent',
        border: 'none',
        cursor: 'pointer',
        color: 'var(--color-text-muted)',
        fontSize: 'var(--text-xs)',
        fontWeight: 500,
        minHeight: 44,
        whiteSpace: 'nowrap',
        transition: 'background var(--transition), color var(--transition)',
      }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLElement
        el.style.background = 'var(--color-surface-offset)'
        el.style.color = 'var(--color-text)'
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLElement
        el.style.background = 'transparent'
        el.style.color = 'var(--color-text-muted)'
      }}
    >
      {icon}
      <span aria-hidden>{label}</span>
    </button>
  )
}

export function TopBar() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const baseRoute = '/' + pathname.split('/')[1]
  const title = pageTitles[baseRoute] ?? 'VacFamily'

  const { theme, toggleTheme } = useA11y()
  const { logout } = useAuth()

  const [painelAberto, setPainelAberto] = useState(false)

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <>
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

        {/* Logo + título da página */}
        <button
          onClick={() => navigate('/')}
          aria-label="Ir para a página inicial"
          style={{
            display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
            background: 'none', border: 'none', cursor: 'pointer',
            padding: 'var(--space-1) var(--space-2)',
            borderRadius: 'var(--radius-md)',
            transition: 'background var(--transition)',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--color-surface-offset)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'none' }}
        >
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
        </button>

        {/* Ações */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}>
          <TopBarBtn
            icon={<LogOut size={16} aria-hidden />}
            label="Sair"
            onClick={handleLogout}
            ariaLabel="Sair da conta"
          />

          <TopBarBtn
            icon={theme === 'dark'
              ? <Sun size={16} aria-hidden />
              : <Moon size={16} aria-hidden />
            }
            label={theme === 'dark' ? 'Claro' : 'Escuro'}
            onClick={toggleTheme}
            ariaLabel={`Alternar para modo ${theme === 'dark' ? 'claro' : 'escuro'}`}
          />

          <TopBarBtn
            icon={<Accessibility size={16} aria-hidden />}
            label="Acessibilidade"
            onClick={() => setPainelAberto(v => !v)}
            ariaLabel="Opções de acessibilidade"
            ariaExpanded={painelAberto}
            ariaHasPopup="dialog"
          />
        </div>
      </header>

      {painelAberto && (
        <AccessibilityPanel onClose={() => setPainelAberto(false)} />
      )}
    </>
  )
}
