import { Outlet } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { TopBar } from './TopBar'
import { BottomNav } from './BottomNav'
import { Sidebar } from './Sidebar'
import { OnboardingTour, shouldShowOnboarding } from '@/components/ui/OnboardingTour'
import { TourFAB } from '@/components/ui/TourFAB'

export function AppShell() {
  const [showTour, setShowTour] = useState(false)

  // Dispara automaticamente na 1ª visita após login
  useEffect(() => {
    if (shouldShowOnboarding()) {
      const t = setTimeout(() => setShowTour(true), 600)
      return () => clearTimeout(t)
    }
  }, [])

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-main">
        <TopBar />
        <main id="main-content" className="page-content" role="main">
          <Outlet />
        </main>
      </div>
      <nav className="bottom-nav" aria-label="Navegação principal">
        <BottomNav />
      </nav>

      {/* FAB de tour — só visível no mobile (≤768px), acima da bottom-nav */}
      <TourFAB onClick={() => setShowTour(true)} bottomOffset={72} />

      {showTour && (
        <OnboardingTour onClose={() => setShowTour(false)} />
      )}
    </div>
  )
}
