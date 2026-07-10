import { Outlet } from 'react-router-dom'
import { useEffect, useState, useCallback } from 'react'
import { TopBar } from './TopBar'
import { BottomNav } from './BottomNav'
import { Sidebar } from './Sidebar'
import { ScrollToTopButton } from '@/components/ui/ScrollToTopButton'

/**
 * Observa o scroll do elemento #main-content.
 * Usa um pequeno delay no attach para garantir que o DOM já está montado.
 */
function usePageScrollTop(threshold = 120) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    let el: HTMLElement | null = null

    // Tenta imediatamente; se não encontrar, tenta após um frame
    const attach = () => {
      el = document.getElementById('main-content') as HTMLElement | null
      if (!el) return false
      const onScroll = () => setVisible(el!.scrollTop > threshold)
      el.addEventListener('scroll', onScroll, { passive: true })
      // cleanup retornado internamente
      return () => el!.removeEventListener('scroll', onScroll)
    }

    let cleanup: (() => void) | false = attach()
    let raf: number
    if (!cleanup) {
      raf = requestAnimationFrame(() => {
        cleanup = attach()
      })
    }

    return () => {
      cancelAnimationFrame(raf)
      if (cleanup) cleanup()
    }
  }, [threshold])

  const scrollToTop = useCallback(() => {
    const el = document.getElementById('main-content')
    el?.scrollTo({ top: 0, behavior: 'smooth' })
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
