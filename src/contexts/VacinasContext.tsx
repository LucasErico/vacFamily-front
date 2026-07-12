/**
 * VacinasContext
 *
 * Cache stale-while-revalidate em sessionStorage:
 *   vf_vacinas_cache   — lista pública de vacinas (imutável por sessão)
 *   vf_registros_cache — registros vacinais dos membros
 *
 * Fontes de dado:
 *   GET /vacinas                     → lista de vacinas do banco (tabela pública)
 *   GET /registros/membro/:membroId  → registros vacinais do membro
 *   POST /registros/membro/:membroId → registrar dose
 *   DELETE /registros/:id            → remover registro
 */
import {
  createContext, useContext, useState, useCallback,
  useEffect, type ReactNode,
} from 'react'
import type { Vacina, RegistroVacinal, DoseStatus, StatusDose, TipoCalendario, FaixaEtaria } from '@/types'
import { apiFetch } from '@/services/api'
import { useAuth } from './AuthContext'
import { useMembros } from './MembrosContext'

export const IDADE_MAX_RETROATIVA_DIAS = 730

const VACINAS_CACHE_KEY   = 'vf_vacinas_cache'
const REGISTROS_CACHE_KEY = 'vf_registros_cache'

function lerCacheVacinas(): Vacina[] {
  try {
    const raw = sessionStorage.getItem(VACINAS_CACHE_KEY)
    return raw ? (JSON.parse(raw) as Vacina[]) : []
  } catch { return [] }
}

function lerCacheRegistros(): RegistroVacinal[] {
  try {
    const raw = sessionStorage.getItem(REGISTROS_CACHE_KEY)
    return raw ? (JSON.parse(raw) as RegistroVacinal[]) : []
  } catch { return [] }
}

function salvarCacheVacinas(v: Vacina[]) {
  try { sessionStorage.setItem(VACINAS_CACHE_KEY, JSON.stringify(v)) } catch { /* noop */ }
}

function salvarCacheRegistros(r: RegistroVacinal[]) {
  try { sessionStorage.setItem(REGISTROS_CACHE_KEY, JSON.stringify(r)) } catch { /* noop */ }
}

const FAIXAS_POR_CALENDARIO: Record<TipoCalendario, FaixaEtaria[]> = {
  infantil:    ['recem_nascido', 'crianca', 'todas', 'intermitente'],
  adolescente: ['adolescente', 'adulto', 'todas', 'intermitente'],
  adulto:      ['adulto', 'todas', 'intermitente'],
  gestante:    ['gestante', 'adulto', 'todas', 'intermitente'],
  idoso:       ['idoso', 'adulto', 'todas', 'intermitente'],
  especial:    ['recem_nascido', 'crianca', 'adolescente', 'adulto', 'gestante', 'idoso', 'todas', 'intermitente'],
}

export function vacinaCompativel(vacina: Vacina, tipoCalendario: TipoCalendario): boolean {
  if (!Array.isArray(vacina.faixa_etaria) || vacina.faixa_etaria.length === 0) return true
  const faixasPermitidas = FAIXAS_POR_CALENDARIO[tipoCalendario] ?? ['todas']
  return vacina.faixa_etaria.some(f => faixasPermitidas.includes(f))
}

function isVacinaIntermitente(vacina: Vacina): boolean {
  return Array.isArray(vacina.faixa_etaria) && vacina.faixa_etaria.includes('intermitente')
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
  idadeEmDias: number,
): StatusDose {
  if (!isVacinaIntermitente(vacina)) {
    const idadeMin = vacina.idade_minima_dias ?? 0
    if (idadeEmDias < idadeMin - 30) return 'nao_aplicavel'
  }
  const registro = registros.find(
    r => r.vacina_id === vacina.id && r.numero_dose === numeroDose,
  )
  if (registro) return 'aplicada'
  return 'pendente'
}

export function calcularDosesStatus(
  vacina: Vacina,
  registros: RegistroVacinal[],
  dataNascimento: string,
  tipoCalendario?: TipoCalendario,
): DoseStatus[] {
  const idadeEmDias = calcularIdadeEmDias(dataNascimento)
  const hoje = new Date().toISOString().slice(0, 10)
  const intermitente = isVacinaIntermitente(vacina)
  const incompativel = tipoCalendario != null && !vacinaCompativel(vacina, tipoCalendario)
  const intervaloDias = vacina.intervalos_por_fabricante
    ? (Object.values(vacina.intervalos_por_fabricante)[0] ?? 30)
    : 30

  return Array.from({ length: vacina.doses_total }, (_, i) => {
    const numeroDose = i + 1
    const status: StatusDose = incompativel
      ? 'nao_aplicavel'
      : calcularStatusDose(vacina, numeroDose, registros, idadeEmDias)
    const registro = registros.find(
      r => r.vacina_id === vacina.id && r.numero_dose === numeroDose,
    )
    let dataRecomendada: string
    if (intermitente) {
      dataRecomendada = new Date(
        new Date(hoje).getTime() + i * intervaloDias * 86400000,
      ).toISOString().slice(0, 10)
    } else {
      const idadeMin = vacina.idade_minima_dias ?? 0
      const dataRecomendadaDias = idadeMin + i * intervaloDias
      dataRecomendada = new Date(
        new Date(dataNascimento).getTime() + dataRecomendadaDias * 86400000,
      ).toISOString().slice(0, 10)
    }
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

export function isAtrasada(
  dose: DoseStatus,
  dataNascimento: string,
  hoje: string,
): boolean {
  if (dose.status !== 'pendente') return false
  if (!dose.dataRecomendada) return false
  if (dose.dataRecomendada >= hoje) return false
  if (dose.vacina.faixa_etaria.includes('intermitente')) return false
  return calcularIdadeEmDias(dataNascimento) <= IDADE_MAX_RETROATIVA_DIAS
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

  // Inicializa com cache
  const [vacinas, setVacinas]     = useState<Vacina[]>(lerCacheVacinas)
  const [registros, setRegistros] = useState<RegistroVacinal[]>(lerCacheRegistros)
  const [carregando, setCarregando] = useState(false)

  const membrosIds = membros.map(m => m.id).join(',')

  // Carrega vacinas do banco (público, sem auth) — só se cache vazio
  useEffect(() => {
    if (vacinas.length > 0) {
      // Cache já tem dados: revalida em segundo plano sem bloquear UI
      apiFetch<{ vacinas: Vacina[] }>('/vacinas')
        .then(res => {
          const lista = Array.isArray(res) ? res : (res.vacinas ?? [])
          setVacinas(lista)
          salvarCacheVacinas(lista)
        })
        .catch(() => { /* mantém cache */ })
      return
    }
    apiFetch<{ vacinas: Vacina[] }>('/vacinas')
      .then(res => {
        const lista = Array.isArray(res) ? res : (res.vacinas ?? [])
        setVacinas(lista)
        salvarCacheVacinas(lista)
      })
      .catch(() => { /* mantém lista vazia */ })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const recarregar = useCallback(async () => {
    if (!isAuthenticated || !membrosIds) return
    setCarregando(true)
    try {
      const ids = membrosIds.split(',').filter(Boolean)
      const resultados = await Promise.all(
        ids.map(id =>
          apiFetch<{ registros: RegistroVacinal[] }>(`/registros/membro/${id}`)
            .then(res => (Array.isArray(res) ? res : (res.registros ?? [])))
            .catch(() => [] as RegistroVacinal[])
        )
      )
      const lista = resultados.flat()
      setRegistros(lista)
      salvarCacheRegistros(lista)
    } catch { /* mantém cache */ } finally {
      setCarregando(false)
    }
  }, [isAuthenticated, membrosIds])

  useEffect(() => { recarregar() }, [recarregar])

  const registrarDose = useCallback(async (
    dados: Omit<RegistroVacinal, 'id' | 'created_at'>,
    gerarLembrete?: GerarLembreteReforcoFn,
  ) => {
    const payload: Record<string, unknown> = {
      vacina_id:      dados.vacina_id,
      numero_dose:    Number(dados.numero_dose),
      data_aplicacao: dados.data_aplicacao,
    }
    if (dados.local_aplicacao)  payload.local_aplicacao = dados.local_aplicacao
    if (dados.fabricante)       payload.fabricante      = dados.fabricante
    if (dados.lote)             payload.lote            = dados.lote
    if (dados.dose_zero != null) payload.dose_zero      = dados.dose_zero
    if (dados.observacoes)      payload.observacoes     = dados.observacoes

    const res = await apiFetch<{ registro: RegistroVacinal } | RegistroVacinal>(
      `/registros/membro/${dados.membro_id}`,
      { method: 'POST', body: payload },
    )
    const novo = 'registro' in res ? res.registro : res
    const novoNormalizado: RegistroVacinal = {
      ...novo,
      membro_id: (novo as unknown as Record<string, unknown>).membro_familiar_id as string ?? novo.membro_id ?? dados.membro_id,
    }
    setRegistros(prev => {
      const lista = [...prev, novoNormalizado]
      salvarCacheRegistros(lista)
      return lista
    })

    if (gerarLembrete) {
      const vacina = vacinas.find(v => v.id === dados.vacina_id)
      if (vacina && dados.numero_dose < vacina.doses_total) {
        const intervaloDias = vacina.intervalos_por_fabricante
          ? (Object.values(vacina.intervalos_por_fabricante)[0] ?? 30)
          : 30
        const proximaData = new Date(
          new Date(dados.data_aplicacao).getTime() + intervaloDias * 86400000,
        ).toISOString().slice(0, 10)
        gerarLembrete(dados.membro_id, dados.vacina_id, dados.numero_dose + 1, proximaData)
      }
    }
    return novoNormalizado
  }, [vacinas])

  const removerRegistro = useCallback(async (id: string) => {
    await apiFetch(`/registros/${id}`, { method: 'DELETE' })
    setRegistros(prev => {
      const lista = prev.filter(r => r.id !== id)
      salvarCacheRegistros(lista)
      return lista
    })
  }, [])

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
