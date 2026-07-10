/**
 * AccessibilityContext
 * Gerencia: tema (light/dark), alto contraste, escala de fonte, TTS ativo, modo daltonismo
 * Persiste preferências em sessionStorage (compatível com ambientes sandbox)
 */
import {
  createContext, useContext, useState, useEffect, useCallback,
  type ReactNode,
} from 'react'

export type Theme = 'light' | 'dark'
export type FontScale = 'normal' | 'grande' | 'muito_grande'
export type ColorBlindMode = 'none' | 'deuteranopia' | 'protanopia' | 'tritanopia'

interface A11yState {
  theme: Theme
  altoContraste: boolean
  fontScale: FontScale
  ttsAtivo: boolean
  colorBlindMode: ColorBlindMode
}

interface A11yContextValue extends A11yState {
  toggleTheme: () => void
  toggleAltoContraste: () => void
  setFontScale: (scale: FontScale) => void
  toggleTTS: () => void
  falar: (texto: string) => void
  pararFala: () => void
  setColorBlindMode: (mode: ColorBlindMode) => void
}

const A11yContext = createContext<A11yContextValue | null>(null)

const FONT_SCALE_FACTOR: Record<FontScale, number> = {
  normal:       1,
  grande:       1.2,
  muito_grande: 1.45,
}

const CB_CLASSES: Record<ColorBlindMode, string> = {
  none:         '',
  deuteranopia: 'cb-deuteranopia',
  protanopia:   'cb-protanopia',
  tritanopia:   'cb-tritanopia',
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
  const [altoContraste, setAltoContraste] = useState(salvo.altoContraste ?? false)
  const [fontScale, setFontScaleState] = useState<FontScale>(salvo.fontScale ?? 'normal')
  const [ttsAtivo, setTtsAtivo] = useState(salvo.ttsAtivo ?? false)
  const [colorBlindMode, setColorBlindModeState] = useState<ColorBlindMode>(salvo.colorBlindMode ?? 'none')

  /* ── aplica tokens no <html> e filtro de daltonismo no <body> ── */
  useEffect(() => {
    const html = document.documentElement
    html.setAttribute('data-theme', theme)
    html.setAttribute('data-contrast', altoContraste ? 'high' : 'normal')
    html.style.setProperty('--font-scale', String(FONT_SCALE_FACTOR[fontScale]))

    // remove todas as classes CB antes de aplicar a nova
    Object.values(CB_CLASSES).forEach(cls => {
      if (cls) document.body.classList.remove(cls)
    })
    const cls = CB_CLASSES[colorBlindMode]
    if (cls) document.body.classList.add(cls)

    salvarSessao({ theme, altoContraste, fontScale, ttsAtivo, colorBlindMode })
  }, [theme, altoContraste, fontScale, ttsAtivo, colorBlindMode])

  /* ── TTS ── */
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

  const pararFala = useCallback(() => {
    window.speechSynthesis?.cancel()
  }, [])

  /* ── actions ── */
  const toggleTheme = useCallback(() => setTheme(t => t === 'dark' ? 'light' : 'dark'), [])
  const toggleAltoContraste = useCallback(() => setAltoContraste(v => !v), [])
  const setFontScale = useCallback((s: FontScale) => setFontScaleState(s), [])
  const toggleTTS = useCallback(() => {
    setTtsAtivo(v => {
      if (v) window.speechSynthesis?.cancel()
      return !v
    })
  }, [])
  const setColorBlindMode = useCallback((mode: ColorBlindMode) => setColorBlindModeState(mode), [])

  return (
    <A11yContext.Provider value={{
      theme, altoContraste, fontScale, ttsAtivo, colorBlindMode,
      toggleTheme, toggleAltoContraste, setFontScale,
      toggleTTS, falar, pararFala, setColorBlindMode,
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
