/**
 * AccessibilityPanel
 * Painel lateral: reset, contraste, fonte, TTS, visão de cores.
 *
 * Acessibilidade (WCAG 2.1):
 *   - role="dialog" + aria-modal="true" + aria-label
 *   - Trap de foco real: Tab/Shift+Tab cicla apenas entre elementos focusáveis do painel
 *   - Foco inicial no botão de fechar ao abrir
 *   - Escape fecha o painel e devolve foco ao elemento que o abriu
 */
import { useEffect, useRef, useCallback } from 'react'
import {
  X, ZoomIn, Volume2, VolumeX,
  Contrast, Type, Eye, RotateCcw,
} from 'lucide-react'
import { useA11y, type FontScale, type ColorBlindMode } from '@/contexts/AccessibilityContext'
import { useScrollTop } from '@/hooks/useScrollTop'
import { ScrollToTopButton } from '@/components/ui/ScrollToTopButton'

interface Props {
  onClose: () => void
}

const FONT_OPTIONS: { value: FontScale; label: string; desc: string }[] = [
  { value: 'normal',       label: 'Normal',       desc: '100%' },
  { value: 'grande',       label: 'Grande',       desc: '120%' },
  { value: 'muito_grande', label: 'Muito grande', desc: '145%' },
]

const COLOR_BLIND_OPTIONS: { value: ColorBlindMode; label: string; desc: string }[] = [
  { value: 'none',         label: 'Padrão',       desc: 'Sem adaptação' },
  { value: 'deuteranopia', label: 'Deuteranopia', desc: 'Dificuldade verde/vermelho' },
  { value: 'protanopia',   label: 'Protanopia',   desc: 'Dificuldade com vermelho' },
  { value: 'tritanopia',   label: 'Tritanopia',   desc: 'Dificuldade azul/amarelo' },
  { value: 'acromatopsia', label: 'Acromatopsia', desc: 'Não distingue cores' },
]

/** Retorna todos os elementos focusáveis dentro de um container. */
function getFocusable(container: HTMLElement): HTMLElement[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), ' +
      'textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  ).filter(el => !el.closest('[hidden]') && getComputedStyle(el).display !== 'none')
}

export function AccessibilityPanel({ onClose }: Props) {
  const {
    altoContraste, fontScale, ttsAtivo, colorBlindMode,
    toggleAltoContraste, setFontScale, toggleTTS,
    setColorBlindMode, resetA11y,
  } = useA11y()

  const panelRef  = useRef<HTMLDivElement>(null)
  const closeRef  = useRef<HTMLButtonElement>(null)
  // Guarda o elemento que tinha foco antes de abrir o painel
  const triggerRef = useRef<HTMLElement | null>(null)

  const {
    ref: bodyRef,
    visible: showScrollTop,
    scrollToTop,
  } = useScrollTop<HTMLDivElement>({ threshold: 80 })

  // Trap de foco: Tab/Shift+Tab cicla apenas dentro do painel
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose()
      return
    }
    if (e.key !== 'Tab' || !panelRef.current) return

    const focusable = getFocusable(panelRef.current)
    if (focusable.length === 0) return

    const first = focusable[0]
    const last  = focusable[focusable.length - 1]

    if (e.shiftKey) {
      // Shift+Tab no primeiro → vai para o último
      if (document.activeElement === first) {
        e.preventDefault()
        last.focus()
      }
    } else {
      // Tab no último → volta para o primeiro
      if (document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
  }, [onClose])

  useEffect(() => {
    // Salva o elemento que abriu o painel para devolver foco ao fechar
    triggerRef.current = document.activeElement as HTMLElement

    // Foco inicial no botão fechar
    closeRef.current?.focus()

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      // Devolve foco ao elemento disparador
      triggerRef.current?.focus()
    }
  }, [handleKeyDown])

  // Fecha ao clicar fora do painel
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) onClose()
    }
    const t = setTimeout(() => document.addEventListener('mousedown', handleClick), 100)
    return () => { clearTimeout(t); document.removeEventListener('mousedown', handleClick) }
  }, [onClose])

  const isDefault =
    !altoContraste &&
    fontScale === 'normal' &&
    !ttsAtivo &&
    colorBlindMode === 'none'

  return (
    <>
      <div
        aria-hidden
        style={{
          position: 'fixed', inset: 0,
          background: 'oklch(0 0 0 / 0.2)',
          zIndex: 49,
          animation: 'fadeIn 150ms ease',
        }}
        onClick={onClose}
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Painel de acessibilidade"
        tabIndex={-1}
        style={{
          position: 'fixed',
          top: 'var(--topbar-h)',
          right: 'var(--space-3)',
          width: 'min(320px, calc(100vw - var(--space-6)))',
          maxHeight: 'calc(100dvh - var(--topbar-h) - var(--space-4))',
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-xl)',
          boxShadow: 'var(--shadow-lg)',
          zIndex: 50,
          outline: 'none',
          animation: 'slideDown 180ms cubic-bezier(0.16,1,0.3,1)',
          overflow: 'hidden',
        }}
      >
        {/* Cabeçalho fixo */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: 'var(--space-4) var(--space-5)',
          borderBottom: '1px solid var(--color-divider)',
          flexShrink: 0,
          background: 'var(--color-surface)',
        }}>
          <h2 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'var(--text-base)',
            fontWeight: 700,
            color: 'var(--color-text)',
          }}>
            Acessibilidade
          </h2>
          <button
            ref={closeRef}
            className="theme-toggle"
            onClick={onClose}
            aria-label="Fechar painel de acessibilidade"
            style={{ width: 36, height: 36 }}
          >
            <X size={18} aria-hidden />
          </button>
        </div>

        {/* Corpo com scroll */}
        <div
          ref={bodyRef}
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: 'var(--space-5)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-5)',
            scrollbarWidth: 'thin',
            scrollbarColor: 'var(--color-border) transparent',
          }}
        >
          {/* Botão reset */}
          <button
            onClick={resetA11y}
            disabled={isDefault}
            aria-label="Restaurar configurações padrão de acessibilidade"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 'var(--space-2)',
              width: '100%',
              padding: 'var(--space-3) var(--space-4)',
              borderRadius: 'var(--radius-md)',
              border: `1.5px solid ${isDefault ? 'var(--color-border)' : 'var(--color-warning)'}`,
              background: isDefault ? 'var(--color-surface-offset)' : 'var(--color-warning-highlight)',
              color: isDefault ? 'var(--color-text-faint)' : 'var(--color-warning)',
              cursor: isDefault ? 'not-allowed' : 'pointer',
              fontSize: 'var(--text-sm)',
              fontWeight: 600,
              transition: 'all var(--transition)',
              opacity: isDefault ? 0.6 : 1,
            }}
          >
            <RotateCcw size={15} aria-hidden />
            Restaurar padrões
          </button>

          {/* Alto contraste */}
          <PanelSection icon={Contrast} title="Alto contraste">
            <ToggleSwitch
              checked={altoContraste}
              onChange={toggleAltoContraste}
              labelOn="Ativado" labelOff="Desativado"
              icon={Contrast}
            />
          </PanelSection>

          {/* Escala de fonte */}
          <PanelSection icon={Type} title="Tamanho do texto">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              {FONT_OPTIONS.map(opt => (
                <RadioRow
                  key={opt.value}
                  active={fontScale === opt.value}
                  onClick={() => setFontScale(opt.value)}
                  label={opt.label}
                  desc={opt.desc}
                  icon={<ZoomIn size={15} aria-hidden />}
                />
              ))}
            </div>
          </PanelSection>

          {/* TTS */}
          <PanelSection icon={ttsAtivo ? Volume2 : VolumeX} title="Leitura em voz alta (TTS)">
            <ToggleSwitch
              checked={ttsAtivo}
              onChange={toggleTTS}
              labelOn="Leitura ativada" labelOff="Leitura desativada"
              icon={ttsAtivo ? Volume2 : VolumeX}
            />
            {ttsAtivo && (
              <p role="status" aria-live="polite" style={{
                fontSize: 'var(--text-xs)',
                color: 'var(--color-text-muted)',
                marginTop: 'var(--space-2)',
                lineHeight: 1.5,
              }}>
                Passe o cursor ou foque em conteúdos para ouvi-los automaticamente.
              </p>
            )}
          </PanelSection>

          {/* Adaptação de cores */}
          <PanelSection icon={Eye} title="Adaptação de cores">
            <p style={{
              fontSize: 'var(--text-xs)',
              color: 'var(--color-text-muted)',
              marginBottom: 'var(--space-3)',
              lineHeight: 1.5,
            }}>
              Ajusta a interface para maior conforto visual conforme seu tipo de visão.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              {COLOR_BLIND_OPTIONS.map(opt => (
                <RadioRow
                  key={opt.value}
                  active={colorBlindMode === opt.value}
                  onClick={() => setColorBlindMode(opt.value)}
                  label={opt.label}
                  desc={opt.desc}
                  icon={<Eye size={15} aria-hidden />}
                />
              ))}
            </div>
          </PanelSection>

          <div style={{ height: 'var(--space-2)', flexShrink: 0 }} aria-hidden />
        </div>

        {/* Botão voltar ao topo do painel */}
        <div style={{
          display: 'flex',
          justifyContent: 'flex-end',
          padding: showScrollTop ? 'var(--space-2) var(--space-4)' : '0 var(--space-4)',
          borderTop: showScrollTop ? '1px solid var(--color-divider)' : '1px solid transparent',
          maxHeight: showScrollTop ? 52 : 0,
          overflow: 'hidden',
          flexShrink: 0,
          transition:
            'max-height 220ms cubic-bezier(0.16,1,0.3,1), ' +
            'padding 220ms cubic-bezier(0.16,1,0.3,1), ' +
            'border-color 220ms ease',
        }}>
          <ScrollToTopButton visible={showScrollTop} onClick={scrollToTop} position="panel" />
        </div>
      </div>
    </>
  )
}

function RadioRow({ active, onClick, label, desc, icon }: {
  active: boolean; onClick: () => void; label: string; desc: string; icon: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      role="radio"
      aria-checked={active}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: 'var(--space-3) var(--space-4)',
        borderRadius: 'var(--radius-md)',
        border: `1.5px solid ${active ? 'var(--color-primary)' : 'var(--color-border)'}`,
        background: active ? 'var(--color-primary-subtle)' : 'var(--color-bg)',
        color: active ? 'var(--color-primary)' : 'var(--color-text)',
        cursor: 'pointer',
        fontSize: 'var(--text-sm)',
        fontWeight: active ? 600 : 400,
        transition: 'all var(--transition)',
        textAlign: 'left',
        width: '100%',
      }}
    >
      <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
        {icon}{label}
      </span>
      <span style={{
        fontSize: 'var(--text-xs)',
        color: active ? 'var(--color-primary)' : 'var(--color-text-muted)',
        textAlign: 'right', maxWidth: 130, flexShrink: 0,
      }}>
        {desc}
      </span>
    </button>
  )
}

function PanelSection({ icon: Icon, title, children }: {
  icon: React.ComponentType<{ size?: number; style?: React.CSSProperties; 'aria-hidden'?: boolean | 'true' }>
  title: string
  children: React.ReactNode
}) {
  return (
    <section aria-label={title}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-3)' }}>
        <Icon size={15} style={{ color: 'var(--color-primary)', flexShrink: 0 }} aria-hidden />
        <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-text)' }}>
          {title}
        </span>
      </div>
      {children}
    </section>
  )
}

function ToggleSwitch({ checked, onChange, labelOn, labelOff, icon: Icon }: {
  checked: boolean; onChange: () => void
  labelOn: string; labelOff: string
  icon: React.ComponentType<{ size?: number; 'aria-hidden'?: boolean | 'true' }>
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      className="btn btn-ghost"
      style={{
        width: '100%', justifyContent: 'space-between',
        background: checked ? 'var(--color-primary-subtle)' : undefined,
        color: checked ? 'var(--color-primary)' : undefined,
        borderColor: checked ? 'var(--color-primary)' : undefined,
      }}
    >
      <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
        <Icon size={16} aria-hidden />{checked ? labelOn : labelOff}
      </span>
      <span aria-hidden style={{
        display: 'inline-flex', width: 40, height: 22,
        borderRadius: 'var(--radius-full)',
        background: checked ? 'var(--color-primary)' : 'var(--color-surface-offset)',
        position: 'relative', transition: 'background var(--transition)', flexShrink: 0,
      }}>
        <span style={{
          position: 'absolute', top: 3, left: checked ? 21 : 3,
          width: 16, height: 16, borderRadius: 'var(--radius-full)',
          background: '#fff', boxShadow: '0 1px 3px oklch(0 0 0 / 0.2)',
          transition: 'left var(--transition)',
        }} />
      </span>
    </button>
  )
}
