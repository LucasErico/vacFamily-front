/**
 * TourFAB — Floating Action Button de tour (somente mobile)
 *
 * Renderiza um botão flutuante circular acima da bottom-bar
 * apenas em viewports ≤ 768 px. No desktop o ícone de tour
 * permanece na Sidebar/TopBar — este FAB não aparece.
 *
 * Uso: importar e renderizar dentro do layout principal do app
 * (ex: AppShell ou MainLayout), fora da TopBar e da BottomBar.
 *
 * Props:
 *   onClick — callback que dispara o tour de onboarding
 *   bottomOffset — distância do fundo da tela em px (default 80,
 *                  suficiente para ficar acima de uma bottom-bar de ~60 px)
 */
import { HelpCircle } from 'lucide-react'

interface TourFABProps {
  onClick: () => void
  bottomOffset?: number
}

export function TourFAB({ onClick, bottomOffset = 80 }: TourFABProps) {
  return (
    <>
      <style>{`
        .tour-fab {
          position: fixed;
          right: 20px;
          bottom: ${bottomOffset}px;
          z-index: 200;
          width: 48px;
          height: 48px;
          border-radius: 50%;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--color-primary);
          color: #fff;
          box-shadow: 0 4px 14px rgba(0,0,0,0.22);
          transition: transform 180ms ease, box-shadow 180ms ease, background 180ms ease;
        }
        .tour-fab:hover {
          background: var(--color-primary-hover);
          box-shadow: 0 6px 20px rgba(0,0,0,0.28);
          transform: scale(1.07);
        }
        .tour-fab:active {
          transform: scale(0.95);
        }
        /* Só aparece em mobile (≤ 768 px) */
        @media (min-width: 769px) {
          .tour-fab { display: none !important; }
        }
      `}</style>

      <button
        className="tour-fab"
        onClick={onClick}
        aria-label="Iniciar tour pelo aplicativo"
        title="Tour de ajuda"
      >
        <HelpCircle size={24} aria-hidden />
      </button>
    </>
  )
}
