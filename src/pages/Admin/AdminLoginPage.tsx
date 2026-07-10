/**
 * AdminLoginPage
 * Tela de login exclusiva do painel admin.
 * Acesso somente via URL: /admin/login
 * Não há link público para esta página.
 */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShieldCheck, Eye, EyeOff } from 'lucide-react'

// Credenciais do admin — futuramente viraro env vars / backend
const ADMIN_PASS = 'vacfamily@admin2026'

const ADMIN_KEY = 'vacfamily_admin_session'
export function setAdminSession() { sessionStorage.setItem(ADMIN_KEY, '1') }
export function clearAdminSession() { sessionStorage.removeItem(ADMIN_KEY) }
export function isAdminLoggedIn() { return sessionStorage.getItem(ADMIN_KEY) === '1' }

export function AdminLoginPage() {
  const navigate = useNavigate()
  const [senha, setSenha] = useState('')
  const [mostrar, setMostrar] = useState(false)
  const [erro, setErro] = useState('')
  const [loading, setLoading] = useState(false)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro('')
    setLoading(true)
    setTimeout(() => {
      if (senha === ADMIN_PASS) {
        setAdminSession()
        navigate('/admin', { replace: true })
      } else {
        setErro('Senha incorreta.')
        setSenha('')
      }
      setLoading(false)
    }, 400)
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
        {/* Logo */}
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

        <form onSubmit={handleSubmit} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            <label
              htmlFor="admin-senha"
              style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-text)' }}
            >
              Senha de acesso
            </label>
            <div style={{ position: 'relative' }}>
              <input
                id="admin-senha"
                type={mostrar ? 'text' : 'password'}
                value={senha}
                onChange={e => setSenha(e.target.value)}
                placeholder="Digite a senha"
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
                  transition: 'border-color var(--transition)',
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
            disabled={loading || !senha}
            className="btn btn-primary"
            style={{ width: '100%', justifyContent: 'center' }}
          >
            {loading ? 'Verificando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  )
}
