/**
 * ForgotPasswordPage — /esqueci-senha
 *
 * Fluxo em 2 etapas:
 *  1. Usuário informa o e-mail cadastrado
 *  2. Usuário digita a nova senha → POST /auth/reset-password { email, nova_senha }
 *
 * Obs.: fluxo simplificado para testes. Em produção o Supabase envia um
 * link mágico e o access_token chega via hash na URL.
 */
import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Syringe, Eye, EyeOff, ArrowLeft, Mail, ShieldCheck } from 'lucide-react'
import { apiFetch } from '@/services/api'

type Etapa = 'email' | 'senha'

export function ForgotPasswordPage() {
  const navigate = useNavigate()
  const [etapa, setEtapa] = useState<Etapa>('email')

  // Etapa 1
  const [email, setEmail] = useState('')
  const [erroEmail, setErroEmail] = useState('')
  const [carregandoEmail, setCarregandoEmail] = useState(false)

  // Etapa 2
  const [novaSenha, setNovaSenha] = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [mostrarConfirmar, setMostrarConfirmar] = useState(false)
  const [erroReset, setErroReset] = useState('')
  const [carregandoReset, setCarregandoReset] = useState(false)
  const [sucesso, setSucesso] = useState(false)

  // ── Etapa 1: confirmar e-mail ──────────────────────────
  async function handleAvancar(e: FormEvent) {
    e.preventDefault()
    if (!email.trim()) { setErroEmail('Informe seu e-mail.'); return }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) { setErroEmail('E-mail inválido.'); return }
    setErroEmail('')
    setCarregandoEmail(true)
    try {
      // Sinaliza ao backend para iniciar o fluxo (fire-and-forget —
      // não bloqueamos se falhar, pois a etapa 2 faz a operação real)
      await apiFetch('/auth/forgot-password', {
        method: 'POST',
        body: { email: email.trim().toLowerCase() },
      })
    } catch { /* ignora — não vaza se email existe */ }
    finally { setCarregandoEmail(false) }
    setEtapa('senha')
  }

  // ── Etapa 2: redefinir senha ───────────────────────────
  async function handleReset(e: FormEvent) {
    e.preventDefault()
    if (novaSenha.length < 8) { setErroReset('A senha deve ter ao menos 8 caracteres.'); return }
    if (novaSenha !== confirmarSenha) { setErroReset('As senhas não coincidem.'); return }
    setErroReset('')
    setCarregandoReset(true)
    try {
      await apiFetch('/auth/reset-password', {
        method: 'POST',
        body: {
          email: email.trim().toLowerCase(),
          nova_senha: novaSenha,
        },
      })
      setSucesso(true)
      setTimeout(() => navigate('/login'), 2500)
    } catch (err) {
      const msg = (err as Error).message ?? ''
      if (msg.includes('não encontrado') || msg.includes('not found') || msg.includes('404')) {
        setErroReset('E-mail não encontrado. Verifique e tente novamente.')
      } else {
        setErroReset('Erro ao redefinir a senha. Tente novamente.')
      }
    } finally {
      setCarregandoReset(false)
    }
  }

  // ── Tela de sucesso ──────────────────────────────
  if (sucesso) {
    return (
      <AuthLayout titulo="Senha redefinida!" subtitulo="Você será redirecionado para o login.">
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-4)', padding: 'var(--space-8)' }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%',
            background: 'var(--color-success-highlight)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <ShieldCheck size={32} color="var(--color-success)" aria-hidden />
          </div>
          <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>
            Senha alterada com sucesso! Redirecionando…
          </p>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout titulo="Recuperar acesso" subtitulo="Vamos redefinir sua senha">
      <div className="card">

        {/* Cabeçalho com botão voltar */}
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
          <div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--color-text)' }}>
              {etapa === 'email' ? 'Esqueci minha senha' : 'Nova senha'}
            </h2>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginTop: 2 }}>
              Etapa {etapa === 'email' ? '1' : '2'} de 2
            </p>
          </div>
        </div>

        {/* ── Etapa 1: e-mail ── */}
        {etapa === 'email' && (
          <form onSubmit={handleAvancar} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <div style={{
              display: 'flex', gap: 'var(--space-3)', alignItems: 'flex-start',
              padding: 'var(--space-3) var(--space-4)',
              background: 'var(--color-primary-highlight)',
              borderRadius: 'var(--radius-md)',
            }}>
              <Mail size={16} style={{ color: 'var(--color-primary)', marginTop: 2, flexShrink: 0 }} aria-hidden />
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text)', lineHeight: 1.5 }}>
                Informe o e-mail da sua conta para continuar.
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

            <button type="submit" disabled={carregandoEmail} className="btn btn-primary" style={{ width: '100%' }}>
              {carregandoEmail ? 'Verificando…' : 'Continuar'}
            </button>
          </form>
        )}

        {/* ── Etapa 2: nova senha ── */}
        {etapa === 'senha' && (
          <form onSubmit={handleReset} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <div style={{
              padding: 'var(--space-3) var(--space-4)',
              background: 'var(--color-surface-offset)',
              borderRadius: 'var(--radius-md)',
              fontSize: 'var(--text-sm)',
              color: 'var(--color-text-muted)',
            }}>
              Redefinindo senha para{' '}
              <strong style={{ color: 'var(--color-text)' }}>{email}</strong>
              {' '}·{' '}
              <button
                type="button"
                onClick={() => { setEtapa('email'); setErroReset(''); setNovaSenha(''); setConfirmarSenha('') }}
                style={{ color: 'var(--color-primary)', fontWeight: 600, fontSize: 'inherit', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              >
                Alterar
              </button>
            </div>

            {/* Nova senha */}
            <div>
              <label htmlFor="nova-senha" style={labelStyle}>Nova senha</label>
              <div style={{ position: 'relative' }}>
                <input
                  id="nova-senha"
                  type={mostrarSenha ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={novaSenha}
                  onChange={e => setNovaSenha(e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  className="input-field"
                  style={{ paddingRight: 'var(--space-12)' }}
                />
                <button type="button" onClick={() => setMostrarSenha(v => !v)} aria-label={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'} style={showBtnStyle}>
                  {mostrarSenha ? <EyeOff size={18} aria-hidden /> : <Eye size={18} aria-hidden />}
                </button>
              </div>
            </div>

            {/* Confirmar senha */}
            <div>
              <label htmlFor="confirmar-senha" style={labelStyle}>Confirmar senha</label>
              <div style={{ position: 'relative' }}>
                <input
                  id="confirmar-senha"
                  type={mostrarConfirmar ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={confirmarSenha}
                  onChange={e => setConfirmarSenha(e.target.value)}
                  placeholder="Repita a nova senha"
                  className="input-field"
                  style={{ paddingRight: 'var(--space-12)' }}
                />
                <button type="button" onClick={() => setMostrarConfirmar(v => !v)} aria-label={mostrarConfirmar ? 'Ocultar confirmação' : 'Mostrar confirmação'} style={showBtnStyle}>
                  {mostrarConfirmar ? <EyeOff size={18} aria-hidden /> : <Eye size={18} aria-hidden />}
                </button>
              </div>
            </div>

            {erroReset && (
              <p role="alert" style={erroBlockStyle}>{erroReset}</p>
            )}

            <button
              type="submit"
              disabled={carregandoReset || novaSenha.length < 8 || !confirmarSenha}
              className="btn btn-primary"
              style={{ width: '100%' }}
            >
              {carregandoReset ? 'Salvando…' : 'Redefinir senha'}
            </button>
          </form>
        )}
      </div>
    </AuthLayout>
  )
}

// ── Layout compartilhado ───────────────────────────────
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
const erroBlockStyle: React.CSSProperties = {
  fontSize: 'var(--text-sm)', color: 'var(--color-error)',
  background: 'var(--color-error-highlight)',
  padding: 'var(--space-3) var(--space-4)', borderRadius: 'var(--radius-md)',
}
const showBtnStyle: React.CSSProperties = {
  position: 'absolute', right: 'var(--space-3)', top: '50%', transform: 'translateY(-50%)',
  color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center',
  minWidth: '44px', minHeight: '44px', justifyContent: 'center',
}
