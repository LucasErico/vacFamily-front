/**
 * LembretesContext — CRUD real via API backend
 * Endpoints: GET|POST /lembretes  |  PATCH /lembretes/:id  |  DELETE /lembretes/:id
 *
 * Respostas da API têm envelope:
 *   GET /lembretes       → { status, lembretes: [] }
 *   POST /lembretes      → { status, lembrete: {} }
 *   PATCH /lembretes/:id → { status, lembrete: {} }
 */
import {
  createContext, useContext, useState, useCallback,
  useEffect, type ReactNode,
} from 'react'
import type { Lembrete, StatusLembrete } from '@/types'
import { apiFetch } from '@/services/api'
import { useAuth } from './AuthContext'

interface LembretesContextValue {
  lembretes: Lembrete[]
  carregando: boolean
  adicionarLembrete: (dados: Omit<Lembrete, 'id' | 'created_at'>) => Promise<Lembrete>
  marcarStatus: (id: string, status: StatusLembrete) => Promise<void>
  removerLembrete: (id: string) => Promise<void>
  buscarLembretesMembro: (membro_id: string) => Lembrete[]
  lembretesPendentes: Lembrete[]
  recarregar: () => Promise<void>
}

const LembretesContext = createContext<LembretesContextValue | null>(null)

export function LembretesProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth()
  const [lembretes, setLembretes] = useState<Lembrete[]>([])
  const [carregando, setCarregando] = useState(false)

  const recarregar = useCallback(async () => {
    if (!isAuthenticated) return
    setCarregando(true)
    try {
      const res = await apiFetch<{ lembretes: Lembrete[] }>('/lembretes')
      setLembretes(Array.isArray(res) ? res : (res.lembretes ?? []))
    } catch { /* mantém estado */ } finally {
      setCarregando(false)
    }
  }, [isAuthenticated])

  useEffect(() => { recarregar() }, [recarregar])

  const adicionarLembrete = useCallback(async (dados: Omit<Lembrete, 'id' | 'created_at'>) => {
    const res = await apiFetch<{ lembrete: Lembrete } | Lembrete>('/lembretes', {
      method: 'POST',
      body: dados,
    })
    const novo = 'lembrete' in res ? res.lembrete : res
    setLembretes(prev => [...prev, novo])
    return novo
  }, [])

  const marcarStatus = useCallback(async (id: string, status: StatusLembrete) => {
    const res = await apiFetch<{ lembrete: Lembrete } | Lembrete>(`/lembretes/${id}`, {
      method: 'PATCH',
      body: { status },
    })
    const atualizado = 'lembrete' in res ? res.lembrete : res
    setLembretes(prev => prev.map(l => l.id === id ? atualizado : l))
  }, [])

  const removerLembrete = useCallback(async (id: string) => {
    await apiFetch(`/lembretes/${id}`, { method: 'DELETE' })
    setLembretes(prev => prev.filter(l => l.id !== id))
  }, [])

  const buscarLembretesMembro = useCallback(
    (membro_id: string) => lembretes.filter(l => l.membro_id === membro_id),
    [lembretes],
  )

  const lembretesPendentes = lembretes.filter(l => l.status === 'pendente')

  return (
    <LembretesContext.Provider value={{
      lembretes, carregando, adicionarLembrete, marcarStatus,
      removerLembrete, buscarLembretesMembro, lembretesPendentes, recarregar,
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
