import { useMemo, useState, useRef, useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { ClipboardList, Plus, CheckCircle2, Clock, AlertCircle, ChevronDown } from 'lucide-react'
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
  faixas: string[]
}

const CICLOS_HISTORICO: CicloInfo[] = [
  { id: 'pre_natal',     label: 'Pré-Natal',    cor: '#a12c7b', corBg: 'oklch(from #a12c7b l c h / 0.08)', faixas: ['gestante'] },
  { id: 'recem_nascido', label: 'Recém-Nasc.',  cor: '#01696f', corBg: 'oklch(from #01696f l c h / 0.07)', faixas: ['recem_nascido'] },
  { id: 'crianca',       label: 'Infância',     cor: '#006494', corBg: 'oklch(from #006494 l c h / 0.08)', faixas: ['crianca'] },
  { id: 'adolescente',   label: 'Adolescência', cor: '#da7101', corBg: 'oklch(from #da7101 l c h / 0.08)', faixas: ['adolescente'] },
  { id: 'adulto',        label: 'Adulto',       cor: '#437a22', corBg: 'oklch(from #437a22 l c h / 0.08)', faixas: ['adulto'] },
  { id: 'idoso',         label: 'Idoso',        cor: '#7a39bb', corBg: 'oklch(from #7a39bb l c h / 0.08)', faixas: ['idoso'] },
]

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

// Dropdown de ciclo reutilizável
function CicloDropdownHistorico({
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
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--color-border)', flexShrink: 0 }} />
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
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: c.cor, flexShrink: 0 }} />
              {c.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
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
  const [filtroStatus, setFiltroStatus] = useState<'todos' | 'aplicada' | 'pendente' | 'atrasada'>('todos')
  const [filtroCiclo, setFiltroCiclo] = useState<CicloId | 'todos'>('todos')

  const membro = membros.find(m => m.id === membroId)

  const timeline = useMemo((): EntradaTimeline[] => {
    if (!membro) return []

    const registrosMembro = buscarRegistrosMembro(membroId)
    const lembretesMembro = lembretes.filter(l => l.membro_id === membroId)
    const entradas: EntradaTimeline[] = []

    // Doses aplicadas (histórico real)
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

    // Doses agendadas / pendentes via lembretes
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
      if (filtroCiclo !== 'todos' && getCicloDeEntrada(e) !== filtroCiclo) return false
      return true
    })
  }, [timeline, filtroStatus, filtroCiclo])

  // Agrupar aplicadas por ano, separar pendentes/atrasadas
  const aplicadas = timelineFiltrada.filter(e => e.tipo === 'aplicada')
  const futuras   = timelineFiltrada.filter(e => e.tipo === 'pendente')
  const atrasadas = timelineFiltrada.filter(e => e.tipo === 'atrasada')

  const porAno = useMemo(() => {
    const mapa: Record<number, typeof aplicadas> = {}
    for (const e of aplicadas) {
      const ano = Number(e.data.slice(0, 4))
      if (!mapa[ano]) mapa[ano] = []
      mapa[ano].push(e)
    }
    return mapa
  }, [aplicadas])

  const anos = Object.keys(porAno).map(Number).sort((a, b) => b - a)

  // Estilo botão de status
  function styleBtnStatus(ativo: boolean, cor?: string) {
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

      {/* Header — sem botão de registrar dose anterior */}
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

      {/* Filtros inline */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)', marginBottom: 'var(--space-5)', alignItems: 'center' }}>
        <button onClick={() => setFiltroStatus('todos')} style={styleBtnStatus(filtroStatus === 'todos')}>
          Todos
        </button>
        <button onClick={() => setFiltroStatus('aplicada')} style={styleBtnStatus(filtroStatus === 'aplicada', 'var(--color-success)')}>
          Aplicadas
        </button>
        <button onClick={() => setFiltroStatus('pendente')} style={styleBtnStatus(filtroStatus === 'pendente', 'var(--color-primary)')}>
          Agendadas
        </button>
        <button onClick={() => setFiltroStatus('atrasada')} style={styleBtnStatus(filtroStatus === 'atrasada', 'var(--color-error)')}>
          Atrasadas
        </button>
        <CicloDropdownHistorico value={filtroCiclo} onChange={setFiltroCiclo} />
      </div>

      {timelineFiltrada.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 'var(--space-12) var(--space-8)', color: 'var(--color-text-muted)' }}>
          <ClipboardList size={40} style={{ margin: '0 auto var(--space-4)', color: 'var(--color-text-faint)' }} aria-hidden />
          <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, marginBottom: 'var(--space-2)', color: 'var(--color-text)', fontSize: 'var(--text-base)' }}>
            {timeline.length === 0 ? 'Nenhum registro ainda' : 'Nenhum resultado para os filtros'}
          </h3>
          <p style={{ fontSize: 'var(--text-sm)', maxWidth: 280, margin: '0 auto' }}>
            {timeline.length === 0
              ? `Registre vacinas para ${membro?.nome?.split(' ')[0]} na página de Vacinas.`
              : 'Tente ajustar os filtros aplicados.'}
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

          {/* Histórico real por ano */}
          {anos.length > 0 && (
            <section aria-label="Histórico de doses aplicadas">
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
                <div style={{ flex: 1, height: 1, background: 'var(--color-success)' }} aria-hidden />
                <span style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--color-success)', textTransform: 'uppercase', letterSpacing: '0.08em', whiteSpace: 'nowrap' }}>Histórico Aplicado</span>
                <div style={{ flex: 1, height: 1, background: 'var(--color-success)' }} aria-hidden />
              </div>

              {anos.map(ano => (
                <div key={ano} style={{ marginBottom: 'var(--space-6)' }}>
                  <p style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 'var(--space-3)' }}>
                    {ano}
                  </p>
                  <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }} role="list">
                    {porAno[ano].sort((a, b) => b.data.localeCompare(a.data)).map((e, i) => (
                      <li key={i} style={{ display: 'flex', gap: 'var(--space-4)', alignItems: 'flex-start' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 4 }}>
                          <CheckCircle2 size={18} style={{ color: 'var(--color-success)', flexShrink: 0 }} aria-hidden />
                          {i < porAno[ano].length - 1 && (
                            <div style={{ flex: 1, width: 2, background: 'var(--color-divider)', marginTop: 4, minHeight: 24 }} aria-hidden />
                          )}
                        </div>
                        <div className="card" style={{ flex: 1, padding: 'var(--space-4) var(--space-5)' }}>
                          <p style={{ fontWeight: 600, fontSize: 'var(--text-sm)', color: 'var(--color-text)' }}>
                            {e.vacinaNome} — {e.numeroDose}ª dose
                          </p>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)', marginTop: 'var(--space-1)' }}>
                            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>{formatarData(e.data)}</span>
                            {'local' in e && e.local && <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>· {e.local}</span>}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </section>
          )}
        </div>
      )}
    </div>
  )
}
