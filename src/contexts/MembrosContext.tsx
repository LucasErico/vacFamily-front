/**
 * MembrosContext — CRUD real via API backend
 * Endpoints: GET|POST /membros  |  GET|PUT|DELETE /membros/:id
 *
 * Respostas da API têm envelope:
 *   GET /membros        → { status, membros: [] }
 *   POST /membros       → { status, membro: {} }
 *   PUT /membros/:id    → { status, membro: {} }
 */
import {
  createContext, useContext, useState, useCallback,
  useEffect, type ReactNode,
} from 'react'
import type { MembroFamiliar, Parentesco } from '@/types'
import { apiFetch } from '@/services/api'
import { useAuth } from './AuthContext'

interface MembrosContextValue {
  membros: MembroFamiliar[]
  carregando: boolean
  adicionarMembro: (dados: Omit<MembroFamiliar, 'id' | 'usuarioId' | 'criadoEm'>) => Promise<MembroFamiliar>
  atualizarMembro: (id: string, dados: Partial<Omit<MembroFamiliar, 'id' | 'usuarioId' | 'criadoEm'>>) => Promise<void>
  removerMembro: (id: string) => Promise<void>
  buscarMembro: (id: string) => MembroFamiliar | undefined
  recarregar: () => Promise<void>
}

const MembrosContext = createContext<MembrosContextValue | null>(null)

export function MembrosProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth()
  const [membros, setMembros] = useState<MembroFamiliar[]>([])
  const [carregando, setCarregando] = useState(false)

  const recarregar = useCallback(async () => {
    if (!isAuthenticated) return
    setCarregando(true)
    try {
      const res = await apiFetch<{ membros: MembroFamiliar[] }>('/membros')
      setMembros(Array.isArray(res) ? res : (res.membros ?? []))
    } catch {
      // mantém estado atual em caso de erro de rede
    } finally {
      setCarregando(false)
    }
  }, [isAuthenticated])

  useEffect(() => { recarregar() }, [recarregar])

  const adicionarMembro = useCallback(async (
    dados: Omit<MembroFamiliar, 'id' | 'usuarioId' | 'criadoEm'>,
  ) => {
    const res = await apiFetch<{ membro: MembroFamiliar } | MembroFamiliar>('/membros', {
      method: 'POST',
      body: dados,
    })
    const novo = 'membro' in res ? res.membro : res
    setMembros(prev => [...prev, novo])
    return novo
  }, [])

  const atualizarMembro = useCallback(async (
    id: string,
    dados: Partial<Omit<MembroFamiliar, 'id' | 'usuarioId' | 'criadoEm'>>,
  ) => {
    const res = await apiFetch<{ membro: MembroFamiliar } | MembroFamiliar>(`/membros/${id}`, {
      method: 'PUT',
      body: dados,
    })
    const atualizado = 'membro' in res ? res.membro : res
    setMembros(prev => prev.map(m => m.id === id ? atualizado : m))
  }, [])

  const removerMembro = useCallback(async (id: string) => {
    await apiFetch(`/membros/${id}`, { method: 'DELETE' })
    setMembros(prev => prev.filter(m => m.id !== id))
  }, [])

  const buscarMembro = useCallback(
    (id: string) => membros.find(m => m.id === id),
    [membros],
  )

  return (
    <MembrosContext.Provider value={{
      membros, carregando, adicionarMembro, atualizarMembro,
      removerMembro, buscarMembro, recarregar,
    }}>
      {children}
    </MembrosContext.Provider>
  )
}

export function useMembros() {
  const ctx = useContext(MembrosContext)
  if (!ctx) throw new Error('useMembros deve ser usado dentro de <MembrosProvider>')
  return ctx
}

export const PARENTESCO_LABEL: Record<Parentesco, string> = {
  titular:     'Titular',
  conjuge:     'Cônjuge',
  filho:       'Filho',
  filha:       'Filha',
  pai:         'Pai',
  mae:         'Mãe',
  avo:         'Avô',
  avo_materna: 'Avó',
  outro:       'Outro',
}
