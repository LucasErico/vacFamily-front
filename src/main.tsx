import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { AuthProvider } from '@/contexts/AuthContext'
import { router } from '@/routes'
import '@/styles/globals.css'

const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  </StrictMode>
)
