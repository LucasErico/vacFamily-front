/**
 * InfoCarousel
 * Carrossel horizontal de cards informativos no topo do Dashboard.
 * Cards vêm do adminStorage e podem ser editados pelo painel admin.
 *
 * Funcionalidades:
 * - Autoplay com pausa ao hover/focus
 * - Swipe touch (mobile)
 * - Dots de navegação clicáveis + setas prev/next
 * - Contador numérico
 * - Animação fadeSlide na troca de card
 * - Acessível: aria-live, aria-label, aria-current
 */
import { useEffect, useState, useRef, useCallback } from 'react'
import { ChevronLeft, ChevronRight, ShieldCheck, Syringe, Bell, Users, Info } from 'lucide-react'
import { getCards, type CardConteudo } from '@/services/adminStorage'

const ICONS: Record<string, React.ReactNode> = {
  ShieldCheck: <ShieldCheck size={22} aria-hidden />,
  Syringe:     <Syringe     size={22} aria-hidden />,
  Bell:        <Bell        size={22} aria-hidden />,
  Users:       <Users       size={22} aria-hidden />,
  Info:        <Info        size={22} aria-hidden />,
}

const AUTOPLAY_MS = 4500
const SWIPE_THRESHOLD = 40 // px mínimos para considerar swipe

export function InfoCarousel() {
  const [cards, setCards]   = useState<CardConteudo[]>([])
  const [idx, setIdx]       = useState(0)
  const [paused, setPaused] = useState(false)
  const [animKey, setAnimKey] = useState(0) // força re-mount da animação

  // Touch tracking
  const touchStartX = useRef<number | null>(null)
  const timerRef    = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const ativos = getCards().filter(c => c.ativo).sort((a, b) => a.ordem - b.ordem)
    setCards(ativos)
  }, [])

  const total = cards.length

  const goTo = useCallback((i: number) => {
    setIdx(i)
    setAnimKey(k => k + 1)
  }, [])

  const prev = useCallback(() => goTo((idx - 1 + total) % total), [idx, total, goTo])
  const next = useCallback(() => goTo((idx + 1) % total), [idx, total, goTo])

  // Autoplay
  useEffect(() => {
    if (paused || total <= 1) return
    timerRef.current = setTimeout(next, AUTOPLAY_MS)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [idx, paused, next, total])

  // Swipe touch
  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return
    const delta = e.changedTouches[0].clientX - touchStartX.current
    touchStartX.current = null
    if (Math.abs(delta) < SWIPE_THRESHOLD) return
    if (delta < 0) next()
    else prev()
  }

  if (total === 0) return null

  const card = cards[idx]

  return (
    <>
      <style>{`
        @keyframes carouselFadeSlide {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .carousel-content {
          animation: carouselFadeSlide 280ms cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        @media (prefers-reduced-motion: reduce) {
          .carousel-content { animation: none; }
        }
      `}</style>

      <section
        aria-label="Informações rápidas"
        aria-roledescription="carrossel"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocus={() => setPaused(true)}
        onBlur={() => setPaused(false)}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        style={{
          position: 'relative',
          borderRadius: 'var(--radius-xl)',
          overflow: 'hidden',
          background: card.cor,
          minHeight: 110,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          boxShadow: 'var(--shadow-md)',
          userSelect: 'none',
        }}
      >
        {/* Conteúdo com animação */}
        <div
          key={animKey}
          className="carousel-content"
          aria-live="polite"
          aria-atomic="true"
          style={{
            padding: 'var(--space-5) var(--space-5) var(--space-3)',
            display: 'flex',
            gap: 'var(--space-4)',
            alignItems: 'flex-start',
          }}
        >
          {/* Ícone */}
          <div style={{
            width: 40, height: 40,
            borderRadius: 'var(--radius-md)',
            background: 'oklch(100% 0 0 / 0.18)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
            color: '#fff',
          }}>
            {ICONS[card.icone] ?? ICONS.Info}
          </div>

          {/* Texto */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{
              fontSize: 'var(--text-sm)',
              fontWeight: 700,
              color: '#fff',
              marginBottom: 'var(--space-1)',
              lineHeight: 1.3,
            }}>
              {card.titulo}
            </p>
            <p style={{
              fontSize: 'var(--text-xs)',
              color: 'oklch(100% 0 0 / 0.85)',
              lineHeight: 1.5,
            }}>
              {card.descricao}
            </p>
          </div>
        </div>

        {/* Rodapé: nav + dots + contador */}
        {total > 1 && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: 'var(--space-2) var(--space-4) var(--space-3)',
          }}>
            {/* Setas prev/next */}
            <div style={{ display: 'flex', gap: 'var(--space-1)' }}>
              <button
                onClick={prev}
                aria-label="Card anterior"
                style={carouselBtnStyle}
                onMouseEnter={e => (e.currentTarget.style.background = 'oklch(100% 0 0 / 0.3)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'oklch(100% 0 0 / 0.18)')}
              >
                <ChevronLeft size={14} aria-hidden />
              </button>
              <button
                onClick={next}
                aria-label="Próximo card"
                style={carouselBtnStyle}
                onMouseEnter={e => (e.currentTarget.style.background = 'oklch(100% 0 0 / 0.3)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'oklch(100% 0 0 / 0.18)')}
              >
                <ChevronRight size={14} aria-hidden />
              </button>
            </div>

            {/* Dots indicadores */}
            <div
              role="tablist"
              aria-label="Selecionar card"
              style={{ display: 'flex', gap: 'var(--space-1)', alignItems: 'center' }}
            >
              {cards.map((c, i) => (
                <button
                  key={c.id}
                  role="tab"
                  onClick={() => goTo(i)}
                  aria-label={`Card ${i + 1}: ${c.titulo}`}
                  aria-selected={i === idx}
                  style={{
                    width: i === idx ? 16 : 6,
                    height: 6,
                    borderRadius: 'var(--radius-full)',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 0,
                    background: i === idx
                      ? 'oklch(100% 0 0 / 0.95)'
                      : 'oklch(100% 0 0 / 0.35)',
                    transition: 'width 250ms ease, background 250ms ease',
                  }}
                />
              ))}
            </div>

            {/* Contador */}
            <span style={{
              fontSize: 'var(--text-xs)',
              color: 'oklch(100% 0 0 / 0.7)',
              fontVariantNumeric: 'tabular-nums',
              minWidth: '2.5ch',
              textAlign: 'right',
            }}>
              {idx + 1}/{total}
            </span>
          </div>
        )}
      </section>
    </>
  )
}

const carouselBtnStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  width: 26, height: 26,
  borderRadius: 'var(--radius-full)',
  border: 'none',
  background: 'oklch(100% 0 0 / 0.18)',
  color: '#fff',
  cursor: 'pointer',
  transition: 'background 180ms ease',
}
