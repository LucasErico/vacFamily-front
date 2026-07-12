/**
 * AdminShell
 * Layout base do painel admin. Verifica sessão e redireciona
 * para /admin/login se não autenticado.
 *
 * A sessão agora é um JWT real (setado pelo AdminLoginPage via setToken),
 * então todas as requisições do painel já enviam Bearer token automaticamente.
 */
import { useEffect } from 'react'
import { Outlet, useNavigate, NavLink } from 'react-router-dom'
import { LayoutDashboard, Users, Newspaper, LogOut, ShieldCheck } from 'lucide-react'
import { isAdminLoggedIn, clearAdminSession } from './AdminLoginPage'

const adminNav = [
  { to: '/admin',          label: 'Visão geral',   icon: LayoutDashboard, end: true },
  { to: '/admin/usuarios', label: 'Usuários',      icon: Users },
  { to: '/admin/cards',    label: 'Cards de info',  icon: Newspaper },
]

export function AdminShell() {
  const navigate = useNavigate()

  useEffect(() => {
    if (!isAdminLoggedIn()) navigate('/admin/login', { replace: true })
  }, [navigate])

  function handleLogout() {
    clearAdminSession()
    navigate('/admin/login', { replace: true })
  }

  return (
    <div style={{
      minHeight: '100dvh',
      display: 'grid',
      gridTemplateColumns: '220px 1fr',
      background: 'var(--color-bg)',
    }}>
      {/* Sidebar admin */}
      <aside style={{
        background: 'var(--color-surface)',
        borderRight: '1px solid var(--color-border)',
        display: 'flex',
        flexDirection: 'column',
        padding: 'var(--space-5)',
        gap: 'var(--space-2)',
      }}>
        {/* Logo */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
          marginBottom: 'var(--space-4)',
        }}>
          <div style={{
            width: 32, height: 32,
            borderRadius: 'var(--radius-md)',
            background: 'var(--color-primary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <ShieldCheck size={16} color="#fff" aria-hidden />
          </div>
          <span style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            fontSize: 'var(--text-sm)',
            color: 'var(--color-text)',
          }}>
            Admin
          </span>
        </div>

        {/* Nav links */}
        <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
          {adminNav.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              style={({ isActive }) => ({
                display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
                padding: 'var(--space-3) var(--space-4)',
                borderRadius: 'var(--radius-md)',
                textDecoration: 'none',
                fontSize: 'var(--text-sm)',
                fontWeight: isActive ? 600 : 400,
                color: isActive ? 'var(--color-primary)' : 'var(--color-text-muted)',
                background: isActive ? 'var(--color-primary-highlight)' : 'transparent',
                transition: 'all var(--transition)',
              })}
            >
              <Icon size={16} aria-hidden /> {label}
            </NavLink>
          ))}
        </nav>

        {/* Logout */}
        <button
          onClick={handleLogout}
          style={{
            display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
            padding: 'var(--space-3) var(--space-4)',
            borderRadius: 'var(--radius-md)',
            border: 'none', background: 'transparent',
            color: 'var(--color-text-muted)',
            fontSize: 'var(--text-sm)', cursor: 'pointer',
            transition: 'all var(--transition)',
          }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-error)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-text-muted)')}
        >
          <LogOut size={16} aria-hidden /> Sair do admin
        </button>
      </aside>

      {/* Conteúdo */}
      <main style={{
        padding: 'var(--space-8)',
        overflowY: 'auto',
        maxWidth: 900,
      }}>
        <Outlet />
      </main>
    </div>
  )
}
