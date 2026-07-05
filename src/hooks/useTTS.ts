/**
 * useTTS — hook conveniente para disparar leitura de texto
 * Retorna { falar, pararFala, ttsAtivo }
 * Só ativa quando TTS está ligado no contexto de acessibilidade.
 */
import { useA11y } from '@/contexts/AccessibilityContext'

export function useTTS() {
  const { falar, pararFala, ttsAtivo } = useA11y()
  return { falar, pararFala, ttsAtivo }
}
