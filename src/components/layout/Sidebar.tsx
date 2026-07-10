import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { Home, Users, Syringe, CalendarDays, ClipboardList, BookOpen } from 'lucide-react'
import { OnboardingTour } from '@/components/ui/OnboardingTour'

const navItems = [
  { to: '/',          icon: Home,          label: 'Início' },
  { to: '/membros',   icon: Users,         label: 'Família' },
  { to: '/vacinas',   icon: Syringe,       label: 'Vacinas' },
  { to: '/agenda',    icon: CalendarDays,  label: 'Agenda' },
  { to: '/historico', icon: ClipboardList, label: 'Histórico' },
]

export function Sidebar() {
  const navigate = useNavigate()
  const [tourAberto, setTourAberto] = useState(false)

  return (
    <>
      <aside className="sidebar" aria-label="Menu lateral">
        {/* Logo */}
        <button
          onClick={() => navigate('/')}
          aria-label="Ir para a página inicial"
          title="Início"
          className="sidebar-logo"
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            width: '100%',
            textAlign: 'left',
            padding: 0,
          }}
        >
          <div className="sidebar-logo-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white"
              strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M9 12h6m-3-3v6"/><circle cx="12" cy="12" r="9"/>
            </svg>
          </div>
          <span className="sidebar-logo-text">VacFamily</span>
        </button>

        {/* Links de navegação */}
        <nav className="sidebar-nav" aria-label="Menu principal" style={{ flex: 1 }}>
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
            >
              <Icon size={18} aria-hidden />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Rodapé da sidebar */}
        <div style={{
          marginTop: 'auto',
          paddingTop: 'var(--space-4)',
          borderTop: '1px solid var(--color-divider)',
        }}>
          <button
            onClick={() => setTourAberto(true)}
            aria-label="Ver apresentação do aplicativo"
            title="Tour pelo app"
            className="sidebar-link"
            style={{ width: '100%', justifyContent: 'flex-start' }}
          >
            <BookOpen size={18} aria-hidden />
            Tour pelo app
          </button>
        </div>
      </aside>

      {tourAberto && (
        <OnboardingTour onClose={() => setTourAberto(false)} />
      )}
    </>
  )
}
