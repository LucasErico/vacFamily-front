import { NavLink } from 'react-router-dom'
import { Home, Users, Syringe, Bell, BookOpen } from 'lucide-react'

const navItems = [
  { to: '/',          icon: Home,     label: 'Início' },
  { to: '/membros',   icon: Users,    label: 'Membros' },
  { to: '/vacinas',   icon: Syringe,  label: 'Vacinas' },
  { to: '/lembretes', icon: Bell,     label: 'Alertas' },
  { to: '/conteudo',  icon: BookOpen, label: 'Conteúdo' },
]

export function BottomNav() {
  return (
    <ul className="flex h-full items-center justify-around px-2" role="list">
      {navItems.map(({ to, icon: Icon, label }) => (
        <li key={to}>
          <NavLink
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors min-w-[44px] min-h-[44px] justify-center ${
                isActive
                  ? 'text-[var(--color-primary)]'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
              }`
            }
            aria-label={label}
          >
            <Icon size={22} aria-hidden="true" />
            <span>{label}</span>
          </NavLink>
        </li>
      ))}
    </ul>
  )
}
