export interface Usuario {
  id: string
  nome: string
  email: string
  criadoEm: string
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

export interface Vacina {
  id: string
  nome: string
  nomeCompleto: string
  doses: number
  intervaloDias?: number
  faixaEtaria: FaixaEtaria[]
  idadeRecomendadaDias?: number
  obrigatoria: boolean
  descricao: string
  doencasProtege: string[]
}

export type StatusDose = 'aplicada' | 'pendente' | 'atrasada' | 'nao_aplicavel'

/**
 * Registro vacinal — espelho da tabela `registro_vacinal` no Supabase.
 *
 * Campos opcionais: podem estar ausentes em registros antigos ou em
 * payloads de criação (Omit<RegistroVacinal, 'id' | 'created_at'>).
 *
 * membro_familiar_id: alias que o back retorna via join do Supabase;
 * normalizado para membro_id no contexto, mas mantido aqui para
 * compatibilidade durante a transição.
 */
export interface RegistroVacinal {
  id: string
  membro_id: string
  /** Alias retornado pelo back via join Supabase — use membro_id no front */
  membro_familiar_id?: string
  vacina_id: string
  numero_dose: number
  data_aplicacao: string       // YYYY-MM-DD
  local_aplicacao?: string
  fabricante?: string
  lote?: string
  dose_zero?: boolean
  comprovante_url?: string
  observacoes?: string
  created_at: string
}

export type StatusLembrete = 'pendente' | 'enviado' | 'cancelado'

export interface Lembrete {
  id: string
  membro_id: string
  vacina_id: string
  numero_dose: number
  data_lembrete: string
  status: StatusLembrete
  automatico: boolean
  created_at: string
}

export interface DoseStatus {
  vacinaId: string
  vacina: Vacina
  numeroDose: number
  status: StatusDose
  dataAplicacao?: string
  dataRecomendada?: string
  /** true quando dose aplicada com data_aplicacao <= hoje → exibe em Histórico */
  isHistorico?: boolean
}
