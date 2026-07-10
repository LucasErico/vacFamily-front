import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { RequireAuth } from '@/components/auth/RequireAuth'
import { DashboardPage } from '@/pages/Dashboard/DashboardPage'
import { MembrosPage } from '@/pages/Membros/MembrosPage'
import { MembroDetailPage } from '@/pages/Membros/MembroDetailPage'
import { MembroFormPage } from '@/pages/Membros/MembroFormPage'
import { VacinasPage } from '@/pages/Vacinas/VacinasPage'
import { VacinaMembroPage } from '@/pages/Vacinas/VacinaMembroPage'
import { RegistrarVacinaPage } from '@/pages/Vacinas/RegistrarVacinaPage'
import { LembretesPage } from '@/pages/Lembretes/LembretesPage'
import { HistoricoPage } from '@/pages/Historico/HistoricoPage'
import { LoginPage } from '@/pages/Auth/LoginPage'
import { RegisterPage } from '@/pages/Auth/RegisterPage'
import { AdminLoginPage } from '@/pages/Admin/AdminLoginPage'
import { AdminShell } from '@/pages/Admin/AdminShell'
import { AdminOverviewPage } from '@/pages/Admin/AdminOverviewPage'
import { AdminUsuariosPage } from '@/pages/Admin/AdminUsuariosPage'
import { AdminCardsPage } from '@/pages/Admin/AdminCardsPage'

export const router = createBrowserRouter([
  { path: '/login',       element: <LoginPage /> },
  { path: '/cadastro',    element: <RegisterPage /> },

  // ── Painel admin (acesso exclusivo via URL) ──────────────
  { path: '/admin/login', element: <AdminLoginPage /> },
  {
    path: '/admin',
    element: <AdminShell />,
    children: [
      { index: true,           element: <AdminOverviewPage /> },
      { path: 'usuarios',      element: <AdminUsuariosPage /> },
      { path: 'cards',         element: <AdminCardsPage /> },
    ],
  },

  { path: '*', element: <Navigate to="/" replace /> },
  {
    path: '/',
    element: <RequireAuth><AppShell /></RequireAuth>,
    children: [
      { index: true,                       element: <DashboardPage /> },
      { path: 'membros',                   element: <MembrosPage /> },
      { path: 'membros/novo',              element: <MembroFormPage /> },
      { path: 'membros/:id',               element: <MembroDetailPage /> },
      { path: 'membros/:id/editar',        element: <MembroFormPage /> },
      { path: 'vacinas',                   element: <VacinasPage /> },
      { path: 'vacinas/membro/:id',        element: <VacinaMembroPage /> },
      { path: 'vacinas/registrar',         element: <RegistrarVacinaPage /> },
      { path: 'agenda',                    element: <LembretesPage /> },
      { path: 'lembretes',                 element: <Navigate to="/agenda" replace /> },
      { path: 'historico',                 element: <HistoricoPage /> },
      { path: 'conteudo',                  element: <Navigate to="/historico" replace /> },
      { path: 'conteudo/:id',              element: <Navigate to="/historico" replace /> },
      { path: 'configuracoes',             element: <Navigate to="/" replace /> },
    ],
  },
])
