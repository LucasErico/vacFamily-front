import { createContext, useContext, useState, type ReactNode } from 'react'
import type { Usuario } from '@/types'

// Usuário mock para desenvolvimento
const MOCK_USER: Usuario = {
  id: 'usr_demo_001',
  nome: 'Demo VacFamily',
  email: 'demo@vacfamily.com',
  criadoEm: new Date().toISOString(),
}

interface AuthContextValue {
  usuario: Usuario | null
  isAuthenticated: boolean
  login: (email: string, senha: string) => Promise<{ ok: boolean; erro?: string }>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null)

  async function login(email: string, senha: string) {
    // Simula latência de rede
    await new Promise(r => setTimeout(r, 600))

    if (email === 'demo@vacfamily.com' && senha === 'demo1234') {
      setUsuario(MOCK_USER)
      return { ok: true }
    }

    return { ok: false, erro: 'E-mail ou senha incorretos.' }
  }

  function logout() {
    setUsuario(null)
  }

  return (
    <AuthContext.Provider value={{ usuario, isAuthenticated: !!usuario, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth deve ser usado dentro de <AuthProvider>')
  return ctx
}
