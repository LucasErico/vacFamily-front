import { Outlet } from 'react-router-dom'
import { useState, useCallback, useEffect } from 'react'
import { TopBar } from './TopBar'
import { BottomNav } from './BottomNav'
import { Sidebar } from './Sidebar'
import { ScrollToTopButton } from '@/components/ui/ScrollToTopButton'

const MAIN_ID = 'main-content'
const THRESHOLD = 120

function getMain() {
  return document.getElementById(MAIN_ID) as HTMLElement | null
}

export function AppShell() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // Aguarda o elemento existir no DOM
    const el = getMain()
    if (!el) return

    const onScroll = () => setVisible(el.scrollTop > THRESHOLD)
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [])

  const scrollToTop = useCallback(() => {
    getMain()?.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-main">
        <TopBar />
        <main
          id={MAIN_ID}
          className="page-content"
          role="main"
        >
          <Outlet />
        </main>
      </div>
      <nav className="bottom-nav" aria-label="Navegação principal">
        <BottomNav />
      </nav>

      <ScrollToTopButton
        visible={visible}
        onClick={scrollToTop}
        position="page"
      />
    </div>
  )
}
