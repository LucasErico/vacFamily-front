import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { AuthProvider } from '@/contexts/AuthContext'
import { AccessibilityProvider } from '@/contexts/AccessibilityContext'
import { MembrosProvider } from '@/contexts/MembrosContext'
import { MembroAtivoProvider } from '@/contexts/MembroAtivoContext'
import { VacinasProvider } from '@/contexts/VacinasContext'
import { LembretesProvider } from '@/contexts/LembretesContext'
import { router } from '@/routes'
import '@/styles/globals.css'

const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AccessibilityProvider>
      <AuthProvider>
        <MembrosProvider>
          <MembroAtivoProvider>
            <VacinasProvider>
              <LembretesProvider>
                <RouterProvider router={router} />
              </LembretesProvider>
            </VacinasProvider>
          </MembroAtivoProvider>
        </MembrosProvider>
      </AuthProvider>
    </AccessibilityProvider>
  </StrictMode>
)
