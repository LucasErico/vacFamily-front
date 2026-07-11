import { useState, useEffect, useMemo, useRef } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import {
  ArrowLeft, CheckCircle2, Trash2, ChevronDown, ListChecks,
  Bell, BellOff, Plus, Search, Syringe, X,
  CalendarCheck, ClipboardList, Clock, AlertCircle, MapPin,
} from 'lucide-react'
import { useMembros, RELACAO_LABEL } from '@/contexts/MembrosContext'
import { useVacinas, calcularDosesStatus, isAtrasada } from '@/contexts/VacinasContext'
import { useLembretes } from '@/contexts/LembretesContext'
import { Avatar } from '@/components/ui/Avatar'
import { VacinaStatusBadge } from '@/components/ui/VacinaStatusBadge'
import type { DoseStatus, CriarLembretePayload, FaixaEtaria, Vacina, RegistroVacinal } from '@/types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function formatarData(iso: string) {
  if (!iso) return ''
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

// Deriva o status visual de uma vacina avulsa a partir do registro
function statusAvulsaEfetivo(r: RegistroVacinal, hoje: string): 'pendente' | 'atrasada' | 'concluida' {
  if (r.status_avulsa === 'concluida') return 'concluida'
  // pendente + data passou = atrasada
  if (r.status_avulsa === 'pendente' && r.data_aplicacao < hoje) return 'atrasada'
  return 'pendente'
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
  | { tipo: 'marcarAvulsaTomada'; registro: RegistroVacinal }
  | { tipo: 'apagarAvulsa'; registro: RegistroVacinal }

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
// ---------------------------------------------------------------------------
function VacinaSkeletonRow() {
  return (
    <li>
      <div className="card" style={{ padding: 'var(--space-4) var(--space-5)', display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          <div className="skeleton skeleton-text" style={{ width: '55%' }} />
          <div className="skeleton skeleton-text" style={{ width: '30%' }} />
        </div>
        <div className="skeleton" style={{ width: 16, height: 16, borderRadius: 'var(--radius-sm)' }} />
      </div>
    </li>
  )
}

// ---------------------------------------------------------------------------
// Dropdown de Ciclo
// ---------------------------------------------------------------------------
function CicloDropdown({
  value,
  onChange,
}: {
  value: CicloId | 'todos'
  onChange: (v: CicloId | 'todos') => void
}) {
  const [aberto, setAberto] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setAberto(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const cicloAtual = value === 'todos' ? null : CICLOS.find(c => c.id === value)
  const label = cicloAtual ? cicloAtual.label : 'Todos os ciclos'

  return (
    <div ref={ref} style={{ position: 'relative', flexShrink: 0 }}>
      <button
        onClick={() => setAberto(v => !v)}
        className="btn btn-ghost"
        style={{
          minHeight: 40,
          gap: 'var(--space-2)',
          fontSize: 'var(--text-sm)',
          border: cicloAtual ? `1.5px solid ${cicloAtual.cor}` : '1.5px solid var(--color-border)',
          color: cicloAtual ? cicloAtual.cor : 'var(--color-text-muted)',
          background: cicloAtual ? cicloAtual.corBg : 'var(--color-surface)',
          borderRadius: 'var(--radius-full)',
          paddingInline: 'var(--space-4)',
        }}
        aria-haspopup="listbox"
        aria-expanded={aberto}
      >
        {cicloAtual && (
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: cicloAtual.cor, flexShrink: 0 }} aria-hidden />
        )}
        {label}
        <ChevronDown size={13} style={{ transform: aberto ? 'rotate(180deg)' : 'none', transition: 'transform 150ms' }} aria-hidden />
      </button>

      {aberto && (
        <div
          role="listbox"
          aria-label="Filtrar por ciclo"
          style={{
            position: 'absolute',
            top: 'calc(100% + var(--space-2))',
            right: 0,
            zIndex: 40,
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-md)',
            minWidth: 200,
            overflow: 'hidden',
            padding: 'var(--space-1) 0',
          }}
        >
          <button
            role="option"
            aria-selected={value === 'todos'}
            onClick={() => { onChange('todos'); setAberto(false) }}
            style={{
              display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
              width: '100%', padding: 'var(--space-3) var(--space-4)',
              background: value === 'todos' ? 'var(--color-surface-offset)' : 'none',
              border: 'none', cursor: 'pointer', textAlign: 'left',
              fontSize: 'var(--text-sm)', color: 'var(--color-text)',
              fontWeight: value === 'todos' ? 600 : 400,
            }}
          >
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-border)', flexShrink: 0 }} aria-hidden />
            Todos os ciclos
          </button>
          {CICLOS.map(c => (
            <button
              key={c.id}
              role="option"
              aria-selected={value === c.id}
              onClick={() => { onChange(c.id); setAberto(false) }}
              style={{
                display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
                width: '100%', padding: 'var(--space-3) var(--space-4)',
                background: value === c.id ? c.corBg : 'none',
                border: 'none', cursor: 'pointer', textAlign: 'left',
                fontSize: 'var(--text-sm)',
                color: value === c.id ? c.cor : 'var(--color-text)',
                fontWeight: value === c.id ? 600 : 400,
              }}
            >
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: c.cor, flexShrink: 0 }} aria-hidden />
              {c.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Badge de status avulsa
// ---------------------------------------------------------------------------
function AvulsaStatusBadge({ status }: { status: 'pendente' | 'atrasada' | 'concluida' }) {
  const cfg = {
    pendente:  { label: 'Pendente',  cor: 'var(--color-warning)', bg: 'oklch(from var(--color-warning) l c h / 0.10)', icon: <Clock size={11} /> },
    atrasada:  { label: 'Atrasada',  cor: 'var(--color-error)',   bg: 'oklch(from var(--color-error) l c h / 0.10)',   icon: <AlertCircle size={11} /> },
    concluida: { label: 'Concluída', cor: 'var(--color-success)', bg: 'oklch(from var(--color-success) l c h / 0.10)', icon: <CheckCircle2 size={11} /> },
  }[status]

  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      fontSize: 'var(--text-xs)', fontWeight: 600,
      color: cfg.cor, background: cfg.bg,
      padding: '3px 8px', borderRadius: 'var(--radius-full)',
      border: `1px solid ${cfg.cor}`,
      flexShrink: 0,
    }}>
      {cfg.icon} {cfg.label}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------
export function VacinaMembroPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const { membros } = useMembros()
  const {
    vacinas, registros, carregando,
    registrarDose, removerRegistro, buscarRegistrosMembro,
  } = useVacinas()
  const { adicionarLembrete, lembretes, removerLembrete } = useLembretes()

  const hoje = new Date().toISOString().slice(0, 10)

  // --- abas ---
  type Aba = 'ciclo' | 'avulsas'
  const [abaAtiva, setAbaAtiva] = useState<Aba>('ciclo')

  // --- state geral ---
  const [membroSelecionadoId, setMembroSelecionadoId] = useState(id ?? '')
  const [seletorAberto, setSeletorAberto] = useState(false)
  const [bannerMsg, setBannerMsg] = useState('')

  // --- filtros caderneta ---
  const [filtroCiclo, setFiltroCiclo] = useState<CicloId | 'todos'>('todos')
  const [filtroStatus, setFiltroStatus] = useState<'todos' | 'pendente' | 'aplicada' | 'atrasada'>('todos')
  const [busca, setBusca] = useState('')
  const [ciclosExpandidos, setCiclosExpandidos] = useState<Set<CicloId>>(new Set(CICLOS.map(c => c.id)))

  // --- filtros avulsas ---
  const [filtroStatusAvulsa, setFiltroStatusAvulsa] = useState<'todos' | 'pendente' | 'atrasada' | 'concluida'>('todos')

  // --- modais ---
  const [modal, setModal] = useState<ModalState>({ tipo: 'nenhum' })

  // modal marcar tomada (ciclo)
  const [dataConfirm, setDataConfirm] = useState(hoje)
  const [localConfirm, setLocalConfirm] = useState('')
  const [erroConfirm, setErroConfirm] = useState('')

  // modal confirmar ciclo
  const [dataCiclo, setDataCiclo] = useState(hoje)
  const [localCiclo, setLocalCiclo] = useState('')
  const [erroCiclo, setErroCiclo] = useState('')
  const [confirmandoCiclo, setConfirmandoCiclo] = useState(false)

  // modal avulsa (criação)
  const [avulsaNome, setAvulsaNome] = useState('')
  const [avulsaData, setAvulsaData] = useState(hoje)
  const [avulsaLocal, setAvulsaLocal] = useState('')
  const [avulsaDose, setAvulsaDose] = useState('1')
  const [avulsaErro, setAvulsaErro] = useState('')
  const [avulsaSalvando, setAvulsaSalvando] = useState(false)

  // modal marcar avulsa tomada
  const [avulsaTomadaData, setAvulsaTomadaData] = useState(hoje)
  const [avulsaTomadaLocal, setAvulsaTomadaLocal] = useState('')
  const [avulsaTomadaErro, setAvulsaTomadaErro] = useState('')
  const [avulsaTomadaSalvando, setAvulsaTomadaSalvando] = useState(false)

  // lembrete manual
  const [dataLembrete, setDataLembrete] = useState('')
  const [erroLembrete, setErroLembrete] = useState('')

  // ---------------------------------------------------------------------------
  // Membro
  // ---------------------------------------------------------------------------
  const membro = membros.find(m => m.id === membroSelecionadoId)
  const outrosMembros = membros.filter(m => m.id !== membroSelecionadoId)

  // Auto-registro infantil via state de navegação
  const navState = location.state as { confirmarInfantis?: boolean; localInfantis?: string } | null
  const confirmarInfantisFlag = navState?.confirmarInfantis
  const localInfantisNavState = navState?.localInfantis ?? ''

  useEffect(() => {
    if (!confirmarInfantisFlag || carregando || vacinas.length === 0) return
    const membroAtual = membros.find(m => m.id === membroSelecionadoId)
    if (!membroAtual) return
    const registrosMembro = buscarRegistrosMembro(membroSelecionadoId)
    if (registrosMembro.length > 0) return

    const vacinasInfantis = vacinas.filter(
      v => Array.isArray(v.faixa_etaria) && v.faixa_etaria.some(f => ['recem_nascido', 'crianca'].includes(f))
    )
    let totalDoses = 0
    vacinasInfantis.forEach(vacina => {
      for (let n = 1; n <= (vacina.doses_total ?? 1); n++) {
        registrarDose(
          { membro_id: membroSelecionadoId, vacina_id: vacina.id, numero_dose: n, data_aplicacao: hoje, local_aplicacao: localInfantisNavState },
          () => {}
        )
        totalDoses++
      }
    })
    setBannerMsg(`Histórico infantil preenchido automaticamente — ${totalDoses} doses registradas com data de hoje e local "${localInfantisNavState}". Você pode editar ou apagar qualquer dose individualmente.`)
    navigate(location.pathname, { replace: true, state: null })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [confirmarInfantisFlag, membros, membroSelecionadoId, carregando, vacinas.length])

  // ---------------------------------------------------------------------------
  // Guard
  // ---------------------------------------------------------------------------
  if (!membro) {
    return (
      <div style={{ textAlign: 'center', padding: 'var(--space-16)' }}>
        <p style={{ color: 'var(--color-text-muted)' }}>Membro não encontrado.</p>
        <button onClick={() => navigate('/vacinas')} className="btn btn-ghost" style={{ marginTop: 'var(--space-4)' }}>Voltar para Vacinas</button>
      </div>
    )
  }
  const membroDefinido = membro
  const registrosMembro = buscarRegistrosMembro(membroSelecionadoId)
  const idadeMembro = calcularIdadeAnos(membroDefinido.data_nascimento, hoje)
  const aguardandoAPI = carregando || vacinas.length === 0

  // ---------------------------------------------------------------------------
  // Agrupamento por ciclo (caderneta)
  // ---------------------------------------------------------------------------
  const vacinasPorCiclo = useMemo(() => {
    if (aguardandoAPI) return []
    return CICLOS.map(ciclo => {
      const vacinasDoCiclo = vacinas.filter(v =>
        v.faixa_etaria.some(f => ciclo.faixas.includes(f))
      )
      const vacinasComDoses = vacinasDoCiclo.map(v => {
        const doses = calcularDosesStatus(v, registrosMembro, membroDefinido.data_nascimento)
          .filter(d => d.status !== 'nao_aplicavel')
        return { vacina: v, doses }
      }).filter(item => item.doses.length > 0)
      return { ciclo, vacinas: vacinasComDoses }
    }).filter(g => g.vacinas.length > 0)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aguardandoAPI, vacinas, registros, membroSelecionadoId])

  const vacinasPorCicloFiltrado = useMemo(() => {
    return vacinasPorCiclo.map(grupo => ({
      ...grupo,
      vacinas: grupo.vacinas.filter(({ vacina, doses }) => {
        if (filtroCiclo !== 'todos' && grupo.ciclo.id !== filtroCiclo) return false
        if (busca && !vacina.nome.toLowerCase().includes(busca.toLowerCase()) &&
          !vacina.nome_completo.toLowerCase().includes(busca.toLowerCase())) return false
        if (filtroStatus !== 'todos') {
          const temStatusFiltrado = doses.some(d => {
            const efetivo = isAtrasada(d, membroDefinido.data_nascimento, hoje) ? 'atrasada' : d.status
            return efetivo === filtroStatus
          })
          if (!temStatusFiltrado) return false
        }
        return true
      }),
    })).filter(g => g.vacinas.length > 0)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vacinasPorCiclo, filtroCiclo, busca, filtroStatus])

  // ---------------------------------------------------------------------------
  // Registros avulsos — apenas vacina_id === 'avulsa'
  // NÃO inclui lembretes; lembretes ficam exclusivamente na Agenda.
  // ---------------------------------------------------------------------------
  const registrosAvulsos = useMemo(() => {
    return registrosMembro
      .filter(r => r.vacina_id === 'avulsa')
      .sort((a, b) => b.data_aplicacao.localeCompare(a.data_aplicacao))
  }, [registrosMembro])

  const avulsasFiltradas = useMemo(() => {
    if (filtroStatusAvulsa === 'todos') return registrosAvulsos
    return registrosAvulsos.filter(r => statusAvulsaEfetivo(r, hoje) === filtroStatusAvulsa)
  }, [registrosAvulsos, filtroStatusAvulsa, hoje])

  // ---------------------------------------------------------------------------
  // Ações
  // ---------------------------------------------------------------------------
  function handleMarcarTomada() {
    if (!dataConfirm) { setErroConfirm('Informe a data de aplicação.'); return }
    if (dataConfirm > hoje) { setErroConfirm('A data não pode ser futura para uma dose já tomada.'); return }
    if (!localConfirm.trim()) { setErroConfirm('Informe o local de aplicação.'); return }
    if (modal.tipo !== 'marcarTomada') return

    registrarDose(
      { membro_id: membroSelecionadoId, vacina_id: modal.dose.vacinaId, numero_dose: modal.dose.numeroDose, data_aplicacao: dataConfirm, local_aplicacao: localConfirm },
      (mId, vId, nDose, dataProxima) => { adicionarLembrete(lembreteVacinal(vId, mId, nDose, dataProxima)) }
    )
    const lembreteExistente = lembretes.find(l =>
      l.membro_id === membroSelecionadoId && l.vacina_id === modal.dose.vacinaId &&
      l.numero_dose === modal.dose.numeroDose && l.status === 'pendente'
    )
    if (lembreteExistente) removerLembrete(lembreteExistente.id)
    setModal({ tipo: 'nenhum' }); setDataConfirm(hoje); setLocalConfirm(''); setErroConfirm('')
  }

  function handleApagarDose() {
    if (modal.tipo !== 'apagarDose') return
    removerRegistro(modal.registroId)
    setModal({ tipo: 'nenhum' })
  }

  async function handleConfirmarCiclo() {
    if (!dataCiclo) { setErroCiclo('Informe a data de aplicação.'); return }
    if (dataCiclo > hoje) { setErroCiclo('A data não pode ser futura.'); return }
    if (!localCiclo.trim()) { setErroCiclo('Informe o local de aplicação.'); return }
    if (modal.tipo !== 'confirmarCiclo') return

    setConfirmandoCiclo(true)
    try {
      for (const vacina of modal.vacinas) {
        const doses = calcularDosesStatus(vacina, registrosMembro, membroDefinido.data_nascimento)
        for (const dose of doses) {
          if (dose.status !== 'aplicada' && dose.status !== 'nao_aplicavel') {
            registrarDose(
              { membro_id: membroSelecionadoId, vacina_id: vacina.id, numero_dose: dose.numeroDose, data_aplicacao: dataCiclo, local_aplicacao: localCiclo.trim() },
              () => {}
            )
          }
        }
      }
    } finally {
      setConfirmandoCiclo(false)
      setModal({ tipo: 'nenhum' })
      setDataCiclo(hoje); setLocalCiclo(''); setErroCiclo('')
    }
  }

  // ---------------------------------------------------------------------------
  // Criar vacina avulsa — NOVO FLUXO
  // Data passada (< hoje)  → registra dose concluída (local obrigatório) → vai pro histórico
  // Data presente/futura (>= hoje) → cria registro pendente (sem local) + lembrete na agenda
  // ---------------------------------------------------------------------------
  async function handleAdicionarAvulsa() {
    if (!avulsaNome.trim()) { setAvulsaErro('Informe o nome da vacina.'); return }
    if (!avulsaData) { setAvulsaErro('Informe a data.'); return }

    const isPendente = avulsaData >= hoje  // hoje ou futuro → pendente

    if (!isPendente && !avulsaLocal.trim()) {
      setAvulsaErro('Informe o local onde a vacina foi aplicada.')
      return
    }

    setAvulsaSalvando(true)
    try {
      if (isPendente) {
        // Cria registro com status_avulsa 'pendente' — SEM local
        await registrarDose({
          membro_id: membroSelecionadoId,
          vacina_id: 'avulsa',
          numero_dose: parseInt(avulsaDose) || 1,
          data_aplicacao: avulsaData,
          observacoes: avulsaNome.trim(),
          status_avulsa: 'pendente',
        })

        // Cria lembrete automaticamente na agenda
        adicionarLembrete({
          membro_familiar_id: membroSelecionadoId,
          tipo: 'manual',
          titulo: `${avulsaNome.trim()} — dose ${avulsaDose}`,
          descricao: `Vacina avulsa agendada para ${formatarData(avulsaData)}.`,
          data_prevista: avulsaData,
          automatico: false,
        })

        setBannerMsg(`Registro pendente criado para "${avulsaNome.trim()}" em ${formatarData(avulsaData)}. Um lembrete foi adicionado automaticamente na Agenda.`)
      } else {
        // Data passada → registra como concluída direto no histórico
        await registrarDose({
          membro_id: membroSelecionadoId,
          vacina_id: 'avulsa',
          numero_dose: parseInt(avulsaDose) || 1,
          data_aplicacao: avulsaData,
          local_aplicacao: avulsaLocal.trim(),
          observacoes: avulsaNome.trim(),
          status_avulsa: 'concluida',
        })

        setBannerMsg(`Vacina "${avulsaNome.trim()}" registrada no histórico com data ${formatarData(avulsaData)}.`)
      }

      setModal({ tipo: 'nenhum' })
      setAvulsaNome(''); setAvulsaData(hoje); setAvulsaLocal('')
      setAvulsaDose('1'); setAvulsaErro('')
      setAbaAtiva('avulsas')
    } catch {
      setAvulsaErro('Erro ao salvar. Tente novamente.')
    } finally {
      setAvulsaSalvando(false)
    }
  }

  // ---------------------------------------------------------------------------
  // Marcar avulsa pendente como tomada
  // ---------------------------------------------------------------------------
  async function handleMarcarAvulsaTomada() {
    if (!avulsaTomadaData) { setAvulsaTomadaErro('Informe a data de aplicação.'); return }
    if (avulsaTomadaData > hoje) { setAvulsaTomadaErro('A data não pode ser futura.'); return }
    if (!avulsaTomadaLocal.trim()) { setAvulsaTomadaErro('Informe o local de aplicação.'); return }
    if (modal.tipo !== 'marcarAvulsaTomada') return

    setAvulsaTomadaSalvando(true)
    try {
      // Atualiza o registro existente via PUT
      const { apiFetch } = await import('@/services/api')
      await apiFetch(`/registros/${modal.registro.id}`, {
        method: 'PUT',
        body: {
          data_aplicacao: avulsaTomadaData,
          local_aplicacao: avulsaTomadaLocal.trim(),
          status_avulsa: 'concluida',
        },
      })

      // Remove lembrete associado se existir
      const nomeVacina = modal.registro.observacoes ?? ''
      const lembreteAssociado = lembretes.find(l =>
        (l.membro_familiar_id === membroSelecionadoId || l.membro_id === membroSelecionadoId) &&
        l.data_prevista === modal.registro.data_aplicacao &&
        l.titulo.includes(nomeVacina.split(' ')[0])
      )
      if (lembreteAssociado) removerLembrete(lembreteAssociado.id)

      // Força recarregamento dos registros do contexto
      const { recarregar } = useVacinas()
      await recarregar()

      setModal({ tipo: 'nenhum' })
      setAvulsaTomadaData(hoje); setAvulsaTomadaLocal(''); setAvulsaTomadaErro('')
      setBannerMsg(`Vacina marcada como tomada e registrada no histórico.`)
    } catch {
      setAvulsaTomadaErro('Erro ao atualizar. Tente novamente.')
    } finally {
      setAvulsaTomadaSalvando(false)
    }
  }

  function handleApagarAvulsa() {
    if (modal.tipo !== 'apagarAvulsa') return
    removerRegistro(modal.registro.id)
    setModal({ tipo: 'nenhum' })
  }

  function handleGerarLembrete() {
    if (!dataLembrete) { setErroLembrete('Informe a data do lembrete.'); return }
    if (dataLembrete <= hoje) { setErroLembrete('A data deve ser futura para criar um lembrete.'); return }
    if (modal.tipo !== 'lembreteManual') return

    adicionarLembrete(lembreteVacinal(modal.dose.vacinaId, membroSelecionadoId, modal.dose.numeroDose, dataLembrete))
    setModal({ tipo: 'nenhum' }); setDataLembrete(''); setErroLembrete('')
  }

  function temLembrete(vacinaId: string, numeroDose: number): boolean {
    return lembretes.some(
      l => l.vacina_id === vacinaId && (l.membro_id === membroSelecionadoId || l.membro_familiar_id === membroSele