import { NavLink } from 'react-router-dom'
import { Home, Users, Syringe, CalendarDays, ClipboardList } from 'lucide-react'

const navItems = [
  { to: '/',          icon: Home,          label: 'Início' },
  { to: '/membros',   icon: Users,         label: 'Família' },
  { to: '/vacinas',   icon: Syringe,       label: 'Vacinas' },
  { to: '/agenda',    icon: CalendarDays,  label: 'Agenda' },
  { to: '/historico', icon: ClipboardList, label: 'Histórico' },
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
            aria-current={undefined} // controlado abaixo via render prop
          >
            {({ isActive }) => (
              <>
                {/* aria-current injetado no elemento pai via wrapper — NavLink não aceita
                    aria-current como função, então usamos um span wrapper invisível */}
                <Icon size={22} aria-hidden="true" />
                <span>{label}</span>
                {/* Anuncia ao leitor de tela a página ativa */}
                {isActive && <span className="sr-only">(página atual)</span>}
              </>
            )}
          </NavLink>
        </li>
      ))}
    </ul>
  )
}
