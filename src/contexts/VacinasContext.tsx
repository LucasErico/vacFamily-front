/**
 * VacinasContext — vacinas locais (seed) + registros vacinais via API
 * Endpoints: GET|POST /registros  |  DELETE /registros/:id
 * A lista de vacinas continua local (seed) pois é dado público imutável.
 */
import {
  createContext, useContext, useState, useCallback,
  useEffect, type ReactNode,
} from 'react'
import type { Vacina, RegistroVacinal, DoseStatus, StatusDose } from '@/types'
import { VACINAS_SEED } from '@/data/vacinasSeed'
import { apiFetch } from '@/services/api'
import { useAuth } from './AuthContext'

function calcularIdadeEmDias(dataNascimento: string): number {
  const nasc = new Date(dataNascimento)
  const hoje = new Date()
  return Math.floor((hoje.getTime() - nasc.getTime()) / (1000 * 60 * 60 * 24))
}

function calcularStatusDose(
  vacina: Vacina,
  numeroDose: number,
  registros: RegistroVacinal[],
  idadeEmDias: number,
): StatusDose {
  const idadeMin = vacina.idadeRecomendadaDias ?? 0
  if (idadeEmDias < idadeMin - 30) return 'nao_aplicavel'
  const registro = registros.find(r => r.vacinaId === vacina.id && r.numeroDose === numeroDose)
  if (registro) return 'aplicada'
  const idadeRecomendada = idadeMin + (numeroDose - 1) * (vacina.intervaloDias ?? 0)
  if (idadeEmDias > idadeRecomendada + 30) return 'atrasada'
  return 'pendente'
}

export function calcularDosesStatus(
  vacina: Vacina,
  registros: RegistroVacinal[],
  dataNascimento: string,
): DoseStatus[] {
  const idadeEmDias = calcularIdadeEmDias(dataNascimento)
  return Array.from({ length: vacina.doses }, (_, i) => {
    const numeroDose = i + 1
    const status = calcularStatusDose(vacina, numeroDose, registros, idadeEmDias)
    const registro = registros.find(r => r.vacinaId === vacina.id && r.numeroDose === numeroDose)
    const idadeMin = vacina.idadeRecomendadaDias ?? 0
    const dataRecomendadaDias = idadeMin + i * (vacina.intervaloDias ?? 0)
    const dataRecomendada = new Date(
      new Date(dataNascimento).getTime() + dataRecomendadaDias * 86400000,
    ).toISOString().slice(0, 10)
    return { vacinaId: vacina.id, vacina, numeroDose, status, dataAplicacao: registro?.dataAplicacao, dataRecomendada }
  })
}

type GerarLembreteReforcoFn = (
  membroId: string, vacinaId: string, numeroDose: number, dataLembrete: string,
) => void

interface VacinasContextValue {
  vacinas: Vacina[]
  registros: RegistroVacinal[]
  carregando: boolean
  registrarDose: (dados: Omit<RegistroVacinal, 'id' | 'criadoEm'>, gerarLembrete?: GerarLembreteReforcoFn) => Promise<RegistroVacinal>
  removerRegistro: (id: string) => Promise<void>
  buscarRegistrosMembro: (membroId: string) => RegistroVacinal[]
  recarregar: () => Promise<void>
}

const VacinasContext = createContext<VacinasContextValue | null>(null)

export function VacinasProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth()
  const [vacinas] = useState<Vacina[]>(VACINAS_SEED)
  const [registros, setRegistros] = useState<RegistroVacinal[]>([])
  const [carregando, setCarregando] = useState(false)

  const recarregar = useCallback(async () => {
    if (!isAuthenticated) return
    setCarregando(true)
    try {
      const data = await apiFetch<RegistroVacinal[]>('/registros')
      setRegistros(data)
    } catch { /* mantém estado */ } finally {
      setCarregando(false)
    }
  }, [isAuthenticated])

  useEffect(() => { recarregar() }, [recarregar])

  const registrarDose = useCallback(async (
    dados: Omit<RegistroVacinal, 'id' | 'criadoEm'>,
    gerarLembrete?: GerarLembreteReforcoFn,
  ) => {
    const novo = await apiFetch<RegistroVacinal>('/registros', {
      method: 'POST',
      body: dados,
    })
    setRegistros(prev => [...prev, novo])

    if (gerarLembrete) {
      const vacina = vacinas.find(v => v.id === dados.vacinaId)
      if (vacina && dados.numeroDose < vacina.doses && vacina.intervaloDias) {
        const proximaData = new Date(
          new Date(dados.dataAplicacao).getTime() + vacina.intervaloDias * 86400000,
        ).toISOString().slice(0, 10)
        gerarLembrete(dados.membroId, dados.vacinaId, dados.numeroDose + 1, proximaData)
      }
    }
    return novo
  }, [vacinas])

  const removerRegistro = useCallback(async (id: string) => {
    await apiFetch(`/registros/${id}`, { method: 'DELETE' })
    setRegistros(prev => prev.filter(r => r.id !== id))
  }, [])

  const buscarRegistrosMembro = useCallback(
    (membroId: string) => registros.filter(r => r.membroId === membroId),
    [registros],
  )

  return (
    <VacinasContext.Provider value={{
      vacinas, registros, carregando,
      registrarDose, removerRegistro, buscarRegistrosMembro, recarregar,
    }}>
      {children}
    </VacinasContext.Provider>
  )
}

export function useVacinas() {
  const ctx = useContext(VacinasContext)
  if (!ctx) throw new Error('useVacinas deve ser usado dentro de <VacinasProvider>')
  return ctx
}
