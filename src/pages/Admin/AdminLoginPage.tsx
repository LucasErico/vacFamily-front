/**
 * AdminLoginPage
 * Login do painel admin usando e-mail + senha reais (mesma API /auth/login).
 * O token JWT é salvo na chave 'vf_token' do sessionStorage — a mesma usada
 * pelo apiFetch — para que as rotas protegidas do back recebam o Bearer token.
 *
 * Acesso somente via URL: /admin/login
 * Não há link público para esta página.
 */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShieldCheck, Eye, EyeOff, Loader2 } from 'lucide-react'
import { apiFetch, setToken } from '@/services/api'

const ADMIN_SESSION_KEY = 'vacfamily_admin_session'

export function setAdminSession(token: string) {
  setToken(token)  // injeta no apiFetch
  try { sessionStorage.setItem(ADMIN_SESSION_KEY, '1') } catch { /* noop */ }
}

export function clearAdminSession() {
  try {
    sessionStorage.removeItem(ADMIN_SESSION_KEY)
    sessionStorage.removeItem('vf_token')
  } catch { /* noop */ }
}

export function isAdminLoggedIn() {
  try { return sessionStorage.getItem(ADMIN_SESSION_KEY) === '1' } catch { return false }
}

interface LoginResponse {
  status: string
  access_token: string
  usuario: { id: string; email: string; nome: string }
}

export function AdminLoginPage() {
  const navigate = useNavigate()
  const [email, setEmail]     = useState('')
  const [senha, setSenha]     = useState('')
  const [mostrar, setMostrar] = useState(false)
  const [erro, setErro]       = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro('')
    setLoading(true)

    try {
      const res = await apiFetch<LoginResponse>('/auth/login', {
        method: 'POST',
        body: { email, senha },
      })

      setAdminSession(res.access_token)
      navigate('/admin', { replace: true })
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao autenticar')
      setSenha('')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100dvh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--color-bg)',
      padding: 'var(--space-4)',
    }}>
      <div style={{
        width: 'min(380px, 100%)',
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-xl)',
        boxShadow: 'var(--shadow-lg)',
        padding: 'var(--space-8) var(--space-6)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-6)',
        alignItems: 'center',
      }}>

        {/* Ícone */}
        <div style={{
          width: 56, height: 56,
          borderRadius: 'var(--radius-xl)',
          background: 'var(--color-primary)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <ShieldCheck size={28} color="#fff" aria-hidden />
        </div>

        <div style={{ textAlign: 'center' }}>
          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'var(--text-xl)',
            fontWeight: 700,
            color: 'var(--color-text)',
            marginBottom: 'var(--space-1)',
          }}>
            Painel Admin
          </h1>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>
            Acesso restrito — VacFamily
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}
        >
          {/* E-mail */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            <label htmlFor="admin-email" style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-text)' }}>
              E-mail
            </label>
            <input
              id="admin-email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="admin@vacfamily.com"
              autoComplete="username"
              required
              style={{
                width: '100%',
                padding: 'var(--space-3)',
                borderRadius: 'var(--radius-md)',
                border: `1.5px solid ${erro ? 'var(--color-error)' : 'var(--color-border)'}`,
                background: 'var(--color-bg)',
                color: 'var(--color-text)',
                fontSize: 'var(--text-sm)',
                outline: 'none',
              }}
            />
          </div>

          {/* Senha */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            <label htmlFor="admin-senha" style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-text)' }}>
              Senha
            </label>
            <div style={{ position: 'relative' }}>
              <input
                id="admin-senha"
                type={mostrar ? 'text' : 'password'}
                value={senha}
                onChange={e => setSenha(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                required
                style={{
                  width: '100%',
                  padding: 'var(--space-3) var(--space-10) var(--space-3) var(--space-3)',
                  borderRadius: 'var(--radius-md)',
                  border: `1.5px solid ${erro ? 'var(--color-error)' : 'var(--color-border)'}`,
                  background: 'var(--color-bg)',
                  color: 'var(--color-text)',
                  fontSize: 'var(--text-sm)',
                  outline: 'none',
                }}
              />
              <button
                type="button"
                onClick={() => setMostrar(v => !v)}
                aria-label={mostrar ? 'Ocultar senha' : 'Mostrar senha'}
                style={{
                  position: 'absolute', right: 'var(--space-3)', top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--color-text-muted)', display: 'flex', padding: 0,
                }}
              >
                {mostrar ? <EyeOff size={16} aria-hidden /> : <Eye size={16} aria-hidden />}
              </button>
            </div>
            {erro && (
              <p role="alert" style={{ fontSize: 'var(--text-xs)', color: 'var(--color-error)' }}>
                {erro}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || !email || !senha}
            className="btn btn-primary"
            style={{ width: '100%', justifyContent: 'center', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}
          >
            {loading && <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} aria-hidden />}
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  )
}
