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
// Componente Dropdown de Ciclo
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
  const [bannerInfantis, setBannerInfantis] = useState('')

  // --- filtros caderneta ---
  const [filtroCiclo, setFiltroCiclo] = useState<CicloId | 'todos'>('todos')
  const [filtroStatus, setFiltroStatus] = useState<'todos' | 'pendente' | 'aplicada' | 'atrasada'>('todos')
  const [busca, setBusca] = useState('')
  const [ciclosExpandidos, setCiclosExpandidos] = useState<Set<CicloId>>(new Set(CICLOS.map(c => c.id)))

  // --- filtros avulsas ---
  const [filtroStatusAvulsa, setFiltroStatusAvulsa] = useState<'todos' | 'aplicada' | 'agendada'>('todos')

  // --- modais ---
  const [modal, setModal] = useState<ModalState>({ tipo: 'nenhum' })
  const [dataConfirm, setDataConfirm] = useState(hoje)
  const [localConfirm, setLocalConfirm] = useState('')
  const [erroConfirm, setErroConfirm] = useState('')

  const [dataCiclo, setDataCiclo] = useState(hoje)
  const [localCiclo, setLocalCiclo] = useState('')
  const [erroCiclo, setErroCiclo] = useState('')
  const [confirmandoCiclo, setConfirmandoCiclo] = useState(false)

  // --- modal avulsa ---
  const [avulsaNome, setAvulsaNome] = useState('')
  const [avulsaData, setAvulsaData] = useState(hoje)
  const [avulsaLocal, setAvulsaLocal] = useState('')
  const [avulsaDose, setAvulsaDose] = useState('1')
  const [avulsaErro, setAvulsaErro] = useState('')
  const [avulsaSalvando, setAvulsaSalvando] = useState(false)

  // --- lembrete manual ---
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
    setBannerInfantis(`Histórico infantil preenchido automaticamente — ${totalDoses} doses registradas com data de hoje e local "${localInfantisNavState}". Você pode editar ou apagar qualquer dose individualmente.`)
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
  // Registros avulsos
  // ---------------------------------------------------------------------------
  const registrosAvulsos = useMemo(() => {
    return registrosMembro.filter(r => r.vacina_id === 'avulsa')
  }, [registrosMembro])

  const lembretesManuais = useMemo(() => {
    return lembretes.filter(
      l => l.tipo === 'manual' &&
        (l.membro_id === membroSelecionadoId || l.membro_familiar_id === membroSelecionadoId) &&
        l.status === 'pendente'
    )
  }, [lembretes, membroSelecionadoId])

  const avulsasFiltradas = useMemo(() => {
    const aplicadas = registrosAvulsos.map(r => ({
      tipo: 'aplicada' as const,
      id: r.id,
      nome: r.observacoes ?? 'Vacina avulsa',
      dose: r.numero_dose,
      data: r.data_aplicacao,
      local: r.local_aplicacao,
      registroId: r.id,
    }))
    const agendadas = lembretesManuais.map(l => ({
      tipo: 'agendada' as const,
      id: l.id,
      nome: l.titulo,
      dose: 1,
      data: l.data_prevista ?? '',
      local: l.descricao ?? '',
      registroId: '',
    }))
    const todas = [...aplicadas, ...agendadas].sort((a, b) => b.data.localeCompare(a.data))
    if (filtroStatusAvulsa === 'todos') return todas
    return todas.filter(a => a.tipo === filtroStatusAvulsa)
  }, [registrosAvulsos, lembretesManuais, filtroStatusAvulsa])

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

  function handleAdicionarAvulsa() {
    if (!avulsaNome.trim()) { setAvulsaErro('Informe o nome da vacina.'); return }
    if (!avulsaData) { setAvulsaErro('Informe a data.'); return }
    if (!avulsaLocal.trim()) { setAvulsaErro('Informe o local.'); return }

    setAvulsaSalvando(true)
    const isFutura = avulsaData > hoje

    if (isFutura) {
      adicionarLembrete({
        membro_familiar_id: membroSelecionadoId,
        tipo: 'manual',
        titulo: `${avulsaNome.trim()} — dose ${avulsaDose}`,
        descricao: `Local previsto: ${avulsaLocal.trim()}`,
        data_prevista: avulsaData,
        automatico: false,
      })
    } else {
      registrarDose(
        {
          membro_id: membroSelecionadoId,
          vacina_id: 'avulsa',
          numero_dose: parseInt(avulsaDose) || 1,
          data_aplicacao: avulsaData,
          local_aplicacao: avulsaLocal.trim(),
          observacoes: avulsaNome.trim(),
        },
        () => {}
      )
    }

    setAvulsaSalvando(false)
    setModal({ tipo: 'nenhum' })
    setAvulsaNome(''); setAvulsaData(hoje); setAvulsaLocal('')
    setAvulsaDose('1'); setAvulsaErro('')

    if (isFutura) {
      setBannerInfantis(`Lembrete criado para ${avulsaNome.trim()} em ${formatarData(avulsaData)}. Você pode gerenciá-lo na seção Agenda.`)
    }
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
      l => l.vacina_id === vacinaId && (l.membro_id === membroSelecionadoId || l.membro_familiar_id === membroSelecionadoId) &&
        l.numero_dose === numeroDose && l.status === 'pendente'
    )
  }

  function toggleCiclo(cicloId: CicloId) {
    setCiclosExpandidos(prev => {
      const next = new Set(prev)
      if (next.has(cicloId)) next.delete(cicloId)
      else next.add(cicloId)
      return next
    })
  }

  function styleBtnStatus(_s: string, ativo: boolean, cor?: string) {
    return {
      fontSize: 'var(--text-xs)',
      fontWeight: ativo ? 700 : 400,
      padding: 'var(--space-2) var(--space-3)',
      minHeight: 36,
      borderRadius: 'var(--radius-full)',
      border: ativo
        ? `1.5px solid ${cor ?? 'var(--color-primary)'}`
        : '1.5px solid var(--color-border)',
      background: ativo ? (cor ? `oklch(from ${cor} l c h / 0.1)` : 'var(--color-primary-highlight)') : 'var(--color-surface)',
      color: ativo ? (cor ?? 'var(--color-primary)') : 'var(--color-text-muted)',
      cursor: 'pointer',
      flexShrink: 0,
      transition: 'all 150ms',
    } as React.CSSProperties
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div style={{ maxWidth: 680, margin: '0 auto', paddingBottom: 'var(--space-10)' }}>

      {/* Cabeçalho */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-5)' }}>
        <button
          onClick={() => navigate('/vacinas')}
          style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)', minHeight: 44, flexShrink: 0 }}
          aria-label="Voltar para Vacinas"
        >
          <ArrowLeft size={18} aria-hidden /> Voltar
        </button>
        <div style={{ flex: 1 }} />
        <button
          onClick={() => { setAbaAtiva('avulsas'); setModal({ tipo: 'adicionarAvulsa' }) }}
          className="btn btn-primary"
          style={{ gap: 'var(--space-2)', fontSize: 'var(--text-sm)', minHeight: 44 }}
        >
          <Plus size={16} aria-hidden /> Vacina avulsa
        </button>
      </div>

      {/* Banner informativo */}
      {bannerInfantis && (
        <div role="status" style={{ background: 'var(--color-primary-highlight)', border: '1px solid oklch(from var(--color-primary) l c h / 0.25)', borderRadius: 'var(--radius-md)', padding: 'var(--space-3) var(--space-4)', marginBottom: 'var(--space-4)', display: 'flex', alignItems: 'flex-start', gap: 'var(--space-3)' }}>
          <CheckCircle2 size={16} style={{ color: 'var(--color-primary)', flexShrink: 0, marginTop: 2 }} aria-hidden />
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text)', lineHeight: 1.5, flex: 1 }}>{bannerInfantis}</p>
          <button onClick={() => setBannerInfantis('')} style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', flexShrink: 0 }} aria-label="Fechar aviso">✕</button>
        </div>
      )}

      {/* Card do membro */}
      <div className="card" style={{ marginBottom: 'var(--space-5)', padding: 'var(--space-4) var(--space-5)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
          <Avatar nome={membroDefinido.nome} tamanho={48} fotoUrl={membroDefinido.foto_url} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontWeight: 700, color: 'var(--color-text)', fontSize: 'var(--text-base)' }}>{membroDefinido.nome}</p>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
              {RELACAO_LABEL[membroDefinido.relacao]} · {idadeMembro} {idadeMembro === 1 ? 'ano' : 'anos'}
            </p>
          </div>
          {outrosMembros.length > 0 && (
            <button onClick={() => setSeletorAberto(v => !v)} className="btn btn-ghost" style={{ fontSize: 'var(--text-xs)', gap: 'var(--space-1)', flexShrink: 0 }} aria-expanded={seletorAberto}>
              Trocar <ChevronDown size={14} style={{ transform: seletorAberto ? 'rotate(180deg)' : 'none', transition: 'transform 150ms' }} aria-hidden />
            </button>
          )}
        </div>
        {seletorAberto && (
          <div style={{ marginTop: 'var(--space-3)', paddingTop: 'var(--space-3)', borderTop: '1px solid var(--color-divider)', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            {outrosMembros.map(m => (
              <button key={m.id} onClick={() => { setMembroSelecionadoId(m.id); setSeletorAberto(false); navigate(`/vacinas/membro/${m.id}`, { replace: true }) }} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', padding: 'var(--space-2) var(--space-3)', borderRadius: 'var(--radius-md)', background: 'var(--color-surface-offset)', border: 'none', cursor: 'pointer', minHeight: 44, textAlign: 'left' }}>
                <Avatar nome={m.nome} tamanho={32} />
                <div>
                  <p style={{ fontWeight: 600, fontSize: 'var(--text-sm)', color: 'var(--color-text)' }}>{m.nome}</p>
                  <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>{RELACAO_LABEL[m.relacao]}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Abas */}
      <div role="tablist" style={{ display: 'flex', gap: 0, marginBottom: 'var(--space-5)', borderBottom: '2px solid var(--color-divider)' }}>
        {(['ciclo', 'avulsas'] as Aba[]).map(aba => (
          <button
            key={aba}
            role="tab"
            aria-selected={abaAtiva === aba}
            onClick={() => setAbaAtiva(aba)}
            style={{
              padding: 'var(--space-3) var(--space-5)',
              fontSize: 'var(--text-sm)',
              fontWeight: abaAtiva === aba ? 700 : 400,
              color: abaAtiva === aba ? 'var(--color-primary)' : 'var(--color-text-muted)',
              background: 'none',
              border: 'none',
              borderBottom: abaAtiva === aba ? '2px solid var(--color-primary)' : '2px solid transparent',
              marginBottom: -2,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-2)',
              transition: 'all 150ms',
            }}
          >
            {aba === 'ciclo' ? <Syringe size={15} aria-hidden /> : <ClipboardList size={15} aria-hidden />}
            {aba === 'ciclo' ? 'Vacinas de Ciclo' : 'Vacinas Avulsas'}
          </button>
        ))}
      </div>

      {/* ===================== ABA: VACINAS DE CICLO ===================== */}
      {abaAtiva === 'ciclo' && (
        <>
          {/* Filtros inline */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)', marginBottom: 'var(--space-4)', alignItems: 'center' }}>
            {/* Busca */}
            <div style={{ flex: '1 1 180px', position: 'relative', minWidth: 160 }}>
              <Search size={14} style={{ position: 'absolute', left: 'var(--space-3)', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-faint)', pointerEvents: 'none' }} aria-hidden />
              <input
                type="search"
                placeholder="Buscar vacina..."
                value={busca}
                onChange={e => setBusca(e.target.value)}
                className="input-field"
                style={{ paddingLeft: 'var(--space-8)', minHeight: 40, fontSize: 'var(--text-sm)' }}
                aria-label="Buscar vacina na caderneta"
              />
            </div>

            {/* Botões de status */}
            <button onClick={() => setFiltroStatus('todos')} style={styleBtnStatus('todos', filtroStatus === 'todos')}>
              Todos
            </button>
            <button onClick={() => setFiltroStatus('pendente')} style={styleBtnStatus('pendente', filtroStatus === 'pendente', 'var(--color-warning)')}>
              Pendentes
            </button>
            <button onClick={() => setFiltroStatus('atrasada')} style={styleBtnStatus('atrasada', filtroStatus === 'atrasada', 'var(--color-error)')}>
              Atrasadas
            </button>
            <button onClick={() => setFiltroStatus('aplicada')} style={styleBtnStatus('aplicada', filtroStatus === 'aplicada', 'var(--color-success)')}>
              Aplicadas
            </button>

            {/* Dropdown de ciclo */}
            <CicloDropdown value={filtroCiclo} onChange={v => setFiltroCiclo(v)} />
          </div>

          {/* Caderneta por ciclo */}
          {aguardandoAPI ? (
            <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }} role="list" aria-busy="true">
              {Array.from({ length: 5 }).map((_, i) => <VacinaSkeletonRow key={i} />)}
            </ul>
          ) : vacinasPorCicloFiltrado.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 'var(--space-12) var(--space-8)', color: 'var(--color-text-muted)' }}>
              <CalendarCheck size={40} style={{ margin: '0 auto var(--space-3)', opacity: 0.3 }} aria-hidden />
              <p style={{ fontWeight: 600, marginBottom: 'var(--space-2)' }}>Nenhuma vacina encontrada</p>
              <p style={{ fontSize: 'var(--text-xs)' }}>Tente ajustar os filtros ou a busca.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
              {vacinasPorCicloFiltrado.map(({ ciclo, vacinas: vacinasCiclo }) => {
                const pendentesNoCiclo = vacinasCiclo.filter(({ doses }) =>
                  doses.some(d => d.status !== 'aplicada')
                )
                const expandido = ciclosExpandidos.has(ciclo.id)

                return (
                  <div key={ciclo.id} style={{ borderRadius: 'var(--radius-lg)', border: `1.5px solid ${ciclo.corBorda}`, overflow: 'hidden' }}>
                    {/* Cabeçalho do ciclo */}
                    <div style={{ background: ciclo.corBg, padding: 'var(--space-4) var(--space-5)', borderBottom: expandido ? `1px solid ${ciclo.corBorda}` : 'none' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: ciclo.cor, flexShrink: 0 }} aria-hidden />
                        <div style={{ flex: 1 }}>
                          <p style={{ fontWeight: 700, fontSize: 'var(--text-sm)', color: ciclo.cor }}>{ciclo.label}</p>
                          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginTop: 2 }}>{ciclo.descricao}</p>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexShrink: 0 }}>
                          {pendentesNoCiclo.length > 0 && (
                            <button
                              onClick={() => setModal({ tipo: 'confirmarCiclo', ciclo, vacinas: pendentesNoCiclo.map(v => v.vacina) })}
                              style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)', fontSize: 'var(--text-xs)', fontWeight: 600, padding: 'var(--space-1) var(--space-3)', borderRadius: 'var(--radius-full)', border: `1px solid ${ciclo.cor}`, background: ciclo.corBg, color: ciclo.cor, cursor: 'pointer', minHeight: 32 }}
                              title={`Marcar todas as ${pendentesNoCiclo.length} vacinas pendentes de ${ciclo.label} como tomadas`}
                            >
                              <ListChecks size={13} aria-hidden />
                              Confirmar todas ({pendentesNoCiclo.length})
                            </button>
                          )}
                          <button onClick={() => toggleCiclo(ciclo.id)} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)', fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', background: 'none', border: 'none', cursor: 'pointer', minHeight: 32 }} aria-expanded={expandido} aria-label={expandido ? `Recolher ${ciclo.label}` : `Expandir ${ciclo.label}`}>
                            <ChevronDown size={14} style={{ transform: expandido ? 'rotate(180deg)' : 'none', transition: 'transform 150ms' }} aria-hidden />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Vacinas do ciclo */}
                    {expandido && (
                      <div style={{ background: 'var(--color-surface)' }}>
                        {vacinasCiclo.map(({ vacina, doses }, idx) => {
                          const todasAplicadas = doses.every(d => d.status === 'aplicada')
                          const isLast = idx === vacinasCiclo.length - 1
                          return (
                            <div
                              key={vacina.id}
                              style={{
                                padding: 'var(--space-5) var(--space-5)',
                                borderBottom: isLast ? 'none' : '2px solid var(--color-divider)',
                                background: 'var(--color-surface)',
                              }}
                            >
                              {/* Nome + status geral */}
                              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                                    <p style={{ fontWeight: 700, fontSize: 'var(--text-base)', color: 'var(--color-text)' }}>{vacina.nome}</p>
                                    {todasAplicadas && (
                                      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-success)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 2 }}>
                                        <CheckCircle2 size={12} aria-hidden /> Completa
                                      </span>
                                    )}
                                  </div>
                                  <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginTop: 'var(--space-1)' }}>
                                    {vacina.descricao ?? (vacina.doses_total === 1 ? 'Dose única' : `${vacina.doses_total} doses`)}
                                  </p>
                                  {vacina.doencas_previstas.length > 0 && (
                                    <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-faint)', marginTop: 'var(--space-1)' }}>
                                      Protege contra: {vacina.doencas_previstas.join(', ')}
                                    </p>
                                  )}
                                </div>
                                <div style={{ display: 'flex', gap: 'var(--space-1)', flexShrink: 0 }}>
                                  {doses.map(d => (
                                    <VacinaStatusBadge key={d.numeroDose} status={isAtrasada(d, membroDefinido.data_nascimento, hoje) ? 'atrasada' : d.status} mostrarLabel={false} />
                                  ))}
                                </div>
                              </div>

                              {/* Doses individuais */}
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                                {doses.map(dose => {
                                  const atrasada = isAtrasada(dose, membroDefinido.data_nascimento, hoje)
                                  const statusEfetivo = atrasada ? 'atrasada' : dose.status
                                  const registro = registros.find(
                                    r => r.vacina_id === vacina.id &&
                                      (r.membro_id === membroSelecionadoId || r.membro_familiar_id === membroSelecionadoId) &&
                                      r.numero_dose === dose.numeroDose
                                  )
                                  const jaTemLembrete = temLembrete(vacina.id, dose.numeroDose)
                                  const ehFutura = dose.dataRecomendada && dose.dataRecomendada > hoje

                                  return (
                                    <div
                                      key={dose.numeroDose}
                                      style={{
                                        display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
                                        padding: 'var(--space-3) var(--space-4)',
                                        borderRadius: 'var(--radius-md)',
                                        background: 'var(--color-surface-offset)',
                                        border: '1px solid var(--color-divider)',
                                      }}
                                    >
                                      <VacinaStatusBadge status={statusEfetivo} mostrarLabel={false} />
                                      <div style={{ flex: 1, minWidth: 0 }}>
                                        <p style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--color-text)' }}>
                                          {vacina.doses_total === 1 ? 'Dose única' : `${dose.numeroDose}ª dose`}
                                          {atrasada && <span style={{ marginLeft: 'var(--space-2)', color: 'var(--color-error)' }}>ATRASADA</span>}
                                        </p>
                                        {dose.status === 'aplicada' && registro && (
                                          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                                            {formatarData(registro.data_aplicacao)}{registro.local_aplicacao ? ` · ${registro.local_aplicacao}` : ''}
                                          </p>
                                        )}
                                        {dose.status !== 'aplicada' && dose.dataRecomendada && (
                                          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                                            Prevista: {formatarData(dose.dataRecomendada)}
                                          </p>
                                        )}
                                      </div>
                                      <div style={{ display: 'flex', gap: 'var(--space-2)', flexShrink: 0 }}>
                                        {dose.status !== 'aplicada' && (
                                          <>
                                            <button
                                              onClick={() => setModal({ tipo: 'marcarTomada', dose, vacinaNome: vacina.nome })}
                                              style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)', fontSize: 'var(--text-xs)', color: 'var(--color-success)', fontWeight: 600, padding: 'var(--space-2)', minHeight: 36, border: '1px solid var(--color-success-highlight)', borderRadius: 'var(--radius-md)', background: 'var(--color-success-highlight)' }}
                                              aria-label={`Marcar ${dose.numeroDose}ª dose de ${vacina.nome} como tomada`}
                                            >
                                              <CheckCircle2 size={13} aria-hidden /> Tomada
                                            </button>
                                            {(ehFutura || dose.status === 'pendente') && (
                                              <button
                                                onClick={() => {
                                                  if (jaTemLembrete) return
                                                  setDataLembrete(dose.dataRecomendada ?? '')
                                                  setModal({ tipo: 'lembreteManual', dose, vacinaNome: vacina.nome })
                                                }}
                                                disabled={jaTemLembrete}
                                                title={jaTemLembrete ? 'Lembrete já criado para esta dose' : 'Criar lembrete para esta dose'}
                                                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--space-2)', minHeight: 36, minWidth: 36, border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', background: 'none', color: jaTemLembrete ? 'var(--color-text-faint)' : 'var(--color-text-muted)', cursor: jaTemLembrete ? 'default' : 'pointer' }}
                                                aria-label={jaTemLembrete ? 'Lembrete já criado' : `Criar lembrete para ${dose.numeroDose}ª dose de ${vacina.nome}`}
                                              >
                                                {jaTemLembrete ? <BellOff size={13} aria-hidden /> : <Bell size={13} aria-hidden />}
                                              </button>
                                            )}
                                          </>
                                        )}
                                        {dose.status === 'aplicada' && registro && (
                                          <button
                                            onClick={() => setModal({ tipo: 'apagarDose', dose, vacinaNome: vacina.nome, registroId: registro.id })}
                                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-error)', padding: 'var(--space-2)', minHeight: 36, minWidth: 36, border: 'none', background: 'none' }}
                                            aria-label={`Remover registro da ${dose.numeroDose}ª dose de ${vacina.nome}`}
                                          >
                                            <Trash2 size={14} aria-hidden />
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* ===================== ABA: VACINAS AVULSAS ===================== */}
      {abaAtiva === 'avulsas' && (
        <>
          {/* Filtros de status */}
          <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-5)', flexWrap: 'wrap' }}>
            <button onClick={() => setFiltroStatusAvulsa('todos')} style={styleBtnStatus('todos', filtroStatusAvulsa === 'todos')}>
              Todas
            </button>
            <button onClick={() => setFiltroStatusAvulsa('aplicada')} style={styleBtnStatus('aplicada', filtroStatusAvulsa === 'aplicada', 'var(--color-success)')}>
              Aplicadas
            </button>
            <button onClick={() => setFiltroStatusAvulsa('agendada')} style={styleBtnStatus('agendada', filtroStatusAvulsa === 'agendada', 'var(--color-primary)')}>
              Agendadas
            </button>
          </div>

          {avulsasFiltradas.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 'var(--space-12) var(--space-8)', color: 'var(--color-text-muted)' }}>
              <ClipboardList size={40} style={{ margin: '0 auto var(--space-3)', opacity: 0.3 }} aria-hidden />
              <p style={{ fontWeight: 600, marginBottom: 'var(--space-2)' }}>Nenhuma vacina avulsa registrada</p>
              <p style={{ fontSize: 'var(--text-xs)', marginBottom: 'var(--space-5)' }}>
                Vacinas fora do calendário oficial — viagens, indicação médica, etc.
              </p>
              <button
                onClick={() => setModal({ tipo: 'adicionarAvulsa' })}
                className="btn btn-primary"
                style={{ gap: 'var(--space-2)' }}
              >
                <Plus size={15} aria-hidden /> Registrar primeira avulsa
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {avulsasFiltradas.map(avulsa => (
                <div
                  key={avulsa.id}
                  className="card"
                  style={{
                    padding: 'var(--space-4) var(--space-5)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-4)',
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                      <p style={{ fontWeight: 700, fontSize: 'var(--text-sm)', color: 'var(--color-text)' }}>{avulsa.nome}</p>
                      <span
                        style={{
                          fontSize: 'var(--text-xs)',
                          fontWeight: 600,
                          padding: '2px var(--space-2)',
                          borderRadius: 'var(--radius-full)',
                          background: avulsa.tipo === 'aplicada' ? 'var(--color-success-highlight)' : 'var(--color-primary-highlight)',
                          color: avulsa.tipo === 'aplicada' ? 'var(--color-success)' : 'var(--color-primary)',
                        }}
                      >
                        {avulsa.tipo === 'aplicada' ? 'Aplicada' : 'Agendada'}
                      </span>
                    </div>
                    <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginTop: 'var(--space-1)' }}>
                      Dose {avulsa.dose} · {avulsa.data ? formatarData(avulsa.data) : '—'}{avulsa.local ? ` · ${avulsa.local}` : ''}
                    </p>
                  </div>
                  {avulsa.tipo === 'aplicada' && avulsa.registroId && (
                    <button
                      onClick={() => removerRegistro(avulsa.registroId)}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-error)', padding: 'var(--space-2)', minHeight: 36, minWidth: 36, border: 'none', background: 'none', flexShrink: 0 }}
                      aria-label={`Remover ${avulsa.nome}`}
                    >
                      <Trash2 size={14} aria-hidden />
                    </button>
                  )}
                  {avulsa.tipo === 'agendada' && (
                    <button
                      onClick={() => removerLembrete(avulsa.id)}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-error)', padding: 'var(--space-2)', minHeight: 36, minWidth: 36, border: 'none', background: 'none', flexShrink: 0 }}
                      aria-label={`Cancelar agendamento de ${avulsa.nome}`}
                    >
                      <X size={14} aria-hidden />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ===================== MODAIS ===================== */}

      {/* Modal: Marcar Tomada */}
      {modal.tipo === 'marcarTomada' && (
        <div role="dialog" aria-modal="true" aria-label={`Confirmar dose de ${modal.vacinaNome}`} style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', background: 'oklch(0 0 0 / 0.45)', padding: 'var(--space-4)' }}>
          <div style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-xl)', padding: 'var(--space-6)', width: '100%', maxWidth: 480, display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h2 style={{ fontSize: 'var(--text-base)', fontWeight: 700 }}>Confirmar dose tomada</h2>
              <button onClick={() => setModal({ tipo: 'nenhum' })} aria-label="Fechar" style={{ color: 'var(--color-text-muted)', padding: 'var(--space-1)' }}><X size={18} /></button>
            </div>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>
              {modal.vacinaNome} — {modal.dose.numeroDose}ª dose
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              <label style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--color-text-muted)' }}>Data de aplicação *</label>
              <input type="date" value={dataConfirm} onChange={e => setDataConfirm(e.target.value)} max={hoje} className="input-field" style={{ minHeight: 44 }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              <label style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--color-text-muted)' }}>Local de aplicação *</label>
              <input type="text" value={localConfirm} onChange={e => setLocalConfirm(e.target.value)} placeholder="UBS, clínica, hospital..." className="input-field" style={{ minHeight: 44 }} />
            </div>
            {erroConfirm && <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-error)' }}>{erroConfirm}</p>}
            <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end' }}>
              <button onClick={() => { setModal({ tipo: 'nenhum' }); setErroConfirm('') }} className="btn btn-ghost">Cancelar</button>
              <button onClick={handleMarcarTomada} className="btn btn-primary">Confirmar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Apagar Dose */}
      {modal.tipo === 'apagarDose' && (
        <div role="dialog" aria-modal="true" aria-label="Remover registro de dose" style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'oklch(0 0 0 / 0.45)', padding: 'var(--space-4)' }}>
          <div style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-xl)', padding: 'var(--space-6)', width: '100%', maxWidth: 400, display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <h2 style={{ fontSize: 'var(--text-base)', fontWeight: 700 }}>Remover registro</h2>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>
              Deseja remover o registro da {modal.dose.numeroDose}ª dose de <strong>{modal.vacinaNome}</strong>? Esta ação não pode ser desfeita.
            </p>
            <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end' }}>
              <button onClick={() => setModal({ tipo: 'nenhum' })} className="btn btn-ghost">Cancelar</button>
              <button onClick={handleApagarDose} style={{ background: 'var(--color-error)', color: '#fff', border: 'none', borderRadius: 'var(--radius-md)', padding: 'var(--space-2) var(--space-5)', fontWeight: 700, cursor: 'pointer', minHeight: 44 }}>Remover</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Confirmar Ciclo */}
      {modal.tipo === 'confirmarCiclo' && (
        <div role="dialog" aria-modal="true" aria-label={`Confirmar vacinas do ciclo ${modal.ciclo.label}`} style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', background: 'oklch(0 0 0 / 0.45)', padding: 'var(--space-4)' }}>
          <div style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-xl)', padding: 'var(--space-6)', width: '100%', maxWidth: 480, display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h2 style={{ fontSize: 'var(--text-base)', fontWeight: 700 }}>Confirmar ciclo: {modal.ciclo.label}</h2>
              <button onClick={() => setModal({ tipo: 'nenhum' })} aria-label="Fechar"><X size={18} /></button>
            </div>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>
              Isso irá marcar todas as {modal.vacinas.length} vacinas pendentes do ciclo como tomadas na data e local informados.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              <label style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--color-text-muted)' }}>Data de aplicação *</label>
              <input type="date" value={dataCiclo} onChange={e => setDataCiclo(e.target.value)} max={hoje} className="input-field" style={{ minHeight: 44 }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              <label style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--color-text-muted)' }}>Local de aplicação *</label>
              <input type="text" value={localCiclo} onChange={e => setLocalCiclo(e.target.value)} placeholder="UBS, clínica..." className="input-field" style={{ minHeight: 44 }} />
            </div>
            {erroCiclo && <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-error)' }}>{erroCiclo}</p>}
            <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end' }}>
              <button onClick={() => setModal({ tipo: 'nenhum' })} className="btn btn-ghost">Cancelar</button>
              <button onClick={handleConfirmarCiclo} disabled={confirmandoCiclo} className="btn btn-primary">
                {confirmandoCiclo ? 'Salvando...' : `Confirmar ${modal.vacinas.length} vacinas`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Adicionar Avulsa */}
      {modal.tipo === 'adicionarAvulsa' && (
        <div role="dialog" aria-modal="true" aria-label="Registrar vacina avulsa" style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', background: 'oklch(0 0 0 / 0.45)', padding: 'var(--space-4)' }}>
          <div style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-xl)', padding: 'var(--space-6)', width: '100%', maxWidth: 480, display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h2 style={{ fontSize: 'var(--text-base)', fontWeight: 700 }}>Registrar vacina avulsa</h2>
              <button onClick={() => setModal({ tipo: 'nenhum' })} aria-label="Fechar"><X size={18} /></button>
            </div>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
              Se a data for futura, um lembrete será criado. Se for passada ou hoje, a dose será registrada.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              <label style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--color-text-muted)' }}>Nome da vacina *</label>
              <input type="text" value={avulsaNome} onChange={e => setAvulsaNome(e.target.value)} placeholder="Ex: Febre Amarela" className="input-field" style={{ minHeight: 44 }} />
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                <label style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--color-text-muted)' }}>Data *</label>
                <input type="date" value={avulsaData} onChange={e => setAvulsaData(e.target.value)} className="input-field" style={{ minHeight: 44 }} />
              </div>
              <div style={{ width: 80, display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                <label style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--color-text-muted)' }}>Dose</label>
                <input type="number" min={1} max={10} value={avulsaDose} onChange={e => setAvulsaDose(e.target.value)} className="input-field" style={{ minHeight: 44 }} />
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              <label style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--color-text-muted)' }}>Local *</label>
              <input type="text" value={avulsaLocal} onChange={e => setAvulsaLocal(e.target.value)} placeholder="UBS, clínica, hospital..." className="input-field" style={{ minHeight: 44 }} />
            </div>
            {avulsaErro && <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-error)' }}>{avulsaErro}</p>}
            <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end' }}>
              <button onClick={() => { setModal({ tipo: 'nenhum' }); setAvulsaErro('') }} className="btn btn-ghost">Cancelar</button>
              <button onClick={handleAdicionarAvulsa} disabled={avulsaSalvando} className="btn btn-primary">
                {avulsaSalvando ? 'Salvando...' : avulsaData > hoje ? 'Criar lembrete' : 'Registrar dose'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Lembrete Manual */}
      {modal.tipo === 'lembreteManual' && (
        <div role="dialog" aria-modal="true" aria-label={`Criar lembrete para ${modal.vacinaNome}`} style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', background: 'oklch(0 0 0 / 0.45)', padding: 'var(--space-4)' }}>
          <div style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-xl)', padding: 'var(--space-6)', width: '100%', maxWidth: 480, display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h2 style={{ fontSize: 'var(--text-base)', fontWeight: 700 }}>Criar lembrete</h2>
              <button onClick={() => setModal({ tipo: 'nenhum' })} aria-label="Fechar"><X size={18} /></button>
            </div>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>
              {modal.vacinaNome} — {modal.dose.numeroDose}ª dose
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              <label style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--color-text-muted)' }}>Data do lembrete *</label>
              <input type="date" value={dataLembrete} onChange={e => setDataLembrete(e.target.value)} min={hoje} className="input-field" style={{ minHeight: 44 }} />
            </div>
            {erroLembrete && <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-error)' }}>{erroLembrete}</p>}
            <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end' }}>
              <button onClick={() => { setModal({ tipo: 'nenhum' }); setErroLembrete('') }} className="btn btn-ghost">Cancelar</button>
              <button onClick={handleGerarLembrete} className="btn btn-primary">Criar lembrete</button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
