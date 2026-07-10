import { NavLink } from 'react-router-dom'
import { Home, Users, Syringe, CalendarDays, BookOpen } from 'lucide-react'

const navItems = [
  { to: '/',        icon: Home,         label: 'Início' },
  { to: '/membros', icon: Users,        label: 'Membros' },
  { to: '/vacinas', icon: Syringe,      label: 'Vacinas' },
  { to: '/agenda',  icon: CalendarDays, label: 'Agenda' },
  { to: '/conteudo',icon: BookOpen,     label: 'Conteúdo' },
]

export function BottomNav() {
  return (
    <ul role="list">
      {navItems.map(({ to, icon: Icon, label }) => (
        <li key={to}>
          <NavLink
            to={to}
            end={to === '/'}
            className={({ isActive }) => isActive ? 'active' : ''}
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
