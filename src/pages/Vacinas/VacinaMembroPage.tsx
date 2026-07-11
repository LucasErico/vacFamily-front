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
import { apiFetch } from '@/services/api'
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

/** Deriva o status visual de uma avulsa a partir do registro salvo. */
function statusAvulsaEfetivo(r: RegistroVacinal, hoje: string): 'pendente' | 'atrasada' | 'concluida' {
  if (r.status_avulsa === 'concluida') return 'concluida'
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
    id: 'pre_natal', label: 'Pré-Natal',
    descricao: 'Vacinas indicadas durante a gestação para proteger mãe e bebê.',
    faixas: ['gestante'], cor: '#a12c7b',
    corBg: 'oklch(from #a12c7b l c h / 0.08)', corBorda: 'oklch(from #a12c7b l c h / 0.25)',
    idadeMinAnos: 0, idadeMaxAnos: 50,
  },
  {
    id: 'recem_nascido', label: 'Recém-Nascido',
    descricao: 'Doses aplicadas nas primeiras horas e dias de vida.',
    faixas: ['recem_nascido'], cor: '#01696f',
    corBg: 'oklch(from #01696f l c h / 0.07)', corBorda: 'oklch(from #01696f l c h / 0.22)',
    idadeMinAnos: 0, idadeMaxAnos: 1,
  },
  {
    id: 'crianca', label: 'Infância',
    descricao: 'Calendário básico da infância (0–9 anos).',
    faixas: ['crianca'], cor: '#006494',
    corBg: 'oklch(from #006494 l c h / 0.08)', corBorda: 'oklch(from #006494 l c h / 0.22)',
    idadeMinAnos: 0, idadeMaxAnos: 10,
  },
  {
    id: 'adolescente', label: 'Adolescência',
    descricao: 'Reforços e novas doses para adolescentes (10–19 anos).',
    faixas: ['adolescente'], cor: '#da7101',
    corBg: 'oklch(from #da7101 l c h / 0.08)', corBorda: 'oklch(from #da7101 l c h / 0.22)',
    idadeMinAnos: 10, idadeMaxAnos: 20,
  },
  {
    id: 'adulto', label: 'Adulto',
    descricao: 'Vacinas recomendadas para adultos (20–59 anos).',
    faixas: ['adulto'], cor: '#437a22',
    corBg: 'oklch(from #437a22 l c h / 0.08)', corBorda: 'oklch(from #437a22 l c h / 0.22)',
    idadeMinAnos: 20, idadeMaxAnos: 60,
  },
  {
    id: 'idoso', label: 'Idoso',
    descricao: 'Vacinas específicas para maiores de 60 anos.',
    faixas: ['idoso'], cor: '#7a39bb',
    corBg: 'oklch(from #7a39bb l c h / 0.08)', corBorda: 'oklch(from #7a39bb l c h / 0.22)',
    idadeMinAnos: 60, idadeMaxAnos: 120,
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
          minHeight: 40, gap: 'var(--space-2)', fontSize: 'var(--text-sm)',
          border: cicloAtual ? `1.5px solid ${cicloAtual.cor}` : '1.5px solid var(--color-border)',
          color: cicloAtual ? cicloAtual.cor : 'var(--color-text-muted)',
          background: cicloAtual ? cicloAtual.corBg : 'var(--color-surface)',
          borderRadius: 'var(--radius-full)', paddingInline: 'var(--space-4)',
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
          role="listbox" aria-label="Filtrar por ciclo"
          style={{
            position: 'absolute', top: 'calc(100% + var(--space-2))', right: 0, zIndex: 40,
            background: 'var(--color-surface)', border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-md)',
            minWidth: 200, overflow: 'hidden', padding: 'var(--space-1) 0',
          }}
        >
          <button
            role="option" aria-selected={value === 'todos'}
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
              key={c.id} role="option" aria-selected={value === c.id}
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
    pendente:  { label: 'Pendente',  cor: 'var(--color-warning)', bg: 'oklch(from var(--color-warning) l c h / 0.10)',  Icon: Clock },
    atrasada:  { label: 'Atrasada',  cor: 'var(--color-error)',   bg: 'oklch(from var(--color-error) l c h / 0.10)',    Icon: AlertCircle },
    concluida: { label: 'Concluída', cor: 'var(--color-success)', bg: 'oklch(from var(--color-success) l c h / 0.10)',  Icon: CheckCircle2 },
  }[status]

  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      fontSize: 'var(--text-xs)', fontWeight: 600,
      color: cfg.cor, background: cfg.bg,
      padding: '3px 8px', borderRadius: 'var(--radius-full)',
      border: `1px solid ${cfg.cor}`, flexShrink: 0,
    }}>
      <cfg.Icon size={11} aria-hidden /> {cfg.label}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Overlay de modal genérico
// ---------------------------------------------------------------------------
function ModalOverlay({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <div
      role="dialog" aria-modal="true"
      style={{
        position: 'fixed', inset: 0, zIndex: 50,
        background: 'oklch(0 0 0 / 0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 'var(--space-4)',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        style={{
          background: 'var(--color-surface)', borderRadius: 'var(--radius-xl)',
          boxShadow: 'var(--shadow-lg)', width: '100%', maxWidth: 440,
          maxHeight: '90dvh', overflowY: 'auto',
          padding: 'var(--space-6)',
        }}
      >
        {children}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// styleBtnStatus helper
// ---------------------------------------------------------------------------
function styleBtnStatus(_s: string, ativo: boolean, cor?: string): React.CSSProperties {
  return {
    fontSize: 'var(--text-xs)', fontWeight: ativo ? 700 : 400,
    padding: 'var(--space-2) var(--space-3)', minHeight: 36,
    borderRadius: 'var(--radius-full)',
    border: ativo ? `1.5px solid ${cor ?? 'var(--color-primary)'}` : '1.5px solid var(--color-border)',
    background: ativo ? (cor ? `oklch(from ${cor} l c h / 0.1)` : 'var(--color-primary-highlight)') : 'var(--color-surface)',
    color: ativo ? (cor ?? 'var(--color-primary)') : 'var(--color-text-muted)',
    cursor: 'pointer', flexShrink: 0, transition: 'all 150ms',
  }
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
    registrarDose, removerRegistro, buscarRegistrosMembro, recarregar,
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

  const navState = location.state as { confirmarInfantis?: boolean; localInfantis?: string } | null
  const confirmarInfantisFlag = navState?.confirmarInfantis
  const localInfantisNavState = navState?.localInfantis ?? ''

  useEffect(() => {
    if (!confirmarInfantisFlag || carregando || vacinas.length === 0) return
    const membroAtual = membros.find(m => m.id === membroSelecionadoId)
    if (!membroAtual) return
    const regsMembro = buscarRegistrosMembro(membroSelecionadoId)
    if (regsMembro.length > 0) return

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
    setBannerMsg(`Histórico infantil preenchido automaticamente — ${totalDoses} doses registradas com data de hoje e local "${localInfantisNavState}".`)
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
        <button onClick={() => navigate('/vacinas')} className="btn btn-ghost" style={{ marginTop: 'var(--space-4)' }}>Voltar</button>
      </div>
    )
  }

  const membroDefinido = membro
  const registrosMembro = buscarRegistrosMembro(membroSelecionadoId)
  const idadeMembro = calcularIdadeAnos(membroDefinido.data_nascimento, hoje)
  const aguardandoAPI = carregando || vacinas.length === 0

  // ---------------------------------------------------------------------------
  // Agrupamento por ciclo
  // Regra: só mostra ciclos que o membro JÁ VIVEU (idadeMembro >= ciclo.idadeMinAnos).
  // Ciclo pre_natal é exceção — aparece sempre (gestação não depende da idade).
  // ---------------------------------------------------------------------------
  const vacinasPorCiclo = useMemo(() => {
    if (aguardandoAPI) return []
    return CICLOS
      .filter(ciclo => ciclo.id === 'pre_natal' || idadeMembro >= ciclo.idadeMinAnos)
      .map(ciclo => {
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
  }, [aguardandoAPI, vacinas, registros, membroSelecionadoId, idadeMembro])

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
  // Registros avulsos
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
  // Criar vacina avulsa
  // data_aplicacao < hoje  → concluída (local obrigatório)
  // data_aplicacao >= hoje → pendente + lembrete na Agenda
  // ---------------------------------------------------------------------------
  async function handleAdicionarAvulsa() {
    setAvulsaErro('')
    if (!avulsaNome.trim()) { setAvulsaErro('Informe o nome da vacina.'); return }
    if (!avulsaData) { setAvulsaErro('Informe a data.'); return }

    const isPendente = avulsaData >= hoje

    if (!isPendente && !avulsaLocal.trim()) {
      setAvulsaErro('Informe o local onde a vacina foi aplicada.')
      return
    }

    setAvulsaSalvando(true)
    try {
      if (isPendente) {
        await registrarDose({
          membro_id: membroSelecionadoId,
          vacina_id: 'avulsa',
          numero_dose: parseInt(avulsaDose) || 1,
          data_aplicacao: avulsaData,
          observacoes: avulsaNome.trim(),
          status_avulsa: 'pendente',
        })
        adicionarLembrete({
          membro_familiar_id: membroSelecionadoId,
          tipo: 'manual',
          titulo: `${avulsaNome.trim()} — dose ${avulsaDose}`,
          descricao: `Vacina avulsa agendada para ${formatarData(avulsaData)}.`,
          data_prevista: avulsaData,
          automatico: false,
        })
        setBannerMsg(`Registro pendente criado para "${avulsaNome.trim()}" em ${formatarData(avulsaData)}. Um lembrete foi adicionado na Agenda.`)
      } else {
        await registrarDose({
          membro_id: membroSelecionadoId,
          vacina_id: 'avulsa',
          numero_dose: parseInt(avulsaDose) || 1,
          data_aplicacao: avulsaData,
          local_aplicacao: avulsaLocal.trim(),
          observacoes: avulsaNome.trim(),
          status_avulsa: 'concluida',
        })
        setBannerMsg(`"${avulsaNome.trim()}" registrada no histórico — dose tomada em ${formatarData(avulsaData)}.`)
      }
      setModal({ tipo: 'nenhum' })
      setAvulsaNome(''); setAvulsaData(hoje); setAvulsaLocal(''); setAvulsaDose('1')
      setAbaAtiva('avulsas')
    } catch {
      setAvulsaErro('Erro ao salvar. Tente novamente.')
    } finally {
      setAvulsaSalvando(false)
    }
  }

  async function handleMarcarAvulsaTomada() {
    setAvulsaTomadaErro('')
    if (!avulsaTomadaData) { setAvulsaTomadaErro('Informe a data de aplicação.'); return }
    if (avulsaTomadaData > hoje) { setAvulsaTomadaErro('A data não pode ser futura.'); return }
    if (!avulsaTomadaLocal.trim()) { setAvulsaTomadaErro('Informe o local de aplicação.'); return }
    if (modal.tipo !== 'marcarAvulsaTomada') return

    setAvulsaTomadaSalvando(true)
    try {
      await apiFetch(`/registros/${modal.registro.id}`, {
        method: 'PUT',
        body: {
          data_aplicacao: avulsaTomadaData,
          local_aplicacao: avulsaTomadaLocal.trim(),
          status_avulsa: 'concluida',
        },
      })
      await recarregar()
      setModal({ tipo: 'nenhum' })
      setAvulsaTomadaData(hoje); setAvulsaTomadaLocal(''); setAvulsaTomadaErro('')
      setBannerMsg('Vacina marcada como tomada.')
    } catch {
      setAvulsaTomadaErro('Erro ao salvar. Tente novamente.')
    } finally {
      setAvulsaTomadaSalvando(false)
    }
  }

  async function handleApagarAvulsa() {
    if (modal.tipo !== 'apagarAvulsa') return
    removerRegistro(modal.registro.id)
    setModal({ tipo: 'nenhum' })
  }

  async function handleSalvarLembreteManual() {
    setErroLembrete('')
    if (!dataLembrete) { setErroLembrete('Informe a data do lembrete.'); return }
    if (modal.tipo !== 'lembreteManual') return
    adicionarLembrete({
      vacina_id: modal.dose.vacinaId,
      membro_familiar_id: membroSelecionadoId,
      tipo: 'manual',
      titulo: `${modal.vacinaNome} — dose ${modal.dose.numeroDose}`,
      data_prevista: dataLembrete,
      automatico: false,
    })
    setModal({ tipo: 'nenhum' })
    setDataLembrete('')
    setBannerMsg('Lembrete adicionado na Agenda.')
  }

  // ---------------------------------------------------------------------------
  // Render helpers
  // ---------------------------------------------------------------------------
  function temLembretePendente(vacinaId: string, numeroDose: number) {
    return lembretes.some(l =>
      l.membro_id === membroSelecionadoId && l.vacina_id === vacinaId &&
      l.numero_dose === numeroDose && l.status === 'pendente'
    )
  }

  // ---------------------------------------------------------------------------
  // JSX
  // ---------------------------------------------------------------------------
  return (
    <div style={{ maxWidth: 720, margin: '0 auto', paddingBottom: 'var(--space-16)' }}>

      {/* Banner */}
      {bannerMsg && (
        <div style={{
          background: 'var(--color-primary-highlight)', color: 'var(--color-primary)',
          borderRadius: 'var(--radius-lg)', padding: 'var(--space-3) var(--space-4)',
          marginBottom: 'var(--space-4)', fontSize: 'var(--text-sm)', fontWeight: 500,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-3)',
        }}>
          <span>{bannerMsg}</span>
          <button onClick={() => setBannerMsg('')} style={{ flexShrink: 0, color: 'inherit', lineHeight: 1 }} aria-label="Fechar"><X size={16} /></button>
        </div>
      )}

      {/* Voltar */}
      <button
        onClick={() => navigate('/vacinas')}
        className="btn btn-ghost"
        style={{ gap: 'var(--space-2)', marginBottom: 'var(--space-4)', paddingLeft: 0, color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}
      >
        <ArrowLeft size={16} aria-hidden /> Voltar
      </button>

      {/* Header do membro */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', marginBottom: 'var(--space-6)', flexWrap: 'wrap' }}>
        <Avatar nome={membroDefinido.nome} tamanho={52} fotoUrl={membroDefinido.foto_url} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-lg)', fontWeight: 700 }}>
              {membroDefinido.nome}
            </h2>
            {outrosMembros.length > 0 && (
              <div style={{ position: 'relative' }}>
                <button
                  onClick={() => setSeletorAberto(v => !v)}
                  className="btn btn-ghost"
                  style={{ padding: 'var(--space-1) var(--space-2)', fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', minHeight: 28 }}
                  aria-label="Trocar membro"
                >
                  <ChevronDown size={13} aria-hidden />
                </button>
                {seletorAberto && (
                  <div style={{
                    position: 'absolute', top: 'calc(100% + 4px)', left: 0, zIndex: 30,
                    background: 'var(--color-surface)', border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-md)',
                    minWidth: 180, overflow: 'hidden', padding: 'var(--space-1) 0',
                  }}>
                    {outrosMembros.map(m => (
                      <button
                        key={m.id}
                        onClick={() => { setMembroSelecionadoId(m.id); setSeletorAberto(false); navigate(`/vacinas/membro/${m.id}`, { replace: true }) }}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
                          width: '100%', padding: 'var(--space-3) var(--space-4)',
                          background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
                          fontSize: 'var(--text-sm)', color: 'var(--color-text)',
                        }}
                      >
                        <Avatar nome={m.nome} tamanho={24} fotoUrl={m.foto_url} />
                        {m.nome}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
            {RELACAO_LABEL[membroDefinido.relacao]} · {idadeMembro} anos
          </p>
        </div>

        {/* Botão vacina avulsa */}
        <button
          onClick={() => { setAvulsaNome(''); setAvulsaData(hoje); setAvulsaLocal(''); setAvulsaDose('1'); setAvulsaErro(''); setModal({ tipo: 'adicionarAvulsa' }) }}
          className="btn btn-primary"
          style={{ gap: 'var(--space-2)', flexShrink: 0 }}
        >
          <Plus size={16} aria-hidden /> Vacina avulsa
        </button>
      </div>

      {/* Abas */}
      <div style={{
        display: 'flex', borderBottom: '1.5px solid var(--color-border)',
        marginBottom: 'var(--space-5)', gap: 'var(--space-1)',
      }}>
        {(['ciclo', 'avulsas'] as Aba[]).map(aba => {
          const labels: Record<Aba, string> = { ciclo: 'Vacinas de Ciclo', avulsas: 'Vacinas Avulsas' }
          const icons: Record<Aba, React.ReactNode> = {
            ciclo: <CalendarCheck size={15} aria-hidden />,
            avulsas: <ClipboardList size={15} aria-hidden />,
          }
          const ativo = abaAtiva === aba
          return (
            <button
              key={aba}
              onClick={() => setAbaAtiva(aba)}
              style={{
                display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
                padding: 'var(--space-3) var(--space-4)',
                fontSize: 'var(--text-sm)', fontWeight: ativo ? 700 : 400,
                color: ativo ? 'var(--color-primary)' : 'var(--color-text-muted)',
                background: 'none', border: 'none', cursor: 'pointer',
                borderBottom: ativo ? '2px solid var(--color-primary)' : '2px solid transparent',
                marginBottom: -1.5,
                transition: 'color 150ms, border-color 150ms',
              }}
            >
              {icons[aba]} {labels[aba]}
              {aba === 'avulsas' && registrosAvulsos.length > 0 && (
                <span style={{
                  fontSize: 'var(--text-xs)', fontWeight: 600,
                  background: 'var(--color-primary-highlight)', color: 'var(--color-primary)',
                  borderRadius: 'var(--radius-full)', padding: '1px 7px',
                }}>{registrosAvulsos.length}</span>
              )}
            </button>
          )
        })}
      </div>

      {/* ================================================================ */}
      {/* ABA: VACINAS DE CICLO                                            */}
      {/* ================================================================ */}
      {abaAtiva === 'ciclo' && (
        <>
          {/* Filtros */}
          <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-4)', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
              <Search size={15} style={{ position: 'absolute', left: 'var(--space-3)', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-faint)', pointerEvents: 'none' }} aria-hidden />
              <input
                value={busca}
                onChange={e => setBusca(e.target.value)}
                placeholder="Buscar vacina..."
                className="input"
                style={{ paddingLeft: 'var(--space-8)', width: '100%', height: 40 }}
                aria-label="Buscar vacina"
              />
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
              {(['todos', 'pendente', 'atrasada', 'aplicada'] as const).map(s => {
                const cfg: Record<string, { label: string; cor?: string }> = {
                  todos: { label: 'Todos' },
                  pendente: { label: 'Pendentes', cor: 'var(--color-warning)' },
                  atrasada: { label: 'Atrasadas', cor: 'var(--color-error)' },
                  aplicada: { label: 'Aplicadas', cor: 'var(--color-success)' },
                }
                return (
                  <button key={s} onClick={() => setFiltroStatus(s)} style={styleBtnStatus(s, filtroStatus === s, cfg[s].cor)}>
                    {cfg[s].label}
                  </button>
                )
              })}
            </div>
            <CicloDropdown value={filtroCiclo} onChange={setFiltroCiclo} />
          </div>

          {/* Lista de ciclos */}
          {aguardandoAPI ? (
            <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {[1, 2, 3].map(i => <VacinaSkeletonRow key={i} />)}
            </ul>
          ) : vacinasPorCicloFiltrado.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 'var(--space-12) var(--space-8)', color: 'var(--color-text-muted)' }}>
              <Syringe size={40} style={{ margin: '0 auto var(--space-3)', color: 'var(--color-text-faint)' }} aria-hidden />
              <p style={{ fontSize: 'var(--text-sm)' }}>Nenhuma vacina encontrada com esses filtros.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
              {vacinasPorCicloFiltrado.map(({ ciclo, vacinas: vacinasCiclo }) => {
                const expandido = ciclosExpandidos.has(ciclo.id)
                const todasDoses = vacinasCiclo.flatMap(({ doses }) => doses)
                const pendentes = todasDoses.filter(d => d.status === 'pendente' || isAtrasada(d, membroDefinido.data_nascimento, hoje)).length

                return (
                  <section key={ciclo.id} aria-label={ciclo.label}>
                    {/* Header do ciclo */}
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
                      marginBottom: 'var(--space-3)',
                    }}>
                      <button
                        onClick={() => setCiclosExpandidos(prev => {
                          const next = new Set(prev)
                          expandido ? next.delete(ciclo.id) : next.add(ciclo.id)
                          return next
                        })}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flex: 1,
                          background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
                          padding: 0,
                        }}
                        aria-expanded={expandido}
                      >
                        <span style={{ width: 10, height: 10, borderRadius: '50%', background: ciclo.cor, flexShrink: 0 }} aria-hidden />
                        <span style={{ fontWeight: 700, fontSize: 'var(--text-sm)', color: ciclo.cor }}>{ciclo.label}</span>
                        {pendentes > 0 && (
                          <span style={{
                            fontSize: 'var(--text-xs)', fontWeight: 600,
                            background: `oklch(from ${ciclo.cor} l c h / 0.12)`,
                            color: ciclo.cor,
                            borderRadius: 'var(--radius-full)', padding: '2px 8px',
                          }}>{pendentes} pendente{pendentes !== 1 ? 's' : ''}</span>
                        )}
                        <ChevronDown size={14} style={{ marginLeft: 'auto', color: 'var(--color-text-faint)', transform: expandido ? 'rotate(180deg)' : 'none', transition: 'transform 150ms' }} aria-hidden />
                      </button>

                      {/* Confirmar todas */}
                      {pendentes > 0 && (
                        <button
                          onClick={() => {
                            setDataCiclo(hoje); setLocalCiclo(''); setErroCiclo('')
                            setModal({ tipo: 'confirmarCiclo', ciclo, vacinas: vacinasCiclo.map(({ vacina }) => vacina) })
                          }}
                          className="btn btn-ghost"
                          style={{
                            fontSize: 'var(--text-xs)', gap: 'var(--space-1)', minHeight: 32,
                            border: `1px solid ${ciclo.cor}`, color: ciclo.cor,
                            background: `oklch(from ${ciclo.cor} l c h / 0.07)`,
                            borderRadius: 'var(--radius-full)', paddingInline: 'var(--space-3)', flexShrink: 0,
                          }}
                        >
                          <ListChecks size={13} aria-hidden /> Confirmar todas ({pendentes})
                        </button>
                      )}
                    </div>

                    {/* Vacinas do ciclo */}
                    {expandido && (
                      <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                        {vacinasCiclo.map(({ vacina, doses }) => (
                          <li key={vacina.id}>
                            <div style={{
                              background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)',
                              border: `1px solid ${ciclo.corBorda}`,
                              overflow: 'hidden',
                            }}>
                              {/* Header vacina */}
                              <div style={{
                                background: ciclo.corBg,
                                padding: 'var(--space-3) var(--space-4)',
                                display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 'var(--space-3)',
                              }}>
                                <div>
                                  <p style={{ fontWeight: 600, fontSize: 'var(--text-sm)', color: 'var(--color-text)' }}>{vacina.nome}</p>
                                  <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginTop: 2 }}>{vacina.descricao}</p>
                                  {vacina.protege_contra && (
                                    <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-faint)', marginTop: 2 }}>Protege contra: {vacina.protege_contra}</p>
                                  )}
                                </div>
                              </div>

                              {/* Doses */}
                              <ul style={{ listStyle: 'none', padding: 'var(--space-2) var(--space-3)', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                                {doses.map(dose => {
                                  const atrasada = isAtrasada(dose, membroDefinido.data_nascimento, hoje)
                                  const statusEfetivo = atrasada ? 'atrasada' : dose.status
                                  const tomada = dose.status === 'aplicada'
                                  const temLembrete = temLembretePendente(vacina.id, dose.numeroDose)

                                  return (
                                    <li key={dose.numeroDose} style={{
                                      display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
                                      padding: 'var(--space-3) var(--space-2)',
                                      borderRadius: 'var(--radius-md)',
                                      background: tomada ? 'var(--color-surface-offset)' : 'var(--color-surface)',
                                    }}>
                                      {/* Ícone status */}
                                      <span style={{ flexShrink: 0, color: statusEfetivo === 'atrasada' ? 'var(--color-error)' : statusEfetivo === 'aplicada' ? 'var(--color-success)' : 'var(--color-warning)' }}>
                                        {statusEfetivo === 'aplicada' ? <CheckCircle2 size={16} aria-hidden /> : <Clock size={16} aria-hidden />}
                                      </span>

                                      <div style={{ flex: 1, minWidth: 0 }}>
                                        <p style={{ fontSize: 'var(--text-sm)', fontWeight: 500, color: tomada ? 'var(--color-text-muted)' : 'var(--color-text)', textDecoration: tomada ? 'line-through' : 'none' }}>
                                          {dose.numeroDose}ª dose
                                          {dose.dataPrevista && !tomada && (
                                            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-faint)', marginLeft: 'var(--space-2)' }}>
                                              Prevista: {formatarData(dose.dataPrevista)}
                                            </span>
                                          )}
                                        </p>
                                        {tomada && dose.dataAplicacao && (
                                          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                                            Tomada em {formatarData(dose.dataAplicacao)}
                                            {dose.localAplicacao && <> · {dose.localAplicacao}</>}
                                          </p>
                                        )}
                                      </div>

                                      {/* Ações */}
                                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexShrink: 0 }}>
                                        {!tomada ? (
                                          <>
                                            <VacinaStatusBadge status={statusEfetivo} />
                                            <button
                                              onClick={() => { setDataConfirm(hoje); setLocalConfirm(''); setErroConfirm(''); setModal({ tipo: 'marcarTomada', dose, vacinaNome: vacina.nome }) }}
                                              className="btn btn-primary"
                                              style={{ fontSize: 'var(--text-xs)', minHeight: 32, padding: 'var(--space-1) var(--space-3)', flexShrink: 0 }}
                                              aria-label={`Marcar ${dose.numeroDose}ª dose de ${vacina.nome} como tomada`}
                                            >
                                              <CheckCircle2 size={13} aria-hidden /> Tomada
                                            </button>
                                            <button
                                              onClick={() => {
                                                if (temLembrete) {
                                                  const l = lembretes.find(x => x.membro_id === membroSelecionadoId && x.vacina_id === vacina.id && x.numero_dose === dose.numeroDose && x.status === 'pendente')
                                                  if (l) removerLembrete(l.id)
                                                } else {
                                                  setDataLembrete(dose.dataPrevista ?? '')
                                                  setErroLembrete('')
                                                  setModal({ tipo: 'lembreteManual', dose, vacinaNome: vacina.nome })
                                                }
                                              }}
                                              className="btn btn-ghost"
                                              style={{ minHeight: 32, padding: 'var(--space-1) var(--space-2)', color: temLembrete ? 'var(--color-primary)' : 'var(--color-text-faint)' }}
                                              aria-label={temLembrete ? 'Remover lembrete' : 'Adicionar lembrete'}
                                            >
                                              {temLembrete ? <Bell size={15} aria-hidden /> : <BellOff size={15} aria-hidden />}
                                            </button>
                                          </>
                                        ) : (
                                          <button
                                            onClick={() => setModal({ tipo: 'apagarDose', dose, vacinaNome: vacina.nome, registroId: dose.registroId! })}
                                            className="btn btn-ghost"
                                            style={{ minHeight: 32, padding: 'var(--space-1) var(--space-2)', color: 'var(--color-text-faint)' }}
                                            aria-label={`Remover registro da ${dose.numeroDose}ª dose de ${vacina.nome}`}
                                          >
                                            <Trash2 size={15} aria-hidden />
                                          </button>
                                        )}
                                      </div>
                                    </li>
                                  )
                                })}
                              </ul>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* ================================================================ */}
      {/* ABA: VACINAS AVULSAS                                             */}
      {/* ================================================================ */}
      {abaAtiva === 'avulsas' && (
        <>
          {/* Filtros status */}
          <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-4)', flexWrap: 'wrap' }}>
            {(['todos', 'pendente', 'atrasada', 'concluida'] as const).map(s => {
              const cfg: Record<string, { label: string; cor?: string }> = {
                todos: { label: 'Todos' },
                pendente: { label: 'Pendentes', cor: 'var(--color-warning)' },
                atrasada: { label: 'Atrasadas', cor: 'var(--color-error)' },
                concluida: { label: 'Concluídas', cor: 'var(--color-success)' },
              }
              return (
                <button key={s} onClick={() => setFiltroStatusAvulsa(s)} style={styleBtnStatus(s, filtroStatusAvulsa === s, cfg[s].cor)}>
                  {cfg[s].label}
                </button>
              )
            })}
          </div>

          {avulsasFiltradas.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 'var(--space-12) var(--space-8)', color: 'var(--color-text-muted)' }}>
              <ClipboardList size={40} style={{ margin: '0 auto var(--space-3)', color: 'var(--color-text-faint)' }} aria-hidden />
              <p style={{ fontWeight: 600, marginBottom: 'var(--space-2)', color: 'var(--color-text)' }}>Nenhuma vacina avulsa</p>
              <p style={{ fontSize: 'var(--text-sm)', maxWidth: 260, margin: '0 auto var(--space-5)' }}>
                Vacinas fora do calendário oficial — viagens, indicação médica, etc.
              </p>
              <button
                onClick={() => { setAvulsaNome(''); setAvulsaData(hoje); setAvulsaLocal(''); setAvulsaDose('1'); setAvulsaErro(''); setModal({ tipo: 'adicionarAvulsa' }) }}
                className="btn btn-primary"
                style={{ gap: 'var(--space-2)' }}
              >
                <Plus size={16} aria-hidden /> Registrar primeira avulsa
              </button>
            </div>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {avulsasFiltradas.map(registro => {
                const status = statusAvulsaEfetivo(registro, hoje)
                const nome = registro.observacoes ?? 'Vacina avulsa'
                return (
                  <li key={registro.id}>
                    <div className="card" style={{ padding: 'var(--space-4) var(--space-5)', display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontWeight: 600, fontSize: 'var(--text-sm)', color: 'var(--color-text)' }}>{nome}</p>
                        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginTop: 2 }}>
                          Dose {registro.numero_dose} · {formatarData(registro.data_aplicacao)}
                          {registro.local_aplicacao && <> · <MapPin size={11} style={{ display: 'inline', verticalAlign: 'middle' }} aria-hidden /> {registro.local_aplicacao}</>}
                        </p>
                      </div>
                      <AvulsaStatusBadge status={status} />
                      <div style={{ display: 'flex', gap: 'var(--space-1)', flexShrink: 0 }}>
                        {status !== 'concluida' && (
                          <button
                            onClick={() => { setAvulsaTomadaData(hoje); setAvulsaTomadaLocal(''); setAvulsaTomadaErro(''); setModal({ tipo: 'marcarAvulsaTomada', registro }) }}
                            className="btn btn-primary"
                            style={{ fontSize: 'var(--text-xs)', minHeight: 32, padding: 'var(--space-1) var(--space-3)' }}
                          >
                            <CheckCircle2 size={13} aria-hidden /> Tomada
                          </button>
                        )}
                        <button
                          onClick={() => setModal({ tipo: 'apagarAvulsa', registro })}
                          className="btn btn-ghost"
                          style={{ minHeight: 32, padding: 'var(--space-1) var(--space-2)', color: 'var(--color-text-faint)' }}
                          aria-label="Apagar vacina avulsa"
                        >
                          <Trash2 size={14} aria-hidden />
                        </button>
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </>
      )}

      {/* ================================================================ */}
      {/* MODAIS                                                           */}
      {/* ================================================================ */}

      {/* Modal: marcar dose tomada */}
      {modal.tipo === 'marcarTomada' && (
        <ModalOverlay onClose={() => setModal({ tipo: 'nenhum' })}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 'var(--text-base)', marginBottom: 'var(--space-4)' }}>
            Marcar como tomada
          </h3>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-5)' }}>
            {modal.vacinaNome} · {modal.dose.numeroDose}ª dose
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <div>
              <label style={{ fontSize: 'var(--text-sm)', fontWeight: 600, display: 'block', marginBottom: 'var(--space-2)' }}>
                Data de aplicação *
              </label>
              <input type="date" value={dataConfirm} onChange={e => setDataConfirm(e.target.value)} max={hoje} className="input" style={{ width: '100%' }} />
            </div>
            <div>
              <label style={{ fontSize: 'var(--text-sm)', fontWeight: 600, display: 'block', marginBottom: 'var(--space-2)' }}>
                Local de aplicação *
              </label>
              <input
                value={localConfirm} onChange={e => setLocalConfirm(e.target.value)}
                placeholder="Ex: UBS Vila Madalena, Clínica São Lucas..."
                className="input" style={{ width: '100%' }}
              />
            </div>
            {erroConfirm && <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-error)' }}>{erroConfirm}</p>}
            <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end', marginTop: 'var(--space-2)' }}>
              <button onClick={() => setModal({ tipo: 'nenhum' })} className="btn btn-ghost">Cancelar</button>
              <button onClick={handleMarcarTomada} className="btn btn-primary"><CheckCircle2 size={15} aria-hidden /> Confirmar</button>
            </div>
          </div>
        </ModalOverlay>
      )}

      {/* Modal: apagar dose de ciclo */}
      {modal.tipo === 'apagarDose' && (
        <ModalOverlay onClose={() => setModal({ tipo: 'nenhum' })}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 'var(--text-base)', marginBottom: 'var(--space-4)' }}>
            Remover registro
          </h3>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-5)' }}>
            Tem certeza que deseja remover o registro da {modal.dose.numeroDose}ª dose de <strong>{modal.vacinaNome}</strong>?
          </p>
          <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end' }}>
            <button onClick={() => setModal({ tipo: 'nenhum' })} className="btn btn-ghost">Cancelar</button>
            <button onClick={handleApagarDose} className="btn btn-danger"><Trash2 size={15} aria-hidden /> Remover</button>
          </div>
        </ModalOverlay>
      )}

      {/* Modal: confirmar ciclo inteiro */}
      {modal.tipo === 'confirmarCiclo' && (
        <ModalOverlay onClose={() => setModal({ tipo: 'nenhum' })}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 'var(--text-base)', marginBottom: 'var(--space-3)' }}>
            Confirmar ciclo: {modal.ciclo.label}
          </h3>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-5)' }}>
            Todas as doses pendentes deste ciclo serão marcadas como aplicadas na data e local informados.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <div>
              <label style={{ fontSize: 'var(--text-sm)', fontWeight: 600, display: 'block', marginBottom: 'var(--space-2)' }}>Data *</label>
              <input type="date" value={dataCiclo} onChange={e => setDataCiclo(e.target.value)} max={hoje} className="input" style={{ width: '100%' }} />
            </div>
            <div>
              <label style={{ fontSize: 'var(--text-sm)', fontWeight: 600, display: 'block', marginBottom: 'var(--space-2)' }}>Local *</label>
              <input value={localCiclo} onChange={e => setLocalCiclo(e.target.value)} placeholder="Ex: UBS Centro" className="input" style={{ width: '100%' }} />
            </div>
            {erroCiclo && <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-error)' }}>{erroCiclo}</p>}
            <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end', marginTop: 'var(--space-2)' }}>
              <button onClick={() => setModal({ tipo: 'nenhum' })} className="btn btn-ghost">Cancelar</button>
              <button onClick={handleConfirmarCiclo} className="btn btn-primary" disabled={confirmandoCiclo}>
                {confirmandoCiclo ? 'Confirmando...' : <><ListChecks size={15} aria-hidden /> Confirmar ciclo</>}
              </button>
            </div>
          </div>
        </ModalOverlay>
      )}

      {/* Modal: adicionar vacina avulsa */}
      {modal.tipo === 'adicionarAvulsa' && (
        <ModalOverlay onClose={() => setModal({ tipo: 'nenhum' })}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 'var(--text-base)', marginBottom: 'var(--space-2)' }}>
            Registrar vacina avulsa
          </h3>
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-1)' }}>
            Para <strong>{membroDefinido.nome}</strong>
          </p>

          {/* Info contextual baseada na data */}
          <div style={{
            background: avulsaData >= hoje ? 'oklch(from var(--color-warning) l c h / 0.08)' : 'oklch(from var(--color-success) l c h / 0.08)',
            border: `1px solid ${avulsaData >= hoje ? 'oklch(from var(--color-warning) l c h / 0.25)' : 'oklch(from var(--color-success) l c h / 0.25)'}`,
            borderRadius: 'var(--radius-md)', padding: 'var(--space-3)', marginBottom: 'var(--space-4)',
            marginTop: 'var(--space-3)',
            fontSize: 'var(--text-xs)', color: avulsaData >= hoje ? 'var(--color-warning)' : 'var(--color-success)',
            display: 'flex', gap: 'var(--space-2)', alignItems: 'flex-start',
          }}>
            <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} aria-hidden />
            <span>
              {avulsaData >= hoje
                ? 'Será criado um registro pendente na aba Avulsas. O local será informado ao marcar como tomada. Um lembrete será criado automaticamente na Agenda.'
                : 'Dose registrada como concluída no histórico. Informe o local onde foi aplicada.'}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <div>
              <label style={{ fontSize: 'var(--text-sm)', fontWeight: 600, display: 'block', marginBottom: 'var(--space-2)' }}>Nome da vacina *</label>
              <input
                value={avulsaNome} onChange={e => setAvulsaNome(e.target.value)}
                placeholder="Ex: Febre Amarela, HPV, Gripe..."
                className="input" style={{ width: '100%' }}
              />
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 'var(--text-sm)', fontWeight: 600, display: 'block', marginBottom: 'var(--space-2)' }}>Data *</label>
                <input type="date" value={avulsaData} onChange={e => setAvulsaData(e.target.value)} className="input" style={{ width: '100%' }} />
              </div>
              <div style={{ width: 90 }}>
                <label style={{ fontSize: 'var(--text-sm)', fontWeight: 600, display: 'block', marginBottom: 'var(--space-2)' }}>Dose</label>
                <input type="number" min={1} value={avulsaDose} onChange={e => setAvulsaDose(e.target.value)} className="input" style={{ width: '100%' }} />
              </div>
            </div>

            {/* Campo local — só aparece quando data é passada (dose concluída) */}
            {avulsaData < hoje && (
              <div>
                <label style={{ fontSize: 'var(--text-sm)', fontWeight: 600, display: 'block', marginBottom: 'var(--space-2)' }}>
                  <MapPin size={13} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} aria-hidden />
                  Local de aplicação *
                </label>
                <input
                  value={avulsaLocal} onChange={e => setAvulsaLocal(e.target.value)}
                  placeholder="Ex: UBS Vila Madalena, Clínica São Lucas..."
                  className="input" style={{ width: '100%' }}
                />
              </div>
            )}

            {avulsaErro && <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-error)' }}>{avulsaErro}</p>}
            <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end', marginTop: 'var(--space-2)' }}>
              <button onClick={() => setModal({ tipo: 'nenhum' })} className="btn btn-ghost">Cancelar</button>
              <button onClick={handleAdicionarAvulsa} disabled={avulsaSalvando} className="btn btn-primary">
                {avulsaSalvando ? 'Salvando...' : avulsaData >= hoje ? 'Criar registro pendente' : 'Registrar dose tomada'}
              </button>
            </div>
          </div>
        </ModalOverlay>
      )}

      {/* Modal: marcar avulsa como tomada */}
      {modal.tipo === 'marcarAvulsaTomada' && (
        <ModalOverlay onClose={() => setModal({ tipo: 'nenhum' })}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 'var(--text-base)', marginBottom: 'var(--space-4)' }}>
            Marcar como tomada
          </h3>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-5)' }}>
            {modal.registro.observacoes ?? 'Vacina avulsa'} · dose {modal.registro.numero_dose}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <div>
              <label style={{ fontSize: 'var(--text-sm)', fontWeight: 600, display: 'block', marginBottom: 'var(--space-2)' }}>Data de aplicação *</label>
              <input type="date" value={avulsaTomadaData} onChange={e => setAvulsaTomadaData(e.target.value)} max={hoje} className="input" style={{ width: '100%' }} />
            </div>
            <div>
              <label style={{ fontSize: 'var(--text-sm)', fontWeight: 600, display: 'block', marginBottom: 'var(--space-2)' }}>
                <MapPin size={13} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} aria-hidden />
                Local de aplicação *
              </label>
              <input
                value={avulsaTomadaLocal} onChange={e => setAvulsaTomadaLocal(e.target.value)}
                placeholder="Ex: UBS Centro, Clínica Particular..."
                className="input" style={{ width: '100%' }}
              />
            </div>
            {avulsaTomadaErro && <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-error)' }}>{avulsaTomadaErro}</p>}
            <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end', marginTop: 'var(--space-2)' }}>
              <button onClick={() => setModal({ tipo: 'nenhum' })} className="btn btn-ghost">Cancelar</button>
              <button onClick={handleMarcarAvulsaTomada} disabled={avulsaTomadaSalvando} className="btn btn-primary">
                {avulsaTomadaSalvando ? 'Salvando...' : <><CheckCircle2 size={15} aria-hidden /> Confirmar</>}
              </button>
            </div>
          </div>
        </ModalOverlay>
      )}

      {/* Modal: apagar avulsa */}
      {modal.tipo === 'apagarAvulsa' && (
        <ModalOverlay onClose={() => setModal({ tipo: 'nenhum' })}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 'var(--text-base)', marginBottom: 'var(--space-4)' }}>
            Remover vacina avulsa
          </h3>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-5)' }}>
            Tem certeza que deseja remover <strong>{modal.registro.observacoes ?? 'esta vacina avulsa'}</strong>?
          </p>
          <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end' }}>
            <button onClick={() => setModal({ tipo: 'nenhum' })} className="btn btn-ghost">Cancelar</button>
            <button onClick={handleApagarAvulsa} className="btn btn-danger"><Trash2 size={15} aria-hidden /> Remover</button>
          </div>
        </ModalOverlay>
      )}

      {/* Modal: lembrete manual */}
      {modal.tipo === 'lembreteManual' && (
        <ModalOverlay onClose={() => setModal({ tipo: 'nenhum' })}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 'var(--text-base)', marginBottom: 'var(--space-4)' }}>
            Adicionar lembrete
          </h3>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-5)' }}>
            {modal.vacinaNome} · {modal.dose.numeroDose}ª dose
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <div>
              <label style={{ fontSize: 'var(--text-sm)', fontWeight: 600, display: 'block', marginBottom: 'var(--space-2)' }}>Data do lembrete *</label>
              <input type="date" value={dataLembrete} onChange={e => setDataLembrete(e.target.value)} className="input" style={{ width: '100%' }} />
            </div>
            {erroLembrete && <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-error)' }}>{erroLembrete}</p>}
            <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end', marginTop: 'var(--space-2)' }}>
              <button onClick={() => setModal({ tipo: 'nenhum' })} className="btn btn-ghost">Cancelar</button>
              <button onClick={handleSalvarLembreteManual} className="btn btn-primary"><Bell size={15} aria-hidden /> Salvar lembrete</button>
            </div>
          </div>
        </ModalOverlay>
      )}
    </div>
  )
}
