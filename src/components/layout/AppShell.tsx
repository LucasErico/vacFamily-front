import { Outlet } from 'react-router-dom'
import { TopBar } from './TopBar'
import { BottomNav } from './BottomNav'
import { Sidebar } from './Sidebar'

export function AppShell() {
  return (
    <div className="flex min-h-dvh bg-[var(--color-bg)]">
      <aside className="hidden md:flex md:flex-col md:w-[var(--sidebar-width)] md:fixed md:inset-y-0 md:border-r md:border-[var(--color-border)] bg-[var(--color-surface)] z-20">
        <Sidebar />
      </aside>
      <div className="flex flex-col flex-1 md:ml-[var(--sidebar-width)]">
        <TopBar />
        <main id="main-content" className="flex-1 px-4 pt-4 pb-safe overflow-y-auto" role="main">
          <Outlet />
        </main>
      </div>
      <nav className="md:hidden fixed bottom-0 inset-x-0 h-[var(--nav-bottom-height)] bg-[var(--color-surface)] border-t border-[var(--color-border)] z-20" aria-label="Navegação principal">
        <BottomNav />
      </nav>
    </div>
  )
}
