/**
 * ForgotPasswordPage — /esqueci-senha
 *
 * Envia o e-mail de recuperação via POST /auth/forgot-password.
 * O Supabase dispara um link mágico para /reset-password com o
 * access_token no hash da URL.
 */
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Syringe, ArrowLeft, Mail, CheckCircle } from 'lucide-react'
import { apiFetch } from '@/services/api'

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [erroEmail, setErroEmail] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [enviado, setEnviado] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!email.trim()) { setErroEmail('Informe seu e-mail.'); return }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) { setErroEmail('E-mail inválido.'); return }
    setErroEmail('')
    setCarregando(true)
    try {
      await apiFetch('/auth/forgot-password', {
        method: 'POST',
        body: { email: email.trim().toLowerCase() },
      })
    } catch { /* ignora — não vaza se e-mail existe */ }
    finally { setCarregando(false) }
    setEnviado(true)
  }

  return (
    <AuthLayout titulo="Recuperar acesso" subtitulo="Redefinir senha por e-mail">
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-6)' }}>
          <Link
            to="/login"
            aria-label="Voltar para login"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 36, height: 36, borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text-muted)', flexShrink: 0,
            }}
          >
            <ArrowLeft size={16} aria-hidden />
          </Link>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--color-text)' }}>
            Esqueci minha senha
          </h2>
        </div>

        {!enviado ? (
          <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <div style={{
              display: 'flex', gap: 'var(--space-3)', alignItems: 'flex-start',
              padding: 'var(--space-3) var(--space-4)',
              background: 'var(--color-primary-highlight)',
              borderRadius: 'var(--radius-md)',
            }}>
              <Mail size={16} style={{ color: 'var(--color-primary)', marginTop: 2, flexShrink: 0 }} aria-hidden />
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text)', lineHeight: 1.5 }}>
                Enviaremos um link para redefinir sua senha.
              </p>
            </div>

            <div>
              <label htmlFor="email-forgot" style={labelStyle}>E-mail cadastrado</label>
              <input
                id="email-forgot"
                type="email"
                autoComplete="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="seu@email.com"
                className={`input-field${erroEmail ? ' error' : ''}`}
                aria-describedby={erroEmail ? 'erro-email' : undefined}
              />
              {erroEmail && (
                <p id="erro-email" role="alert" style={erroInlineStyle}>{erroEmail}</p>
              )}
            </div>

            <button type="submit" disabled={carregando} className="btn btn-primary" style={{ width: '100%' }}>
              {carregando ? 'Enviando…' : 'Enviar link de recuperação'}
            </button>
          </form>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-4)', padding: 'var(--space-6) 0', textAlign: 'center' }}>
            <div style={{
              width: 56, height: 56, borderRadius: '50%',
              background: 'var(--color-success-highlight)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <CheckCircle size={28} color="var(--color-success)" aria-hidden />
            </div>
            <div>
              <p style={{ fontWeight: 600, color: 'var(--color-text)', marginBottom: 'var(--space-1)' }}>
                Verifique seu e-mail
              </p>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', maxWidth: '30ch', margin: '0 auto' }}>
                Se <strong>{email}</strong> estiver cadastrado, você receberá um link em instantes.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setEnviado(false)}
              style={{ color: 'var(--color-primary)', fontWeight: 600, fontSize: 'var(--text-sm)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            >
              Tentar outro e-mail
            </button>
          </div>
        )}
      </div>
    </AuthLayout>
  )
}

function AuthLayout({ titulo, subtitulo, children }: { titulo: string; subtitulo: string; children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--space-4)', background: 'var(--color-bg)' }}>
      <div style={{ width: '100%', maxWidth: '420px' }}>
        <div style={{ textAlign: 'center', marginBottom: 'var(--space-8)' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: '56px', height: '56px', borderRadius: 'var(--radius-xl)',
            background: 'var(--color-primary)', marginBottom: 'var(--space-4)',
          }}>
            <Syringe size={28} color="var(--color-text-inverse)" aria-hidden />
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-xl)', fontWeight: 800, color: 'var(--color-text)', marginBottom: 'var(--space-1)' }}>
            {titulo}
          </h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>{subtitulo}</p>
        </div>
        {children}
      </div>
    </div>
  )
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 'var(--text-sm)', fontWeight: 500,
  marginBottom: 'var(--space-2)', color: 'var(--color-text)',
}
const erroInlineStyle: React.CSSProperties = {
  fontSize: 'var(--text-xs)', color: 'var(--color-error)', marginTop: 'var(--space-1)',
}
