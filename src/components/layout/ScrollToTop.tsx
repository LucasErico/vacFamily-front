/**
 * ScrollToTop
 * Monta-se dentro do AppShell (dentro do <RouterProvider>).
 * A cada mudança de rota, rola a janela para o topo — garante que todas
 * as páginas iniciem no scroll 0, sem herdar a posição da página anterior.
 */
import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

export function ScrollToTop() {
  const { pathname } = useLocation()

  useEffect(() => {
    // Scroll suave se o browser suportar, fallback imediato caso contrário
    try {
      window.scrollTo({ top: 0, behavior: 'instant' })
    } catch {
      window.scrollTo(0, 0)
    }
  }, [pathname])

  return null
}
