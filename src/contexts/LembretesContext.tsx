import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import type { Lembrete, StatusLembrete } from '@/types'

function gerarId() {
  return `lem_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
}

interface LembretesContextValue {
  lembretes: Lembrete[]
  adicionarLembrete: (dados: Omit<Lembrete, 'id' | 'criadoEm'>) => Lembrete
  marcarStatus: (id: string, status: StatusLembrete) => void
  removerLembrete: (id: string) => void
  buscarLembretesMembro: (membroId: string) => Lembrete[]
  lembretesPendentes: Lembrete[]
}

const LembretesContext = createContext<LembretesContextValue | null>(null)

export function LembretesProvider({ children }: { children: ReactNode }) {
  const [lembretes, setLembretes] = useState<Lembrete[]>([])

  const adicionarLembrete = useCallback((dados: Omit<Lembrete, 'id' | 'criadoEm'>) => {
    const novo: Lembrete = { ...dados, id: gerarId(), criadoEm: new Date().toISOString() }
    setLembretes(prev => [...prev, novo])
    return novo
  }, [])

  const marcarStatus = useCallback((id: string, status: StatusLembrete) => {
    setLembretes(prev => prev.map(l => l.id === id ? { ...l, status } : l))
  }, [])

  const removerLembrete = useCallback((id: string) => {
    setLembretes(prev => prev.filter(l => l.id !== id))
  }, [])

  const buscarLembretesMembro = useCallback((membroId: string) => {
    return lembretes.filter(l => l.membroId === membroId)
  }, [lembretes])

  const lembretesPendentes = lembretes.filter(l => l.status === 'pendente')

  return (
    <LembretesContext.Provider value={{
      lembretes, adicionarLembrete, marcarStatus, removerLembrete,
      buscarLembretesMembro, lembretesPendentes,
    }}>
      {children}
    </LembretesContext.Provider>
  )
}

export function useLembretes() {
  const ctx = useContext(LembretesContext)
  if (!ctx) throw new Error('useLembretes deve ser usado dentro de <LembretesProvider>')
  return ctx
}
