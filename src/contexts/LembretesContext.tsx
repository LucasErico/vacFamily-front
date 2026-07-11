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

const LABEL_TIPO: Record<string, string> = {
  campanha: 'Campanha de vacinação',
  reforco: 'Reforço vacinal',
  manual: 'Lembrete manual',
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
    const membro_familiar_id = 'membro_familiar_id' in dados
      ? dados.membro_familiar_id
      : ('membro_id' in dados ? dados.membro_id : undefined)

    const data_prevista = 'data_prevista' in dados
      ? dados.data_prevista
      : ('data_lembrete' in dados ? dados.data_lembrete : '')

    const payload: CriarLembretePayload = {
      membro_familiar_id,
      vacina_id: dados.vacina_id,
      tipo: 'tipo' in dados && dados.tipo ? dados.tipo : 'manual',
      titulo: 'titulo' in dados && dados.titulo
        ? dados.titulo
        : LABEL_TIPO['manual'],
      descricao: 'descricao' in dados ? dados.descricao : undefined,
      data_prevista,
      automatico: dados.automatico ?? false,
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
