import { NavLink } from 'react-router-dom'
import { Home, Users, Syringe, CalendarDays, BookOpen, Settings } from 'lucide-react'

const navItems = [
  { to: '/',         icon: Home,        label: 'Início' },
  { to: '/membros',  icon: Users,       label: 'Membros' },
  { to: '/vacinas',  icon: Syringe,     label: 'Vacinas' },
  { to: '/agenda',   icon: CalendarDays,label: 'Agenda' },
  { to: '/conteudo', icon: BookOpen,    label: 'Conteúdo' },
]

export function Sidebar() {
  return (
    <aside className="sidebar" aria-label="Menu lateral">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M9 12h6m-3-3v6"/>
            <circle cx="12" cy="12" r="9"/>
          </svg>
        </div>
        <span className="sidebar-logo-text">VacFamily</span>
      </div>

      {/* Links */}
      <nav className="sidebar-nav" aria-label="Menu principal">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
          >
            <Icon size={18} aria-hidden="true" />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Configurações */}
      <NavLink
        to="/configuracoes"
        className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
      >
        <Settings size={18} aria-hidden="true" />
        Configurações
      </NavLink>
    </aside>
  )
}
