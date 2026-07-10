import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import type { MembroFamiliar } from '@/types'
import { useMembros } from './MembrosContext'

interface MembroAtivoContextValue {
  membroAtivo: MembroFamiliar | null
  setMembroAtivo: (membro: MembroFamiliar) => void
}

const MembroAtivoContext = createContext<MembroAtivoContextValue | null>(null)

export function MembroAtivoProvider({ children }: { children: ReactNode }) {
  const { membros } = useMembros()
  const [membroAtivo, setMembroAtivo] = useState<MembroFamiliar | null>(null)

  // inicializa com o titular ou o primeiro membro disponível
  useEffect(() => {
    if (membros.length > 0 && !membroAtivo) {
      const titular = membros.find(m => m.parentesco === 'titular') ?? membros[0]
      setMembroAtivo(titular)
    }
  }, [membros, membroAtivo])

  return (
    <MembroAtivoContext.Provider value={{ membroAtivo, setMembroAtivo }}>
      {children}
    </MembroAtivoContext.Provider>
  )
}

export function useMembroAtivo() {
  const ctx = useContext(MembroAtivoContext)
  if (!ctx) throw new Error('useMembroAtivo deve ser usado dentro de <MembroAtivoProvider>')
  return ctx
}

/** Gera uma cor de fundo determinística baseada no nome do membro */
export function corAvatar(nome: string): string {
  const cores = [
    '#01696f', '#006494', '#7a39bb', '#437a22',
    '#964219', '#a12c7b', '#d19900', '#a13544',
  ]
  let hash = 0
  for (let i = 0; i < nome.length; i++) hash = nome.charCodeAt(i) + ((hash << 5) - hash)
  return cores[Math.abs(hash) % cores.length]
}
