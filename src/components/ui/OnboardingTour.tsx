/**
 * OnboardingTour
 * Apresentação guiada do app em slides.
 * Disparada automaticamente na 1ª visita e pelo botão na Sidebar.
 */
import { useState, useEffect, useCallback } from 'react'
import {
  Home, Users, Syringe, CalendarDays,
  ClipboardList, ChevronLeft, ChevronRight, X
} from 'lucide-react'

const STORAGE_KEY = 'vacfamily_onboarding_done'

const SLIDES = [
  {
    icon: <Home size={36} aria-hidden />,
    title: 'Bem-vindo ao VacFamily 👋',
    desc: 'Seu aplicativo para gerenciar o histórico vacinal de toda a família em um só lugar. Vamos fazer um tour rápido pelas principais telas.',
  },
  {
    icon: <Users size={36} aria-hidden />,
    title: 'Família',
    desc: 'Cadastre os membros da família — filhos, cônjuge, pais. Cada perfil tem seus dados de nascimento, sexo e relação de parentesco.',
  },
  {
    icon: <Syringe size={36} aria-hidden />,
    title: 'Vacinas',
    desc: 'Registre doses aplicadas para cada membro. O sistema identifica automaticamente vacinas em atraso e gera lembretes de reforço com base nas regras do calendário vacinal.',
  },
  {
    icon: <CalendarDays size={36} aria-hidden />,
    title: 'Agenda',
    desc: 'Visualize lembretes em um calendário mensal. Dias com eventos ficam destacados — clique em qualquer dia para ver detalhes. Reforços automáticos e lembretes manuais ficam listados abaixo.',
  },
  {
    icon: <ClipboardList size={36} aria-hidden />,
    title: 'Histórico',
    desc: 'Consulte a linha do tempo vacinal de cada membro, organizada por ciclo de vida (Infância, Adolescência, Adulto…). Filtre por ciclo ou busque pelo nome da vacina.',
  },
  {
    icon: (
      <div aria-hidden style={{ fontSize: 36, lineHeight: 1 }}>✅</div>
    ),
    title: 'Tudo pronto!',
    desc: 'Comece cadastrando os membros da família e registrando as primeiras vacinas. Use o painel de acessibilidade (ícone ♿) para ajustar tema, fonte e leitura em voz alta.',
  },
]

interface Props {
  onClose: () => void
}

export function OnboardingTour({ onClose }: Props) {
  const [slide, setSlide] = useState(0)
  const total = SLIDES.length
  const isLast = slide === total - 1

  const handleClose = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, '1')
    onClose()
  }, [onClose])

  // Fechar com Escape
  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') handleClose() }
    document.addEventListener('keydown', fn)
    return () => document.removeEventListener('keydown', fn)
  }, [handleClose])

  const prev = () => setSlide(s => Math.max(0, s - 1))
  const next = () => isLast ? handleClose() : setSlide(s => s + 1)

  const current = SLIDES[slide]

  return (
    <>
      {/* Overlay */}
      <div
        aria-hidden
        onClick={handleClose}
        style={{
          position: 'fixed', inset: 0,
          background: 'oklch(0 0 0 / 0.55)',
          zIndex: 199,
          animation: 'fadeIn 200ms ease',
        }}
      />

      {/* Modal */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Tour de apresentação do VacFamily"
        aria-live="polite"
        style={{
          position: 'fixed',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 200,
          padding: 'var(--space-4)',
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            pointerEvents: 'auto',
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-xl)',
            boxShadow: 'var(--shadow-lg)',
            width: 'min(440px, 100%)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            animation: 'slideDown 220ms cubic-bezier(0.16,1,0.3,1)',
          }}
        >
          {/* Topo: progress + fechar */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-3)',
            padding: 'var(--space-4) var(--space-5)',
            borderBottom: '1px solid var(--color-divider)',
          }}>
            {/* Indicadores de slide */}
            <div style={{ display: 'flex', gap: 'var(--space-1)', flex: 1 }}>
              {SLIDES.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setSlide(i)}
                  aria-label={`Ir para slide ${i + 1}`}
                  style={{
                    height: 4,
                    flex: 1,
                    borderRadius: 'var(--radius-full)',
                    border: 'none',
                    cursor: 'pointer',
                    background: i === slide
                      ? 'var(--color-primary)'
                      : i < slide
                        ? 'var(--color-primary-highlight)'
                        : 'var(--color-surface-dynamic)',
                    transition: 'background 250ms ease',
                    padding: 0,
                  }}
                />
              ))}
            </div>

            <span style={{
              fontSize: 'var(--text-xs)',
              color: 'var(--color-text-muted)',
              fontVariantNumeric: 'tabular-nums',
              flexShrink: 0,
            }}>
              {slide + 1} / {total}
            </span>

            <button
              onClick={handleClose}
              aria-label="Fechar apresentação"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 32, height: 32,
                borderRadius: 'var(--radius-md)',
                border: 'none',
                background: 'transparent',
                color: 'var(--color-text-muted)',
                cursor: 'pointer',
                transition: 'background var(--transition)',
                flexShrink: 0,
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-surface-offset)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <X size={16} aria-hidden />
            </button>
          </div>

          {/* Conteúdo do slide */}
          <div
            key={slide}
            style={{
              padding: 'var(--space-8) var(--space-8) var(--space-6)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              gap: 'var(--space-4)',
              animation: 'fadeIn 180ms ease',
            }}
          >
            <div style={{
              width: 72, height: 72,
              borderRadius: 'var(--radius-xl)',
              background: 'var(--color-primary-highlight)',
              color: 'var(--color-primary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {current.icon}
            </div>

            <h2 style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'var(--text-xl)',
              fontWeight: 700,
              color: 'var(--color-text)',
              lineHeight: 1.2,
            }}>
              {current.title}
            </h2>

            <p style={{
              fontSize: 'var(--text-base)',
              color: 'var(--color-text-muted)',
              lineHeight: 1.65,
              maxWidth: '34ch',
            }}>
              {current.desc}
            </p>
          </div>

          {/* Botões de navegação */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: 'var(--space-4) var(--space-5) var(--space-5)',
            borderTop: '1px solid var(--color-divider)',
            gap: 'var(--space-3)',
          }}>
            <button
              onClick={prev}
              disabled={slide === 0}
              aria-label="Slide anterior"
              style={{
                display: 'flex', alignItems: 'center', gap: 'var(--space-1)',
                padding: 'var(--space-2) var(--space-4)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border)',
                background: 'transparent',
                color: slide === 0 ? 'var(--color-text-faint)' : 'var(--color-text-muted)',
                cursor: slide === 0 ? 'not-allowed' : 'pointer',
                fontSize: 'var(--text-sm)',
                fontWeight: 500,
                opacity: slide === 0 ? 0.4 : 1,
                transition: 'all var(--transition)',
                minHeight: 40,
              }}
            >
              <ChevronLeft size={16} aria-hidden /> Anterior
            </button>

            {/* Pontinhos de posição */}
            <div style={{ display: 'flex', gap: 'var(--space-1)' }}>
              {SLIDES.map((_, i) => (
                <div
                  key={i}
                  aria-hidden
                  style={{
                    width: i === slide ? 16 : 6,
                    height: 6,
                    borderRadius: 'var(--radius-full)',
                    background: i === slide ? 'var(--color-primary)' : 'var(--color-surface-dynamic)',
                    transition: 'width 250ms ease, background 250ms ease',
                  }}
                />
              ))}
            </div>

            <button
              onClick={next}
              aria-label={isLast ? 'Concluir apresentação' : 'Próximo slide'}
              style={{
                display: 'flex', alignItems: 'center', gap: 'var(--space-1)',
                padding: 'var(--space-2) var(--space-4)',
                borderRadius: 'var(--radius-md)',
                border: 'none',
                background: 'var(--color-primary)',
                color: '#fff',
                cursor: 'pointer',
                fontSize: 'var(--text-sm)',
                fontWeight: 600,
                transition: 'background var(--transition)',
                minHeight: 40,
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-primary-hover)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'var(--color-primary)')}
            >
              {isLast ? 'Começar' : 'Próximo'}
              {!isLast && <ChevronRight size={16} aria-hidden />}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

/** Retorna true se o usuário ainda não viu o tour */
export function shouldShowOnboarding(): boolean {
  return !localStorage.getItem(STORAGE_KEY)
}

/** Reseta o flag (para testes) */
export function resetOnboarding(): void {
  localStorage.removeItem(STORAGE_KEY)
}
