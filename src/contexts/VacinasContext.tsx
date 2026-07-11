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
 *
 * ATENÇÃO — isAtrasada (em VacinaMembroPage):
 *   Uma dose pendente só é exibida como 'atrasada' se o membro tiver
 *   menos de IDADE_MAX_RETROATIVA_DIAS de vida. Para membros mais velhos,
 *   doses do passado sem registro são exibidas apenas como 'pendente'.
 *
 * membrosCarregados: Set<string>
 *   Conjunto de membro_ids cujos registros já foram buscados na API
 *   ao menos uma vez. Usado pelas páginas para distinguir "ainda carregando"
 *   de "carregou e realmente não tem registros" — evitando a exibição
 *   antecipada de vacinas pendentes calculadas apenas com a seed local.
 *
 * membrosCarregadosUmaVez: boolean
 *   Torna-se true após a primeira carga bem-sucedida da API (mesmo que
 *   nenhum membro exista ainda). Enquanto false, a UI não deve exibir
 *   nada baseado na seed — a carga ainda não rodou.
 *
 * Membro novo após carga inicial:
 *   É marcado imediatamente em membrosCarregados com lista vazia, pois
 *   um membro recém-criado definitivamente não tem registros no banco.
 *   Isso evita que a página exiba doses calculadas da seed enquanto
 *   espera uma busca que nunca precisaria acontecer.
 */
import {
  createContext, useContext, useState, useCallback,
  useEffect, useRef, type ReactNode,
} from 'react'
import type { Vacina, RegistroVacinal, DoseStatus, StatusDose } from '@/types'
import { VACINAS_SEED } from '@/data/vacinasSeed'
import { apiFetch } from '@/services/api'
import { useAuth } from './AuthContext'
import { useMembros } from './MembrosContext'

/**
 * Limite de idade (em dias) até o qual doses passadas sem registro
 * são consideradas 'atrasadas'. Acima disso → apenas 'pendente'.
 * 730 dias ≈ 2 anos — cobre o calendário pediátrico completo.
 */
export const IDADE_MAX_RETROATIVA_DIAS = 730

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

/**
 * Determina se uma dose pendente deve ser exibida como "atrasada".
 *
 * Regra: só marca como atrasada se:
 *  1. A dose está pendente (sem registro no banco)
 *  2. A dataRecomendada já passou (hoje > dataRecomendada)
 *  3. O membro tem menos de IDADE_MAX_RETROATIVA_DIAS de vida
 *
 * Motivo do critério 3: membros adultos/adolescentes cadastrados pela
 * primeira vez não têm histórico no sistema — não é correto acusá-los
 * de "atrasados" em vacinas que deveriam ter tomado décadas atrás.
 * O sistema só rastreia atrasos reais dentro da janela pediátrica.
 */
export function isAtrasada(
  dose: DoseStatus,
  dataNascimento: string,
  hoje: string,
): boolean {
  if (dose.status !== 'pendente') return false
  if (!dose.dataRecomendada) return false
  if (dose.dataRecomendada >= hoje) return false
  const idadeEmDias = calcularIdadeEmDias(dataNascimento)
  return idadeEmDias <= IDADE_MAX_RETROATIVA_DIAS
}

type GerarLembreteReforcoFn = (
  membro_id: string, vacina_id: string, numero_dose: number, data_lembrete: string,
) => void

interface VacinasContextValue {
  vacinas: Vacina[]
  registros: RegistroVacinal[]
  carregando: boolean
  /** IDs dos membros cujos registros já foram buscados na API ao menos uma vez. */
  membrosCarregados: Set<string>
  /**
   * True após a primeira carga da API ter rodado ao menos uma vez.
   * Enquanto false, nenhuma UI deve exibir dados calculados da seed.
   */
  membrosCarregadosUmaVez: boolean
  registrarDose: (dados: Omit<RegistroVacinal, 'id' | 'created_at'>, gerarLembrete?: GerarLembreteReforcoFn) => Promise<RegistroVacinal>
  removerRegistro: (id: string) => Promise<void>
  buscarRegistrosMembro: (membro_id: string) => RegistroVacinal[]
  recarregar: () => Promise<void>
  /**
   * Marca um membro recém-criado como "já carregado" com registros vazios.
   * Deve ser chamado imediatamente após adicionarMembro() no contexto de membros,
   * ou pela página que cria o membro, para evitar pré-renderização da seed.
   */
  marcarMembroNovo: (membroId: string) => void
}

const VacinasContext = createContext<VacinasContextValue | null>(null)

export function VacinasProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth()
  const { membros } = useMembros()
  const [vacinas] = useState<Vacina[]>(VACINAS_SEED)
  const [registros, setRegistros] = useState<RegistroVacinal[]>([])
  const [carregando, setCarregando] = useState(false)

  /**
   * Rastreia quais membro_ids já tiveram seus registros buscados na API.
   * Inicialmente vazio — só é populado após a primeira carga bem-sucedida
   * (ou mesmo após uma carga que retornou lista vazia).
   */
  const [membrosCarregados, setMembrosCarregados] = useState<Set<string>>(new Set())

  /**
   * Torna-se true após a primeira carga da API rodar com sucesso.
   * Enquanto false, a UI exibe skeleton independentemente de qualquer outra flag.
   */
  const [membrosCarregadosUmaVez, setMembrosCarregadosUmaVez] = useState(false)

  // Ref para saber quais ids já foram carregados sem causar re-renders
  const membrosCarregadosRef = useRef<Set<string>>(new Set())

  // FIX: usar string primitiva como dependencia estavel para evitar
  // loop infinito causado por nova referencia de array a cada render.
  const membrosIds = membros.map(m => m.id).join(',')

  // Carrega registros de TODOS os membros do usuário em paralelo
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
      setRegistros(resultados.flat())
      // Marca todos os membros como "já carregados" — mesmo os que não têm registros.
      const novoSet = new Set(ids)
      membrosCarregadosRef.current = novoSet
      setMembrosCarregados(novoSet)
      setMembrosCarregadosUmaVez(true)
    } catch { /* mantém estado offline */ } finally {
      setCarregando(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, membrosIds])

  useEffect(() => { recarregar() }, [recarregar])

  /**
   * Quando novos membros aparecem no MembrosContext após a carga inicial
   * já ter rodado (ex: membro recém-criado via adicionarMembro), marcamos
   * esse id imediatamente como carregado com lista vazia.
   * Isso evita que a VacinaMembroPage exiba doses calculadas da seed
   * enquanto aguarda uma busca que nunca precisaria acontecer.
   */
  useEffect(() => {
    if (!membrosCarregadosUmaVez) return
    const ids = membrosIds.split(',').filter(Boolean)
    const novos = ids.filter(id => !membrosCarregadosRef.current.has(id))
    if (novos.length === 0) return
    setMembrosCarregados(prev => {
      const next = new Set(prev)
      novos.forEach(id => next.add(id))
      membrosCarregadosRef.current = next
      return next
    })
  }, [membrosIds, membrosCarregadosUmaVez])

  const marcarMembroNovo = useCallback((membroId: string) => {
    setMembrosCarregados(prev => {
      if (prev.has(membroId)) return prev
      const next = new Set(prev)
      next.add(membroId)
      membrosCarregadosRef.current = next
      return next
    })
  }, [])

  const registrarDose = useCallback(async (
    dados: Omit<RegistroVacinal, 'id' | 'created_at'>,
    gerarLembrete?: GerarLembreteReforcoFn,
  ) => {
    const payload: Record<string, unknown> = {
      vacina_id: dados.vacina_id,
      numero_dose: Number(dados.numero_dose),
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
  const buscarRegistrosMembro = useCallback(
    (membro_id: string) => registros.filter(
      r => r.membro_id === membro_id || r.membro_familiar_id === membro_id,
    ),
    [registros],
  )

  return (
    <VacinasContext.Provider value={{
      vacinas, registros, carregando, membrosCarregados, membrosCarregadosUmaVez,
      registrarDose, removerRegistro, buscarRegistrosMembro, recarregar, marcarMembroNovo,
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
