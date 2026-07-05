import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import type { MembroFamiliar, Parentesco } from '@/types'
import { useAuth } from './AuthContext'

function gerarId() {
  return `mbr_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
}

const MEMBROS_INICIAIS: MembroFamiliar[] = [
  {
    id: 'mbr_demo_001',
    usuarioId: 'usr_demo_001',
    nome: 'Ana Silva',
    dataNascimento: '1985-03-15',
    parentesco: 'titular',
    criadoEm: new Date().toISOString(),
  },
  {
    id: 'mbr_demo_002',
    usuarioId: 'usr_demo_001',
    nome: 'Carlos Silva',
    dataNascimento: '1983-07-22',
    parentesco: 'conjuge',
    criadoEm: new Date().toISOString(),
  },
  {
    id: 'mbr_demo_003',
    usuarioId: 'usr_demo_001',
    nome: 'Pedro Silva',
    dataNascimento: '2018-11-05',
    parentesco: 'filho',
    criadoEm: new Date().toISOString(),
  },
  {
    id: 'mbr_demo_004',
    usuarioId: 'usr_demo_001',
    nome: 'Luísa Silva',
    dataNascimento: '2021-04-18',
    parentesco: 'filha',
    criadoEm: new Date().toISOString(),
  },
]

interface MembrosContextValue {
  membros: MembroFamiliar[]
  adicionarMembro: (dados: Omit<MembroFamiliar, 'id' | 'usuarioId' | 'criadoEm'>) => MembroFamiliar
  atualizarMembro: (id: string, dados: Partial<Omit<MembroFamiliar, 'id' | 'usuarioId' | 'criadoEm'>>) => void
  removerMembro: (id: string) => void
  buscarMembro: (id: string) => MembroFamiliar | undefined
}

const MembrosContext = createContext<MembrosContextValue | null>(null)

export function MembrosProvider({ children }: { children: ReactNode }) {
  const { usuario } = useAuth()
  const [membros, setMembros] = useState<MembroFamiliar[]>(MEMBROS_INICIAIS)

  const adicionarMembro = useCallback((dados: Omit<MembroFamiliar, 'id' | 'usuarioId' | 'criadoEm'>) => {
    const novo: MembroFamiliar = {
      ...dados,
      id: gerarId(),
      usuarioId: usuario?.id ?? '',
      criadoEm: new Date().toISOString(),
    }
    setMembros(prev => [...prev, novo])
    return novo
  }, [usuario])

  const atualizarMembro = useCallback((id: string, dados: Partial<Omit<MembroFamiliar, 'id' | 'usuarioId' | 'criadoEm'>>) => {
    setMembros(prev => prev.map(m => m.id === id ? { ...m, ...dados } : m))
  }, [])

  const removerMembro = useCallback((id: string) => {
    setMembros(prev => prev.filter(m => m.id !== id))
  }, [])

  const buscarMembro = useCallback((id: string) => {
    return membros.find(m => m.id === id)
  }, [membros])

  return (
    <MembrosContext.Provider value={{ membros, adicionarMembro, atualizarMembro, removerMembro, buscarMembro }}>
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
