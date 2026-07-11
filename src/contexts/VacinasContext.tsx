/**
 * VacinasContext — vacinas locais (seed) + registros vacinais via API
 *
 * Registros são carregados por membro sob demanda:
 *   GET /registros/membro/:membroId  → { status, registros: [] }
 *   POST /registros/membro/:membroId → { status, registro: {} }
 *   DELETE /registros/:id
 *
 * A lista de vacinas continua local (seed) — dado público imutável.
 */
import {
  createContext, useContext, useState, useCallback,
  useEffect, type ReactNode,
} from 'react'
import type { Vacina, RegistroVacinal, DoseStatus, StatusDose } from '@/types'
import { VACINAS_SEED } from '@/data/vacinasSeed'
import { apiFetch } from '@/services/api'
import { useAuth } from './AuthContext'
import { useMembros } from './MembrosContext'

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
  const registro = registros.find(r => r.vacina_id === vacina.id && r.numero_dose === numeroDose)
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
    const registro = registros.find(r => r.vacina_id === vacina.id && r.numero_dose === numeroDose)
    const idadeMin = vacina.idadeRecomendadaDias ?? 0
    const dataRecomendadaDias = idadeMin + i * (vacina.intervaloDias ?? 0)
    const dataRecomendada = new Date(
      new Date(dataNascimento).getTime() + dataRecomendadaDias * 86400000,
    ).toISOString().slice(0, 10)
    return { vacinaId: vacina.id, vacina, numeroDose, status, dataAplicacao: registro?.data_aplicacao, dataRecomendada }
  })
}

type GerarLembreteReforcoFn = (
  membro_id: string, vacina_id: string, numero_dose: number, data_lembrete: string,
) => void

interface VacinasContextValue {
  vacinas: Vacina[]
  registros: RegistroVacinal[]
  carregando: boolean
  registrarDose: (dados: Omit<RegistroVacinal, 'id' | 'created_at'>, gerarLembrete?: GerarLembreteReforcoFn) => Promise<RegistroVacinal>
  removerRegistro: (id: string) => Promise<void>
  buscarRegistrosMembro: (membro_id: string) => RegistroVacinal[]
  recarregar: () => Promise<void>
}

const VacinasContext = createContext<VacinasContextValue | null>(null)

export function VacinasProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth()
  const { membros } = useMembros()
  const [vacinas] = useState<Vacina[]>(VACINAS_SEED)
  const [registros, setRegistros] = useState<RegistroVacinal[]>([])
  const [carregando, setCarregando] = useState(false)

  // Carrega registros de TODOS os membros do usuário em paralelo
  const recarregar = useCallback(async () => {
    if (!isAuthenticated || membros.length === 0) return
    setCarregando(true)
    try {
      const resultados = await Promise.all(
        membros.map(m =>
          apiFetch<{ registros: RegistroVacinal[] }>(`/registros/membro/${m.id}`)
            .then(res => (Array.isArray(res) ? res : (res.registros ?? [])))
            .catch(() => [] as RegistroVacinal[])
        )
      )
      setRegistros(resultados.flat())
    } catch { /* mantém estado */ } finally {
      setCarregando(false)
    }
  }, [isAuthenticated, membros])

  useEffect(() => { recarregar() }, [recarregar])

  const registrarDose = useCallback(async (
    dados: Omit<RegistroVacinal, 'id' | 'created_at'>,
    gerarLembrete?: GerarLembreteReforcoFn,
  ) => {
    const res = await apiFetch<{ registro: RegistroVacinal } | RegistroVacinal>(
      `/registros/membro/${dados.membro_id}`,
      { method: 'POST', body: dados },
    )
    const novo = 'registro' in res ? res.registro : res
    setRegistros(prev => [...prev, novo])

    if (gerarLembrete) {
      const vacina = vacinas.find(v => v.id === dados.vacina_id)
      if (vacina && dados.numero_dose < vacina.doses && vacina.intervaloDias) {
        const proximaData = new Date(
          new Date(dados.data_aplicacao).getTime() + vacina.intervaloDias * 86400000,
        ).toISOString().slice(0, 10)
        gerarLembrete(dados.membro_id, dados.vacina_id, dados.numero_dose + 1, proximaData)
      }
    }
    return novo
  }, [vacinas])

  const removerRegistro = useCallback(async (id: string) => {
    await apiFetch(`/registros/${id}`, { method: 'DELETE' })
    setRegistros(prev => prev.filter(r => r.id !== id))
  }, [])

  const buscarRegistrosMembro = useCallback(
    (membro_id: string) => registros.filter(r => r.membro_id === membro_id),
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
