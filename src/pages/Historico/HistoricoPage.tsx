import { useMemo, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { ClipboardList, Plus, CheckCircle2, Clock, AlertCircle } from 'lucide-react'
import { useMembros } from '@/contexts/MembrosContext'
import { useVacinas } from '@/contexts/VacinasContext'
import { useLembretes } from '@/contexts/LembretesContext'
import { Avatar } from '@/components/ui/Avatar'

function formatarData(iso: string) {
  const [ano, mes, dia] = iso.split('-')
  return `${dia}/${mes}/${ano}`
}

type EntradaTimeline =
  | { tipo: 'aplicada'; data: string; vacinaNome: string; numeroDose: number; local?: string }
  | { tipo: 'pendente'; data: string; vacinaNome: string; numeroDose: number }
  | { tipo: 'atrasada'; data: string; vacinaNome: string; numeroDose: number }

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

  const membro = membros.find(m => m.id === membroId)

  const timeline = useMemo((): EntradaTimeline[] => {
    if (!membro) return []

    const registrosMembro = buscarRegistrosMembro(membroId)
    const lembretesMembro = lembretes.filter(l => l.membroId === membroId)
    const entradas: EntradaTimeline[] = []

    // Doses aplicadas (histórico real)
    for (const reg of registrosMembro) {
      const vacina = vacinas.find(v => v.id === reg.vacinaId)
      if (!vacina) continue
      entradas.push({
        tipo: 'aplicada',
        data: reg.dataAplicacao,
        vacinaNome: vacina.nome,
        numeroDose: reg.numeroDose,
        local: reg.localAplicacao,
      })
    }

    // Doses agendadas / pendentes via lembretes
    for (const lem of lembretesMembro) {
      if (lem.status !== 'pendente') continue
      const vacina = vacinas.find(v => v.id === lem.vacinaId)
      if (!vacina) continue

      // Não duplicar doses já aplicadas
      const jaAplicada = registrosMembro.some(r => r.vacinaId === lem.vacinaId && r.numeroDose === lem.numeroDose)
      if (jaAplicada) continue

      const atrasada = lem.dataLembrete < hoje
      entradas.push({
        tipo: atrasada ? 'atrasada' : 'pendente',
        data: lem.dataLembrete,
        vacinaNome: vacina.nome,
        numeroDose: lem.numeroDose,
      })
    }

    return entradas.sort((a, b) => a.data.localeCompare(b.data))
  }, [membroId, membro, registros, lembretes, vacinas, buscarRegistrosMembro, hoje])

  // Agrupar aplicadas por ano, separar pendentes/atrasadas
  const aplicadas = timeline.filter(e => e.tipo === 'aplicada')
  const futuras   = timeline.filter(e => e.tipo === 'pendente')
  const atrasadas = timeline.filter(e => e.tipo === 'atrasada')

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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-5)' }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--color-text)' }}>
            Histórico Vacinal
          </h2>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', marginTop: 'var(--space-1)' }}>
            {aplicadas.length} dose{aplicadas.length !== 1 ? 's' : ''} registrada{aplicadas.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Link
          to="/vacinas/registrar"
          state={{ membroId }}
          className="btn btn-primary"
          style={{ gap: 'var(--space-2)', fontSize: 'var(--text-sm)' }}
        >
          <Plus size={16} aria-hidden /> Registrar dose anterior
        </Link>
      </div>

      {/* Seletor de membros (chips) */}
      <div
        style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-6)', overflowX: 'auto', paddingBottom: 4 }}
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

      {timeline.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 'var(--space-12) var(--space-8)', color: 'var(--color-text-muted)' }}>
          <ClipboardList size={40} style={{ margin: '0 auto var(--space-4)', color: 'var(--color-text-faint)' }} aria-hidden />
          <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, marginBottom: 'var(--space-2)', color: 'var(--color-text)', fontSize: 'var(--text-base)' }}>
            Nenhum registro ainda
          </h3>
          <p style={{ fontSize: 'var(--text-sm)', maxWidth: 280, margin: '0 auto var(--space-6)' }}>
            Registre doses anteriores ou agende vacinas futuras para {membro?.nome?.split(' ')[0]}.
          </p>
          <Link to="/vacinas/registrar" state={{ membroId }} className="btn btn-primary">
            <Plus size={18} aria-hidden /> Registrar primeira dose
          </Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>

          {/* Seção: Atrasadas */}
          {atrasadas.length > 0 && (
            <section aria-label="Doses atrasadas">
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
                <div style={{ flex: 1, height: 1, background: 'var(--color-error)' }} aria-hidden />
                <span style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--color-error)', textTransform: 'uppercase', letterSpacing: '0.08em', whiteSpace: 'nowrap' }}>
                  Atrasadas
                </span>
                <div style={{ flex: 1, height: 1, background: 'var(--color-error)' }} aria-hidden />
              </div>
              <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }} role="list">
                {atrasadas.map((e, i) => (
                  <li key={i} style={{ display: 'flex', gap: 'var(--space-4)', alignItems: 'flex-start' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 4 }}>
                      <AlertCircle size={18} style={{ color: 'var(--color-error)', flexShrink: 0 }} aria-hidden />
                      <div style={{ flex: 1, width: 2, background: 'var(--color-divider)', marginTop: 4 }} aria-hidden />
                    </div>
                    <div className="card" style={{ flex: 1, padding: 'var(--space-3) var(--space-4)', border: '1px solid var(--color-error-highlight)', marginBottom: 'var(--space-1)' }}>
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
                <span style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '0.08em', whiteSpace: 'nowrap' }}>
                  Agendadas
                </span>
                <div style={{ flex: 1, height: 1, background: 'var(--color-primary)' }} aria-hidden />
              </div>
              <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }} role="list">
                {futuras.map((e, i) => (
                  <li key={i} style={{ display: 'flex', gap: 'var(--space-4)', alignItems: 'flex-start' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 4 }}>
                      <Clock size={18} style={{ color: 'var(--color-primary)', flexShrink: 0 }} aria-hidden />
                      <div style={{ flex: 1, width: 2, background: 'var(--color-divider)', marginTop: 4 }} aria-hidden />
                    </div>
                    <div className="card" style={{ flex: 1, padding: 'var(--space-3) var(--space-4)', marginBottom: 'var(--space-1)' }}>
                      <p style={{ fontWeight: 600, fontSize: 'var(--text-sm)', color: 'var(--color-text)' }}>{e.vacinaNome} — {e.numeroDose}ª dose</p>
                      <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginTop: 'var(--space-1)' }}>Prevista para {formatarData(e.data)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Histórico real por ano (mais recente primeiro) */}
          {anos.length > 0 && (
            <section aria-label="Histórico de doses aplicadas">
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
                <div style={{ flex: 1, height: 1, background: 'var(--color-success)' }} aria-hidden />
                <span style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--color-success)', textTransform: 'uppercase', letterSpacing: '0.08em', whiteSpace: 'nowrap' }}>
                  Histórico Aplicado
                </span>
                <div style={{ flex: 1, height: 1, background: 'var(--color-success)' }} aria-hidden />
              </div>

              {anos.map(ano => (
                <div key={ano} style={{ marginBottom: 'var(--space-5)' }}>
                  <p style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 'var(--space-3)' }}>
                    {ano}
                  </p>
                  <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }} role="list">
                    {porAno[ano].sort((a, b) => b.data.localeCompare(a.data)).map((e, i) => (
                      <li key={i} style={{ display: 'flex', gap: 'var(--space-4)', alignItems: 'flex-start' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 4 }}>
                          <CheckCircle2 size={18} style={{ color: 'var(--color-success)', flexShrink: 0 }} aria-hidden />
                          {i < porAno[ano].length - 1 && (
                            <div style={{ flex: 1, width: 2, background: 'var(--color-divider)', marginTop: 4, minHeight: 24 }} aria-hidden />
                          )}
                        </div>
                        <div className="card" style={{ flex: 1, padding: 'var(--space-3) var(--space-4)', marginBottom: 'var(--space-1)' }}>
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
