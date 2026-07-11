import { useMemo, useState, useRef, useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { ClipboardList, Plus, CheckCircle2, Clock, AlertCircle, Filter, Search, X } from 'lucide-react'
import { useMembros } from '@/contexts/MembrosContext'
import { useVacinas } from '@/contexts/VacinasContext'
import { useLembretes } from '@/contexts/LembretesContext'
import { Avatar } from '@/components/ui/Avatar'

function formatarData(iso: string) {
  const [ano, mes, dia] = iso.split('-')
  return `${dia}/${mes}/${ano}`
}

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
  { id: 'recem_nascido', label: 'Recém-Nasc.',  cor: '#01696f', corBg: 'oklch(from #01696f l c h / 0.07)', corBorda: 'oklch(from #01696f l c h / 0.22)', faixas: ['recem_nascido'] },
  { id: 'crianca',       label: 'Infância',     cor: '#006494', corBg: 'oklch(from #006494 l c h / 0.08)', corBorda: 'oklch(from #006494 l c h / 0.22)', faixas: ['crianca'] },
  { id: 'adolescente',   label: 'Adolescência', cor: '#da7101', corBg: 'oklch(from #da7101 l c h / 0.08)', corBorda: 'oklch(from #da7101 l c h / 0.22)', faixas: ['adolescente'] },
  { id: 'adulto',        label: 'Adulto',       cor: '#437a22', corBg: 'oklch(from #437a22 l c h / 0.08)', corBorda: 'oklch(from #437a22 l c h / 0.22)', faixas: ['adulto'] },
  { id: 'idoso',         label: 'Idoso',        cor: '#7a39bb', corBg: 'oklch(from #7a39bb l c h / 0.08)', corBorda: 'oklch(from #7a39bb l c h / 0.22)', faixas: ['idoso'] },
]

type StatusFiltro = 'todos' | 'aplicada' | 'pendente' | 'atrasada'

type EntradaTimeline =
  | { tipo: 'aplicada'; data: string; vacinaNome: string; numeroDose: number; local?: string; faixas?: string[] }
  | { tipo: 'pendente'; data: string; vacinaNome: string; numeroDose: number; faixas?: string[] }
  | { tipo: 'atrasada'; data: string; vacinaNome: string; numeroDose: number; faixas?: string[] }

function getCicloDeEntrada(entrada: EntradaTimeline): CicloId | 'avulsa' {
  if (!entrada.faixas || entrada.faixas.length === 0) return 'avulsa'
  for (const ciclo of CICLOS_HISTORICO) {
    if (ciclo.faixas.some(f => entrada.faixas!.includes(f))) return ciclo.id
  }
  return 'avulsa'
}

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

  // Filtros
  const [filtroStatus, setFiltroStatus] = useState<StatusFiltro>('todos')
  const [filtroCiclo, setFiltroCiclo] = useState<CicloId | 'todos' | 'avulsa'>('todos')
  const [busca, setBusca] = useState('')
  const [filtrosAbertos, setFiltrosAbertos] = useState(false)

  // Fechar modal de filtros com Escape
  useEffect(() => {
    if (!filtrosAbertos) return
    function handler(e: KeyboardEvent) {
      if (e.key === 'Escape') setFiltrosAbertos(false)
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [filtrosAbertos])

  const membro = membros.find(m => m.id === membroId)

  const timeline = useMemo((): EntradaTimeline[] => {
    if (!membro) return []

    const registrosMembro = buscarRegistrosMembro(membroId)
    const lembretesMembro = lembretes.filter(l => l.membro_id === membroId)
    const entradas: EntradaTimeline[] = []

    for (const reg of registrosMembro) {
      const vacina = vacinas.find(v => v.id === reg.vacina_id)
      if (!vacina) continue
      entradas.push({
        tipo: 'aplicada',
        data: reg.data_aplicacao,
        vacinaNome: vacina.nome,
        numeroDose: reg.numero_dose,
        local: reg.local_aplicacao,
        faixas: vacina.faixa_etaria as string[],
      })
    }

    for (const lem of lembretesMembro) {
      if (lem.status !== 'pendente') continue
      const vacina = vacinas.find(v => v.id === lem.vacina_id)
      if (!vacina) continue

      const dataLembrete = lem.data_lembrete ?? lem.data_prevista
      const numeroDose = lem.numero_dose

      if (!dataLembrete || numeroDose === undefined) continue

      const dataStr: string = dataLembrete
      const doseNum: number = numeroDose

      const jaAplicada = registrosMembro.some(
        r => r.vacina_id === lem.vacina_id && r.numero_dose === doseNum
      )
      if (jaAplicada) continue

      const atrasada = dataStr < hoje
      entradas.push({
        tipo: atrasada ? 'atrasada' : 'pendente',
        data: dataStr,
        vacinaNome: vacina.nome,
        numeroDose: doseNum,
        faixas: vacina.faixa_etaria as string[],
      })
    }

    return entradas.sort((a, b) => a.data.localeCompare(b.data))
  }, [membroId, membro, registros, lembretes, vacinas, buscarRegistrosMembro, hoje])

  // Filtrar timeline
  const timelineFiltrada = useMemo(() => {
    return timeline.filter(e => {
      if (filtroStatus !== 'todos' && e.tipo !== filtroStatus) return false
      const cicloEntrada = getCicloDeEntrada(e)
      if (filtroCiclo !== 'todos' && cicloEntrada !== filtroCiclo) return false
      if (busca) {
        const termo = busca.toLowerCase()
        const nomeMatch = e.vacinaNome.toLowerCase().includes(termo)
        const localMatch = e.tipo === 'aplicada' && (e.local ?? '').toLowerCase().includes(termo)
        if (!nomeMatch && !localMatch) return false
      }
      return true
    })
  }, [timeline, filtroStatus, filtroCiclo, busca])

  // Separar por tipo
  const aplicadas = timelineFiltrada.filter(e => e.tipo === 'aplicada')
  const futuras   = timelineFiltrada.filter(e => e.tipo === 'pendente')
  const atrasadas = timelineFiltrada.filter(e => e.tipo === 'atrasada')

  // Agrupar aplicadas por ciclo
  const aplicadasPorCiclo = useMemo(() => {
    const mapa = new Map<string, typeof aplicadas>()
    for (const e of aplicadas) {
      const key = getCicloDeEntrada(e)
      if (!mapa.has(key)) mapa.set(key, [])
      mapa.get(key)!.push(e)
    }

    const grupos: { id: string; ciclo: CicloInfo | null; label: string; cor: string; corBg: string; corBorda: string; entradas: typeof aplicadas }[] = []

    for (const ciclo of CICLOS_HISTORICO) {
      const regs = mapa.get(ciclo.id)
      if (regs && regs.length > 0) {
        grupos.push({ id: ciclo.id, ciclo, label: ciclo.label, cor: ciclo.cor, corBg: ciclo.corBg, corBorda: ciclo.corBorda, entradas: regs.sort((a, b) => b.data.localeCompare(a.data)) })
      }
    }

    const avulsas = mapa.get('avulsa')
    if (avulsas && avulsas.length > 0) {
      grupos.push({ id: 'avulsa', ciclo: null, label: 'Vacinas Avulsas', cor: 'var(--color-text-muted)', corBg: 'var(--color-surface-offset)', corBorda: 'var(--color-border)', entradas: avulsas.sort((a, b) => b.data.localeCompare(a.data)) })
    }

    return grupos
  }, [aplicadas])

  // Contagem de filtros ativos
  const filtrosAtivos = (filtroStatus !== 'todos' ? 1 : 0) + (filtroCiclo !== 'todos' ? 1 : 0)

  function limparFiltros() {
    setFiltroStatus('todos')
    setFiltroCiclo('todos')
  }

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

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', paddingBottom: 'var(--space-8)' }}>

      {/* Header */}
      <div style={{ marginBottom: 'var(--space-5)' }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--color-text)' }}>
          Histórico Vacinal
        </h2>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', marginTop: 'var(--space-1)' }}>
          {aplicadas.length} dose{aplicadas.length !== 1 ? 's' : ''} registrada{aplicadas.length !== 1 ? 's' : ''}
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

      {/* Barra de busca + botão Filtros */}
      <div style={{ display: 'flex', gap: 'var(--space-3)', marginBottom: 'var(--space-5)', alignItems: 'center' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: 'var(--space-3)', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-faint)', pointerEvents: 'none' }} aria-hidden />
          <input
            type="search"
            placeholder="Buscar por vacina ou local…"
            value={busca}
            onChange={e => setBusca(e.target.value)}
            className="input-field"
            style={{ paddingLeft: 'var(--space-8)', minHeight: 44, fontSize: 'var(--text-sm)' }}
            aria-label="Buscar vacina ou local no histórico"
          />
        </div>
        <button
          onClick={() => setFiltrosAbertos(true)}
          className="btn btn-ghost"
          style={{
            minHeight: 44,
            gap: 'var(--space-2)',
            fontSize: 'var(--text-sm)',
            flexShrink: 0,
            position: 'relative',
            border: filtrosAtivos > 0 ? '1.5px solid var(--color-primary)' : undefined,
            color: filtrosAtivos > 0 ? 'var(--color-primary)' : undefined,
          }}
          aria-label={`Filtros${filtrosAtivos > 0 ? ` (${filtrosAtivos} ativo${filtrosAtivos > 1 ? 's' : ''})` : ''}`}
        >
          <Filter size={15} aria-hidden />
          Filtros
          {filtrosAtivos > 0 && (
            <span style={{
              position: 'absolute', top: -6, right: -6,
              minWidth: 18, height: 18, borderRadius: 'var(--radius-full)',
              background: 'var(--color-primary)', color: '#fff',
              fontSize: 10, fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              paddingInline: 4,
            }}>
              {filtrosAtivos}
            </span>
          )}
        </button>
      </div>

      {/* Modal de filtros */}
      {filtrosAbertos && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Filtros do histórico"
          style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', background: 'oklch(0 0 0 / 0.5)', padding: 'var(--space-4)' }}
          onClick={e => { if (e.target === e.currentTarget) setFiltrosAbertos(false) }}
        >
          <div className="card" style={{ width: '100%', maxWidth: 480, display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            {/* Cabeçalho do modal */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
              <Filter size={18} style={{ color: 'var(--color-primary)', flexShrink: 0 }} aria-hidden />
              <h3 style={{ fontWeight: 700, color: 'var(--color-text)', fontSize: 'var(--text-base)', flex: 1 }}>Filtros</h3>
              <button
                onClick={() => setFiltrosAbertos(false)}
                style={{ color: 'var(--color-text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 'var(--space-1)' }}
                aria-label="Fechar filtros"
              >
                <X size={18} aria-hidden />
              </button>
            </div>

            {/* Filtro: Status */}
            <div>
              <label style={{ display: 'block', fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-2)', fontWeight: 600 }}>Status</label>
              <select
                value={filtroStatus}
                onChange={e => setFiltroStatus(e.target.value as StatusFiltro)}
                className="input-field"
                style={{ minHeight: 48, fontSize: 'var(--text-sm)' }}
              >
                <option value="todos">Todos</option>
                <option value="aplicada">Aplicadas</option>
                <option value="pendente">Agendadas</option>
                <option value="atrasada">Atrasadas</option>
              </select>
            </div>

            {/* Filtro: Ciclo */}
            <div>
              <label style={{ display: 'block', fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-2)', fontWeight: 600 }}>Ciclo</label>
              <select
                value={filtroCiclo}
                onChange={e => setFiltroCiclo(e.target.value as CicloId | 'todos' | 'avulsa')}
                className="input-field"
                style={{ minHeight: 48, fontSize: 'var(--text-sm)' }}
              >
                <option value="todos">Todos os ciclos</option>
                {CICLOS_HISTORICO.map(c => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
                <option value="avulsa">Vacinas Avulsas</option>
              </select>
            </div>

            {/* Rodapé do modal */}
            <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
              <button
                onClick={() => { limparFiltros(); setFiltrosAbertos(false) }}
                className="btn btn-ghost"
                style={{ flex: 1 }}
              >
                Limpar filtros
              </button>
              <button
                onClick={() => setFiltrosAbertos(false)}
                className="btn btn-primary"
                style={{ flex: 1 }}
              >
                Aplicar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Conteúdo */}
      {timelineFiltrada.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 'var(--space-12) var(--space-8)', color: 'var(--color-text-muted)' }}>
          <ClipboardList size={40} style={{ margin: '0 auto var(--space-4)', color: 'var(--color-text-faint)' }} aria-hidden />
          <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, marginBottom: 'var(--space-2)', color: 'var(--color-text)', fontSize: 'var(--text-base)' }}>
            {timeline.length === 0 ? 'Nenhum registro ainda' : 'Nenhum resultado para os filtros'}
          </h3>
          <p style={{ fontSize: 'var(--text-sm)', maxWidth: 280, margin: '0 auto' }}>
            {timeline.length === 0
              ? `Registre vacinas para ${membro?.nome?.split(' ')[0]} na página de Vacinas.`
              : 'Tente ajustar os filtros ou a busca.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>

          {/* Seção: Atrasadas */}
          {atrasadas.length > 0 && (
            <section aria-label="Doses atrasadas">
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
                <div style={{ flex: 1, height: 1, background: 'var(--color-error)' }} aria-hidden />
                <span style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--color-error)', textTransform: 'uppercase', letterSpacing: '0.08em', whiteSpace: 'nowrap' }}>Atrasadas</span>
                <div style={{ flex: 1, height: 1, background: 'var(--color-error)' }} aria-hidden />
              </div>
              <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }} role="list">
                {atrasadas.map((e, i) => (
                  <li key={i} style={{ display: 'flex', gap: 'var(--space-4)', alignItems: 'flex-start' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 4 }}>
                      <AlertCircle size={18} style={{ color: 'var(--color-error)', flexShrink: 0 }} aria-hidden />
                      {i < atrasadas.length - 1 && <div style={{ flex: 1, width: 2, background: 'var(--color-divider)', marginTop: 4, minHeight: 20 }} aria-hidden />}
                    </div>
                    <div className="card" style={{ flex: 1, padding: 'var(--space-4) var(--space-5)', border: '1px solid var(--color-error-highlight)' }}>
                      <p style={{ fontWeight: 600, fontSize: 'var(--text-sm)', color: 'var(--color-error)' }}>{e.vacinaNome} — {e.numeroDose}ª dose</p>
                      <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginTop: 'var(--space-1)' }}>Prevista para {formatarData(e.data)} · Não realizada</p>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Seção: Agendadas/Pendentes */}
          {futuras.length > 0 && (
            <section aria-label="Doses agendadas">
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
                <div style={{ flex: 1, height: 1, background: 'var(--color-primary)' }} aria-hidden />
                <span style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '0.08em', whiteSpace: 'nowrap' }}>Agendadas</span>
                <div style={{ flex: 1, height: 1, background: 'var(--color-primary)' }} aria-hidden />
              </div>
              <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }} role="list">
                {futuras.map((e, i) => (
                  <li key={i} style={{ display: 'flex', gap: 'var(--space-4)', alignItems: 'flex-start' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 4 }}>
                      <Clock size={18} style={{ color: 'var(--color-primary)', flexShrink: 0 }} aria-hidden />
                      {i < futuras.length - 1 && <div style={{ flex: 1, width: 2, background: 'var(--color-divider)', marginTop: 4, minHeight: 20 }} aria-hidden />}
                    </div>
                    <div className="card" style={{ flex: 1, padding: 'var(--space-4) var(--space-5)' }}>
                      <p style={{ fontWeight: 600, fontSize: 'var(--text-sm)', color: 'var(--color-text)' }}>{e.vacinaNome} — {e.numeroDose}ª dose</p>
                      <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginTop: 'var(--space-1)' }}>Prevista para {formatarData(e.data)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Seção: Histórico aplicado por ciclo */}
          {aplicadasPorCiclo.length > 0 && (
            <section aria-label="Histórico de doses aplicadas">
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
                <div style={{ flex: 1, height: 1, background: 'var(--color-success)' }} aria-hidden />
                <span style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--color-success)', textTransform: 'uppercase', letterSpacing: '0.08em', whiteSpace: 'nowrap' }}>Histórico Aplicado</span>
                <div style={{ flex: 1, height: 1, background: 'var(--color-success)' }} aria-hidden />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                {aplicadasPorCiclo.map(grupo => (
                  <div
                    key={grupo.id}
                    style={{
                      borderRadius: 'var(--radius-lg)',
                      border: `1.5px solid ${grupo.corBorda}`,
                      overflow: 'hidden',
                    }}
                  >
                    {/* Cabeçalho do ciclo */}
                    <div style={{ background: grupo.corBg, padding: 'var(--space-3) var(--space-5)', borderBottom: `1px solid ${grupo.corBorda}`, display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                      <span style={{ width: 10, height: 10, borderRadius: '50%', background: grupo.cor, flexShrink: 0 }} aria-hidden />
                      <p style={{ fontWeight: 700, fontSize: 'var(--text-sm)', color: grupo.cor, flex: 1 }}>{grupo.label}</p>
                      <span style={{ fontSize: 'var(--text-xs)', color: grupo.cor, opacity: 0.8 }}>{grupo.entradas.length} dose{grupo.entradas.length !== 1 ? 's' : ''}</span>
                    </div>

                    {/* Lista de doses */}
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }} role="list">
                      {grupo.entradas.map((e, i) => (
                        <li
                          key={i}
                          style={{
                            display: 'flex',
                            gap: 'var(--space-4)',
                            alignItems: 'center',
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
                              {e.tipo === 'aplicada' && e.local ? ` · ${e.local}` : ''}
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
        </div>
      )}
    </div>
  )
}
