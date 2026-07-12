/**
 * AuthContext — autenticação real via backend VacFamily
 * Endpoints: POST /auth/login | POST /auth/register | GET /auth/me
 * O JWT fica em sessionStorage via api.ts (setToken / clearToken).
 *
 * Criação automática de membro titular:
 *   Após qualquer login bem-sucedido, se o usuário ainda não possui
 *   nenhum membro cadastrado, cria automaticamente um membro com:
 *     nome  = usuario.nome
 *     relacao = 'outro'
 *     data_nascimento = fornecida no cadastro (salva em sessionStorage
 *                       como 'vf_reg_dob' e removida após o uso)
 *   Isso garante que todo usuário tenha pelo menos um membro próprio
 *   desde o primeiro acesso, inclusive após o fluxo de verificação
 *   de e-mail.
 */
import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import type { Usuario } from '@/types'
import { apiFetch, setToken, clearToken, getToken, wakeUpBack } from '@/services/api'

const SESSION_KEY = 'vf_session'
/** Chave temporária para preservar a data de nascimento entre cadastro e
 *  verificação de e-mail. Removida logo após a criação do membro. */
const DOB_KEY = 'vf_reg_dob'
/** Chave temporária para preservar o nome entre cadastro e verificação. */
const NOME_KEY = 'vf_reg_nome'

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
  register: (
    nome: string,
    email: string,
    senha: string,
    dataNascimento: string,
  ) => Promise<{ ok: boolean; requiresVerification?: boolean; erro?: string }>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

/**
 * Cria o membro titular do usuário se ainda não existir nenhum membro.
 * Silencioso em caso de falha — não interrompe o fluxo de autenticação.
 */
async function criarMembroTitularSeNecessario(
  nome: string,
  dataNascimento: string,
): Promise<void> {
  try {
    // Verifica se já há membros cadastrados
    const res = await apiFetch<{ membros?: unknown[] } | unknown[]>('/membros')
    const membros = Array.isArray(res) ? res : ((res as { membros?: unknown[] }).membros ?? [])
    if (membros.length > 0) return // titular já existe, nada a fazer

    await apiFetch('/membros', {
      method: 'POST',
      body: {
        nome,
        relacao: 'outro',
        data_nascimento: dataNascimento,
      },
    })
  } catch {
    // Fire-and-forget: falhas não bloqueiam o login
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(lerSessao)

  // Acorda o back no Render assim que o app é carregado.
  useEffect(() => { wakeUpBack() }, [])

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

      // Cria membro titular automaticamente se necessário.
      // A data de nascimento pode ter sido salva durante o cadastro
      // (fluxo com verificação de e-mail). O nome vem do próprio usuário.
      const dob  = sessionStorage.getItem(DOB_KEY)  ?? ''
      const nome = sessionStorage.getItem(NOME_KEY) ?? data.usuario.nome ?? ''
      if (dob) {
        await criarMembroTitularSeNecessario(nome, dob)
        sessionStorage.removeItem(DOB_KEY)
        sessionStorage.removeItem(NOME_KEY)
      } else {
        // Login comum (sem cadastro recente): ainda verifica e cria se
        // o usuário não tiver membros (ex.: conta criada antes desta feature)
        await criarMembroTitularSeNecessario(data.usuario.nome ?? nome, '')
      }

      return { ok: true }
    } catch (err) {
      return { ok: false, erro: (err as Error).message }
    }
  }

  async function register(
    nome: string,
    email: string,
    senha: string,
    dataNascimento: string,
  ) {
    try {
      const data = await apiFetch<RegisterResponse>('/auth/register', {
        method: 'POST',
        body: { nome, email, senha, data_nascimento: dataNascimento },
      })

      if (data.requiresVerification) {
        // Salva dob e nome para usar após o login pós-verificação
        try {
          sessionStorage.setItem(DOB_KEY, dataNascimento)
          sessionStorage.setItem(NOME_KEY, nome)
        } catch { /* noop */ }
        return { ok: true, requiresVerification: true }
      }

      if (data.access_token && data.usuario) {
        setToken(data.access_token)
        setUsuario(data.usuario)
        // Registro sem verificação: cria membro titular diretamente
        await criarMembroTitularSeNecessario(nome, dataNascimento)
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
