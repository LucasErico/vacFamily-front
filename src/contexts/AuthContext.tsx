/**
 * AuthContext — autenticação real via backend VacFamily
 * Endpoints: POST /auth/login | POST /auth/register | GET /auth/me
 * O JWT fica em sessionStorage via api.ts (setToken / clearToken).
 *
 * Criação automática de membro titular:
 *   O register() SEMPRE salva DOB/NOME/SEXO em sessionStorage.
 *   O login() lê essas chaves após autenticar e cria o membro se
 *   o usuário ainda não tiver nenhum, depois limpa as chaves.
 *   Isso garante que o fluxo funcione tanto com quanto sem
 *   verificação de e-mail.
 */
import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import type { Sexo, TipoCalendario, Usuario } from '@/types'
import { apiFetch, setToken, clearToken, getToken, wakeUpBack } from '@/services/api'

const SESSION_KEY = 'vf_session'
const DOB_KEY     = 'vf_reg_dob'
const NOME_KEY    = 'vf_reg_nome'
const SEXO_KEY    = 'vf_reg_sexo'

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

/** Infere tipo_calendario pela idade calculada a partir da data de nascimento. */
function inferirTipoCalendario(dataNascimento: string): TipoCalendario {
  const hoje = new Date()
  const nasc = new Date(dataNascimento)
  const idadeAnos = hoje.getFullYear() - nasc.getFullYear()
    - (hoje < new Date(hoje.getFullYear(), nasc.getMonth(), nasc.getDate()) ? 1 : 0)
  if (idadeAnos < 10) return 'infantil'
  if (idadeAnos < 20) return 'adolescente'
  if (idadeAnos < 60) return 'adulto'
  return 'idoso'
}

/** Persiste os dados de cadastro para uso no próximo login(). */
function salvarDadosCadastro(nome: string, dataNascimento: string, sexo: Sexo) {
  try {
    sessionStorage.setItem(DOB_KEY,  dataNascimento)
    sessionStorage.setItem(NOME_KEY, nome)
    sessionStorage.setItem(SEXO_KEY, sexo)
  } catch { /* noop */ }
}

/** Remove as chaves temporárias de cadastro do sessionStorage. */
function limparDadosCadastro() {
  try {
    sessionStorage.removeItem(DOB_KEY)
    sessionStorage.removeItem(NOME_KEY)
    sessionStorage.removeItem(SEXO_KEY)
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
    sexo: Sexo,
  ) => Promise<{ ok: boolean; requiresVerification?: boolean; erro?: string }>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

/**
 * Cria o membro titular se o usuário ainda não tiver nenhum membro.
 * Silencioso em caso de falha — nunca interrompe o fluxo de autenticação.
 */
async function criarMembroTitularSeNecessario(
  nome: string,
  dataNascimento: string,
  sexo: Sexo,
): Promise<void> {
  if (!dataNascimento) return
  try {
    const res = await apiFetch<{ membros?: unknown[] } | unknown[]>('/membros')
    const membros = Array.isArray(res) ? res : ((res as { membros?: unknown[] }).membros ?? [])
    if (membros.length > 0) return

    await apiFetch('/membros', {
      method: 'POST',
      body: {
        nome,
        relacao: 'outro',
        data_nascimento: dataNascimento,
        sexo,
        tipo_calendario: inferirTipoCalendario(dataNascimento),
      },
    })
  } catch {
    // fire-and-forget
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(lerSessao)

  useEffect(() => { wakeUpBack() }, [])
  useEffect(() => { salvarSessao(usuario) }, [usuario])

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

      // Lê dados salvos pelo register() e cria o membro titular se necessário
      const dob  = sessionStorage.getItem(DOB_KEY)  ?? ''
      const nome = sessionStorage.getItem(NOME_KEY) ?? data.usuario.nome ?? ''
      const sexo = (sessionStorage.getItem(SEXO_KEY) ?? 'outro') as Sexo

      if (dob) {
        await criarMembroTitularSeNecessario(nome, dob, sexo)
        limparDadosCadastro()
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
    sexo: Sexo,
  ) {
    try {
      const data = await apiFetch<RegisterResponse>('/auth/register', {
        method: 'POST',
        body: { nome, email, senha, data_nascimento: dataNascimento },
      })

      // Sempre salva os dados para o login() criar o membro titular.
      // Funciona tanto no fluxo com quanto sem verificação de e-mail,
      // pois em ambos os casos o usuário passará pelo login() a seguir.
      salvarDadosCadastro(nome, dataNascimento, sexo)

      if (data.requiresVerification) {
        return { ok: true, requiresVerification: true }
      }

      // Sem verificação: não loga automaticamente — redireciona para /login
      // (RegisterPage já faz navigate('/login')). Não chama setToken/setUsuario
      // aqui para que o fluxo passe obrigatoriamente pelo login().
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
