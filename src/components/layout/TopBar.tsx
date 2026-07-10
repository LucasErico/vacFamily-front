import { useLocation, useNavigate } from 'react-router-dom'
import { Sun, Moon, Accessibility, LogOut, ChevronDown, Check } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { useA11y } from '@/contexts/AccessibilityContext'
import { useAuth } from '@/contexts/AuthContext'
import { useMembros, PARENTESCO_LABEL } from '@/contexts/MembrosContext'
import { useMembroAtivo, corAvatar } from '@/contexts/MembroAtivoContext'
import { AccessibilityPanel } from '@/components/ui/AccessibilityPanel'

const pageTitles: Record<string, string> = {
  '/':              'Início',
  '/membros':       'Família',
  '/vacinas':       'Vacinas',
  '/agenda':        'Agenda',
  '/historico':     'Histórico',
  '/assistente':    'Assistente',
  '/configuracoes': 'Configurações',
}

export function TopBar() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const baseRoute = '/' + pathname.split('/')[1]
  const title = pageTitles[baseRoute] ?? 'VacFamily'

  const { theme, toggleTheme } = useA11y()
  const { logout } = useAuth()
  const { membros } = useMembros()
  const { membroAtivo, setMembroAtivo } = useMembroAtivo()

  const [painelAberto, setPainelAberto] = useState(false)
  const [dropdownAberto, setDropdownAberto] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!dropdownAberto) return
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownAberto(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [dropdownAberto])

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  function handleSelecionarMembro(membro: typeof membros[0]) {
    setMembroAtivo(membro)
    setDropdownAberto(false)
  }

  const inicialNome = membroAtivo?.nome?.charAt(0).toUpperCase() ?? '?'
  const bgAvatar = membroAtivo ? corAvatar(membroAtivo.nome) : 'var(--color-primary)'
  const primeiroNome = membroAtivo?.nome?.split(' ')[0] ?? 'Membro'

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

        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}>
          <div ref={dropdownRef} style={{ position: 'relative' }}>
            <button
              className="theme-toggle"
              onClick={() => setDropdownAberto(v => !v)}
              aria-label={`Membro ativo: ${membroAtivo?.nome ?? 'nenhum'}. Clique para trocar`}
              aria-haspopup="menu"
              aria-expanded={dropdownAberto}
              title="Trocar membro"
              style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)', paddingInline: 'var(--space-2)', minHeight: 36 }}
            >
              <div style={{
                width: 24, height: 24, borderRadius: '50%',
                background: bgAvatar,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontSize: '0.7rem', fontWeight: 700,
                flexShrink: 0, lineHeight: 1,
              }} aria-hidden>
                {inicialNome}
              </div>
              <span style={{
                fontSize: 'var(--text-sm)', fontWeight: 500,
                maxWidth: 72, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {primeiroNome}
              </span>
              <ChevronDown
                size={14}
                aria-hidden
                style={{ transition: 'transform 180ms', transform: dropdownAberto ? 'rotate(180deg)' : 'rotate(0deg)' }}
              />
            </button>

            {dropdownAberto && (
              <div
                role="menu"
                aria-label="Selecionar membro da família"
                style={{
                  position: 'absolute', top: 'calc(100% + var(--space-1))', right: 0,
                  background: 'var(--color-surface)', border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-lg)',
                  minWidth: 200, zIndex: 200, overflow: 'hidden',
                  padding: 'var(--space-1) 0',
                }}
              >
                <p style={{
                  fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)',
                  padding: 'var(--space-2) var(--space-3)',
                  borderBottom: '1px solid var(--color-divider)', marginBottom: 'var(--space-1)',
                  fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em',
                }}>
                  Família
                </p>

                {membros.map(membro => {
                  const isAtivo = membro.id === membroAtivo?.id
                  const bg = corAvatar(membro.nome)
                  const inicial = membro.nome.charAt(0).toUpperCase()
                  return (
                    <button
                      key={membro.id}
                      role="menuitem"
                      aria-current={isAtivo ? 'true' : undefined}
                      onClick={() => handleSelecionarMembro(membro)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
                        width: '100%', padding: 'var(--space-2) var(--space-3)',
                        background: isAtivo ? 'var(--color-primary-highlight)' : 'transparent',
                        border: 'none', cursor: 'pointer', textAlign: 'left',
                        minHeight: 44,
                        transition: 'background 150ms',
                      }}
                      onMouseEnter={e => { if (!isAtivo) (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-surface-offset)' }}
                      onMouseLeave={e => { if (!isAtivo) (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
                    >
                      <div style={{
                        width: 28, height: 28, borderRadius: '50%',
                        background: bg, flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#fff', fontSize: '0.75rem', fontWeight: 700,
                      }} aria-hidden>
                        {inicial}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 'var(--text-sm)', fontWeight: isAtivo ? 600 : 400, color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {membro.nome}
                        </div>
                        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                          {PARENTESCO_LABEL[membro.parentesco]}
                        </div>
                      </div>
                      {isAtivo && <Check size={14} color="var(--color-primary)" aria-hidden />}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          <button className="theme-toggle" onClick={handleLogout} aria-label="Sair da conta" title="Sair">
            <LogOut size={18} aria-hidden />
          </button>

          <button
            className="theme-toggle"
            onClick={toggleTheme}
            aria-label={`Alternar para modo ${theme === 'dark' ? 'claro' : 'escuro'}`}
            title={`Modo ${theme === 'dark' ? 'claro' : 'escuro'}`}
          >
            {theme === 'dark' ? <Sun size={20} aria-hidden /> : <Moon size={20} aria-hidden />}
          </button>

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

      {painelAberto && (
        <AccessibilityPanel onClose={() => setPainelAberto(false)} />
      )}
    </>
  )
}
