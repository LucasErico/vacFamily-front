/**
 * AdminOverviewPage — /admin
 * KPIs carregados em tempo real via GET /admin/overview.
 */
import { useState, useEffect } from 'react'
import { Users, Newspaper, Syringe, ClipboardList, Loader2 } from 'lucide-react'
import { apiFetch } from '@/services/api'

interface Overview {
  totalUsuarios:  number
  cardsAtivos:    number
  cardsTotais:    number
  totalVacinas:   number
  totalRegistros: number
}

export function AdminOverviewPage() {
  const [data, setData]       = useState<Overview | null>(null)
  const [loading, setLoading] = useState(true)
  const [erro, setErro]       = useState('')

  useEffect(() => {
    apiFetch<{ status: string; overview: Overview }>('/admin/overview')
      .then(r => setData(r.overview))
      .catch(e => setErro(e.message))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-8)' }}>
      <div>
        <h1 style={{
          fontFamily: 'var(--font-display)', fontSize: 'var(--text-xl)',
          fontWeight: 700, color: 'var(--color-text)', marginBottom: 'var(--space-1)',
        }}>
          Visão geral
        </h1>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>
          Painel administrativo do VacFamily
        </p>
      </div>

      {loading && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>
          <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} aria-hidden />
          Carregando...
        </div>
      )}

      {erro && (
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-error)' }}>{erro}</p>
      )}

      {data && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 'var(--space-4)' }}>
          <AdminKpi icon={Users}         label="Usuários registrados" value={data.totalUsuarios} />
          <AdminKpi icon={Newspaper}     label="Cards ativos"         value={data.cardsAtivos} />
          <AdminKpi icon={Newspaper}     label="Cards totais"         value={data.cardsTotais} />
          <AdminKpi icon={Syringe}       label="Vacinas cadastradas"  value={data.totalVacinas} />
          <AdminKpi icon={ClipboardList} label="Registros de vacina"  value={data.totalRegistros} />
        </div>
      )}

      <div style={{
        padding: 'var(--space-4) var(--space-5)',
        borderRadius: 'var(--radius-lg)',
        background: 'var(--color-primary-highlight)',
        border: '1px solid var(--color-primary)',
        fontSize: 'var(--text-sm)', color: 'var(--color-primary)', lineHeight: 1.6,
      }}>
        <strong>Dados em tempo real:</strong> Todos os KPIs são carregados diretamente do banco via API.
      </div>
    </div>
  )
}

function AdminKpi({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: number }) {
  return (
    <div style={{
      background: 'var(--color-surface)', border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-lg)', padding: 'var(--space-5)',
      display: 'flex', flexDirection: 'column', gap: 'var(--space-2)',
    }}>
      <Icon size={20} style={{ color: 'var(--color-primary)' }} aria-hidden />
      <p style={{
        fontSize: 'var(--text-xl)', fontWeight: 800,
        fontFamily: 'var(--font-display)', color: 'var(--color-text)', lineHeight: 1,
      }}>
        {value.toLocaleString('pt-BR')}
      </p>
      <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>{label}</p>
    </div>
  )
}
