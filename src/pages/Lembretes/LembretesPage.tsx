import { useState, useMemo } from 'react'
import { CalendarDays, CheckCheck, Trash2, Plus, ChevronLeft, ChevronRight, Bell } from 'lucide-react'
import { useLembretes } from '@/contexts/LembretesContext'
import { useMembros } from '@/contexts/MembrosContext'
import { useVacinas } from '@/contexts/VacinasContext'
import type { Lembrete } from '@/types'

type Filtro = 'todos' | 'pendente' | 'concluido' | 'ignorado'

const FILTROS: { valor: Filtro; label: string }[] = [
  { valor: 'todos',      label: 'Todos' },
  { valor: 'pendente',   label: 'Pendentes' },
  { valor: 'concluido',  label: 'Concluídos' },
  { valor: 'ignorado',   label: 'Ignorados' },
]

const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

function formatarData(iso: string) {
  const [ano, mes, dia] = iso.split('-')
  return `${dia}/${mes}/${ano}`
}

function obterData(l: Lembrete) {
  return l.data_prevista ?? l.data_lembrete ?? ''
}

function obterMembroId(l: Lembrete) {
  return l.membro_familiar_id ?? l.membro_id ?? ''
}

function isAtrasado(data: string) {
  return new Date(data) < new Date(new Date().toISOString().slice(0, 10))
}

function toDateKey(iso: string) {
  return iso.slice(0, 10)
}

export function LembretesPage() {
  const { lembretes, marcarStatus, removerLembrete, adicionarLembrete } = useLembretes()
  const { membros } = useMembros()
  const { vacinas } = useVacinas()
  const [filtro, setFiltro] = useState<Filtro>('todos')
  const [modalAberto, setModalAberto] = useState(false)
  const [diaSelecionado, setDiaSelecionado] = useState<string | null>(null)

  const hoje = new Date()
  const hojeAno = hoje.getFullYear()
  const hojesMes = hoje.getMonth()

  const [mesAtual, setMesAtual] = useState(hojesMes)
  const [anoAtual, setAnoAtual] = useState(hojeAno)

  // Bloqueia navegação para meses anteriores ao atual
  const estaNoMesAtual = mesAtual === hojesMes && anoAtual === hojeAno

  const [fMembroId, setFMembroId] = useState('')
  const [fVacinaId, setFVacinaId] = useState('')
  const [fNumeroDose, setFNumeroDose] = useState(1)
  const [fData, setFData] = useState('')
  const [fErro, setFErro] = useState('')

  const diasNoMes = new Date(anoAtual, mesAtual + 1, 0).getDate()
  const primeiroDiaSemana = new Date(anoAtual, mesAtual, 1).getDay()

  const eventosPorDia = useMemo(() => {
    const mapa: Record<string, Lembrete[]> = {}
    lembretes.forEach(l => {
      const key = toDateKey(obterData(l))
      if (!mapa[key]) mapa[key] = []
      mapa[key].push(l)
    })
    return mapa
  }, [lembretes])

  function diaKey(dia: number) {
    const m = String(mesAtual + 1).padStart(2, '0')
    const d = String(dia).padStart(2, '0')
    return `${anoAtual}-${m}-${d}`
  }

  function mesAnterior() {
    if (estaNoMesAtual) return // bloqueado
    if (mesAtual === 0) { setMesAtual(11); setAnoAtual(a => a - 1) }
    else setMesAtual(m => m - 1)
    setDiaSelecionado(null)
  }

  function proximoMes() {
    if (mesAtual === 11) { setMesAtual(0); setAnoAtual(a => a + 1) }
    else setMesAtual(m => m + 1)
    setDiaSelecionado(null)
  }

  function handleDiaClick(dia: number) {
    const key = diaKey(dia)
    if (eventosPorDia[key]?.length) {
      setDiaSelecionado(prev => prev === key ? null : key)
    }
  }

  const filtrados = lembretes
    .filter(l => filtro === 'todos' ? true : l.status === filtro)
    .sort((a, b) => obterData(a).localeCompare(obterData(b)))

  const automaticos = filtrados.filter(l => l.automatico)
  const manuais = filtrados.filter(l => !l.automatico)
  const eventosDiaSelecionado = diaSelecionado ? (eventosPorDia[diaSelecionado] ?? []) : []

  function nomeMembro(id: string) {
    return membros.find(m => m.id === id)?.nome ?? 'Membro'
  }
  function nomeVacina(id?: string) {
    return id ? (vacinas.find(v => v.id === id)?.nome ?? 'Vacina') : 'Vacina'
  }

  function handleSalvarManual() {
    if (!fMembroId || !fVacinaId || !fData) {
      setFErro('Preencha todos os campos.')
      return
    }

    adicionarLembrete({
      membro_familiar_id: fMembroId,
      vacina_id: fVacinaId,
      tipo: 'manual',
      titulo: `Lembrete manual · ${fNumeroDose}ª dose`,
      descricao: undefined,
      data_prevista: fData,
      automatico: false,
    })

    setModalAberto(false)
    setFMembroId(''); setFVacinaId(''); setFNumeroDose(1); setFData(''); setFErro('')
  }

  function renderLembrete(l: Lembrete) {
    const data = obterData(l)
    const membroId = obterMembroId(l)
    const atrasado = l.status === 'pendente' && isAtrasado(data)

    return (
      <li
        key={l.id}
        style={{
          display: 'flex', alignItems: 'flex-start', gap: 'var(--space-3)',
          padding: 'var(--space-4) var(--space-5)',
          opacity: l.status === 'ignorado' ? 0.45 : 1,
        }}
      >
        <div style={{ flexShrink: 0, minWidth: 64, textAlign: 'center', paddingTop: 2 }}>
          <p style={{
            fontSize: 'var(--text-xs)', fontWeight: 700, whiteSpace: 'nowrap',
            color: atrasado ? 'var(--color-error)' : l.status === 'concluido' ? 'var(--color-success)' : 'var(--color-primary)',
          }}>
            {formatarData(data)}
          </p>
          {atrasado && (
            <p style={{ fontSize: 10, color: 'var(--color-error)', fontWeight: 600, whiteSpace: 'nowrap' }}>Atrasado</p>
          )}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontWeight: 600, fontSize: 'var(--text-sm)', color: 'var(--color-text)' }}>
            {l.titulo || nomeVacina(l.vacina_id)}
          </p>
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
            {nomeMembro(membroId)}
            {l.vacina_id ? ` · ${nomeVacina(l.vacina_id)}` : ''}
            {l.automatico && (
              <span style={{ marginLeft: 'var(--space-2)', color: 'var(--color-primary)', fontWeight: 500 }}>Automático</span>
            )}
          </p>
        </div>

        {l.status === 'pendente' && (
          <div style={{ display: 'flex', gap: 'var(--space-2)', flexShrink: 0 }}>
            <button
              onClick={() => marcarStatus(l.id, 'concluido')}
              style={{ color: 'var(--color-success)', padding: 'var(--space-2)', minHeight: 44, minWidth: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              aria-label="Marcar como concluído"
            >
              <CheckCheck size={17} aria-hidden />
            </button>
            <button
              onClick={() => marcarStatus(l.id, 'ignorado')}
              style={{ color: 'var(--color-text-faint)', padding: 'var(--space-2)', minHeight: 44, minWidth: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              aria-label="Ignorar lembrete"
            >
              <Trash2 size={16} aria-hidden />
            </button>
          </div>
        )}
        {l.status !== 'pendente' && (
          <button
            onClick={() => removerLembrete(l.id)}
            style={{ color: 'var(--color-text-faint)', padding: 'var(--space-2)', minHeight: 44, minWidth: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            aria-label="Remover lembrete"
          >
            <Trash2 size={16} aria-hidden />
          </button>
        )}
      </li>
    )
  }

  const hojeKey = `${hojeAno}-${String(hojesMes + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', paddingBottom: 'var(--space-8)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-6)' }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--color-text)' }}>
            Agenda
          </h2>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', marginTop: 'var(--space-1)' }}>
            {lembretes.filter(l => l.status === 'pendente').length} pendente{lembretes.filter(l => l.status === 'pendente').length !== 1 ? 's' : ''}
          </p>
        </div>
        <button onClick={() => setModalAberto(true)} className="btn btn-primary" style={{ gap: 'var(--space-2)' }}>
          <Plus size={18} aria-hidden />
          <span>Novo</span>
        </button>
      </div>

      <div className="card" style={{ marginBottom: 'var(--space-5)', padding: 'var(--space-4)' }}>
        {/* Cabeçalho do calendário */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-4)' }}>
          <button
            onClick={mesAnterior}
            className="theme-toggle"
            aria-label="Mês anterior"
            disabled={estaNoMesAtual}
            style={{
              opacity: estaNoMesAtual ? 0.3 : 1,
              cursor: estaNoMesAtual ? 'not-allowed' : 'pointer',
              pointerEvents: estaNoMesAtual ? 'none' : 'auto',
            }}
          >
            <ChevronLeft size={18} aria-hidden />
          </button>
          <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 'var(--text-base)', color: 'var(--color-text)' }}>
            {MESES[mesAtual]} {anoAtual}
          </p>
          <button onClick={proximoMes} className="theme-toggle" aria-label="Próximo mês">
            <ChevronRight size={18} aria-hidden />
          </button>
        </div>

        {/* Cabeçalho dias da semana */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 'var(--space-2)' }}>
          {DIAS_SEMANA.map(d => (
            <div key={d} style={{ textAlign: 'center', fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--color-text-muted)', padding: 'var(--space-1) 0' }}>
              {d}
            </div>
          ))}
        </div>

        {/* Grade de dias */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
          {Array.from({ length: primeiroDiaSemana }).map((_, i) => (
            <div key={`vazio-${i}`} />
          ))}

          {Array.from({ length: diasNoMes }).map((_, i) => {
            const dia = i + 1
            const key = diaKey(dia)
            const temEvento = !!eventosPorDia[key]?.length
            const isHoje = key === hojeKey
            const isSelecionado = key === diaSelecionado
            const temPendente = eventosPorDia[key]?.some(l => l.status === 'pendente')
            const temAtrasado = eventosPorDia[key]?.some(l => l.status === 'pendente' && isAtrasado(obterData(l)))
            const temConcluido = eventosPorDia[key]?.every(l => l.status === 'concluido')

            // Cor de destaque do dia com evento
            const eventoColor = temAtrasado
              ? 'var(--color-error)'
              : temPendente
              ? 'var(--color-primary)'
              : 'var(--color-success)'

            const eventoHighlight = temAtrasado
              ? 'var(--color-error-highlight)'
              : temPendente
              ? 'var(--color-primary-highlight)'
              : 'var(--color-success-highlight)'

            // Prioridade de estilos: selecionado > hoje > com evento > normal
            let bgDia: string
            let colorDia: string
            let borderDia: string
            let fontWeight: number

            if (isSelecionado) {
              bgDia      = eventoColor
              colorDia   = '#fff'
              borderDia  = '1.5px solid transparent'
              fontWeight = 700
            } else if (isHoje && temEvento) {
              bgDia      = eventoHighlight
              colorDia   = eventoColor
              borderDia  = `1.5px solid ${eventoColor}`
              fontWeight = 700
            } else if (isHoje) {
              bgDia      = 'transparent'
              colorDia   = 'var(--color-primary)'
              borderDia  = '1.5px solid var(--color-primary)'
              fontWeight = 700
            } else if (temEvento) {
              bgDia      = eventoHighlight
              colorDia   = eventoColor
              borderDia  = '1.5px solid transparent'
              fontWeight = 600
            } else {
              bgDia      = 'transparent'
              colorDia   = 'var(--color-text)'
              borderDia  = '1.5px solid transparent'
              fontWeight = 400
            }

            // Pequeno contador de eventos no canto (só quando há múltiplos)
            const qtdEventos = eventosPorDia[key]?.length ?? 0

            return (
              <button
                key={key}
                onClick={() => handleDiaClick(dia)}
                disabled={!temEvento}
                aria-label={`${dia} de ${MESES[mesAtual]}${
                  temEvento ? `, ${qtdEventos} evento${qtdEventos !== 1 ? 's' : ''}` : ''
                }`}
                aria-pressed={isSelecionado}
                style={{
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 1,
                  padding: 'var(--space-1)',
                  borderRadius: 'var(--radius-md)',
                  border: borderDia,
                  background: bgDia,
                  color: colorDia,
                  cursor: temEvento ? 'pointer' : 'default',
                  minHeight: 44,
                  fontSize: 'var(--text-xs)',
                  fontWeight,
                  transition: 'background 150ms ease, color 150ms ease, border-color 150ms ease',
                }}
              >
                <span>{dia}</span>
                {temEvento && qtdEventos > 1 && (
                  <span
                    aria-hidden
                    style={{
                      fontSize: 9,
                      fontWeight: 700,
                      color: isSelecionado ? 'rgba(255,255,255,0.85)' : eventoColor,
                      lineHeight: 1,
                    }}
                  >
                    {qtdEventos}
                  </span>
                )}
                {temEvento && qtdEventos === 1 && (
                  <span
                    aria-hidden
                    style={{
                      width: 4, height: 4,
                      borderRadius: 'var(--radius-full)',
                      background: isSelecionado ? 'rgba(255,255,255,0.7)' : eventoColor,
                      flexShrink: 0,
                    }}
                  />
                )}
                {/* Badge de concluído (check) quando todos os eventos do dia estão concluídos */}
                {temConcluido && !isSelecionado && (
                  <span
                    aria-hidden
                    style={{
                      position: 'absolute', top: 2, right: 3,
                      fontSize: 8, color: 'var(--color-success)', fontWeight: 800, lineHeight: 1,
                    }}
                  >
                    ✓
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Detalhe do dia selecionado */}
        {diaSelecionado && eventosDiaSelecionado.length > 0 && (
          <div style={{ marginTop: 'var(--space-4)', borderTop: '1px solid var(--color-divider)', paddingTop: 'var(--space-4)' }}>
            <p style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 'var(--space-3)' }}>
              {formatarData(diaSelecionado)} — {eventosDiaSelecionado.length} evento{eventosDiaSelecionado.length !== 1 ? 's' : ''}
            </p>
            <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }} role="list">
              {eventosDiaSelecionado.map(l => {
                const atrasado = l.status === 'pendente' && isAtrasado(obterData(l))
                return (
                  <li
                    key={l.id}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
                      padding: 'var(--space-3) var(--space-4)',
                      background: 'var(--color-surface-offset)',
                      borderRadius: 'var(--radius-md)',
                    }}
                  >
                    <CalendarDays
                      size={15}
                      aria-hidden
                      style={{ color: atrasado ? 'var(--color-error)' : l.status === 'concluido' ? 'var(--color-success)' : 'var(--color-primary)', flexShrink: 0 }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--color-text)' }}>
                        {l.titulo || nomeVacina(l.vacina_id)}
                      </p>
                      <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                        {nomeMembro(obterMembroId(l))}
                      </p>
                    </div>
                    <span
                      className={`badge ${
                        atrasado ? 'badge-error' :
                        l.status === 'concluido' ? 'badge-success' :
                        l.status === 'ignorado' ? 'badge-neutral' : 'badge-accent'
                      }`}
                    >
                      {atrasado ? 'Atrasado' : l.status === 'concluido' ? 'Concluído' : l.status === 'ignorado' ? 'Ignorado' : 'Pendente'}
                    </span>
                  </li>
                )
              })}
            </ul>
          </div>
        )}
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-5)', overflowX: 'auto', paddingBottom: 2 }} role="group" aria-label="Filtrar lembretes">
        {FILTROS.map(f => (
          <button
            key={f.valor}
            onClick={() => setFiltro(f.valor)}
            className={filtro === f.valor ? 'btn btn-primary' : 'btn btn-ghost'}
            style={{ fontSize: 'var(--text-xs)', whiteSpace: 'nowrap', flexShrink: 0 }}
            aria-pressed={filtro === f.valor}
          >
            {f.label}
          </button>
        ))}
      </div>

      {filtrados.length === 0 && (
        <div style={{ textAlign: 'center', padding: 'var(--space-16) var(--space-8)', color: 'var(--color-text-muted)' }}>
          <Bell size={48} style={{ margin: '0 auto var(--space-4)', color: 'var(--color-text-faint)' }} aria-hidden />
          <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, marginBottom: 'var(--space-2)', color: 'var(--color-text)' }}>
            {filtro === 'todos' ? 'Nenhum lembrete ainda' : 'Nenhum lembrete neste filtro'}
          </h3>
          <p style={{ fontSize: 'var(--text-sm)', maxWidth: 280, margin: '0 auto var(--space-6)' }}>
            {filtro === 'todos'
              ? 'Registre uma dose com múltiplas etapas para gerar lembretes automáticos, ou adicione um manualmente.'
              : 'Tente outro filtro.'}
          </p>
          {filtro === 'todos' && (
            <button onClick={() => setModalAberto(true)} className="btn btn-primary">
              <Plus size={18} aria-hidden /> Adicionar lembrete
            </button>
          )}
        </div>
      )}

      {filtrados.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
          {automaticos.length > 0 && (
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: 'var(--space-3) var(--space-5)', background: 'var(--color-surface-offset)' }}>
                <p style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Reforços automáticos
                </p>
              </div>
              <ul style={{ listStyle: 'none', padding: 0 }} role="list">
                {automaticos.map((l, i) => (
                  <div key={l.id}>
                    {i > 0 && <hr className="divider" style={{ margin: 0 }} />}
                    {renderLembrete(l)}
                  </div>
                ))}
              </ul>
            </div>
          )}

          {manuais.length > 0 && (
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: 'var(--space-3) var(--space-5)', background: 'var(--color-surface-offset)' }}>
                <p style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Lembretes manuais
                </p>
              </div>
              <ul style={{ listStyle: 'none', padding: 0 }} role="list">
                {manuais.map((l, i) => (
                  <div key={l.id}>
                    {i > 0 && <hr className="divider" style={{ margin: 0 }} />}
                    {renderLembrete(l)}
                  </div>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Modal novo lembrete */}
      {modalAberto && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'oklch(0 0 0 / 0.5)',
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
            zIndex: 50, padding: 'var(--space-4)',
          }}
          role="dialog"
          aria-modal="true"
          aria-label="Novo lembrete"
          onClick={e => { if (e.target === e.currentTarget) setModalAberto(false) }}
        >
          <div className="card" style={{ width: '100%', maxWidth: 480, padding: 'var(--space-6)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-base)', fontWeight: 700, color: 'var(--color-text)' }}>
              Novo lembrete
            </h3>

            <div>
              <label htmlFor="m-membro" style={{ display: 'block', fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-2)', fontWeight: 500 }}>
                Membro *
              </label>
              <select id="m-membro" value={fMembroId} onChange={e => setFMembroId(e.target.value)} className="input-field">
                <option value="">Selecione...</option>
                {membros.map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}
              </select>
            </div>

            <div>
              <label htmlFor="m-vacina" style={{ display: 'block', fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-2)', fontWeight: 500 }}>
                Vacina *
              </label>
              <select id="m-vacina" value={fVacinaId} onChange={e => setFVacinaId(e.target.value)} className="input-field">
                <option value="">Selecione...</option>
                {vacinas.map(v => <option key={v.id} value={v.id}>{v.nome}</option>)}
              </select>
            </div>

            <div>
              <label htmlFor="m-dose" style={{ display: 'block', fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-2)', fontWeight: 500 }}>
                Número da dose
              </label>
              <input id="m-dose" type="number" min={1} max={9} value={fNumeroDose} onChange={e => setFNumeroDose(Number(e.target.value))} className="input-field" />
            </div>

            <div>
              <label htmlFor="m-data" style={{ display: 'block', fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-2)', fontWeight: 500 }}>
                Data *
              </label>
              <input id="m-data" type="date" value={fData} onChange={e => setFData(e.target.value)} className="input-field" />
            </div>

            {fErro && <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-error)' }} role="alert">{fErro}</p>}

            <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end' }}>
              <button onClick={() => { setModalAberto(false); setFErro('') }} className="btn btn-ghost">Cancelar</button>
              <button onClick={handleSalvarManual} className="btn btn-primary">Salvar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
