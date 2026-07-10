/**
 * AccessibilityContext
 * Gerencia: tema, alto contraste, escala de fonte, TTS, modo daltonismo.
 * Persiste em sessionStorage.
 */
import {
  createContext, useContext, useState, useEffect, useCallback,
  type ReactNode,
} from 'react'

export type Theme = 'light' | 'dark'
export type FontScale = 'normal' | 'grande' | 'muito_grande'
export type ColorBlindMode = 'none' | 'deuteranopia' | 'protanopia' | 'tritanopia' | 'acromatopsia'

interface A11yState {
  theme: Theme
  altoContraste: boolean
  fontScale: FontScale
  ttsAtivo: boolean
  colorBlindMode: ColorBlindMode
}

export const A11Y_DEFAULTS: A11yState = {
  theme:          'light',
  altoContraste:  false,
  fontScale:      'normal',
  ttsAtivo:       false,
  colorBlindMode: 'none',
}

interface A11yContextValue extends A11yState {
  toggleTheme: () => void
  toggleAltoContraste: () => void
  setFontScale: (scale: FontScale) => void
  toggleTTS: () => void
  falar: (texto: string) => void
  pararFala: () => void
  setColorBlindMode: (mode: ColorBlindMode) => void
  resetA11y: () => void
}

const A11yContext = createContext<A11yContextValue | null>(null)

const FONT_SCALE_FACTOR: Record<FontScale, number> = {
  normal:       1,
  grande:       1.2,
  muito_grande: 1.45,
}

const CB_BODY_CLASS: Record<ColorBlindMode, string> = {
  none:         '',
  deuteranopia: 'cb-deuteranopia',
  protanopia:   'cb-protanopia',
  tritanopia:   'cb-tritanopia',
  acromatopsia: 'cb-acromatopsia',
}

function lerSessao(): Partial<A11yState> {
  try {
    const raw = sessionStorage.getItem('a11y_prefs')
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function salvarSessao(state: A11yState) {
  try { sessionStorage.setItem('a11y_prefs', JSON.stringify(state)) } catch { /* noop */ }
}

export function AccessibilityProvider({ children }: { children: ReactNode }) {
  const salvo = lerSessao()

  const [theme, setTheme] = useState<Theme>(
    salvo.theme ??
    (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
  )
  const [altoContraste, setAltoContraste]   = useState(salvo.altoContraste  ?? A11Y_DEFAULTS.altoContraste)
  const [fontScale, setFontScaleState]       = useState<FontScale>(salvo.fontScale ?? A11Y_DEFAULTS.fontScale)
  const [ttsAtivo, setTtsAtivo]             = useState(salvo.ttsAtivo       ?? A11Y_DEFAULTS.ttsAtivo)
  const [colorBlindMode, setColorBlindModeState] = useState<ColorBlindMode>(salvo.colorBlindMode ?? A11Y_DEFAULTS.colorBlindMode)

  /* aplica tokens + classe de daltonismo */
  useEffect(() => {
    const html = document.documentElement
    html.setAttribute('data-theme', theme)
    html.setAttribute('data-contrast', altoContraste ? 'high' : 'normal')
    html.style.setProperty('--font-scale', String(FONT_SCALE_FACTOR[fontScale]))

    Object.values(CB_BODY_CLASS).forEach(cls => {
      if (cls) document.body.classList.remove(cls)
    })
    const cls = CB_BODY_CLASS[colorBlindMode]
    if (cls) document.body.classList.add(cls)

    salvarSessao({ theme, altoContraste, fontScale, ttsAtivo, colorBlindMode })
  }, [theme, altoContraste, fontScale, ttsAtivo, colorBlindMode])

  /* TTS */
  const falar = useCallback((texto: string) => {
    if (!ttsAtivo || !window.speechSynthesis) return
    window.speechSynthesis.cancel()
    const utt = new SpeechSynthesisUtterance(texto)
    utt.lang = 'pt-BR'
    utt.rate = 0.95
    utt.pitch = 1
    const vozes = window.speechSynthesis.getVoices()
    const ptBR = vozes.find(v => v.lang === 'pt-BR') ?? vozes.find(v => v.lang.startsWith('pt'))
    if (ptBR) utt.voice = ptBR
    window.speechSynthesis.speak(utt)
  }, [ttsAtivo])

  const pararFala = useCallback(() => { window.speechSynthesis?.cancel() }, [])

  const toggleTheme        = useCallback(() => setTheme(t => t === 'dark' ? 'light' : 'dark'), [])
  const toggleAltoContraste = useCallback(() => setAltoContraste(v => !v), [])
  const setFontScale        = useCallback((s: FontScale) => setFontScaleState(s), [])
  const toggleTTS           = useCallback(() => {
    setTtsAtivo(v => {
      if (v) window.speechSynthesis?.cancel()
      return !v
    })
  }, [])
  const setColorBlindMode = useCallback((mode: ColorBlindMode) => setColorBlindModeState(mode), [])

  /* reset para defaults */
  const resetA11y = useCallback(() => {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    setTheme(prefersDark ? 'dark' : 'light')
    setAltoContraste(A11Y_DEFAULTS.altoContraste)
    setFontScaleState(A11Y_DEFAULTS.fontScale)
    setTtsAtivo(A11Y_DEFAULTS.ttsAtivo)
    setColorBlindModeState(A11Y_DEFAULTS.colorBlindMode)
    window.speechSynthesis?.cancel()
    try { sessionStorage.removeItem('a11y_prefs') } catch { /* noop */ }
  }, [])

  return (
    <A11yContext.Provider value={{
      theme, altoContraste, fontScale, ttsAtivo, colorBlindMode,
      toggleTheme, toggleAltoContraste, setFontScale,
      toggleTTS, falar, pararFala, setColorBlindMode, resetA11y,
    }}>
      {children}
    </A11yContext.Provider>
  )
}

export function useA11y() {
  const ctx = useContext(A11yContext)
  if (!ctx) throw new Error('useA11y deve ser usado dentro de <AccessibilityProvider>')
  return ctx
}
