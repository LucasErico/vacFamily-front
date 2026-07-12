/**
 * ForgotPasswordPage — /esqueci-senha
 *
 * Fluxo em 2 etapas:
 *  1. Usuário informa o email cadastrado → POST /auth/forgot-password
 *  2. Usuário digita o código de 6 dígitos + nova senha → POST /auth/reset-password
 */
import { useState, useRef, type FormEvent, type KeyboardEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Syringe, Eye, EyeOff, ArrowLeft, Mail, ShieldCheck } from 'lucide-react'
import { apiFetch } from '@/services/api'

type Etapa = 'email' | 'codigo'

export function ForgotPasswordPage() {
  const navigate = useNavigate()
  const [etapa, setEtapa] = useState<Etapa>('email')

  // Etapa 1
  const [email, setEmail] = useState('')
  const [erroEmail, setErroEmail] = useState('')
  const [carregandoEmail, setCarregandoEmail] = useState(false)

  // Etapa 2
  const [codigo, setCodigo] = useState(['', '', '', '', '', ''])
  const [novaSenha, setNovaSenha] = useState('')
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [erroReset, setErroReset] = useState('')
  const [carregandoReset, setCarregandoReset] = useState(false)
  const [sucesso, setSucesso] = useState(false)

  const digitRefs = useRef<(HTMLInputElement | null)[]>([])

  // ── Etapa 1: enviar e-mail ─────────────────────────────
  async function handleEnviarEmail(e: FormEvent) {
    e.preventDefault()
    if (!email.trim()) { setErroEmail('Informe seu e-mail.'); return }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) { setErroEmail('E-mail inválido.'); return }
    setErroEmail('')
    setCarregandoEmail(true)
    try {
      await apiFetch('/auth/forgot-password', {
        method: 'POST',
        body: { email: email.trim().toLowerCase() },
      })
    } catch {
      // O backend sempre retorna 200 para não vazar se o e-mail existe.
      // Qualquer erro de rede é ignorado silenciosamente — avançamos
      // para a etapa 2 de qualquer forma.
    } finally {
      setCarregandoEmail(false)
    }
    setEtapa('codigo')
  }

  // ── Etapa 2: inputs de dígito ───────────────────────────
  function handleDigit(index: number, value: string) {
    const digit = value.replace(/\D/g, '').slice(-1)
    const next = [...codigo]
    next[index] = digit
    setCodigo(next)
    if (digit && index < 5) digitRefs.current[index + 1]?.focus()
  }

  function handleDigitKey(index: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !codigo[index] && index > 0) {
      digitRefs.current[index - 1]?.focus()
    }
  }

  function handleDigitPaste(e: React.ClipboardEvent) {
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (!text) return
    e.preventDefault()
    const next = [...codigo]
    text.split('').forEach((d, i) => { if (i < 6) next[i] = d })
    setCodigo(next)
    digitRefs.current[Math.min(text.length, 5)]?.focus()
  }

  // ── Etapa 2: confirmar reset ───────────────────────────
  async function handleReset(e: FormEvent) {
    e.preventDefault()
    const codigoCompleto = codigo.join('')
    if (codigoCompleto.length < 6) { setErroReset('Digite o código completo de 6 dígitos.'); return }
    if (novaSenha.length < 8) { setErroReset('A nova senha deve ter ao menos 8 caracteres.'); return }
    setErroReset('')
    setCarregandoReset(true)
    try {
      await apiFetch('/auth/reset-password', {
        method: 'POST',
        body: {
          email: email.trim().toLowerCase(),
          code: codigoCompleto,
          nova_senha: novaSenha,
        },
      })
      setSucesso(true)
      setTimeout(() => navigate('/login'), 2500)
    } catch (err) {
      const msg = (err as Error).message ?? ''
      if (msg.includes('expirado') || msg.includes('expired')) {
        setErroReset('Código expirado. Solicite um novo código.')
      } else if (msg.includes('inválido') || msg.includes('invalid') || msg.includes('400')) {
        setErroReset('Código inválido. Verifique e tente novamente.')
      } else {
        setErroReset('Erro ao redefinir a senha. Tente novamente.')
      }
    } finally {
      setCarregandoReset(false)
    }
  }

  if (sucesso) {
    return (
      <AuthLayout titulo="Senha redefinida!" subtitulo="Você será redirecionado para o login.">
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          gap: 'var(--space-4)', padding: 'var(--space-8)',
        }}>
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-6)' }}>
          <Link
            to="/login"
            aria-label="Voltar para login"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 36, height: 36, borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text-muted)',
              flexShrink: 0,
            }}
          >
            <ArrowLeft size={16} aria-hidden />
          </Link>
          <div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--color-text)' }}>
              {etapa === 'email' ? 'Esqueci minha senha' : 'Verificar código'}
            </h2>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginTop: 2 }}>
              Etapa {etapa === 'email' ? '1' : '2'} de 2
            </p>
          </div>
        </div>

        {/* ── Etapa 1: email ── */}
        {etapa === 'email' && (
          <form onSubmit={handleEnviarEmail} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <div style={{
              display: 'flex', gap: 'var(--space-3)', alignItems: 'flex-start',
              padding: 'var(--space-3) var(--space-4)',
              background: 'var(--color-primary-highlight)',
              borderRadius: 'var(--radius-md)',
            }}>
              <Mail size={16} style={{ color: 'var(--color-primary)', marginTop: 2, flexShrink: 0 }} aria-hidden />
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text)', lineHeight: 1.5 }}>
                Enviaremos um código de 6 dígitos para o e-mail cadastrado.
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
              {carregandoEmail ? 'Enviando…' : 'Enviar código'}
            </button>
          </form>
        )}

        {/* ── Etapa 2: código + nova senha ── */}
        {etapa === 'codigo' && (
          <form onSubmit={handleReset} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
            <div style={{
              padding: 'var(--space-3) var(--space-4)',
              background: 'var(--color-surface-offset)',
              borderRadius: 'var(--radius-md)',
              fontSize: 'var(--text-sm)',
              color: 'var(--color-text-muted)',
            }}>
              Código enviado para <strong style={{ color: 'var(--color-text)' }}>{email}</strong>
              {' '}·{' '}
              <button
                type="button"
                onClick={() => { setEtapa('email'); setCodigo(['','','','','','']); setErroReset('') }}
                style={{ color: 'var(--color-primary)', fontWeight: 600, fontSize: 'inherit', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              >
                Alterar e-mail
              </button>
            </div>

            {/* Inputs de 6 dígitos */}
            <div>
              <label style={labelStyle}>Código de verificação</label>
              <div
                style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'center' }}
                onPaste={handleDigitPaste}
              >
                {codigo.map((d, i) => (
                  <input
                    key={i}
                    ref={el => { digitRefs.current[i] = el }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={d}
                    onChange={e => handleDigit(i, e.target.value)}
                    onKeyDown={e => handleDigitKey(i, e)}
                    aria-label={`Dígito ${i + 1} do código`}
                    style={{
                      width: 44, height: 52,
                      textAlign: 'center',
                      fontSize: 'var(--text-lg)',
                      fontWeight: 700,
                      borderRadius: 'var(--radius-md)',
                      border: `2px solid ${d ? 'var(--color-primary)' : 'var(--color-border)'}`,
                      background: 'var(--color-bg)',
                      color: 'var(--color-text)',
                      outline: 'none',
                      transition: 'border-color 150ms ease',
                      fontFamily: 'inherit',
                    }}
                  />
                ))}
              </div>
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
                <button
                  type="button"
                  onClick={() => setMostrarSenha(v => !v)}
                  aria-label={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}
                  style={showBtnStyle}
                >
                  {mostrarSenha ? <EyeOff size={18} aria-hidden /> : <Eye size={18} aria-hidden />}
                </button>
              </div>
            </div>

            {erroReset && (
              <p role="alert" style={erroBlockStyle}>{erroReset}</p>
            )}

            <button
              type="submit"
              disabled={carregandoReset || codigo.join('').length < 6 || novaSenha.length < 8}
              className="btn btn-primary"
              style={{ width: '100%' }}
            >
              {carregandoReset ? 'Redefinindo…' : 'Redefinir senha'}
            </button>

            <p style={{ textAlign: 'center', fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
              Não recebeu o código?{' '}
              <button
                type="button"
                onClick={() => handleEnviarEmail({ preventDefault: () => {} } as FormEvent)}
                style={{ color: 'var(--color-primary)', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: 'inherit' }}
              >
                Reenviar
              </button>
            </p>
          </form>
        )}
      </div>
    </AuthLayout>
  )
}

// ── Sub-componente de layout compartilhado ──────────────────
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
