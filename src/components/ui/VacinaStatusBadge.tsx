import type { StatusDose } from '@/types'
import { CheckCircle2, Clock, AlertCircle, MinusCircle } from 'lucide-react'

interface Props {
  status: StatusDose
  mostrarLabel?: boolean
}

const CONFIG: Record<StatusDose, { label: string; cor: string; icon: typeof CheckCircle2 }> = {
  aplicada:      { label: 'Aplicada',       cor: 'var(--color-success)',      icon: CheckCircle2 },
  pendente:      { label: 'Pendente',       cor: 'var(--color-warning)',      icon: Clock },
  atrasada:      { label: 'Atrasada',       cor: 'var(--color-error)',        icon: AlertCircle },
  nao_aplicavel: { label: 'N/A',            cor: 'var(--color-text-faint)',   icon: MinusCircle },
}

export function VacinaStatusBadge({ status, mostrarLabel = true }: Props) {
  const { label, cor, icon: Icon } = CONFIG[status]
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 'var(--space-1)',
        fontSize: 'var(--text-xs)',
        fontWeight: 500,
        color: cor,
      }}
      aria-label={label}
    >
      <Icon size={13} aria-hidden />
      {mostrarLabel && label}
    </span>
  )
}
