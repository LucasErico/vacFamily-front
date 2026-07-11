/**
 * AuthContext — autenticação real via backend VacFamily
 * Endpoints: POST /auth/login | POST /auth/register | GET /auth/me
 * O JWT fica em sessionStorage via api.ts (setToken / clearToken).
 */
import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import type { Usuario } from '@/types'
import { apiFetch, setToken, clearToken, getToken } from '@/services/api'

const SESSION_KEY = 'vf_session'

function lerSessao(): Usuario | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY)
    return raw ? (JSON.parse(raw) as Usuario) : null
  } catch { return null }
}

function salvarSessao(u: Usuario | null) {
  try {
    if (u) sessionStorage.setItem(SESSION_KEY, JSON.stringify(u))
    else sessionStorage.removeItem(SESSION_KEY)
  } catch { /* noop */ }
}

interface LoginResponse {
  access_token: string
  usuario: Usuario
}

interface RegisterResponse {
  access_token?: string
  usuario?: Usuario
  requiresVerification?: boolean
  message?: string
}

interface AuthContextValue {
  usuario: Usuario | null
  isAuthenticated: boolean
  login: (email: string, senha: string) => Promise<{ ok: boolean; erro?: string }>
  register: (nome: string, email: string, senha: string) => Promise<{ ok: boolean; requiresVerification?: boolean; erro?: string }>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(lerSessao)

  // Sincroniza sessionStorage
  useEffect(() => { salvarSessao(usuario) }, [usuario])

  // Ao montar, se há token mas não há usuário em memória, busca /auth/me
  useEffect(() => {
    if (!usuario && getToken()) {
      apiFetch<{ status: string; usuario: Usuario }>('/auth/me')
        .then(r => setUsuario(r.usuario))
        .catch(() => clearToken())
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function login(email: string, senha: string) {
    try {
      const data = await apiFetch<LoginResponse>('/auth/login', {
        method: 'POST',
        body: { email, senha },
      })
      setToken(data.access_token)
      setUsuario(data.usuario)
      return { ok: true }
    } catch (err) {
      return { ok: false, erro: (err as Error).message }
    }
  }

  async function register(nome: string, email: string, senha: string) {
    try {
      const data = await apiFetch<RegisterResponse>('/auth/register', {
        method: 'POST',
        body: { nome, email, senha },
      })
      if (data.requiresVerification) {
        return { ok: true, requiresVerification: true }
      }
      // Cadastro sem verificação: já recebe token
      if (data.access_token && data.usuario) {
        setToken(data.access_token)
        setUsuario(data.usuario)
      }
      return { ok: true, requiresVerification: false }
    } catch (err) {
      return { ok: false, erro: (err as Error).message }
    }
  }

  function logout() {
    clearToken()
    setUsuario(null)
  }

  return (
    <AuthContext.Provider value={{ usuario, isAuthenticated: !!usuario, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth deve ser usado dentro de <AuthProvider>')
  return ctx
}
