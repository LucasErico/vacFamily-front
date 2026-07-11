import { useState, useEffect, useMemo, useRef } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import {
  ArrowLeft, CheckCircle2, Trash2, ChevronDown, ListChecks,
  Bell, BellOff, Plus, Search, Syringe, X,
  CalendarCheck, ClipboardList,
} from 'lucide-react'
import { useMembros, RELACAO_LABEL } from '@/contexts/MembrosContext'
import { useVacinas, calcularDosesStatus, isAtrasada } from '@/contexts/VacinasContext'
import { useLembretes } from '@/contexts/LembretesContext'
import { Avatar } from '@/components/ui/Avatar'
import { VacinaStatusBadge } from '@/components/ui/VacinaStatusBadge'
import type { DoseStatus, CriarLembretePayload, FaixaEtaria, Vacina } from '@/types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function formatarData(iso: string) {
  const [ano, mes, dia] = iso.split('-')
  return `${dia}/${mes}/${ano}`
}

function calcularIdadeAnos(dataNascimento: string, hoje: string): number {
  const nasc = new Date(dataNascimento)
  const hj = new Date(hoje)
  let idade = hj.getFullYear() - nasc.getFullYear()
  const m = hj.getMonth() - nasc.getMonth()
  if (m < 0 || (m === 0 && hj.getDate() < nasc.getDate())) idade--
  return idade
}

// ---------------------------------------------------------------------------
// Definição de Ciclos
// ---------------------------------------------------------------------------
export type CicloId = 'pre_natal' | 'recem_nascido' | 'crianca' | 'adolescente' | 'adulto' | 'idoso'

interface Ciclo {
  id: CicloId
  label: string
  descricao: string
  faixas: FaixaEtaria[]
  cor: string
  corBg: string
  corBorda: string
  idadeMinAnos: number
  idadeMaxAnos: number
}

const CICLOS: Ciclo[] = [
  {
    id: 'pre_natal',
    label: 'Pré-Natal',
    descricao: 'Vacinas indicadas durante a gestação para proteger mãe e bebê.',
    faixas: ['gestante'],
    cor: '#a12c7b',
    corBg: 'oklch(from #a12c7b l c h / 0.08)',
    corBorda: 'oklch(from #a12c7b l c h / 0.25)',
    idadeMinAnos: 0,
    idadeMaxAnos: 50,
  },
  {
    id: 'recem_nascido',
    label: 'Recém-Nascido',
    descricao: 'Doses aplicadas nas primeiras horas e dias de vida. Fundamentais para proteção imediata.',
    faixas: ['recem_nascido'],
    cor: '#01696f',
    corBg: 'oklch(from #01696f l c h / 0.07)',
    corBorda: 'oklch(from #01696f l c h / 0.22)',
    idadeMinAnos: 0,
    idadeMaxAnos: 1,
  },
  {
    id: 'crianca',
    label: 'Infância',
    descricao: 'Calendário básico da infância (0–9 anos). Garante proteção contra as doenças mais prevalentes.',
    faixas: ['crianca'],
    cor: '#006494',
    corBg: 'oklch(from #006494 l c h / 0.08)',
    corBorda: 'oklch(from #006494 l c h / 0.22)',
    idadeMinAnos: 0,
    idadeMaxAnos: 10,
  },
  {
    id: 'adolescente',
    label: 'Adolescência',
    descricao: 'Reforços e novas doses para adolescentes (10–19 anos).',
    faixas: ['adolescente'],
    cor: '#da7101',
    corBg: 'oklch(from #da7101 l c h / 0.08)',
    corBorda: 'oklch(from #da7101 l c h / 0.22)',
    idadeMinAnos: 10,
    idadeMaxAnos: 20,
  },
  {
    id: 'adulto',
    label: 'Adulto',
    descricao: 'Vacinas recomendadas para adultos (20–59 anos), incluindo reforços periódicos.',
    faixas: ['adulto'],
    cor: '#437a22',
    corBg: 'oklch(from #437a22 l c h / 0.08)',
    corBorda: 'oklch(from #437a22 l c h / 0.22)',
    idadeMinAnos: 20,
    idadeMaxAnos: 60,
  },
  {
    id: 'idoso',
    label: 'Idoso',
    descricao: 'Vacinas específicas para maiores de 60 anos, incluindo reforços e doses adicionais.',
    faixas: ['idoso'],
    cor: '#7a39bb',
    corBg: 'oklch(from #7a39bb l c h / 0.08)',
    corBorda: 'oklch(from #7a39bb l c h / 0.22)',
    idadeMinAnos: 60,
    idadeMaxAnos: 120,
  },
]

// ---------------------------------------------------------------------------
// Tipos de modal
// ---------------------------------------------------------------------------
type ModalState =
  | { tipo: 'nenhum' }
  | { tipo: 'marcarTomada'; dose: DoseStatus; vacinaNome: string }
  | { tipo: 'apagarDose'; dose: DoseStatus; vacinaNome: string; registroId: string }
  | { tipo: 'confirmarCiclo'; ciclo: Ciclo; vacinas: Vacina[] }
  | { tipo: 'adicionarAvulsa' }
  | { tipo: 'lembreteManual'; dose: DoseStatus; vacinaNome: string }

// ---------------------------------------------------------------------------
// Helpers de lembrete
// ---------------------------------------------------------------------------
function lembreteVacinal(
  vacinaId: string,
  membroFamiliarId: string,
  numeroDose: number,
  dataPrevista: string,
): CriarLembretePayload {
  return {
    vacina_id: vacinaId,
    membro_familiar_id: membroFamiliarId,
    tipo: 'reforco',
    titulo: `Dose ${numeroDose} — lembrete automático`,
    data_prevista: dataPrevista,
    automatico: true,
  }
}

// ---------------------------------------------------------------------------
// Skeleton