import {
  createContext, useContext, useState, useCallback,
  useEffect, type ReactNode,
} from 'react'
import type { Lembrete, StatusLembrete, CriarLembretePayload } from '@/types'
import { apiFetch } from '@/services/api'
import { useAuth } from './AuthContext'

interface LembretesContextValue {
  lembretes: Lembrete[]
  carregando: boolean
  adicionarLembrete: (dados: CriarLembretePayload | Omit<Lembrete, 'id' | 'created_at'>) => Promise<Lembrete>
  marcarStatus: (id: string, status: StatusLembrete) => Promise<void>
  removerLembrete: (id: string) => Promise<void>
  buscarLembretesMembro: (membro_id: string) => Lembrete[]
  lembretesPendentes: Lembrete[]
  recarregar: () => Promise<void>
}

const LembretesContext = createContext<LembretesContextValue | null>(null)

function normalizarLembrete(l: Lembrete): Lembrete {
  return {
    ...l,
    membro_id: l.membro_id ?? l.membro_familiar_id,
    data_lembrete: l.data_lembrete ?? l.data_prevista,
  }
}

export function LembretesProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth()
  const [lembretes, setLembretes] = useState<Lembrete[]>([])
  const [carregando, setCarregando] = useState(false)

  const recarregar = useCallback(async () => {
    if (!isAuthenticated) return
    setCarregando(true)
    try {
      const res = await apiFetch<{ lembretes: Lembrete[] }>('/lembretes')
      const lista = Array.isArray(res) ? res : (res.lembretes ?? [])
      setLembretes(lista.map(normalizarLembrete))
    } catch {
      // mantém estado
    } finally {
      setCarregando(false)
    }
  }, [isAuthenticated])

  useEffect(() => { recarregar() }, [recarregar])

  const adicionarLembrete = useCallback(async (dados: CriarLembretePayload | Omit<Lembrete, 'id' | 'created_at'>) => {
    const raw = dados as Record<string, unknown>

    const membro_familiar_id = (raw.membro_familiar_id ?? raw.membro_id) as string | undefined
    const data_prevista = (raw.data_prevista ?? raw.data_lembrete ?? '') as string

    const payload: CriarLembretePayload = {
      membro_familiar_id,
      vacina_id: raw.vacina_id as string | undefined,
      tipo: (raw.tipo as CriarLembretePayload['tipo']) || 'reforco',
      titulo: (raw.titulo as string) || 'Reforço vacinal',
      descricao: raw.descricao as string | undefined,
      data_prevista,
      automatico: (raw.automatico as boolean) ?? false,
    }

    const res = await apiFetch<{ lembrete: Lembrete } | Lembrete>('/lembretes', {
      method: 'POST',
      body: payload,
    })
    const novo = normalizarLembrete('lembrete' in res ? res.lembrete : res)
    setLembretes(prev => [...prev, novo])
    return novo
  }, [])

  const marcarStatus = useCallback(async (id: string, status: StatusLembrete) => {
    const res = await apiFetch<{ lembrete: Lembrete } | Lembrete>(`/lembretes/${id}`, {
      method: 'PATCH',
      body: { status },
    })
    const atualizado = normalizarLembrete('lembrete' in res ? res.lembrete : res)
    setLembretes(prev => prev.map(l => l.id === id ? atualizado : l))
  }, [])

  const removerLembrete = useCallback(async (id: string) => {
    await apiFetch(`/lembretes/${id}`, { method: 'DELETE' })
    setLembretes(prev => prev.filter(l => l.id !== id))
  }, [])

  const buscarLembretesMembro = useCallback(
    (membro_id: string) => lembretes.filter(l => (l.membro_id ?? l.membro_familiar_id) === membro_id),
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
