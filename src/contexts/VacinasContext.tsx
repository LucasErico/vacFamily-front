/**
 * VacinasContext — vacinas locais (seed) + registros vacinais via API
 *
 * Registros são carregados por membro sob demanda:
 *   GET /registros/membro/:membroId  → { status, registros: [] }
 *   POST /registros/membro/:membroId → { status, registro: {} }
 *   DELETE /registros/:id
 *
 * A lista de vacinas continua local (seed) — dado público imutável.
 *
 * Regras de negócio de status:
 *   - dose com registro (data passada)  → 'aplicada'  → vai para Histórico
 *   - dose sem registro, data futura    → 'pendente'  → vai para Calendário
 *   - dose sem registro, data passada   → 'pendente'  → NÃO é 'atrasada' automática
 *     (evita poluição retroativa; 'atrasada' só deve existir com registro explícito)
 *   - dose ainda fora da faixa etária   → 'nao_aplicavel'
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

  // Fora da faixa etária com margem de 30 dias
  if (idadeEmDias < idadeMin - 30) return 'nao_aplicavel'

  // Se há registro para esta dose → aplicada (vai para Histórico)
  const registro = registros.find(
    r => r.vacina_id === vacina.id && r.numero_dose === numeroDose,
  )
  if (registro) return 'aplicada'

  // Sem registro: sempre 'pendente' — nunca calcular 'atrasada' retroativamente.
  // Doses passadas sem registro são omitidas no Calendário e não poluem o histórico.
  return 'pendente'
}

export function calcularDosesStatus(
  vacina: Vacina,
  registros: RegistroVacinal[],
  dataNascimento: string,
): DoseStatus[] {
  const idadeEmDias = calcularIdadeEmDias(dataNascimento)
  const hoje = new Date().toISOString().slice(0, 10)

  return Array.from({ length: vacina.doses }, (_, i) => {
    const numeroDose = i + 1
    const status = calcularStatusDose(vacina, numeroDose, registros, idadeEmDias)
    const registro = registros.find(
      r => r.vacina_id === vacina.id && r.numero_dose === numeroDose,
    )
    const idadeMin = vacina.idadeRecomendadaDias ?? 0
    const dataRecomendadaDias = idadeMin + i * (vacina.intervaloDias ?? 0)
    const dataRecomendada = new Date(
      new Date(dataNascimento).getTime() + dataRecomendadaDias * 86400000,
    ).toISOString().slice(0, 10)

    // Dose aplicada com data passada → Histórico; futura → Calendário
    const isHistorico = status === 'aplicada' && (registro?.data_aplicacao ?? '') <= hoje

    return {
      vacinaId: vacina.id,
      vacina,
      numeroDose,
      status,
      dataAplicacao: registro?.data_aplicacao,
      dataRecomendada,
      isHistorico,
    }
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
    } catch { /* mantém estado offline */ } finally {
      setCarregando(false)
    }
  }, [isAuthenticated, membros])

  useEffect(() => { recarregar() }, [recarregar])

  const registrarDose = useCallback(async (
    dados: Omit<RegistroVacinal, 'id' | 'created_at'>,
    gerarLembrete?: GerarLembreteReforcoFn,
  ) => {
    // Monta payload explicitamente: garante tipos corretos e exclui campos
    // que não pertencem ao body (ex: membro_id que vai no path param).
    const payload: Record<string, unknown> = {
      vacina_id: dados.vacina_id,
      numero_dose: Number(dados.numero_dose), // Zod exige number, não string
      data_aplicacao: dados.data_aplicacao,
    }
    if (dados.local_aplicacao) payload.local_aplicacao = dados.local_aplicacao
    if (dados.fabricante)      payload.fabricante      = dados.fabricante
    if (dados.lote)            payload.lote            = dados.lote
    if (dados.dose_zero != null) payload.dose_zero     = dados.dose_zero
    if (dados.observacoes)     payload.observacoes     = dados.observacoes

    const res = await apiFetch<{ registro: RegistroVacinal } | RegistroVacinal>(
      `/registros/membro/${dados.membro_id}`,
      { method: 'POST', body: payload },
    )
    const novo = 'registro' in res ? res.registro : res

    // Normaliza: garante que membro_id esteja presente (pode vir como membro_familiar_id do back)
    const novoNormalizado: RegistroVacinal = {
      ...novo,
      membro_id: (novo as unknown as Record<string, unknown>).membro_familiar_id as string ?? novo.membro_id ?? dados.membro_id,
    }

    setRegistros(prev => [...prev, novoNormalizado])

    if (gerarLembrete) {
      const vacina = vacinas.find(v => v.id === dados.vacina_id)
      if (vacina && dados.numero_dose < vacina.doses && vacina.intervaloDias) {
        const proximaData = new Date(
          new Date(dados.data_aplicacao).getTime() + vacina.intervaloDias * 86400000,
        ).toISOString().slice(0, 10)
        gerarLembrete(dados.membro_id, dados.vacina_id, dados.numero_dose + 1, proximaData)
      }
    }
    return novoNormalizado
  }, [vacinas])

  const removerRegistro = useCallback(async (id: string) => {
    await apiFetch(`/registros/${id}`, { method: 'DELETE' })
    setRegistros(prev => prev.filter(r => r.id !== id))
  }, [])

  // CRÍTICO: o back retorna membro_familiar_id, não membro_id.
  // Filtra pelos dois para garantir compatibilidade enquanto
  // o campo não é normalizado pelo back.
  const buscarRegistrosMembro = useCallback(
    (membro_id: string) => registros.filter(
      r => r.membro_id === membro_id || r.membro_familiar_id === membro_id,
    ),
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
