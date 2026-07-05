import { iniciais } from '@/utils/idade'

const CORES = [
  { bg: 'var(--color-primary-subtle)',  text: 'var(--color-primary)' },
  { bg: 'var(--color-info-subtle)',     text: 'var(--color-info)' },
  { bg: 'var(--color-accent-highlight)',text: 'var(--color-accent-text)' },
  { bg: 'var(--color-success-highlight)',text: 'var(--color-success)' },
]

interface AvatarProps {
  nome: string
  tamanho?: number
  fotoUrl?: string
}

export function Avatar({ nome, tamanho = 40, fotoUrl }: AvatarProps) {
  const idx = nome.charCodeAt(0) % CORES.length
  const cor = CORES[idx]

  if (fotoUrl) {
    return (
      <img
        src={fotoUrl}
        alt={nome}
        width={tamanho}
        height={tamanho}
        style={{ width: tamanho, height: tamanho, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
      />
    )
  }

  return (
    <div
      aria-hidden="true"
      style={{
        width: tamanho,
        height: tamanho,
        borderRadius: '50%',
        background: cor.bg,
        color: cor.text,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'var(--font-display)',
        fontWeight: 700,
        fontSize: tamanho * 0.36,
        flexShrink: 0,
        border: '1.5px solid var(--color-border)',
      }}
    >
      {iniciais(nome)}
    </div>
  )
}
