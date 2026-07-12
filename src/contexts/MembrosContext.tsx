/**
 * MembrosContext — CRUD real via API backend
 * Endpoints: GET|POST /membros  |  GET|PUT|DELETE /membros/:id
 *
 * Cache stale-while-revalidate em sessionStorage (chave vf_membros_cache):
 *   - Exibe dado cacheado imediatamente ao montar (zero flash de lista vazia)
 *   - Revalida em segundo plano e atualiza a UI quando a resposta chega
 *   - Cache é inválido ao fazer logout (clearToken limpa a sessão)
 */
import {
  createContext, useContext, useState, useCallback,
  useEffect, type ReactNode,
} from 'react'
import type { MembroFamiliar, CriarMembroPayload, Relacao } from '@/types'
import { apiFetch } from '@/services/api'
import { useAuth } from './AuthContext'

const CACHE_KEY = 'vf_membros_cache'

function lerCache(): MembroFamiliar[] {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY)
    return raw ? (JSON.parse(raw) as MembroFamiliar[]) : []
  } catch { return [] }
}

function salvarCache(membros: MembroFamiliar[]) {
  try { sessionStorage.setItem(CACHE_KEY, JSON.stringify(membros)) } catch { /* noop */ }
}

interface MembrosContextValue {
  membros: MembroFamiliar[]
  carregando: boolean
  adicionarMembro: (dados: CriarMembroPayload) => Promise<MembroFamiliar>
  atualizarMembro: (id: string, dados: Partial<CriarMembroPayload>) => Promise<void>
  removerMembro: (id: string) => Promise<void>
  buscarMembro: (id: string) => MembroFamiliar | undefined
  recarregar: () => Promise<void>
}

const MembrosContext = createContext<MembrosContextValue | null>(null)

export function MembrosProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth()

  // Inicializa com cache para evitar flash de lista vazia
  const [membros, setMembros] = useState<MembroFamiliar[]>(lerCache)
  const [carregando, setCarregando] = useState(false)

  const recarregar = useCallback(async () => {
    if (!isAuthenticated) return
    setCarregando(true)
    try {
      const res = await apiFetch<{ membros: MembroFamiliar[] }>('/membros')
      const lista = Array.isArray(res) ? res : (res.membros ?? [])
      setMembros(lista)
      salvarCache(lista)
    } catch {
      // Rede indisponível: mantém o cache atual (já carregado no estado)
    } finally {
      setCarregando(false)
    }
  }, [isAuthenticated])

  useEffect(() => { recarregar() }, [recarregar])

  const adicionarMembro = useCallback(async (dados: CriarMembroPayload) => {
    const res = await apiFetch<{ membro: MembroFamiliar } | MembroFamiliar>('/membros', {
      method: 'POST',
      body: dados,
    })
    const novo = 'membro' in res ? res.membro : res
    setMembros(prev => {
      const lista = [...prev, novo]
      salvarCache(lista)
      return lista
    })
    return novo
  }, [])

  const atualizarMembro = useCallback(async (
    id: string,
    dados: Partial<CriarMembroPayload>,
  ) => {
    const res = await apiFetch<{ membro: MembroFamiliar } | MembroFamiliar>(`/membros/${id}`, {
      method: 'PUT',
      body: dados,
    })
    const atualizado = 'membro' in res ? res.membro : res
    setMembros(prev => {
      const lista = prev.map(m => m.id === id ? atualizado : m)
      salvarCache(lista)
      return lista
    })
  }, [])

  const removerMembro = useCallback(async (id: string) => {
    await apiFetch(`/membros/${id}`, { method: 'DELETE' })
    setMembros(prev => {
      const lista = prev.filter(m => m.id !== id)
      salvarCache(lista)
      return lista
    })
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

export const RELACAO_LABEL: Record<Relacao, string> = {
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

/** @deprecated use RELACAO_LABEL */
export const PARENTESCO_LABEL = RELACAO_LABEL
