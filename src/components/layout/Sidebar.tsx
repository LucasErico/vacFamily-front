import { NavLink } from 'react-router-dom'
import { Home, Users, Syringe, Bell, BookOpen, MessageCircle, Settings } from 'lucide-react'

const navItems = [
  { to: '/',           icon: Home,           label: 'Início' },
  { to: '/membros',    icon: Users,           label: 'Membros' },
  { to: '/vacinas',    icon: Syringe,         label: 'Vacinas' },
  { to: '/lembretes',  icon: Bell,            label: 'Lembretes' },
  { to: '/conteudo',   icon: BookOpen,        label: 'Conteúdo' },
  { to: '/assistente', icon: MessageCircle,   label: 'Assistente' },
]

export function Sidebar() {
  return (
    <div className="flex flex-col h-full py-6 px-3">
      <div className="px-3 mb-8">
        <span className="font-display font-bold text-lg text-[var(--color-primary)]">VacFamily</span>
      </div>
      <nav aria-label="Menu principal" className="flex-1">
        <ul className="space-y-1" role="list">
          {navItems.map(({ to, icon: Icon, label }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-[var(--color-primary-highlight)] text-[var(--color-primary)]'
                      : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-offset)] hover:text-[var(--color-text)]'
                  }`
                }
              >
                <Icon size={18} aria-hidden="true" />
                {label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <NavLink
        to="/configuracoes"
        className={({ isActive }) =>
          `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            isActive
              ? 'bg-[var(--color-primary-highlight)] text-[var(--color-primary)]'
              : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-offset)] hover:text-[var(--color-text)]'
          }`
        }
      >
        <Settings size={18} aria-hidden="true" />
        Configurações
      </NavLink>
    </div>
  )
}
