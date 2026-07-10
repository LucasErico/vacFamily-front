/**
 * ScrollToTopButton
 * Botão flutuante "Voltar ao topo".
 * position="page"  → fixed, canto inferior direito
 *   - mobile: acima da bottom nav (var(--nav-h))
 *   - desktop: bottom fixo em var(--space-8), pois não há bottom nav
 * position="panel" → sticky dentro do rodapé do dialog
 */
import { ArrowUp } from 'lucide-react'

interface Props {
  visible: boolean
  onClick: () => void
  position?: 'page' | 'panel'
}

export function ScrollToTopButton({ visible, onClick, position = 'page' }: Props) {
  const isPage = position === 'page'

  return (
    <>
      {isPage && (
        <style>{`
          .scroll-to-top-btn {
            position: fixed;
            bottom: calc(var(--nav-h) + var(--space-4));
            right: var(--space-5);
            z-index: 15;
          }
          @media (min-width: 768px) {
            .scroll-to-top-btn {
              bottom: var(--space-8);
              right: var(--space-8);
            }
          }
        `}</style>
      )}
      <button
        onClick={onClick}
        aria-label="Voltar ao topo"
        title="Voltar ao topo"
        aria-hidden={!visible}
        tabIndex={visible ? 0 : -1}
        className={isPage ? 'scroll-to-top-btn' : ''}
        style={{
          ...(!isPage ? {
            position: 'sticky' as const,
            bottom: 'var(--space-3)',
            alignSelf: 'flex-end',
            marginTop: 'auto',
            marginRight: 'var(--space-1)',
            zIndex: 5,
          } : {}),
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
    </>
  )
}
