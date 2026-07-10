import { Outlet } from 'react-router-dom'
import { TopBar } from './TopBar'
import { BottomNav } from './BottomNav'
import { Sidebar } from './Sidebar'

function ScrollTopBtn() {
  return (
    <button
      aria-label="Voltar ao topo"
      title="Voltar ao topo"
      onClick={() =>
        document.getElementById('main-content')?.scrollTo({ top: 0, behavior: 'smooth' })
      }
      style={{
        position: 'fixed',
        bottom: 'calc(var(--nav-h) + var(--space-4))',
        right: 'var(--space-5)',
        zIndex: 99,
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-2)',
        padding: 'var(--space-2) var(--space-4)',
        borderRadius: 'var(--radius-full)',
        background: 'var(--color-primary)',
        color: '#fff',
        border: 'none',
        cursor: 'pointer',
        fontSize: 'var(--text-xs)',
        fontWeight: 600,
        boxShadow: 'var(--shadow-md)',
      }}
    >
      ↑ Voltar ao topo
    </button>
  )
}

export function AppShell() {
  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-main">
        <TopBar />
        <main id="main-content" className="page-content" role="main">
          <Outlet />
        </main>
      </div>
      <nav className="bottom-nav" aria-label="Navegação principal">
        <BottomNav />
      </nav>
      <ScrollTopBtn />
    </div>
  )
}
