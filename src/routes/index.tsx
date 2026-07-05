import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { RequireAuth } from '@/components/auth/RequireAuth'
import { DashboardPage } from '@/pages/Dashboard/DashboardPage'
import { MembrosPage } from '@/pages/Membros/MembrosPage'
import { MembroDetailPage } from '@/pages/Membros/MembroDetailPage'
import { VacinasPage } from '@/pages/Vacinas/VacinasPage'
import { RegistrarVacinaPage } from '@/pages/Vacinas/RegistrarVacinaPage'
import { LembretesPage } from '@/pages/Lembretes/LembretesPage'
import { ConteudoPage } from '@/pages/Conteudo/ConteudoPage'
import { ConteudoDetailPage } from '@/pages/Conteudo/ConteudoDetailPage'
import { AssistentePage } from '@/pages/Assistente/AssistentePage'
import { ConfiguracoesPage } from '@/pages/Configuracoes/ConfiguracoesPage'
import { LoginPage } from '@/pages/Auth/LoginPage'
import { RegisterPage } from '@/pages/Auth/RegisterPage'

export const router = createBrowserRouter([
  { path: '/login',    element: <LoginPage /> },
  { path: '/cadastro', element: <RegisterPage /> },
  { path: '*',         element: <Navigate to="/" replace /> },
  {
    path: '/',
    element: <RequireAuth><AppShell /></RequireAuth>,
    children: [
      { index: true,                element: <DashboardPage /> },
      { path: 'membros',            element: <MembrosPage /> },
      { path: 'membros/:id',        element: <MembroDetailPage /> },
      { path: 'vacinas',            element: <VacinasPage /> },
      { path: 'vacinas/registrar',  element: <RegistrarVacinaPage /> },
      { path: 'lembretes',          element: <LembretesPage /> },
      { path: 'conteudo',           element: <ConteudoPage /> },
      { path: 'conteudo/:id',       element: <ConteudoDetailPage /> },
      { path: 'assistente',         element: <AssistentePage /> },
      { path: 'configuracoes',      element: <ConfiguracoesPage /> },
    ],
  },
])
