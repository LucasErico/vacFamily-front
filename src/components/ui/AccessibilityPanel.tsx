/**
 * AccessibilityPanel
 * Painel lateral: contraste, fonte, TTS, modo daltonismo.
 * Cabeçalho fixo + corpo com scroll interno → funciona em qualquer escala de fonte.
 */
import { useEffect, useRef } from 'react'
import {
  X, Sun, Moon, ZoomIn, Volume2, VolumeX,
  Contrast, Type, Eye,
} from 'lucide-react'
import { useA11y, type FontScale, type ColorBlindMode } from '@/contexts/AccessibilityContext'

interface Props {
  onClose: () => void
}

const FONT_OPTIONS: { value: FontScale; label: string; desc: string }[] = [
  { value: 'normal',       label: 'Normal',       desc: '100%' },
  { value: 'grande',       label: 'Grande',       desc: '120%' },
  { value: 'muito_grande', label: 'Muito grande', desc: '145%' },
]

const COLOR_BLIND_OPTIONS: { value: ColorBlindMode; label: string; desc: string }[] = [
  { value: 'none',         label: 'Normal',       desc: 'Sem filtro' },
  { value: 'deuteranopia', label: 'Deuteranopia', desc: 'Dificuldade com verde' },
  { value: 'protanopia',   label: 'Protanopia',   desc: 'Dificuldade com vermelho' },
  { value: 'tritanopia',   label: 'Tritanopia',   desc: 'Dificuldade com azul' },
]

export function AccessibilityPanel({ onClose }: Props) {
  const {
    theme, altoContraste, fontScale, ttsAtivo, colorBlindMode,
    toggleTheme, toggleAltoContraste, setFontScale, toggleTTS, setColorBlindMode,
  } = useA11y()

  const panelRef = useRef<HTMLDivElement>(null)

  /* foco trap + Escape */
  useEffect(() => {
    panelRef.current?.focus()
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  /* fechar ao clicar fora */
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) onClose()
    }
    const t = setTimeout(() => document.addEventListener('mousedown', handleClick), 100)
    return () => { clearTimeout(t); document.removeEventListener('mousedown', handleClick) }
  }, [onClose])

  return (
    <>
      {/* backdrop */}
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

      {/* painel */}
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
            className="theme-toggle"
            onClick={onClose}
            aria-label="Fechar painel de acessibilidade"
            style={{ width: 36, height: 36 }}
          >
            <X size={18} aria-hidden />
          </button>
        </div>

        {/* Corpo com scroll */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: 'var(--space-5)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-5)',
          scrollbarWidth: 'thin',
          scrollbarColor: 'var(--color-border) transparent',
        }}>

          {/* Tema */}
          <PanelSection icon={theme === 'dark' ? Moon : Sun} title="Tema">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-2)' }}>
              <ToggleChip
                active={theme === 'light'}
                onClick={theme === 'dark' ? toggleTheme : undefined}
                label="Claro"
                icon={Sun}
              />
              <ToggleChip
                active={theme === 'dark'}
                onClick={theme === 'light' ? toggleTheme : undefined}
                label="Escuro"
                icon={Moon}
              />
            </div>
          </PanelSection>

          {/* Alto contraste */}
          <PanelSection icon={Contrast} title="Alto contraste">
            <ToggleSwitch
              checked={altoContraste}
              onChange={toggleAltoContraste}
              labelOn="Ativado"
              labelOff="Desativado"
              icon={Contrast}
            />
          </PanelSection>

          {/* Escala de fonte */}
          <PanelSection icon={Type} title="Tamanho do texto">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              {FONT_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setFontScale(opt.value)}
                  role="radio"
                  aria-checked={fontScale === opt.value}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: 'var(--space-3) var(--space-4)',
                    borderRadius: 'var(--radius-md)',
                    border: `1.5px solid ${fontScale === opt.value ? 'var(--color-primary)' : 'var(--color-border)'}`,
                    background: fontScale === opt.value ? 'var(--color-primary-subtle)' : 'var(--color-bg)',
                    color: fontScale === opt.value ? 'var(--color-primary)' : 'var(--color-text)',
                    cursor: 'pointer',
                    fontSize: 'var(--text-sm)',
                    fontWeight: fontScale === opt.value ? 600 : 400,
                    transition: 'all var(--transition)',
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                    <ZoomIn size={15} aria-hidden />
                    {opt.label}
                  </span>
                  <span style={{
                    fontSize: 'var(--text-xs)',
                    color: fontScale === opt.value ? 'var(--color-primary)' : 'var(--color-text-muted)',
                  }}>
                    {opt.desc}
                  </span>
                </button>
              ))}
            </div>
          </PanelSection>

          {/* Leitura em voz alta (TTS) */}
          <PanelSection icon={ttsAtivo ? Volume2 : VolumeX} title="Leitura em voz alta (TTS)">
            <ToggleSwitch
              checked={ttsAtivo}
              onChange={toggleTTS}
              labelOn="Leitura ativada"
              labelOff="Leitura desativada"
              icon={ttsAtivo ? Volume2 : VolumeX}
            />
            {ttsAtivo && (
              <p
                role="status"
                aria-live="polite"
                style={{
                  fontSize: 'var(--text-xs)',
                  color: 'var(--color-text-muted)',
                  marginTop: 'var(--space-2)',
                  lineHeight: 1.5,
                }}
              >
                Passe o cursor ou foque em conteúdos para ouvi-los automaticamente.
              </p>
            )}
          </PanelSection>

          {/* Visão de cores (daltonismo) */}
          <PanelSection icon={Eye} title="Visão de cores">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              {COLOR_BLIND_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setColorBlindMode(opt.value)}
                  role="radio"
                  aria-checked={colorBlindMode === opt.value}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: 'var(--space-3) var(--space-4)',
                    borderRadius: 'var(--radius-md)',
                    border: `1.5px solid ${colorBlindMode === opt.value ? 'var(--color-primary)' : 'var(--color-border)'}`,
                    background: colorBlindMode === opt.value ? 'var(--color-primary-subtle)' : 'var(--color-bg)',
                    color: colorBlindMode === opt.value ? 'var(--color-primary)' : 'var(--color-text)',
                    cursor: 'pointer',
                    fontSize: 'var(--text-sm)',
                    fontWeight: colorBlindMode === opt.value ? 600 : 400,
                    transition: 'all var(--transition)',
                    textAlign: 'left',
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                    <Eye size={15} aria-hidden />
                    {opt.label}
                  </span>
                  <span style={{
                    fontSize: 'var(--text-xs)',
                    color: colorBlindMode === opt.value ? 'var(--color-primary)' : 'var(--color-text-muted)',
                    textAlign: 'right',
                    maxWidth: 120,
                  }}>
                    {opt.desc}
                  </span>
                </button>
              ))}
            </div>
          </PanelSection>

          <div style={{ height: 'var(--space-2)', flexShrink: 0 }} aria-hidden />
        </div>
      </div>
    </>
  )
}

/* ── PanelSection ── */
function PanelSection({ icon: Icon, title, children }: {
  icon: typeof Sun; title: string; children: React.ReactNode
}) {
  return (
    <section aria-label={title}>
      <div style={{
        display: 'flex', alignItems: 'center',
        gap: 'var(--space-2)', marginBottom: 'var(--space-3)',
      }}>
        <Icon size={15} style={{ color: 'var(--color-primary)', flexShrink: 0 }} aria-hidden />
        <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-text)' }}>
          {title}
        </span>
      </div>
      {children}
    </section>
  )
}

/* ── ToggleSwitch ── */
function ToggleSwitch({ checked, onChange, labelOn, labelOff, icon: Icon }: {
  checked: boolean
  onChange: () => void
  labelOn: string
  labelOff: string
  icon: typeof Sun
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      className="btn btn-ghost"
      style={{
        width: '100%',
        justifyContent: 'space-between',
        background: checked ? 'var(--color-primary-subtle)' : undefined,
        color: checked ? 'var(--color-primary)' : undefined,
        borderColor: checked ? 'var(--color-primary)' : undefined,
      }}
    >
      <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
        <Icon size={16} aria-hidden />
        {checked ? labelOn : labelOff}
      </span>
      <span
        aria-hidden
        style={{
          display: 'inline-flex',
          width: 40, height: 22,
          borderRadius: 'var(--radius-full)',
          background: checked ? 'var(--color-primary)' : 'var(--color-surface-offset)',
          position: 'relative',
          transition: 'background var(--transition)',
          flexShrink: 0,
        }}
      >
        <span style={{
          position: 'absolute',
          top: 3,
          left: checked ? 21 : 3,
          width: 16, height: 16,
          borderRadius: 'var(--radius-full)',
          background: '#fff',
          boxShadow: '0 1px 3px oklch(0 0 0 / 0.2)',
          transition: 'left var(--transition)',
        }} />
      </span>
    </button>
  )
}

/* ── ToggleChip ── */
function ToggleChip({ active, onClick, label, icon: Icon }: {
  active: boolean; onClick?: () => void; label: string; icon: typeof Sun
}) {
  return (
    <button
      onClick={onClick}
      disabled={active}
      aria-pressed={active}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: 'var(--space-2)',
        padding: 'var(--space-3)',
        borderRadius: 'var(--radius-md)',
        border: `1.5px solid ${active ? 'var(--color-primary)' : 'var(--color-border)'}`,
        background: active ? 'var(--color-primary-subtle)' : 'var(--color-bg)',
        color: active ? 'var(--color-primary)' : 'var(--color-text-muted)',
        cursor: active ? 'default' : 'pointer',
        fontSize: 'var(--text-sm)', fontWeight: active ? 600 : 400,
        transition: 'all var(--transition)',
      }}
    >
      <Icon size={14} aria-hidden /> {label}
    </button>
  )
}
