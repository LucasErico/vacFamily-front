/**
 * ScrollToTopButton
 * Botão flutuante "Voltar ao topo".
 * Aparece apenas quando visible=true (controlado por useScrollTop).
 * Recebe onClick e visible como props — sem acoplamento ao container.
 */
import { ArrowUp } from 'lucide-react'

interface Props {
  visible: boolean
  onClick: () => void
  /** Posição do botão. Default: fixo no canto inferior direito da página */
  position?: 'page' | 'panel'
}

export function ScrollToTopButton({ visible, onClick, position = 'page' }: Props) {
  const isPage = position === 'page'

  return (
    <button
      onClick={onClick}
      aria-label="Voltar ao topo"
      title="Voltar ao topo"
      aria-hidden={!visible}
      tabIndex={visible ? 0 : -1}
      style={{
        /* posição */
        position: isPage ? 'fixed' : 'sticky',
        ...(isPage
          ? {
              bottom: 'calc(var(--nav-h) + var(--space-4))',
              right: 'var(--space-5)',
              zIndex: 15,
            }
          : {
              bottom: 'var(--space-3)',
              alignSelf: 'flex-end',
              marginTop: 'auto',
              marginRight: 'var(--space-1)',
              zIndex: 5,
            }
        ),
        /* visual */
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 'var(--space-2)',
        padding: isPage ? 'var(--space-2) var(--space-4)' : 'var(--space-2) var(--space-3)',
        borderRadius: 'var(--radius-full)',
        background: 'var(--color-primary)',
        color: '#fff',
        border: 'none',
        cursor: visible ? 'pointer' : 'default',
        fontSize: 'var(--text-xs)',
        fontWeight: 600,
        boxShadow: 'var(--shadow-md)',
        whiteSpace: 'nowrap',
        /* animação entrada/saída */
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0) scale(1)' : 'translateY(12px) scale(0.85)',
        pointerEvents: visible ? 'auto' : 'none',
        transition:
          'opacity 200ms cubic-bezier(0.16,1,0.3,1), ' +
          'transform 200ms cubic-bezier(0.16,1,0.3,1), ' +
          'background var(--transition)',
      }}
      onMouseEnter={e => {
        if (visible) (e.currentTarget as HTMLElement).style.background = 'var(--color-primary-hover)'
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.background = 'var(--color-primary)'
      }}
    >
      <ArrowUp size={14} aria-hidden />
      {isPage ? 'Voltar ao topo' : 'Topo'}
    </button>
  )
}
