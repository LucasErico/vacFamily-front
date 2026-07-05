import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Header } from './Header'
import { Sidebar } from './Sidebar'
import { Footer } from './Footer'

export function AppShell() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-950">
      {/* Header fixo */}
      <Header
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen(o => !o)}
      />

      {/* Sidebar retrátil */}
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Conteúdo principal — empurrado pelo header (pt-16) */}
      <div className="flex flex-1 flex-col pt-16">
        <main
          id="main-content"
          className="flex-1 px-4 py-6 max-w-screen-xl mx-auto w-full"
        >
          <Outlet />
        </main>

        <Footer />
      </div>
    </div>
  )
}
