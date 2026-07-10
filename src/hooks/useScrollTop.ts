/**
 * useScrollTop
 * Observa o scroll de um elemento via ref e retorna:
 *   - visible: se o botão deve aparecer (scrollTop > threshold)
 *   - scrollToTop: função para rolar suavemente ao topo
 */
import { useEffect, useRef, useState, useCallback, type RefObject } from 'react'

interface Options {
  threshold?: number   // px de scroll mínimo para mostrar o botão (default 120)
}

export function useScrollTop<T extends HTMLElement>(
  options: Options = {}
): { ref: RefObject<T>; visible: boolean; scrollToTop: () => void } {
  const { threshold = 120 } = options
  const ref = useRef<T>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const onScroll = () => setVisible(el.scrollTop > threshold)
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [threshold])

  const scrollToTop = useCallback(() => {
    ref.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  return { ref, visible, scrollToTop }
}
