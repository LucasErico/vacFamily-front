import { useMemo, useState, useRef, useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import {
  ClipboardList, Plus, CheckCircle2, Clock, AlertCircle,
  Search, ChevronDown, Syringe, X, CalendarCheck,
} from 'lucide-react'
import { useMembros } from '@/contexts/MembrosContext'
import { useVacinas } from '@/contexts/VacinasContext'
import { useLembretes } from '@/contexts/LembretesContext'
import { Avatar } from '@/components/ui/Avatar'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function formatarData(iso: string) {
  const [ano, mes, dia] = iso.split('-')
  return `${dia}/${mes}/${ano}`
}

// ---------------------------------------------------------------------------
// Ciclos
// ---------------------------------------------------------------------------
type CicloId = 'pre_natal' | 'recem_nascido' | 'crianca' | 'adolescente' | 'adulto' | 'idoso'

interface CicloInfo {
  id: CicloId
  label: string
  cor: string
  corBg: string
  corBorda: string
  faixas: string[]
}

const CICLOS_HISTORICO: CicloInfo[] = [
  { id: 'pre_natal',     label: 'Pré-Natal',    cor: '#a12c7b', corBg: 'oklch(from #a12c7b l c h / 0.08)', corBorda: 'oklch(from #a12c7b l c h / 0.25)', faixas: ['gestante'] },
  { id: 'recem_nascido', label: 'Recém-Nascido', cor: '#01696f', corBg: 'oklch(from #01696f l c h / 0.07)', corBorda: 'oklch(from #01696f l c h / 0.22)', faixas: ['recem_nascido'] },
  { id: 'crianca',       label: 'Infância',      cor: '#006494', corBg: 'oklch(from #006494 l c h / 0.08)', corBorda: 'oklch(from #006494 l c h / 0.22)', faixas: ['crianca'] },
  { id: 'adolescente',   label: 'Adolescência',  cor: '#da7101', corBg: 'oklch(from #da7101 l c h / 0.08)', corBorda: 'oklch(from #da7101 l c h / 0.22)', faixas: ['adolescente'] },
  { id: 'adulto',        label: 'Adulto',        cor: '#437a22', corBg: 'oklch(from #437a22 l c h / 0.08)', corBorda: 'oklch(from #437a22 l c h / 0.22)', faixas: ['adulto'] },
  { id: 'idoso',         label: 'Idoso',         cor: '#7a39bb', corBg: 'oklch(from #7a39bb l c h / 0.08)', corBorda: 'oklch(from #7a39bb l c h / 0.22)', faixas: ['idoso'] },
]

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------
type Aba = 'ciclo' | 'avulsas'
type StatusFiltro = 'todos' | 'aplicada' | 'pendente' | 'atrasada'

type EntradaTimeline =
  | { tipo: 'aplicada'; data: string; vacinaNome: string; numeroDose: number; local?: string; faixas: string[]; avulsa?: boolean }
  | { tipo: 'pendente'; data: string; vacinaNome: string; numeroDose: number; faixas: string[]; avulsa?: boolean }
  | { tipo: 'atrasada'; data: string; vacinaNome: string; numeroDose: number; faixas: string[]; avulsa?: boolean }

function getCicloDeEntrada(entrada: EntradaTimeline): CicloId | null {
  if (!entrada.faixas || entrada.faixas.length === 0) return null
  for (const ciclo of CICLOS_HISTORICO) {
    if (ciclo.faixas.some(f => entrada.faixas.includes(f))) return ciclo.id
  }
  return null
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

  const cicloAtual = value === 'todos' ? null : CICLOS_HISTORICO.find(c => c.id === value)
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
          {CICLOS_HISTORICO.map(c => (
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
// Helper de estilo dos botões de status
// ---------------------------------------------------------------------------
function styleBtnStatus(_s: string, ativo: boolean, cor?: string): React.CSSProperties {
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
  }
}

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------
export function HistoricoPage() {
  const [searchParams] = useSearchParams()
  const membroIdParam = searchParams.get('membro') ?? ''

  const { membros } = useMembros()
  const { vacinas, registros, buscarRegistrosMembro } = useVacinas()
  const { lembretes } = useLembretes()

  const hoje = new Date().toISOString().slice(0, 10)

  const [membroId, setMembroId] = useState(
    membroIdParam && membros.find(m => m.id === membroIdParam) ? membroIdParam : (membros[0]?.id ?? '')
  )

  // --- abas e filtros ---
  const [abaAtiva, setAbaAtiva]         = useState<Aba>('ciclo')
  const [filtroStatus, setFiltroStatus] = useState<StatusFiltro>('todos')
  const [filtroCiclo, setFiltroCiclo]   = useState<CicloId | 'todos'>('todos')
  const [busca, setBusca]               = useState('')

  const membro = membros.find(m => m.id === membroId)

  // ---------------------------------------------------------------------------
  // Timeline completa (vacinas de catálogo + avulsas)
  // ---------------------------------------------------------------------------
  const timeline = useMemo((): EntradaTimeline[] => {
    if (!membro) return []

    const registrosMembro = buscarRegistrosMembro(membroId)
    const lembretesMembro = lembretes.filter(l => l.membro_id === membroId || l.membro_familiar_id === membroId)
    const entradas: EntradaTimeline[] = []

    // Registros aplicados
    for (const reg of registrosMembro) {
      const vacina = vacinas.find(v => v.id === reg.vacina_id)
      const isAvulsa = !vacina || reg.vacina_id === 'avulsa'
      entradas.push({
        tipo: 'aplicada',
        data: reg.data_aplicacao,
        vacinaNome: vacina?.nome ?? reg.vacina_nome ?? 'Vacina avulsa',
        numeroDose: reg.numero_dose,
        local: reg.local_aplicacao,
        faixas: vacina ? (vacina.faixa_etaria as string[]) : [],
        avulsa: isAvulsa,
      })
    }

    // Lembretes de reforço pendentes (apenas catálogo)
    for (const lem of lembretesMembro) {
      if (lem.status !== 'pendente') continue
      if (lem.tipo !== 'reforco' && lem.tipo !== 'campanha') continue

      const vacina = vacinas.find(v => v.id === lem.vacina_id)
      if (!vacina) continue
      const dataLem = lem.data_lembrete ?? lem.data_prevista
      const numeroDose = lem.numero_dose
      if (!dataLem || numeroDose === undefined) continue

      const jaAplicada = registros.some(
        r => r.vacina_id === lem.vacina_id &&
          (r.membro_id === membroId || r.membro_familiar_id === membroId) &&
          r.numero_dose === numeroDose
      )
      if (jaAplicada) continue

      const atrasada = dataLem < hoje
      entradas.push({
        tipo: atrasada ? 'atrasada' : 'pendente',
        data: dataLem,
        vacinaNome: vacina.nome,
        numeroDose,
        faixas: vacina.faixa_etaria as string[],
        avulsa: false,
      })
    }

    return entradas.sort((a, b) => b.data.localeCompare(a.data))
  }, [membroId, membro, registros, lembretes, vacinas, buscarRegistrosMembro, hoje])

  // ---------------------------------------------------------------------------
  // Separar entradas por aba e aplicar filtros
  // ---------------------------------------------------------------------------
  const timelineCiclo = useMemo(
    () => timeline.filter(e => !e.avulsa),
    [timeline]
  )
  const timelineAvulsas = useMemo(
    () => timeline.filter(e => e.avulsa),
    [timeline]
  )

  function aplicarFiltros(entradas: EntradaTimeline[]) {
    return entradas.filter(e => {
      if (filtroStatus !== 'todos' && e.tipo !== filtroStatus) return false
      if (filtroCiclo !== 'todos' && abaAtiva === 'ciclo') {
        const cicloEntrada = getCicloDeEntrada(e)
        if (cicloEntrada !== filtroCiclo) return false
      }
      if (busca) {
        const termo = busca.toLowerCase()
        const nomeMatch = e.vacinaNome.toLowerCase().includes(termo)
        const localMatch = e.tipo === 'aplicada' && ((e as { local?: string }).local ?? '').toLowerCase().includes(termo)
        if (!nomeMatch && !localMatch) return false
      }
      return true
    })
  }

  const cicloFiltrado   = useMemo(() => aplicarFiltros(timelineCiclo),   [timelineCiclo, filtroStatus, filtroCiclo, busca])
  const avulsasFiltradas = useMemo(() => aplicarFiltros(timelineAvulsas), [timelineAvulsas, filtroStatus, busca])

  const entradaAtivaFiltrada = abaAtiva === 'ciclo' ? cicloFiltrado : avulsasFiltradas

  const aplicadas = entradaAtivaFiltrada.filter(e => e.tipo === 'aplicada')
  const agendadas = entradaAtivaFiltrada.filter(e => e.tipo === 'pendente')
  const atrasadas = entradaAtivaFiltrada.filter(e => e.tipo === 'atrasada')

  // Agrupar aplicadas de ciclo por ciclo
  const aplicadasPorCiclo = useMemo(() => {
    if (abaAtiva !== 'ciclo') return []
    const mapa = new Map<string, typeof aplicadas>()
    for (const e of aplicadas) {
      const key = getCicloDeEntrada(e) ?? 'outros'
      if (!mapa.has(key)) mapa.set(key, [])
      mapa.get(key)!.push(e)
    }

    const grupos: {
      id: string
      ciclo: CicloInfo | null
      label: string
      cor: string
      corBg: string
      corBorda: string
      entradas: typeof aplicadas
    }[] = []

    for (const ciclo of CICLOS_HISTORICO) {
      const regs = mapa.get(ciclo.id)
      if (regs && regs.length > 0) {
        grupos.push({
          id: ciclo.id, ciclo,
          label: ciclo.label,
          cor: ciclo.cor, corBg: ciclo.corBg, corBorda: ciclo.corBorda,
          entradas: regs,
        })
      }
    }
    const outros = mapa.get('outros')
    if (outros && outros.length > 0) {
      grupos.push({
        id: 'outros', ciclo: null,
        label: 'Outros',
        cor: 'var(--color-text-muted)', corBg: 'var(--color-surface-offset)', corBorda: 'var(--color-border)',
        entradas: outros,
      })
    }
    return grupos
  }, [aplicadas, abaAtiva])

  // ---------------------------------------------------------------------------
  // Guard: sem membros
  // ---------------------------------------------------------------------------
  if (membros.length === 0) {
    return (
      <div style={{ maxWidth: 640, margin: '0 auto', paddingBottom: 'var(--space-8)', textAlign: 'center', paddingTop: 'var(--space-16)' }}>
        <ClipboardList size={48} style={{ margin: '0 auto var(--space-4)', color: 'var(--color-text-faint)' }} aria-hidden />
        <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, marginBottom: 'var(--space-2)', color: 'var(--color-text)' }}>Nenhum membro ainda</h3>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', maxWidth: 280, margin: '0 auto var(--space-6)' }}>
          Adicione membros da família para ver o histórico vacinal.
        </p>
        <Link to="/membros/novo" className="btn btn-primary"><Plus size={18} aria-hidden /> Adicionar membro</Link>
      </div>
    )
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div style={{ maxWidth: 640, margin: '0 auto', paddingBottom: 'var(--space-8)' }}>

      {/* Header */}
      <div style={{ marginBottom: 'var(--space-5)' }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--color-text)' }}>
          Histórico Vacinal
        </h2>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', marginTop: 'var(--space-1)' }}>
          {timelineCiclo.filter(e => e.tipo === 'aplicada').length} dose{timelineCiclo.filter(e => e.tipo === 'aplicada').length !== 1 ? 's' : ''} registrada{timelineCiclo.filter(e => e.tipo === 'aplicada').length !== 1 ? 's' : ''} no calendário
          {timelineAvulsas.filter(e => e.tipo === 'aplicada').length > 0 && (
            <> · {timelineAvulsas.filter(e => e.tipo === 'aplicada').length} avulsa{timelineAvulsas.filter(e => e.tipo === 'aplicada').length !== 1 ? 's' : ''}</>
          )}
        </p>
      </div>

      {/* Seletor de membros (chips) */}
      <div
        style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-5)', overflowX: 'auto', paddingBottom: 4 }}
        role="group"
        aria-label="Selecionar membro"
      >
        {membros.map(m => (
          <button
            key={m.id}
            onClick={() => setMembroId(m.id)}
            aria-pressed={m.id === membroId}
            style={{
              display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
              padding: 'var(--space-2) var(--space-3)',
              borderRadius: 'var(--radius-full)',
              border: `1.5px solid ${m.id === membroId ? 'var(--color-primary)' : 'var(--color-border)'}`,
              background: m.id === membroId ? 'var(--color-primary-highlight)' : 'var(--color-surface)',
              color: m.id === membroId ? 'var(--color-primary)' : 'var(--color-text-muted)',
              fontWeight: m.id === membroId ? 700 : 400,
              fontSize: 'var(--text-xs)', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
              minHeight: 36, transition: 'all 150ms',
            }}
          >
            <Avatar nome={m.nome} tamanho={20} />
            {m.nome.split(' ')[0]}
          </button>
        ))}
      </div>

      {/* Abas */}
      <div
        role="tablist"
        aria-label="Tipo de vacina"
        style={{
          display: 'flex',
          gap: 0,
          marginBottom: 'var(--space-5)',
          borderBottom: '2px solid var(--color-divider)',
        }}
      >
        {([
          { id: 'ciclo' as Aba,    label: 'Vacinas de Ciclo',  icon: <CalendarCheck size={15} aria-hidden /> },
          { id: 'avulsas' as Aba,  label: 'Vacinas Avulsas',   icon: <ClipboardList  size={15} aria-hidden /> },
        ]).map(aba => (
          <button
            key={aba.id}
            role="tab"
            aria-selected={abaAtiva === aba.id}
            onClick={() => { setAbaAtiva(aba.id); setFiltroStatus('todos'); setFiltroCiclo('todos'); setBusca('') }}
            style={{
              padding: 'var(--space-3) var(--space-5)',
              fontSize: 'var(--text-sm)',
              fontWeight: abaAtiva === aba.id ? 700 : 400,
              color: abaAtiva === aba.id ? 'var(--color-primary)' : 'var(--color-text-muted)',
              background: 'none',
              border: 'none',
              borderBottom: abaAtiva === aba.id ? '2px solid var(--color-primary)' : '2px solid transparent',
              marginBottom: -2,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-2)',
              transition: 'all 150ms',
            }}
          >
            {aba.icon}
            {aba.label}
            {/* badge de contagem */}
            {(() => {
              const total = (aba.id === 'ciclo' ? timelineCiclo : timelineAvulsas).length
              if (total === 0) return null
              return (
                <span style={{
                  fontSize: 'var(--text-xs)', fontWeight: 700,
                  minWidth: 18, height: 18, borderRadius: 'var(--radius-full)',
                  background: abaAtiva === aba.id ? 'var(--color-primary-highlight)' : 'var(--color-surface-offset)',
                  color: abaAtiva === aba.id ? 'var(--color-primary)' : 'var(--color-text-muted)',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  paddingInline: 'var(--space-1)',
                }}>
                  {total}
                </span>
              )
            })()}
          </button>
        ))}
      </div>

      {/* Filtros inline */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)', marginBottom: 'var(--space-5)', alignItems: 'center' }}>
        {/* Busca */}
        <div style={{ flex: '1 1 180px', position: 'relative', minWidth: 160 }}>
          <Search size={14} style={{ position: 'absolute', left: 'var(--space-3)', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-faint)', pointerEvents: 'none' }} aria-hidden />
          <input
            type="search"
            placeholder="Buscar vacina ou local..."
            value={busca}
            onChange={e => setBusca(e.target.value)}
            className="input-field"
            style={{ paddingLeft: 'var(--space-8)', minHeight: 40, fontSize: 'var(--text-sm)' }}
            aria-label="Buscar vacina no histórico"
          />
        </div>

        {/* Botões de status */}
        <button onClick={() => setFiltroStatus('todos')} style={styleBtnStatus('todos', filtroStatus === 'todos')}>
          Todos
        </button>
        <button onClick={() => setFiltroStatus('aplicada')} style={styleBtnStatus('aplicada', filtroStatus === 'aplicada', 'var(--color-success)')}>
          Aplicadas
        </button>
        <button onClick={() => setFiltroStatus('pendente')} style={styleBtnStatus('pendente', filtroStatus === 'pendente', 'var(--color-primary)')}>
          Agendadas
        </button>
        <button onClick={() => setFiltroStatus('atrasada')} style={styleBtnStatus('atrasada', filtroStatus === 'atrasada', 'var(--color-error)')}>
          Atrasadas
        </button>

        {/* Dropdown de ciclo — só visível na aba de ciclo */}
        {abaAtiva === 'ciclo' && (
          <CicloDropdown value={filtroCiclo} onChange={v => setFiltroCiclo(v)} />
        )}

        {/* Limpar filtros */}
        {(filtroStatus !== 'todos' || filtroCiclo !== 'todos' || busca) && (
          <button
            onClick={() => { setFiltroStatus('todos'); setFiltroCiclo('todos'); setBusca('') }}
            style={{ ...styleBtnStatus('limpar', false), color: 'var(--color-error)', borderColor: 'var(--color-error-highlight)', display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}
            aria-label="Limpar todos os filtros"
          >
            <X size={12} aria-hidden /> Limpar
          </button>
        )}
      </div>

      {/* Conteúdo */}
      {entradaAtivaFiltrada.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 'var(--space-12) var(--space-8)', color: 'var(--color-text-muted)' }}>
          <Syringe size={40} style={{ margin: '0 auto var(--space-3)', opacity: 0.3 }} aria-hidden />
          <p style={{ fontWeight: 600, marginBottom: 'var(--space-2)', color: 'var(--color-text)' }}>
            {(abaAtiva === 'ciclo' ? timelineCiclo : timelineAvulsas).length === 0
              ? (abaAtiva === 'ciclo' ? 'Nenhuma vacina de ciclo registrada' : 'Nenhuma vacina avulsa registrada')
              : 'Nenhum resultado para os filtros'}
          </p>
          <p style={{ fontSize: 'var(--text-xs)', maxWidth: 280, margin: '0 auto' }}>
            {(abaAtiva === 'ciclo' ? timelineCiclo : timelineAvulsas).length === 0
              ? `Registre vacinas para ${membro?.nome?.split(' ')[0]} na página de Vacinas.`
              : 'Tente ajustar os filtros ou a busca.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>

          {/* ── ABA: VACINAS AVULSAS ── lista simples */}
          {abaAtiva === 'avulsas' && (
            <>
              {atrasadas.length > 0 && (
                <section aria-label="Avulsas atrasadas">
                  <SectionDivider label="Atrasadas" cor="var(--color-error)" />
                  <ListaEntradas entradas={atrasadas} />
                </section>
              )}
              {agendadas.length > 0 && (
                <section aria-label="Avulsas agendadas">
                  <SectionDivider label="Agendadas" cor="var(--color-primary)" />
                  <ListaEntradas entradas={agendadas} />
                </section>
              )}
              {aplicadas.length > 0 && (
                <section aria-label="Avulsas aplicadas">
                  <SectionDivider label="Aplicadas" cor="var(--color-success)" />
                  <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }} role="list">
                    {aplicadas.map((e, i) => (
                      <li key={i} style={{ display: 'flex', gap: 'var(--space-4)', alignItems: 'flex-start' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 4 }}>
                          <CheckCircle2 size={18} style={{ color: 'var(--color-success)', flexShrink: 0 }} aria-hidden />
                          {i < aplicadas.length - 1 && <div style={{ flex: 1, width: 2, background: 'var(--color-divider)', marginTop: 4, minHeight: 20 }} aria-hidden />}
                        </div>
                        <div className="card" style={{ flex: 1, padding: 'var(--space-4) var(--space-5)', border: '1px solid var(--color-success-highlight)' }}>
                          <p style={{ fontWeight: 600, fontSize: 'var(--text-sm)', color: 'var(--color-text)' }}>{e.vacinaNome} — {e.numeroDose}ª dose</p>
                          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginTop: 'var(--space-1)' }}>
                            {formatarData(e.data)}
                            {e.tipo === 'aplicada' && (e as { local?: string }).local ? ` · ${(e as { local?: string }).local}` : ''}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </>
          )}

          {/* ── ABA: VACINAS DE CICLO ── */}
          {abaAtiva === 'ciclo' && (
            <>
              {/* Atrasadas */}
              {atrasadas.length > 0 && (
                <section aria-label="Doses atrasadas">
                  <SectionDivider label="Atrasadas" cor="var(--color-error)" />
                  <ListaEntradas entradas={atrasadas} />
                </section>
              )}

              {/* Agendadas */}
              {agendadas.length > 0 && (
                <section aria-label="Doses agendadas">
                  <SectionDivider label="Agendadas" cor="var(--color-primary)" />
                  <ListaEntradas entradas={agendadas} />
                </section>
              )}

              {/* Histórico aplicado por ciclo */}
              {aplicadasPorCiclo.length > 0 && (
                <section aria-label="Histórico de doses aplicadas por ciclo">
                  <SectionDivider label="Histórico Aplicado" cor="var(--color-success)" />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                    {aplicadasPorCiclo.map(grupo => (
                      <div
                        key={grupo.id}
                        style={{ borderRadius: 'var(--radius-lg)', border: `1.5px solid ${grupo.corBorda}`, overflow: 'hidden' }}
                      >
                        {/* Cabeçalho do ciclo */}
                        <div style={{ background: grupo.corBg, padding: 'var(--space-3) var(--space-5)', borderBottom: `1px solid ${grupo.corBorda}`, display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                          <span style={{ width: 10, height: 10, borderRadius: '50%', background: grupo.cor, flexShrink: 0 }} aria-hidden />
                          <p style={{ fontWeight: 700, fontSize: 'var(--text-sm)', color: grupo.cor, flex: 1 }}>{grupo.label}</p>
                          <span style={{ fontSize: 'var(--text-xs)', color: grupo.cor, opacity: 0.8 }}>
                            {grupo.entradas.length} dose{grupo.entradas.length !== 1 ? 's' : ''}
                          </span>
                        </div>

                        {/* Lista de doses */}
                        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }} role="list">
                          {grupo.entradas.map((e, i) => (
                            <li
                              key={i}
                              style={{
                                display: 'flex', gap: 'var(--space-4)', alignItems: 'center',
                                padding: 'var(--space-4) var(--space-5)',
                                borderBottom: i < grupo.entradas.length - 1 ? '1px solid var(--color-divider)' : 'none',
                                background: 'var(--color-surface)',
                              }}
                            >
                              <CheckCircle2 size={16} style={{ color: 'var(--color-success)', flexShrink: 0 }} aria-hidden />
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <p style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-text)' }}>
                                  {e.vacinaNome} — {e.numeroDose}ª dose
                                </p>
                                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginTop: 'var(--space-1)' }}>
                                  {formatarData(e.data)}
                                  {e.tipo === 'aplicada' && (e as { local?: string }).local ? ` · ${(e as { local?: string }).local}` : ''}
                                </p>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sub-componentes auxiliares
// ---------------------------------------------------------------------------
function SectionDivider({ label, cor }: { label: string; cor: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
      <div style={{ flex: 1, height: 1, background: cor }} aria-hidden />
      <span style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: cor, textTransform: 'uppercase', letterSpacing: '0.08em', whiteSpace: 'nowrap' }}>{label}</span>
      <div style={{ flex: 1, height: 1, background: cor }} aria-hidden />
    </div>
  )
}

type EntradaBasica =
  | { tipo: 'aplicada'; data: string; vacinaNome: string; numeroDose: number; local?: string; faixas: string[]; avulsa?: boolean }
  | { tipo: 'pendente'; data: string; vacinaNome: string; numeroDose: number; faixas: string[]; avulsa?: boolean }
  | { tipo: 'atrasada'; data: string; vacinaNome: string; numeroDose: number; faixas: string[]; avulsa?: boolean }

function ListaEntradas({ entradas }: { entradas: EntradaBasica[] }) {
  return (
    <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }} role="list">
      {entradas.map((e, i) => {
        const isAtrasada = e.tipo === 'atrasada'
        const isPendente = e.tipo === 'pendente'
        const icon = isAtrasada
          ? <AlertCircle size={18} style={{ color: 'var(--color-error)', flexShrink: 0 }} aria-hidden />
          : isPendente
            ? <Clock size={18} style={{ color: 'var(--color-primary)', flexShrink: 0 }} aria-hidden />
            : <CheckCircle2 size={18} style={{ color: 'var(--color-success)', flexShrink: 0 }} aria-hidden />
        const borderColor = isAtrasada ? 'var(--color-error-highlight)' : isPendente ? 'var(--color-border)' : 'var(--color-success-highlight)'
        const labelCor = isAtrasada ? 'var(--color-error)' : 'var(--color-text)'
        const dataLabel = isAtrasada
          ? `Prevista para ${formatarData(e.data)} · Não realizada`
          : isPendente
            ? `Prevista para ${formatarData(e.data)}`
            : formatarData(e.data) + (e.tipo === 'aplicada' && (e as { local?: string }).local ? ` · ${(e as { local?: string }).local}` : '')

        return (
          <li key={i} style={{ display: 'flex', gap: 'var(--space-4)', alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 4 }}>
              {icon}
              {i < entradas.length - 1 && <div style={{ flex: 1, width: 2, background: 'var(--color-divider)', marginTop: 4, minHeight: 20 }} aria-hidden />}
            </div>
            <div className="card" style={{ flex: 1, padding: 'var(--space-4) var(--space-5)', border: `1px solid ${borderColor}` }}>
              <p style={{ fontWeight: 600, fontSize: 'var(--text-sm)', color: labelCor }}>{e.vacinaNome} — {e.numeroDose}ª dose</p>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginTop: 'var(--space-1)' }}>{dataLabel}</p>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
