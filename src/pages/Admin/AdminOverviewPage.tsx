/**
 * AdminOverviewPage — /admin
 * Visão geral: totais de usuários e cards ativos.
 * Cards carregados de forma assíncrona da API /conteudo/admin.
 */
import { useState, useEffect, useMemo } from 'react'
import { Users, Newspaper, Database } from 'lucide-react'
import { getSnapshotUsuarios, getCardsAdmin, type CardConteudo } from '@/services/adminStorage'

export function AdminOverviewPage() {
  const usuarios = useMemo(() => getSnapshotUsuarios(), [])
  const [cards, setCards] = useState<CardConteudo[]>([])

  useEffect(() => {
    getCardsAdmin()
      .then(setCards)
      .catch(() => setCards([]))
  }, [])

  const cardsAtivos = cards.filter((c: CardConteudo) => c.ativo).length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-8)' }}>
      <div>
        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'var(--text-xl)',
          fontWeight: 700,
          color: 'var(--color-text)',
          marginBottom: 'var(--space-1)',
        }}>
          Visão geral
        </h1>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>
          Painel administrativo do VacFamily
        </p>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-4)' }}>
        <AdminKpi icon={Users}     label="Usuários registrados" value={usuarios.length} />
        <AdminKpi icon={Newspaper} label="Cards ativos"         value={cardsAtivos} />
        <AdminKpi icon={Database}  label="Cards totais"         value={cards.length} />
      </div>

      {/* Info */}
      <div style={{
        padding: 'var(--space-4) var(--space-5)',
        borderRadius: 'var(--radius-lg)',
        background: 'var(--color-primary-highlight)',
        border: '1px solid var(--color-primary)',
        fontSize: 'var(--text-sm)',
        color: 'var(--color-primary)',
        lineHeight: 1.6,
      }}>
        <strong>Dados em tempo real:</strong> Os cards são carregados diretamente do banco via API.
        Alterações feitas na aba <em>Cards do carrossel</em> refletem imediatamente para todos os usuários.
      </div>
    </div>
  )
}

function AdminKpi({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: number }) {
  return (
    <div style={{
      background: 'var(--color-surface)',
      border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-lg)',
      padding: 'var(--space-5)',
      display: 'flex', flexDirection: 'column', gap: 'var(--space-2)',
    }}>
      <Icon size={20} style={{ color: 'var(--color-primary)' }} aria-hidden />
      <p style={{
        fontSize: 'var(--text-xl)',
        fontWeight: 800,
        fontFamily: 'var(--font-display)',
        color: 'var(--color-text)',
        lineHeight: 1,
      }}>
        {value}
      </p>
      <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>{label}</p>
    </div>
  )
}
