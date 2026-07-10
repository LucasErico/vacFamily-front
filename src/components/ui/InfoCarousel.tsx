/**
 * InfoCarousel
 * Carrossel horizontal de cards informativos no topo do Dashboard.
 * Cards vêm do adminStorage e podem ser editados pelo painel admin.
 */
import { useEffect, useState, useRef, useCallback } from 'react'
import { ChevronLeft, ChevronRight, ShieldCheck, Syringe, Bell, Users, Info } from 'lucide-react'
import { getCards, type CardConteudo } from '@/services/adminStorage'

// Mapa de ícones disponíveis
const ICONS: Record<string, React.ReactNode> = {
  ShieldCheck: <ShieldCheck size={22} aria-hidden />,
  Syringe:     <Syringe     size={22} aria-hidden />,
  Bell:        <Bell        size={22} aria-hidden />,
  Users:       <Users       size={22} aria-hidden />,
  Info:        <Info        size={22} aria-hidden />,
}

const AUTOPLAY_MS = 4500

export function InfoCarousel() {
  const [cards, setCards] = useState<CardConteudo[]>([])
  const [idx, setIdx]     = useState(0)
  const [paused, setPaused] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const ativos = getCards().filter(c => c.ativo).sort((a, b) => a.ordem - b.ordem)
    setCards(ativos)
  }, [])

  const total = cards.length
  const prev = useCallback(() => setIdx(i => (i - 1 + total) % total), [total])
  const next = useCallback(() => setIdx(i => (i + 1) % total), [total])

  // Autoplay
  useEffect(() => {
    if (paused || total <= 1) return
    timerRef.current = setTimeout(next, AUTOPLAY_MS)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [idx, paused, next, total])

  if (total === 0) return null

  const card = cards[idx]

  return (
    <section
      aria-label="Informações rápidas"
      aria-roledescription="carrossel"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
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
      }}
    >
      {/* Conteúdo */}
      <div
        key={card.id}
        aria-live="polite"
        aria-atomic="true"
        style={{
          padding: 'var(--space-5) var(--space-5) var(--space-3)',
          display: 'flex',
          gap: 'var(--space-4)',
          alignItems: 'flex-start',
          animation: 'fadeIn 300ms ease',
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

      {/* Rodapé: botões + indicadores */}
      {total > 1 && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: 'var(--space-2) var(--space-4) var(--space-3)',
        }}>
          {/* Botões nav */}
          <div style={{ display: 'flex', gap: 'var(--space-1)' }}>
            <button
              onClick={prev}
              aria-label="Card anterior"
              style={carouselBtnStyle}
            >
              <ChevronLeft size={14} aria-hidden />
            </button>
            <button
              onClick={next}
              aria-label="Próximo card"
              style={carouselBtnStyle}
            >
              <ChevronRight size={14} aria-hidden />
            </button>
          </div>

          {/* Indicadores */}
          <div style={{ display: 'flex', gap: 'var(--space-1)', alignItems: 'center' }}>
            {cards.map((_, i) => (
              <button
                key={i}
                onClick={() => setIdx(i)}
                aria-label={`Ir para card ${i + 1}`}
                aria-current={i === idx}
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
          }}>
            {idx + 1}/{total}
          </span>
        </div>
      )}
    </section>
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
