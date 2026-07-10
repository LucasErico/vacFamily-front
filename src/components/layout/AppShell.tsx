import { Outlet, useRef } from 'react-router-dom'
import { TopBar } from './TopBar'
import { BottomNav } from './BottomNav'
import { Sidebar } from './Sidebar'
import { ScrollToTopButton } from '@/components/ui/ScrollToTopButton'
import { useEffect, useState, useCallback } from 'react'
import { useRef as useReactRef } from 'react'

/**
 * Hook inline para observar o scroll do main element via id,
 * evitando problemas de cast de RefObject.
 */
function usePageScrollTop(threshold = 120) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = document.getElementById('main-content')
    if (!el) return
    const onScroll = () => setVisible(el.scrollTop > threshold)
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [threshold])

  const scrollToTop = useCallback(() => {
    document.getElementById('main-content')?.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  return { visible, scrollToTop }
}

export function AppShell() {
  const { visible, scrollToTop } = usePageScrollTop(120)

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-main">
        <TopBar />
        <main
          id="main-content"
          className="page-content"
          role="main"
        >
          <Outlet />
        </main>
      </div>
      <nav className="bottom-nav" aria-label="Navegação principal">
        <BottomNav />
      </nav>

      <ScrollToTopButton visible={visible} onClick={scrollToTop} position="page" />
    </div>
  )
}
