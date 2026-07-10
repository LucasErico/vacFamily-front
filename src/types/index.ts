export interface Usuario {
  id: string
  nome: string
  email: string
  criadoEm: string
}

export type Parentesco =
  | 'titular'
  | 'conjuge'
  | 'filho'
  | 'filha'
  | 'pai'
  | 'mae'
  | 'avo'
  | 'avo_materna'
  | 'outro'

export interface MembroFamiliar {
  id: string
  usuarioId: string
  nome: string
  dataNascimento: string // ISO 8601 YYYY-MM-DD
  parentesco: Parentesco
  fotoUrl?: string
  criadoEm: string
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
  intervaloDias?: number   // intervalo entre doses
  faixaEtaria: FaixaEtaria[]
  idadeRecomendadaDias?: number  // idade mínima em dias
  obrigatoria: boolean
  descricao: string
  doencasProtege: string[]
}

export type StatusDose = 'aplicada' | 'pendente' | 'atrasada' | 'nao_aplicavel'

export interface RegistroVacinal {
  id: string
  membroId: string
  vacinaId: string
  numeroDose: number
  dataAplicacao: string // ISO 8601
  localAplicacao: string
  comprovanteUrl?: string
  criadoEm: string
}

export type StatusLembrete = 'pendente' | 'enviado' | 'cancelado'

export interface Lembrete {
  id: string
  membroId: string
  vacinaId: string
  numeroDose: number
  dataLembrete: string // ISO 8601
  status: StatusLembrete
  automatico: boolean
  criadoEm: string
}

export interface DoseStatus {
  vacinaId: string
  vacina: Vacina
  numeroDose: number
  status: StatusDose
  dataAplicacao?: string
  dataRecomendada?: string
}
