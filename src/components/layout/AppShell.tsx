import { Outlet } from 'react-router-dom'
import { useState, useCallback } from 'react'
import { TopBar } from './TopBar'
import { BottomNav } from './BottomNav'
import { Sidebar } from './Sidebar'
import { ScrollToTopButton } from '@/components/ui/ScrollToTopButton'

export function AppShell() {
  const [scrollVisible, setScrollVisible] = useState(false)

  const handleScroll = useCallback((e: React.UIEvent<HTMLElement>) => {
    setScrollVisible(e.currentTarget.scrollTop > 120)
  }, [])

  const scrollToTop = useCallback((e: React.UIEvent<HTMLElement> | null, el?: HTMLElement | null) => {
    const target = el ?? document.getElementById('main-content')
    target?.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  const handleScrollToTop = useCallback(() => {
    document.getElementById('main-content')?.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-main">
        <TopBar />
        <main
          id="main-content"
          className="page-content"
          role="main"
          onScroll={handleScroll}
        >
          <Outlet />
        </main>
      </div>
      <nav className="bottom-nav" aria-label="Navegação principal">
        <BottomNav />
      </nav>

      <ScrollToTopButton
        visible={scrollVisible}
        onClick={handleScrollToTop}
        position="page"
      />
    </div>
  )
}
