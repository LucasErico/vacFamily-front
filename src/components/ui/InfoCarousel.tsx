/**
 * InfoCarousel — v3
 * Carrossel de cards informativos no Dashboard.
 *
 * Layout: seta esquerda | conteúdo | seta direita
 * - Ícone 32 px, título bold/lg, descrição sm
 * - Autoplay 10 000 ms com pausa em hover/focus/touch
 * - Swipe touch (threshold 40 px)
 * - Dots + contador no rodapé
 * - fadeSlide animation, prefers-reduced-motion respeitado
 * - Cores em hex → sem dependência de CSS vars no background inline
 */
import { useEffect, useState, useRef, useCallback } from 'react'
import {
  ChevronLeft, ChevronRight,
  ShieldCheck, Syringe, Bell, Users, Info,
  Heart, Baby, Star, Stethoscope, Activity,
  ClipboardList, CalendarCheck, AlertTriangle, BookOpen, Smile,
} from 'lucide-react'
import { getCards, type CardConteudo } from '@/services/adminStorage'

const ICONS: Record<string, React.ReactNode> = {
  ShieldCheck:    <ShieldCheck    size={32} aria-hidden />,
  Syringe:        <Syringe        size={32} aria-hidden />,
  Bell:           <Bell           size={32} aria-hidden />,
  Users:          <Users          size={32} aria-hidden />,
  Info:           <Info           size={32} aria-hidden />,
  Heart:          <Heart          size={32} aria-hidden />,
  Baby:           <Baby           size={32} aria-hidden />,
  Star:           <Star           size={32} aria-hidden />,
  Stethoscope:    <Stethoscope    size={32} aria-hidden />,
  Activity:       <Activity       size={32} aria-hidden />,
  ClipboardList:  <ClipboardList  size={32} aria-hidden />,
  CalendarCheck:  <CalendarCheck  size={32} aria-hidden />,
  AlertTriangle:  <AlertTriangle  size={32} aria-hidden />,
  BookOpen:       <BookOpen       size={32} aria-hidden />,
  Smile:          <Smile          size={32} aria-hidden />,
}

const AUTOPLAY_MS = 10_000
const SWIPE_THRESHOLD = 40

export function InfoCarousel() {
  const [cards, setCards]     = useState<CardConteudo[]>([])
  const [idx, setIdx]         = useState(0)
  const [paused, setPaused]   = useState(false)
  const [animKey, setAnimKey] = useState(0)
  const touchStartX           = useRef<number | null>(null)
  const timerRef              = useRef<ReturnType<typeof setTimeout> | null>(null)

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

  useEffect(() => {
    if (paused || total <= 1) return
    timerRef.current = setTimeout(next, AUTOPLAY_MS)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [idx, paused, next, total])

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX
  }
  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return
    const delta = e.changedTouches[0].clientX - touchStartX.current
    touchStartX.current = null
    if (Math.abs(delta) < SWIPE_THRESHOLD) return
    delta < 0 ? next() : prev()
  }

  if (total === 0) return null

  const card = cards[idx]

  return (
    <>
      <style>{`
        @keyframes carouselFadeSlide {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .carousel-content {
          animation: carouselFadeSlide 300ms cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        @media (prefers-reduced-motion: reduce) {
          .carousel-content { animation: none; }
        }
        .carousel-arrow {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          min-width: 32px;
          height: 32px;
          border-radius: 50%;
          border: none;
          background: rgba(255,255,255,0.18);
          color: #fff;
          cursor: pointer;
          transition: background 180ms ease;
          flex-shrink: 0;
        }
        .carousel-arrow:hover {
          background: rgba(255,255,255,0.32);
        }
        .carousel-arrow:active {
          background: rgba(255,255,255,0.45);
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
          borderRadius: '16px',
          overflow: 'hidden',
          background: card.cor,
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          userSelect: 'none',
          minHeight: 140,
        }}
      >
        {/* Linha principal: seta | conteúdo | seta */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '20px 16px 12px',
          flex: 1,
        }}>
          {/* Seta esquerda */}
          {total > 1 && (
            <button className="carousel-arrow" onClick={prev} aria-label="Card anterior">
              <ChevronLeft size={18} aria-hidden />
            </button>
          )}

          {/* Conteúdo animado */}
          <div
            key={animKey}
            className="carousel-content"
            aria-live="polite"
            aria-atomic="true"
            style={{
              flex: 1,
              display: 'flex',
              gap: '16px',
              alignItems: 'flex-start',
              minWidth: 0,
            }}
          >
            {/* Ícone */}
            <div style={{
              width: 52,
              height: 52,
              borderRadius: '12px',
              background: 'rgba(255,255,255,0.20)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              flexShrink: 0,
            }}>
              {ICONS[card.icone] ?? ICONS.Info}
            </div>

            {/* Texto */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{
                fontSize: '17px',
                fontWeight: 800,
                color: '#fff',
                marginBottom: '6px',
                lineHeight: 1.25,
                letterSpacing: '-0.01em',
              }}>
                {card.titulo}
              </p>
              <p style={{
                fontSize: '13px',
                color: 'rgba(255,255,255,0.88)',
                lineHeight: 1.55,
              }}>
                {card.descricao}
              </p>
            </div>
          </div>

          {/* Seta direita */}
          {total > 1 && (
            <button className="carousel-arrow" onClick={next} aria-label="Próximo card">
              <ChevronRight size={18} aria-hidden />
            </button>
          )}
        </div>

        {/* Rodapé: dots + contador */}
        {total > 1 && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: '0 16px 14px',
            position: 'relative',
          }}>
            {/* Dots */}
            <div
              role="tablist"
              aria-label="Selecionar card"
              style={{ display: 'flex', gap: '6px', alignItems: 'center' }}
            >
              {cards.map((c, i) => (
                <button
                  key={c.id}
                  role="tab"
                  onClick={() => goTo(i)}
                  aria-label={`Card ${i + 1}: ${c.titulo}`}
                  aria-selected={i === idx}
                  style={{
                    width: i === idx ? 18 : 6,
                    height: 6,
                    borderRadius: '999px',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 0,
                    background: i === idx
                      ? 'rgba(255,255,255,0.95)'
                      : 'rgba(255,255,255,0.35)',
                    transition: 'width 250ms ease, background 250ms ease',
                  }}
                />
              ))}
            </div>

            {/* Contador */}
            <span style={{
              position: 'absolute',
              right: 16,
              fontSize: '11px',
              color: 'rgba(255,255,255,0.65)',
              fontVariantNumeric: 'tabular-nums',
            }}>
              {idx + 1}/{total}
            </span>
          </div>
        )}
      </section>
    </>
  )
}
