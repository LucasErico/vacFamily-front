import { NavLink } from 'react-router-dom'
import { Home, Users, Syringe, Bell, BookOpen, MessageCircle, Settings, X } from 'lucide-react'

interface SidebarProps {
  open: boolean
  onClose: () => void
}

const navItems = [
  { to: '/',           icon: Home,           label: 'Início',       end: true },
  { to: '/membros',    icon: Users,          label: 'Membros',      end: false },
  { to: '/vacinas',    icon: Syringe,        label: 'Vacinas',      end: false },
  { to: '/lembretes',  icon: Bell,           label: 'Lembretes',    end: false },
  { to: '/conteudo',   icon: BookOpen,       label: 'Conteúdo',     end: false },
  { to: '/assistente', icon: MessageCircle,  label: 'Assistente',   end: false },
]

export function Sidebar({ open, onClose }: SidebarProps) {
  return (
    <>
      {/* Overlay mobile */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm md:hidden"
          onClick={onClose}
          aria-hidden
        />
      )}

      {/* Painel */}
      <aside
        className={[
          'fixed top-16 left-0 bottom-0 z-30',
          'w-64 bg-white dark:bg-gray-950',
          'border-r border-gray-200 dark:border-gray-800',
          'flex flex-col',
          'transition-transform duration-200 ease-in-out',
          open ? 'translate-x-0 shadow-xl' : '-translate-x-full',
        ].join(' ')}
        aria-label="Menu lateral"
      >
        {/* Header da sidebar (mobile: botão fechar) */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800 md:hidden">
          <span className="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Menu</span>
          <button className="btn-icon" onClick={onClose} aria-label="Fechar menu">
            <X size={18} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-2" aria-label="Menu principal">
          <ul role="list" className="space-y-0.5">
            {navItems.map(({ to, icon: Icon, label, end }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  end={end}
                  className={({ isActive }) =>
                    `nav-link${isActive ? ' active' : ''}`
                  }
                  onClick={() => { if (window.innerWidth < 768) onClose() }}
                >
                  <Icon size={18} aria-hidden />
                  {label}
                </NavLink>
              </li>
            ))}
          </ul>

          <div className="my-3 border-t border-gray-100 dark:border-gray-800" />

          <ul role="list">
            <li>
              <NavLink
                to="/configuracoes"
                className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
                onClick={() => { if (window.innerWidth < 768) onClose() }}
              >
                <Settings size={18} aria-hidden />
                Configurações
              </NavLink>
            </li>
          </ul>
        </nav>

        {/* Footer da sidebar */}
        <div className="p-4 border-t border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#006B3F] flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
              WJ
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">Wellisson Junior</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">Administrador</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}
