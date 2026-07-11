export interface Usuario {
  id: string
  nome: string
  email: string
  criadoEm?: string
  created_at?: string
}

export type Relacao =
  | 'titular'
  | 'conjuge'
  | 'filho'
  | 'filha'
  | 'pai'
  | 'mae'
  | 'avo'
  | 'avo_materna'
  | 'outro'

/** @deprecated use Relacao */
export type Parentesco = Relacao

export type Sexo = 'M' | 'F' | 'outro'

export type TipoCalendario =
  | 'infantil'
  | 'adolescente'
  | 'adulto'
  | 'gestante'
  | 'idoso'
  | 'especial'

/** Estrutura retornada pelo backend (snake_case, espelho da tabela Supabase) */
export interface MembroFamiliar {
  id: string
  usuario_id: string
  nome: string
  data_nascimento: string // YYYY-MM-DD
  sexo: Sexo
  relacao: Relacao
  tipo_calendario: TipoCalendario
  gestacao_semanas?: number
  mae_id?: string
  observacoes?: string
  foto_url?: string
  created_at: string
  updated_at?: string
}

/** Payload para POST /membros */
export interface CriarMembroPayload {
  nome: string
  data_nascimento: string
  sexo: Sexo
  relacao: Relacao
  tipo_calendario: TipoCalendario
  gestacao_semanas?: number
  mae_id?: string
  observacoes?: string
  foto_url?: string
}

export type FaixaEtaria =
  | 'recem_nascido'
  | 'crianca'
  | 'adolescente'
  | 'adulto'
  | 'gestante'
  | 'idoso'
  | 'todas'

/**
 * Shape real da tabela `vacina` no Supabase (snake_case).
 * Retornado por GET /vacinas e GET /vacinas/:id.
 */
export interface Vacina {
  id: string
  nome: string
  nome_completo: string
  descricao?: string
  doses_total: number
  idade_minima_dias?: number
  faixa_etaria: FaixaEtaria[]
  doencas_previstas: string[]
  /**
   * Alias de `doencas_previstas` — campo usado em algumas views para
   * descrever contra quais doenças a vacina protege.
   */
  protege_contra?: string[]
  obrigatoria: boolean
  ativo: boolean
  fabricante_default?: string
  intervalos_por_fabricante?: Record<string, number>
  contabiliza_esquema?: boolean
  created_at?: string
  updated_at?: string
}

export type StatusDose = 'aplicada' | 'pendente' | 'atrasada' | 'nao_aplicavel'

/**
 * status_avulsa — exclusivo para registros com vacina_id === 'avulsa':
 *   'pendente'  → data futura, ainda não tomada (criado sem local)
 *   'concluida' → usuário marcou como tomada (local + data real preenchidos)
 * 'atrasada' é calculado em runtime no front: status_avulsa === 'pendente' && data_aplicacao < hoje
 */
export type StatusAvulsa = 'pendente' | 'concluida'

export interface RegistroVacinal {
  id: string
  membro_id: string
  membro_familiar_id?: string
  vacina_id: string
  numero_dose: number
  data_aplicacao: string
  local_aplicacao?: string
  fabricante?: string
  lote?: string
  dose_zero?: boolean
  comprovante_url?: string
  observacoes?: string
  /** Exclusivo para vacinas avulsas. undefined = vacina de ciclo (não avulsa). */
  status_avulsa?: StatusAvulsa
  created_at: string
}

export type TipoLembrete = 'campanha' | 'reforco' | 'manual'
export type StatusLembrete = 'pendente' | 'concluido' | 'ignorado'

export interface Lembrete {
  id: string
  usuario_id?: string
  membro_familiar_id?: string
  vacina_id?: string
  tipo: TipoLembrete
  titulo: string
  descricao?: string
  data_prevista: string
  status: StatusLembrete
  automatico: boolean
  created_at: string
  updated_at?: string

  // Aliases de compatibilidade temporária no front
  membro_id?: string
  data_lembrete?: string
  numero_dose?: number
}

export interface CriarLembretePayload {
  membro_familiar_id?: string
  vacina_id?: string
  tipo: TipoLembrete
  titulo: string
  descricao?: string
  data_prevista: string
  automatico?: boolean
}

export interface DoseStatus {
  vacinaId: string
  vacina: Vacina
  numeroDose: number
  status: StatusDose
  dataAplicacao?: string
  dataRecomendada?: string
  isHistorico?: boolean
  /** Data prevista/agendada para a dose (pode diferir de dataRecomendada em casos de atraso). */
  dataPrevista?: string
  /** Local de aplicação da dose (clínica, UBS, etc.). */
  localAplicacao?: string
  /** ID do RegistroVacinal associado a esta dose, quando já aplicada. */
  registroId?: string
}
