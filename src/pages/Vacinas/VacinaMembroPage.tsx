import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import {
  ArrowLeft, CheckCircle2, Trash2, ChevronDown, ListChecks,
  Bell, BellOff, Plus, Search, Filter, X, Clock, ChevronRight,
  BookOpen, Syringe, CalendarCheck, Info,
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
  cor: string            // CSS color var ou hex
  corBg: string
  corBorda: string
  idadeMinAnos: number   // para decidir se o ciclo é "atual/futuro" do membro
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

function getCicloDeVacina(vacina: Vacina): Ciclo | undefined {
  for (const ciclo of CICLOS) {
    if (vacina.faixa_etaria.some(f => ciclo.faixas.includes(f))) return ciclo
  }
  return undefined
}

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
        <div style={{ display: 'flex', gap: 'var(--space-1)' }}>
          <div className="skeleton" style={{ width: 16, height: 16, borderRadius: 'var(--radius-full)' }} />
          <div className="skeleton" style={{ width: 16, height: 16, borderRadius: 'var(--radius-full)' }} />
        </div>
        <div className="skeleton" style={{ width: 16, height: 16, borderRadius: 'var(--radius-sm)' }} />
      </div>
    </li>
  )
}

// ---------------------------------------------------------------------------
// Abas principais
// ---------------------------------------------------------------------------
type Aba = 'caderneta' | 'historico'

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

  // --- state geral ---
  const [membroSelecionadoId, setMembroSelecionadoId] = useState(id ?? '')
  const [seletorAberto, setSeletorAberto] = useState(false)
  const [abaAtiva, setAbaAtiva] = useState<Aba>('caderneta')
  const [bannerInfantis, setBannerInfantis] = useState('')

  // --- filtros caderneta ---
  const [filtroCiclo, setFiltroCiclo] = useState<CicloId | 'todos'>('todos')
  const [filtroStatus, setFiltroStatus] = useState<'todos' | 'pendente' | 'aplicada' | 'atrasada'>('todos')
  const [busca, setBusca] = useState('')
  const [ciclosExpandidos, setCiclosExpandidos] = useState<Set<CicloId>>(new Set(CICLOS.map(c => c.id)))

  // --- filtros histórico ---
  const [filtroCicloHistorico, setFiltroCicloHistorico] = useState<CicloId | 'todos' | 'avulsa'>('todos')
  const [buscaHistorico, setBuscaHistorico] = useState('')

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
  // Agrupamento por ciclo (caderneta de pendentes/todas)
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

  // Filtrado para exibição caderneta
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
  // Histórico (vacinas aplicadas + avulsas)
  // ---------------------------------------------------------------------------
  const registrosHistorico = useMemo(() => {
    return registrosMembro.filter(r => r.data_aplicacao <= hoje)
  }, [registrosMembro, hoje])

  // Histórico agrupado por ciclo
  const historicoPorCiclo = useMemo(() => {
    const grupos: { ciclo: Ciclo | null; label: string; registros: (RegistroVacinal & { vacina?: Vacina })[] }[] = []
    const cicloMap = new Map<string, (RegistroVacinal & { vacina?: Vacina })[]>()

    registrosHistorico.forEach(reg => {
      const vacina = vacinas.find(v => v.id === reg.vacina_id)
      const ciclo = vacina ? getCicloDeVacina(vacina) : undefined
      const key = ciclo?.id ?? 'avulsa'
      if (!cicloMap.has(key)) cicloMap.set(key, [])
      cicloMap.get(key)!.push({ ...reg, vacina })
    })

    CICLOS.forEach(ciclo => {
      const regs = cicloMap.get(ciclo.id)
      if (regs && regs.length > 0) grupos.push({ ciclo, label: ciclo.label, registros: regs })
    })

    const avulsas = cicloMap.get('avulsa')
    if (avulsas && avulsas.length > 0) {
      grupos.push({ ciclo: null, label: 'Vacinas Avulsas', registros: avulsas })
    }
    return grupos
  }, [registrosHistorico, vacinas])

  // Filtro histórico
  const historicoFiltrado = useMemo(() => {
    return historicoPorCiclo.map(grupo => ({
      ...grupo,
      registros: grupo.registros.filter(reg => {
        const chave = grupo.ciclo?.id ?? 'avulsa'
        if (filtroCicloHistorico !== 'todos' && chave !== filtroCicloHistorico) return false
        if (buscaHistorico) {
          const nome = reg.vacina?.nome ?? ''
          const nomeCompleto = reg.vacina?.nome_completo ?? ''
          const nomeBusca = buscaHistorico.toLowerCase()
          if (!nome.toLowerCase().includes(nomeBusca) &&
            !nomeCompleto.toLowerCase().includes(nomeBusca) &&
            !(reg.local_aplicacao ?? '').toLowerCase().includes(nomeBusca)) return false
        }
        return true
      }),
    })).filter(g => g.registros.length > 0)
  }, [historicoPorCiclo, filtroCicloHistorico, buscaHistorico])

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
      // Cria lembrete manual para data futura
      adicionarLembrete({
        membro_familiar_id: membroSelecionadoId,
        tipo: 'manual',
        titulo: `${avulsaNome.trim()} — dose ${avulsaDose}`,
        descricao: `Local previsto: ${avulsaLocal.trim()}`,
        data_prevista: avulsaData,
        automatico: false,
      })
    } else {
      // Registra direto no histórico
      // Como é avulsa (sem ID de vacina padrão), criamos um registro avulso
      // usando um ID genérico de "vacina avulsa" — o backend aceita observacoes
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
          onClick={() => setModal({ tipo: 'adicionarAvulsa' })}
          className="btn btn-ghost"
          style={{ gap: 'var(--space-2)', fontSize: 'var(--text-sm)' }}
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
      <div style={{ display: 'flex', borderBottom: '2px solid var(--color-divider)', marginBottom: 'var(--space-5)', gap: 'var(--space-1)' }} role="tablist">
        {([
          { id: 'caderneta', label: 'Caderneta de Vacinas', icon: <Syringe size={15} aria-hidden /> },
          { id: 'historico', label: 'Histórico', icon: <BookOpen size={15} aria-hidden /> },
        ] as { id: Aba; label: string; icon: React.ReactNode }[]).map(aba => (
          <button
            key={aba.id}
            role="tab"
            aria-selected={abaAtiva === aba.id}
            onClick={() => setAbaAtiva(aba.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
              padding: 'var(--space-3) var(--space-4)',
              fontSize: 'var(--text-sm)', fontWeight: abaAtiva === aba.id ? 700 : 500,
              color: abaAtiva === aba.id ? 'var(--color-primary)' : 'var(--color-text-muted)',
              borderBottom: abaAtiva === aba.id ? '2px solid var(--color-primary)' : '2px solid transparent',
              marginBottom: -2, background: 'none', cursor: 'pointer',
              transition: 'color var(--transition-interactive)',
            }}
          >
            {aba.icon} {aba.label}
          </button>
        ))}
      </div>

      {/* ================================================================= */}
      {/* ABA: CADERNETA */}
      {/* ================================================================= */}
      {abaAtiva === 'caderneta' && (
        <div>
          {/* Filtros caderneta */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', marginBottom: 'var(--space-5)' }}>
            {/* Busca */}
            <div style={{ position: 'relative' }}>
              <Search size={15} style={{ position: 'absolute', left: 'var(--space-3)', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-faint)', pointerEvents: 'none' }} aria-hidden />
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
            {/* Filtros rápidos */}
            <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap', alignItems: 'center' }}>
              <Filter size={13} style={{ color: 'var(--color-text-faint)' }} aria-hidden />
              {/* Filtro status */}
              {(['todos', 'pendente', 'atrasada', 'aplicada'] as const).map(s => (
                <button key={s} onClick={() => setFiltroStatus(s)} style={{ padding: 'var(--space-1) var(--space-3)', borderRadius: 'var(--radius-full)', fontSize: 'var(--text-xs)', fontWeight: 600, border: '1px solid', cursor: 'pointer', transition: 'all var(--transition-interactive)', background: filtroStatus === s ? 'var(--color-primary)' : 'transparent', color: filtroStatus === s ? '#fff' : 'var(--color-text-muted)', borderColor: filtroStatus === s ? 'var(--color-primary)' : 'var(--color-border)' }}>
                  {s === 'todos' ? 'Todos' : s === 'pendente' ? 'Pendentes' : s === 'atrasada' ? 'Atrasadas' : 'Aplicadas'}
                </button>
              ))}
            </div>
            {/* Filtro ciclo */}
            <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
              <button onClick={() => setFiltroCiclo('todos')} style={{ padding: 'var(--space-1) var(--space-3)', borderRadius: 'var(--radius-full)', fontSize: 'var(--text-xs)', fontWeight: 600, border: '1px solid', cursor: 'pointer', background: filtroCiclo === 'todos' ? 'var(--color-text)' : 'transparent', color: filtroCiclo === 'todos' ? 'var(--color-bg)' : 'var(--color-text-muted)', borderColor: filtroCiclo === 'todos' ? 'var(--color-text)' : 'var(--color-border)' }}>Todos os ciclos</button>
              {CICLOS.map(ciclo => (
                <button key={ciclo.id} onClick={() => setFiltroCiclo(ciclo.id)} style={{ padding: 'var(--space-1) var(--space-3)', borderRadius: 'var(--radius-full)', fontSize: 'var(--text-xs)', fontWeight: 600, border: '1px solid', cursor: 'pointer', background: filtroCiclo === ciclo.id ? ciclo.cor : 'transparent', color: filtroCiclo === ciclo.id ? '#fff' : 'var(--color-text-muted)', borderColor: filtroCiclo === ciclo.id ? ciclo.cor : 'var(--color-border)' }}>
                  {ciclo.label}
                </button>
              ))}
            </div>
          </div>

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
                      <ul style={{ listStyle: 'none', padding: 'var(--space-2) 0', background: 'var(--color-surface)' }} role="list">
                        {vacinasCiclo.map(({ vacina, doses }) => {
                          const todasAplicadas = doses.every(d => d.status === 'aplicada')
                          return (
                            <li key={vacina.id} style={{ padding: 'var(--space-4) var(--space-5)', borderBottom: '1px solid var(--color-divider)' }}>
                              {/* Nome + doses resumo */}
                              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-3)', marginBottom: doses.length > 1 ? 'var(--space-3)' : 0 }}>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                                    <p style={{ fontWeight: 600, fontSize: 'var(--text-sm)', color: 'var(--color-text)' }}>{vacina.nome}</p>
                                    {todasAplicadas && (
                                      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-success)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 2 }}>
                                        <CheckCircle2 size={12} aria-hidden /> Completa
                                      </span>
                                    )}
                                  </div>
                                  <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginTop: 2 }}>
                                    {vacina.descricao ?? (vacina.doses_total === 1 ? 'Dose única' : `${vacina.doses_total} doses`)}
                                  </p>
                                  {vacina.doencas_previstas.length > 0 && (
                                    <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-faint)', marginTop: 2 }}>
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

                              {/* Detalhes de cada dose */}
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
                                  <div key={dose.numeroDose} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', padding: 'var(--space-2) 0', borderTop: '1px dashed var(--color-divider)' }}>
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
                            </li>
                          )
                        })}
                      </ul>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ================================================================= */}
      {/* ABA: HISTÓRICO */}
      {/* ================================================================= */}
      {abaAtiva === 'historico' && (
        <div>
          {/* Filtros histórico */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', marginBottom: 'var(--space-5)' }}>
            <div style={{ position: 'relative' }}>
              <Search size={15} style={{ position: 'absolute', left: 'var(--space-3)', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-faint)', pointerEvents: 'none' }} aria-hidden />
              <input
                type="search"
                placeholder="Buscar por vacina ou local..."
                value={buscaHistorico}
                onChange={e => setBuscaHistorico(e.target.value)}
                className="input-field"
                style={{ paddingLeft: 'var(--space-8)', minHeight: 40, fontSize: 'var(--text-sm)' }}
                aria-label="Buscar no histórico"
              />
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
              <button onClick={() => setFiltroCicloHistorico('todos')} style={{ padding: 'var(--space-1) var(--space-3)', borderRadius: 'var(--radius-full)', fontSize: 'var(--text-xs)', fontWeight: 600, border: '1px solid', cursor: 'pointer', background: filtroCicloHistorico === 'todos' ? 'var(--color-text)' : 'transparent', color: filtroCicloHistorico === 'todos' ? 'var(--color-bg)' : 'var(--color-text-muted)', borderColor: filtroCicloHistorico === 'todos' ? 'var(--color-text)' : 'var(--color-border)' }}>Todos</button>
              {CICLOS.map(ciclo => (
                <button key={ciclo.id} onClick={() => setFiltroCicloHistorico(ciclo.id)} style={{ padding: 'var(--space-1) var(--space-3)', borderRadius: 'var(--radius-full)', fontSize: 'var(--text-xs)', fontWeight: 600, border: '1px solid', cursor: 'pointer', background: filtroCicloHistorico === ciclo.id ? ciclo.cor : 'transparent', color: filtroCicloHistorico === ciclo.id ? '#fff' : 'var(--color-text-muted)', borderColor: filtroCicloHistorico === ciclo.id ? ciclo.cor : 'var(--color-border)' }}>
                  {ciclo.label}
                </button>
              ))}
              <button onClick={() => setFiltroCicloHistorico('avulsa')} style={{ padding: 'var(--space-1) var(--space-3)', borderRadius: 'var(--radius-full)', fontSize: 'var(--text-xs)', fontWeight: 600, border: '1px solid', cursor: 'pointer', background: filtroCicloHistorico === 'avulsa' ? 'var(--color-text-muted)' : 'transparent', color: filtroCicloHistorico === 'avulsa' ? '#fff' : 'var(--color-text-muted)', borderColor: filtroCicloHistorico === 'avulsa' ? 'var(--color-text-muted)' : 'var(--color-border)' }}>Avulsas</button>
            </div>
          </div>

          {/* Mensagem explicativa */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-2)', padding: 'var(--space-3)', background: 'var(--color-surface-offset)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-4)' }}>
            <Info size={14} style={{ color: 'var(--color-text-faint)', flexShrink: 0, marginTop: 2 }} aria-hidden />
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
              O histórico exibe todas as doses aplicadas até hoje, organizadas por ciclo vacinal. Vacinas avulsas são entradas manuais não vinculadas ao calendário padrão.
            </p>
          </div>

          {aguardandoAPI ? (
            <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }} role="list" aria-busy="true">
              {Array.from({ length: 4 }).map((_, i) => <VacinaSkeletonRow key={i} />)}
            </ul>
          ) : historicoFiltrado.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 'var(--space-12) var(--space-8)', color: 'var(--color-text-muted)' }}>
              <Clock size={40} style={{ margin: '0 auto var(--space-3)', opacity: 0.3 }} aria-hidden />
              <p style={{ fontWeight: 600, marginBottom: 'var(--space-2)' }}>Nenhum registro encontrado</p>
              <p style={{ fontSize: 'var(--text-xs)' }}>As doses aplicadas aparecerão aqui. Use os filtros para navegar.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
              {historicoFiltrado.map(({ ciclo, label, registros: regs }) => {
                const cor = ciclo?.cor ?? 'var(--color-text-muted)'
                const corBg = ciclo?.corBg ?? 'var(--color-surface-offset)'
                const corBorda = ciclo?.corBorda ?? 'var(--color-border)'

                return (
                  <div key={ciclo?.id ?? 'avulsa'} style={{ borderRadius: 'var(--radius-lg)', border: `1.5px solid ${corBorda}`, overflow: 'hidden' }}>
                    <div style={{ background: corBg, padding: 'var(--space-3) var(--space-5)', borderBottom: `1px solid ${corBorda}`, display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                      <div style={{ width: 10, height: 10, borderRadius: '50%', background: cor, flexShrink: 0 }} aria-hidden />
                      <p style={{ fontWeight: 700, fontSize: 'var(--text-sm)', color: cor }}>{label}</p>
                      <span style={{ marginLeft: 'auto', fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>{regs.length} {regs.length === 1 ? 'registro' : 'registros'}</span>
                    </div>
                    <ul style={{ listStyle: 'none', padding: 'var(--space-2) 0', background: 'var(--color-surface)' }} role="list">
                      {regs
                        .slice()
                        .sort((a, b) => b.data_aplicacao.localeCompare(a.data_aplicacao))
                        .map(reg => (
                          <li key={reg.id} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', padding: 'var(--space-3) var(--space-5)', borderBottom: '1px solid var(--color-divider)' }}>
                            <CheckCircle2 size={16} style={{ color: 'var(--color-success)', flexShrink: 0 }} aria-hidden />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <p style={{ fontWeight: 600, fontSize: 'var(--text-sm)', color: 'var(--color-text)' }}>
                                {reg.vacina?.nome ?? reg.observacoes ?? 'Vacina avulsa'}
                              </p>
                              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                                {reg.numero_dose}ª dose · {formatarData(reg.data_aplicacao)}
                                {reg.local_aplicacao ? ` · ${reg.local_aplicacao}` : ''}
                              </p>
                            </div>
                          </li>
                        ))}
                    </ul>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ================================================================= */}
      {/* MODAIS */}
      {/* ================================================================= */}

      {/* Modal: Marcar como tomada */}
      {modal.tipo === 'marcarTomada' && (
        <div role="dialog" aria-modal="true" aria-labelledby="modal-title" style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', background: 'oklch(0 0 0 / 0.5)', padding: 'var(--space-4)' }} onClick={e => { if (e.target === e.currentTarget) setModal({ tipo: 'nenhum' }) }}>
          <div className="card" style={{ width: '100%', maxWidth: 480, display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
              <CheckCircle2 size={20} style={{ color: 'var(--color-success)', flexShrink: 0 }} aria-hidden />
              <h3 id="modal-title" style={{ fontWeight: 700, color: 'var(--color-text)', fontSize: 'var(--text-base)' }}>Marcar {modal.dose.numeroDose}ª dose como tomada</h3>
            </div>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>Vacina: <strong>{modal.vacinaNome}</strong> · Membro: <strong>{membroDefinido.nome}</strong></p>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', lineHeight: 1.5 }}>Informe a data e o local em que a dose foi aplicada. Se a data for hoje, você pode deixar o campo como está.</p>
            <div>
              <label htmlFor="data-confirm" style={{ display: 'block', fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-2)', fontWeight: 500 }}>Data de aplicação *</label>
              <input id="data-confirm" type="date" value={dataConfirm} max={hoje} onChange={e => { setDataConfirm(e.target.value); setErroConfirm('') }} className="input-field" style={{ minHeight: 48 }} />
            </div>
            <div>
              <label htmlFor="local-confirm" style={{ display: 'block', fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-2)', fontWeight: 500 }}>Local de aplicação *</label>
              <input id="local-confirm" type="text" value={localConfirm} onChange={e => { setLocalConfirm(e.target.value); setErroConfirm('') }} placeholder="Ex: UBS Centro" className="input-field" style={{ minHeight: 48 }} />
            </div>
            {erroConfirm && <p role="alert" style={{ fontSize: 'var(--text-xs)', color: 'var(--color-error)', background: 'var(--color-error-highlight)', borderRadius: 'var(--radius-md)', padding: 'var(--space-3)' }}>⚠️ {erroConfirm}</p>}
            <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
              <button onClick={() => { setModal({ tipo: 'nenhum' }); setErroConfirm('') }} className="btn btn-ghost" style={{ flex: 1 }}>Cancelar</button>
              <button onClick={handleMarcarTomada} className="btn btn-primary" style={{ flex: 1, gap: 'var(--space-2)' }}><CheckCircle2 size={15} aria-hidden /> Confirmar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Apagar dose */}
      {modal.tipo === 'apagarDose' && (
        <div role="dialog" aria-modal="true" aria-labelledby="modal-apagar-title" style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', background: 'oklch(0 0 0 / 0.5)', padding: 'var(--space-4)' }} onClick={e => { if (e.target === e.currentTarget) setModal({ tipo: 'nenhum' }) }}>
          <div className="card" style={{ width: '100%', maxWidth: 480, display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
              <Trash2 size={20} style={{ color: 'var(--color-error)', flexShrink: 0 }} aria-hidden />
              <h3 id="modal-apagar-title" style={{ fontWeight: 700, color: 'var(--color-text)', fontSize: 'var(--text-base)' }}>Remover este registro?</h3>
            </div>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>
              Você está removendo o registro da <strong>{modal.dose.numeroDose}ª dose</strong> de <strong>{modal.vacinaNome}</strong> para <strong>{membroDefinido.nome}</strong>. Esta ação não pode ser desfeita.
            </p>
            <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
              <button onClick={() => setModal({ tipo: 'nenhum' })} className="btn btn-ghost" style={{ flex: 1 }}>Cancelar</button>
              <button onClick={handleApagarDose} className="btn" style={{ flex: 1, background: 'var(--color-error)', color: '#fff', gap: 'var(--space-2)' }}><Trash2 size={15} aria-hidden /> Remover</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Confirmar todas as vacinas de um ciclo */}
      {modal.tipo === 'confirmarCiclo' && (
        <div role="dialog" aria-modal="true" aria-labelledby="modal-ciclo-title" style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', background: 'oklch(0 0 0 / 0.5)', padding: 'var(--space-4)' }} onClick={e => { if (e.target === e.currentTarget) setModal({ tipo: 'nenhum' }) }}>
          <div className="card" style={{ width: '100%', maxWidth: 480, display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
              <div style={{ width: 20, height: 20, borderRadius: '50%', background: modal.ciclo.cor, flexShrink: 0 }} aria-hidden />
              <h3 id="modal-ciclo-title" style={{ fontWeight: 700, color: 'var(--color-text)', fontSize: 'var(--text-base)' }}>
                Confirmar vacinas de {modal.ciclo.label}
              </h3>
            </div>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
              Esta ação marcará todas as <strong>{modal.vacinas.length} vacinas pendentes</strong> do ciclo <strong>{modal.ciclo.label}</strong> como tomadas com a mesma data e local.
              Ideal quando você tem o cartão de vacinação em mãos. Cada dose poderá ser editada individualmente depois.
            </p>
            <div>
              <label htmlFor="data-ciclo" style={{ display: 'block', fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-2)', fontWeight: 500 }}>Data de aplicação *</label>
              <input id="data-ciclo" type="date" value={dataCiclo} max={hoje} onChange={e => { setDataCiclo(e.target.value); setErroCiclo('') }} className="input-field" style={{ minHeight: 48 }} />
            </div>
            <div>
              <label htmlFor="local-ciclo" style={{ display: 'block', fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-2)', fontWeight: 500 }}>Local de aplicação *</label>
              <input id="local-ciclo" type="text" value={localCiclo} onChange={e => { setLocalCiclo(e.target.value); setErroCiclo('') }} placeholder="Ex: UBS Centro" className="input-field" style={{ minHeight: 48 }} />
            </div>
            {erroCiclo && <p role="alert" style={{ fontSize: 'var(--text-xs)', color: 'var(--color-error)', background: 'var(--color-error-highlight)', borderRadius: 'var(--radius-md)', padding: 'var(--space-3)' }}>⚠️ {erroCiclo}</p>}
            <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
              <button onClick={() => { setModal({ tipo: 'nenhum' }); setErroCiclo('') }} className="btn btn-ghost" style={{ flex: 1 }} disabled={confirmandoCiclo}>Cancelar</button>
              <button onClick={handleConfirmarCiclo} className="btn btn-primary" style={{ flex: 1, gap: 'var(--space-2)' }} disabled={confirmandoCiclo}>
                <ListChecks size={15} aria-hidden />
                {confirmandoCiclo ? 'Confirmando…' : 'Confirmar todas'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Vacina avulsa */}
      {modal.tipo === 'adicionarAvulsa' && (
        <div role="dialog" aria-modal="true" aria-labelledby="modal-avulsa-title" style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', background: 'oklch(0 0 0 / 0.5)', padding: 'var(--space-4)' }} onClick={e => { if (e.target === e.currentTarget) setModal({ tipo: 'nenhum' }) }}>
          <div className="card" style={{ width: '100%', maxWidth: 480, display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', maxHeight: '85dvh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
              <Plus size={20} style={{ color: 'var(--color-primary)', flexShrink: 0 }} aria-hidden />
              <h3 id="modal-avulsa-title" style={{ fontWeight: 700, color: 'var(--color-text)', fontSize: 'var(--text-base)' }}>Registrar Vacina Avulsa</h3>
              <button onClick={() => setModal({ tipo: 'nenhum' })} style={{ marginLeft: 'auto', color: 'var(--color-text-muted)', background: 'none', border: 'none', cursor: 'pointer' }} aria-label="Fechar"><X size={18} aria-hidden /></button>
            </div>
            <div style={{ background: 'var(--color-surface-offset)', borderRadius: 'var(--radius-md)', padding: 'var(--space-3)' }}>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
                <strong>📅 Data passada ou hoje:</strong> o registro vai direto para o histórico.<br />
                <strong>📆 Data futura:</strong> será criado um lembrete na seção Agenda.
              </p>
            </div>
            <div>
              <label htmlFor="avulsa-nome" style={{ display: 'block', fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-2)', fontWeight: 500 }}>Nome da vacina *</label>
              <input id="avulsa-nome" type="text" value={avulsaNome} onChange={e => { setAvulsaNome(e.target.value); setAvulsaErro('') }} placeholder="Ex: Febre Tifóide, Raiva, Dengue…" className="input-field" style={{ minHeight: 48 }} />
            </div>
            <div>
              <label htmlFor="avulsa-dose" style={{ display: 'block', fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-2)', fontWeight: 500 }}>Número da dose</label>
              <input id="avulsa-dose" type="number" min={1} max={10} value={avulsaDose} onChange={e => setAvulsaDose(e.target.value)} className="input-field" style={{ minHeight: 48 }} />
            </div>
            <div>
              <label htmlFor="avulsa-data" style={{ display: 'block', fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-2)', fontWeight: 500 }}>Data *</label>
              <input id="avulsa-data" type="date" value={avulsaData} onChange={e => { setAvulsaData(e.target.value); setAvulsaErro('') }} className="input-field" style={{ minHeight: 48 }} />
              {avulsaData > hoje && (
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-warning)', marginTop: 'var(--space-1)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Bell size={11} aria-hidden /> Data futura — será criado um lembrete na Agenda.
                </p>
              )}
            </div>
            <div>
              <label htmlFor="avulsa-local" style={{ display: 'block', fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-2)', fontWeight: 500 }}>Local *</label>
              <input id="avulsa-local" type="text" value={avulsaLocal} onChange={e => { setAvulsaLocal(e.target.value); setAvulsaErro('') }} placeholder="Ex: Clínica Particular" className="input-field" style={{ minHeight: 48 }} />
            </div>
            {avulsaErro && <p role="alert" style={{ fontSize: 'var(--text-xs)', color: 'var(--color-error)', background: 'var(--color-error-highlight)', borderRadius: 'var(--radius-md)', padding: 'var(--space-3)' }}>⚠️ {avulsaErro}</p>}
            <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
              <button onClick={() => { setModal({ tipo: 'nenhum' }); setAvulsaErro('') }} className="btn btn-ghost" style={{ flex: 1 }} disabled={avulsaSalvando}>Cancelar</button>
              <button onClick={handleAdicionarAvulsa} className="btn btn-primary" style={{ flex: 1, gap: 'var(--space-2)' }} disabled={avulsaSalvando}>
                {avulsaData > hoje ? <><Bell size={14} aria-hidden /> Criar lembrete</> : <><CheckCircle2 size={14} aria-hidden /> Registrar</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Lembrete manual de dose */}
      {modal.tipo === 'lembreteManual' && (
        <div role="dialog" aria-modal="true" aria-labelledby="modal-lembrete-title" style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', background: 'oklch(0 0 0 / 0.5)', padding: 'var(--space-4)' }} onClick={e => { if (e.target === e.currentTarget) setModal({ tipo: 'nenhum' }) }}>
          <div className="card" style={{ width: '100%', maxWidth: 480, display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
              <Bell size={20} style={{ color: 'var(--color-warning)', flexShrink: 0 }} aria-hidden />
              <h3 id="modal-lembrete-title" style={{ fontWeight: 700, color: 'var(--color-text)', fontSize: 'var(--text-base)' }}>Criar lembrete</h3>
            </div>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
              Crie um lembrete para a <strong>{modal.dose.numeroDose}ª dose</strong> de <strong>{modal.vacinaNome}</strong>.
              O lembrete aparecerá na seção Agenda e você será notificado na data escolhida.
            </p>
            <div>
              <label htmlFor="data-lembrete" style={{ display: 'block', fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-2)', fontWeight: 500 }}>Data do lembrete * (deve ser futura)</label>
              <input id="data-lembrete" type="date" value={dataLembrete} min={hoje} onChange={e => { setDataLembrete(e.target.value); setErroLembrete('') }} className="input-field" style={{ minHeight: 48 }} />
            </div>
            {erroLembrete && <p role="alert" style={{ fontSize: 'var(--text-xs)', color: 'var(--color-error)', background: 'var(--color-error-highlight)', borderRadius: 'var(--radius-md)', padding: 'var(--space-3)' }}>⚠️ {erroLembrete}</p>}
            <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
              <button onClick={() => { setModal({ tipo: 'nenhum' }); setErroLembrete('') }} className="btn btn-ghost" style={{ flex: 1 }}>Cancelar</button>
              <button onClick={handleGerarLembrete} className="btn btn-primary" style={{ flex: 1, gap: 'var(--space-2)' }}><Bell size={14} aria-hidden /> Criar lembrete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
