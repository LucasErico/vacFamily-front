import { NavLink } from 'react-router-dom'
import { Menu, X, Sun, Moon, Bell } from 'lucide-react'
import { useState, useEffect } from 'react'

interface HeaderProps {
  sidebarOpen: boolean
  onToggleSidebar: () => void
}

export function Header({ sidebarOpen, onToggleSidebar }: HeaderProps) {
  const [dark, setDark] = useState(() =>
    document.documentElement.classList.contains('dark')
  )

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
  }, [dark])

  return (
    <header className="fixed top-0 left-0 right-0 z-40 h-16 bg-white dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800 shadow-sm">
      <div className="flex items-center justify-between h-full px-4 max-w-screen-2xl mx-auto">

        {/* Esquerda: Hamburguer + Logo */}
        <div className="flex items-center gap-3">
          <button
            className="btn-icon"
            onClick={onToggleSidebar}
            aria-label={sidebarOpen ? 'Fechar menu' : 'Abrir menu'}
            aria-expanded={sidebarOpen}
          >
            {sidebarOpen ? <X size={22} /> : <Menu size={22} />}
          </button>

          <NavLink to="/" className="flex items-center gap-2 select-none">
            <div className="w-8 h-8 rounded-lg bg-[#006B3F] flex items-center justify-center flex-shrink-0">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M9 12h6m-3-3v6" />
                <circle cx="12" cy="12" r="9" />
              </svg>
            </div>
            <span className="text-base font-bold text-gray-900 dark:text-white" style={{ fontFamily: 'var(--font-display)' }}>
              VacFamily
            </span>
          </NavLink>
        </div>

        {/* Direita: ações */}
        <div className="flex items-center gap-1">
          <button className="btn-icon relative" aria-label="Notificações">
            <Bell size={20} />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#E8B800] rounded-full" aria-hidden />
          </button>

          <button
            className="btn-icon"
            onClick={() => setDark(d => !d)}
            aria-label={`Alternar para modo ${dark ? 'claro' : 'escuro'}`}
          >
            {dark ? <Sun size={20} /> : <Moon size={20} />}
          </button>

          {/* Avatar do usuário */}
          <div className="w-9 h-9 rounded-full bg-[#006B3F] flex items-center justify-center text-white text-sm font-bold ml-1 cursor-pointer select-none" aria-label="Perfil">
            WJ
          </div>
        </div>

      </div>
    </header>
  )
}
