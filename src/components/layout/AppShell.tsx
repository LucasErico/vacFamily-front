import { Outlet } from 'react-router-dom'
import { TopBar } from './TopBar'
import { BottomNav } from './BottomNav'
import { Sidebar } from './Sidebar'
import { ScrollToTopButton } from '@/components/ui/ScrollToTopButton'
import { useScrollTop } from '@/hooks/useScrollTop'

export function AppShell() {
  const { ref: mainRef, scrollToTop } = useScrollTop<HTMLElement>({ threshold: 120 })

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-main">
        <TopBar />
        <main
          id="main-content"
          className="page-content"
          role="main"
          ref={mainRef}
        >
          <Outlet />
        </main>
      </div>
      <nav className="bottom-nav" aria-label="Navegação principal">
        <BottomNav />
      </nav>

      {/* TESTE: sempre visivel para verificar posicionamento */}
      <ScrollToTopButton
        visible={true}
        onClick={scrollToTop}
        position="page"
      />
    </div>
  )
}
