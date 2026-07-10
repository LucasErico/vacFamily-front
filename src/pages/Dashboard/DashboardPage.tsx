import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  Users, Syringe, Bell, ChevronRight,
  CheckCircle2, Clock, AlertTriangle, Calendar,
  TrendingUp, ShieldCheck,
} from 'lucide-react'
import { useMembros, PARENTESCO_LABEL } from '@/contexts/MembrosContext'
import { useVacinas, calcularDosesStatus } from '@/contexts/VacinasContext'
import { useLembretes } from '@/contexts/LembretesContext'
import { useAuth } from '@/contexts/AuthContext'
import { InfoCarousel } from '@/components/ui/InfoCarousel'
import type { StatusDose } from '@/types'

/* ── helpers ────────────────────────────────────────── */

function formatarData(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

function diasAte(iso: string): number {
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  const alvo = new Date(iso)
  alvo.setHours(0, 0, 0, 0)
  return Math.round((alvo.getTime() - hoje.getTime()) / 86400000)
}

function calcularIdade(dataNascimento: string): string {
  const nasc = new Date(dataNascimento)
  const hoje = new Date()
  const anos = hoje.getFullYear() - nasc.getFullYear()
  const meses = hoje.getMonth() - nasc.getMonth()
  const totalMeses = anos * 12 + meses
  if (totalMeses < 24) return `${totalMeses}m`
  return `${Math.floor(totalMeses / 12)}a`
}

type StatusGlobal = 'em_dia' | 'pendente' | 'atrasado'

function statusGlobal(doses: { status: StatusDose }[]): StatusGlobal {
  const relevantes = doses.filter(d => d.status !== 'nao_aplicavel')
  if (relevantes.some(d => d.status === 'atrasada')) return 'atrasado'
  if (relevantes.some(d => d.status === 'pendente')) return 'pendente'
  return 'em_dia'
}

const STATUS_CONFIG: Record<StatusGlobal, { label: string; className: string; icon: typeof CheckCircle2 }> = {
  em_dia:   { label: 'Em dia',   className: 'badge-success', icon: CheckCircle2   },
  pendente: { label: 'Pendente', className: 'badge-accent',  icon: Clock          },
  atrasado: { label: 'Atrasado', className: 'badge-error',   icon: AlertTriangle  },
}

/* ── sub-components ─────────────────────────────────── */

function SectionHeader({ icon: Icon, title, to, count }: {
  icon: typeof Users; title: string; to?: string; count?: number
}) {
  return (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        <Icon size={18} style={{ color: 'var(--color-primary)' }} aria-hidden />
        <h2 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'var(--text-base)',
          fontWeight: 700,
          color: 'var(--color-text)',
        }}>
          {title}
          {count !== undefined && (
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', fontWeight: 500, marginLeft: '0.4rem' }}>
              ({count})
            </span>
          )}
        </h2>
      </div>
      {to && (
        <Link
          to={to}
          className="flex items-center gap-1 btn btn-sm btn-ghost"
          style={{ minHeight: 32, padding: '0 var(--space-3)' }}
        >
          Ver todos <ChevronRight size={14} aria-hidden />
        </Link>
      )}
    </div>
  )
}

/* ── main component ─────────────────────────────────── */

export function DashboardPage() {
  const { usuario } = useAuth()
  const { membros } = useMembros()
  const { vacinas, registros } = useVacinas()
  const { lembretesPendentes } = useLembretes()

  const statusPorMembro = useMemo(() =>
    membros.map(membro => {
      const regsMembro = registros.filter(r => r.membroId === membro.id)
      const doses = vacinas.flatMap(v => calcularDosesStatus(v, regsMembro, membro.dataNascimento))
      return { membro, status: statusGlobal(doses), totalDoses: doses.filter(d => d.status !== 'nao_aplicavel').length, aplicadas: doses.filter(d => d.status === 'aplicada').length }
    }), [membros, vacinas, registros])

  const totalAtrasados  = statusPorMembro.filter(s => s.status === 'atrasado').length
  const totalEmDia      = statusPorMembro.filter(s => s.status === 'em_dia').length
  const totalPendentes  = lembretesPendentes.length

  const proximosLembretes = useMemo(() =>
    [...lembretesPendentes]
      .sort((a, b) => a.dataLembrete.localeCompare(b.dataLembrete))
      .slice(0, 4)
  , [lembretesPendentes])

  const registrosRecentes = useMemo(() =>
    [...registros]
      .sort((a, b) => b.criadoEm.localeCompare(a.criadoEm))
      .slice(0, 5)
  , [registros])

  const primeiroNome = usuario?.nome?.split(' ')[0] ?? 'Usuário'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>

      {/* Saudação */}
      <div>
        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'var(--text-lg)',
          fontWeight: 800,
          color: 'var(--color-text)',
          marginBottom: 'var(--space-1)',
        }}>
          Olá, {primeiroNome} 👋
        </h1>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>
          Veja o resumo vacinal da sua família
        </p>
      </div>

      {/* Carrossel de informações */}
      <InfoCarousel />

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-3)' }}>
        <KpiCard value={membros.length} label="Membros" icon={Users}
          color="var(--color-primary)" highlight="var(--color-primary-subtle)" />
        <KpiCard value={totalEmDia} label="Em dia" icon={ShieldCheck}
          color="var(--color-success)" highlight="var(--color-success-highlight)" />
        <KpiCard
          value={totalAtrasados}
          label={totalAtrasados === 1 ? 'Atrasado' : 'Atrasados'}
          icon={AlertTriangle}
          color={totalAtrasados > 0 ? 'var(--color-error)' : 'var(--color-text-faint)'}
          highlight={totalAtrasados > 0 ? 'var(--color-error-highlight)' : 'var(--color-surface-offset)'}
        />
      </div>

      {/* Status por membro */}
      <section aria-labelledby="membros-heading">
        <SectionHeader icon={Users} title="Status por membro" to="/membros" count={membros.length} />
        {membros.length === 0 ? (
          <EmptyState icon={Users} message="Nenhum membro cadastrado ainda."
            action={{ label: 'Adicionar membro', to: '/membros' }} />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            {statusPorMembro.map(({ membro, status, totalDoses, aplicadas }) => {
              const cfg = STATUS_CONFIG[status]
              const StatusIcon = cfg.icon
              const pct = totalDoses > 0 ? Math.round((aplicadas / totalDoses) * 100) : 0
              return (
                <Link key={membro.id} to={`/membros/${membro.id}`}
                  className="card card-hover"
                  style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', padding: 'var(--space-4)', textDecoration: 'none' }}
                >
                  <div style={{
                    width: 40, height: 40, borderRadius: 'var(--radius-full)',
                    background: 'var(--color-primary-highlight)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0, fontFamily: 'var(--font-display)', fontWeight: 700,
                    fontSize: 'var(--text-sm)', color: 'var(--color-primary)',
                  }} aria-hidden>
                    {membro.nome.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 600, fontSize: 'var(--text-sm)', color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {membro.nome}
                      </span>
                      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                        {calcularIdade(membro.dataNascimento)} · {PARENTESCO_LABEL[membro.parentesco]}
                      </span>
                    </div>
                    <div style={{ marginTop: 'var(--space-2)' }}>
                      <div style={{ height: 4, background: 'var(--color-surface-offset)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
                        <div style={{
                          height: '100%', width: `${pct}%`,
                          background: status === 'atrasado' ? 'var(--color-error)' : status === 'pendente' ? 'var(--color-accent)' : 'var(--color-success)',
                          borderRadius: 'var(--radius-full)', transition: 'width 0.4s ease',
                        }} />
                      </div>
                      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-faint)', marginTop: 2, display: 'block' }}>
                        {aplicadas}/{totalDoses} doses aplicadas
                      </span>
                    </div>
                  </div>
                  <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}>
                    <span className={`badge ${cfg.className}`}>
                      <StatusIcon size={10} aria-hidden />{cfg.label}
                    </span>
                    <ChevronRight size={16} style={{ color: 'var(--color-text-faint)' }} aria-hidden />
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </section>

      {/* Próximos Lembretes */}
      <section aria-labelledby="lembretes-heading">
        <SectionHeader icon={Bell} title="Próximos lembretes" to="/agenda" count={totalPendentes} />
        {proximosLembretes.length === 0 ? (
          <EmptyState icon={Bell} message="Nenhum lembrete pendente."
            action={{ label: 'Ver agenda', to: '/agenda' }} />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            {proximosLembretes.map(lem => {
              const vacina = vacinas.find(v => v.id === lem.vacinaId)
              const membro = membros.find(m => m.id === lem.membroId)
              const dias = diasAte(lem.dataLembrete)
              const urgente = dias <= 7 && dias >= 0
              const atrasado = dias < 0
              return (
                <div key={lem.id} className="card"
                  style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', padding: 'var(--space-4)' }}
                >
                  <div style={{
                    width: 36, height: 36, borderRadius: 'var(--radius-md)',
                    background: atrasado ? 'var(--color-error-highlight)' : urgente ? 'var(--color-warning-highlight)' : 'var(--color-primary-subtle)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <Calendar size={16} style={{ color: atrasado ? 'var(--color-error)' : urgente ? 'var(--color-warning)' : 'var(--color-primary)' }} aria-hidden />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-text)' }}>
                      {vacina?.nome ?? 'Vacina'} — dose {lem.numeroDose}
                    </p>
                    <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                      {membro?.nome ?? '—'} · {formatarData(lem.dataLembrete)}
                    </p>
                  </div>
                  <span className={`badge ${atrasado ? 'badge-error' : urgente ? 'badge-warning' : 'badge-neutral'}`}>
                    {atrasado ? `${Math.abs(dias)}d atrás` : dias === 0 ? 'Hoje' : `${dias}d`}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* Registros Recentes */}
      <section aria-labelledby="recentes-heading">
        <SectionHeader icon={TrendingUp} title="Registros recentes" to="/vacinas" count={registros.length} />
        {registrosRecentes.length === 0 ? (
          <EmptyState icon={Syringe} message="Nenhuma vacina registrada ainda."
            action={{ label: 'Registrar vacina', to: '/vacinas/registrar' }} />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            {registrosRecentes.map(reg => {
              const vacina = vacinas.find(v => v.id === reg.vacinaId)
              const membro = membros.find(m => m.id === reg.membroId)
              return (
                <div key={reg.id} className="card"
                  style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', padding: 'var(--space-4)' }}
                >
                  <div style={{
                    width: 36, height: 36, borderRadius: 'var(--radius-md)',
                    background: 'var(--color-success-highlight)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <Syringe size={16} style={{ color: 'var(--color-success)' }} aria-hidden />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-text)' }}>
                      {vacina?.nome ?? 'Vacina'} — dose {reg.numeroDose}
                    </p>
                    <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                      {membro?.nome ?? '—'} · {formatarData(reg.dataAplicacao)}
                    </p>
                  </div>
                  <span className="badge badge-success">
                    <CheckCircle2 size={10} aria-hidden /> Aplicada
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </section>

    </div>
  )
}

function KpiCard({ value, label, icon: Icon, color, highlight }: {
  value: number; label: string; icon: typeof Users; color: string; highlight: string
}) {
  return (
    <div className="card" style={{ padding: 'var(--space-4)', textAlign: 'center' }}>
      <div style={{
        width: 36, height: 36, borderRadius: 'var(--radius-md)',
        background: highlight,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        margin: '0 auto var(--space-2)',
      }}>
        <Icon size={18} style={{ color }} aria-hidden />
      </div>
      <p style={{ fontSize: 'var(--text-lg)', fontWeight: 800, fontFamily: 'var(--font-display)', color: 'var(--color-text)', lineHeight: 1 }}>
        {value}
      </p>
      <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginTop: 'var(--space-1)' }}>
        {label}
      </p>
    </div>
  )
}

function EmptyState({ icon: Icon, message, action }: {
  icon: typeof Users; message: string; action?: { label: string; to: string }
}) {
  return (
    <div className="card" style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: 'var(--space-8) var(--space-4)', textAlign: 'center', gap: 'var(--space-3)',
    }}>
      <Icon size={32} style={{ color: 'var(--color-text-faint)' }} aria-hidden />
      <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>{message}</p>
      {action && (
        <Link to={action.to} className="btn btn-sm btn-ghost">{action.label}</Link>
      )}
    </div>
  )
}
