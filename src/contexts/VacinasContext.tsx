import {
  createContext, useContext, useState, useCallback,
  type ReactNode,
} from 'react'
import type { Vacina, RegistroVacinal, DoseStatus, StatusDose } from '@/types'
import { VACINAS_SEED } from '@/data/vacinasSeed'

function gerarId() {
  return `reg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
}

function calcularIdadeEmDias(dataNascimento: string): number {
  const nasc = new Date(dataNascimento)
  const hoje = new Date()
  return Math.floor((hoje.getTime() - nasc.getTime()) / (1000 * 60 * 60 * 24))
}

function calcularStatusDose(
  vacina: Vacina,
  numeroDose: number,
  registros: RegistroVacinal[],
  idadeEmDias: number
): StatusDose {
  const idadeMin = vacina.idadeRecomendadaDias ?? 0
  if (idadeEmDias < idadeMin - 30) return 'nao_aplicavel'

  const registro = registros.find(
    r => r.vacinaId === vacina.id && r.numeroDose === numeroDose
  )
  if (registro) return 'aplicada'

  const idadeRecomendada = idadeMin + (numeroDose - 1) * (vacina.intervaloDias ?? 0)
  if (idadeEmDias > idadeRecomendada + 30) return 'atrasada'

  return 'pendente'
}

export function calcularDosesStatus(
  vacina: Vacina,
  registros: RegistroVacinal[],
  dataNascimento: string
): DoseStatus[] {
  const idadeEmDias = calcularIdadeEmDias(dataNascimento)
  const doses: DoseStatus[] = []

  for (let i = 1; i <= vacina.doses; i++) {
    const status = calcularStatusDose(vacina, i, registros, idadeEmDias)
    const registro = registros.find(r => r.vacinaId === vacina.id && r.numeroDose === i)
    const idadeMin = vacina.idadeRecomendadaDias ?? 0
    const dataRecomendadaDias = idadeMin + (i - 1) * (vacina.intervaloDias ?? 0)
    const dataRecomendada = new Date(
      new Date(dataNascimento).getTime() + dataRecomendadaDias * 86400000
    ).toISOString().slice(0, 10)

    doses.push({
      vacinaId: vacina.id,
      vacina,
      numeroDose: i,
      status,
      dataAplicacao: registro?.dataAplicacao,
      dataRecomendada,
    })
  }
  return doses
}

type GerarLembreteReforcoFn = (membroId: string, vacinaId: string, numeroDose: number, dataLembrete: string) => void

interface VacinasContextValue {
  vacinas: Vacina[]
  registros: RegistroVacinal[]
  registrarDose: (dados: Omit<RegistroVacinal, 'id' | 'criadoEm'>, gerarLembrete?: GerarLembreteReforcoFn) => RegistroVacinal
  removerRegistro: (id: string) => void
  buscarRegistrosMembro: (membroId: string) => RegistroVacinal[]
}

const VacinasContext = createContext<VacinasContextValue | null>(null)

export function VacinasProvider({ children }: { children: ReactNode }) {
  const [vacinas] = useState<Vacina[]>(VACINAS_SEED)
  const [registros, setRegistros] = useState<RegistroVacinal[]>([])

  const registrarDose = useCallback(
    (dados: Omit<RegistroVacinal, 'id' | 'criadoEm'>, gerarLembrete?: GerarLembreteReforcoFn) => {
      const novo: RegistroVacinal = {
        ...dados,
        id: gerarId(),
        criadoEm: new Date().toISOString(),
      }
      setRegistros(prev => [...prev, novo])

      // Gerar lembrete automático para próxima dose, se houver
      if (gerarLembrete) {
        const vacina = vacinas.find(v => v.id === dados.vacinaId)
        if (vacina && dados.numeroDose < vacina.doses && vacina.intervaloDias) {
          const proximaData = new Date(
            new Date(dados.dataAplicacao).getTime() + vacina.intervaloDias * 86400000
          ).toISOString().slice(0, 10)
          gerarLembrete(dados.membroId, dados.vacinaId, dados.numeroDose + 1, proximaData)
        }
      }

      return novo
    },
    [vacinas]
  )

  const removerRegistro = useCallback((id: string) => {
    setRegistros(prev => prev.filter(r => r.id !== id))
  }, [])

  const buscarRegistrosMembro = useCallback((membroId: string) => {
    return registros.filter(r => r.membroId === membroId)
  }, [registros])

  return (
    <VacinasContext.Provider value={{ vacinas, registros, registrarDose, removerRegistro, buscarRegistrosMembro }}>
      {children}
    </VacinasContext.Provider>
  )
}

export function useVacinas() {
  const ctx = useContext(VacinasContext)
  if (!ctx) throw new Error('useVacinas deve ser usado dentro de <VacinasProvider>')
  return ctx
}
