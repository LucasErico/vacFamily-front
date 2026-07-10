/**
 * VerifyEmailPage — /verificar-email
 *
 * Exibida após o cadastro normal (sem modo teste) para o usuário
 * confirmar o e-mail via token enviado pelo back-end.
 *
 * TODO (back-end):
 *  - POST /auth/verify-email  { email, code }
 *    200 OK → redirecionar para /  (usuário autenticado)
 *    400    → código inválido / expirado
 *  - POST /auth/resend-verification  { email }
 *    200 OK → cooldown reinicia
 *    429    → rate limit atingido
 *
 * O email do usuário é passado via location.state.email (navigate).
 * Se ausente, redireciona para /cadastro.
 */
import { useState, useRef, useEffect, type KeyboardEvent } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Syringe, Mail, ArrowLeft, RotateCcw } from 'lucide-react'

const COOLDOWN_S = 60

export function VerifyEmailPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login } = useAuth()

  const email: string = (location.state as { email?: string })?.email ?? ''

  useEffect(() => {
    if (!email) navigate('/cadastro', { replace: true })
  }, [email, navigate])

  const [codigo, setCodigo] = useState(['', '', '', '', '', ''])
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)

  const [cooldown, setCooldown] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  function iniciarCooldown() {
    setCooldown(COOLDOWN_S)
    timerRef.current = setInterval(() => {
      setCooldown(c => {
        if (c <= 1) { clearInterval(timerRef.current!); return 0 }
        return c - 1
      })
    }, 1000)
  }

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current) }, [])

  const digitRefs = useRef<(HTMLInputElement | null)[]>([])

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

  function handlePaste(e: React.ClipboardEvent) {
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (!text) return
    e.preventDefault()
    const next = [...codigo]
    text.split('').forEach((d, i) => { if (i < 6) next[i] = d })
    setCodigo(next)
    digitRefs.current[Math.min(text.length, 5)]?.focus()
  }

  async function handleVerificar() {
    const codigoCompleto = codigo.join('')
    if (codigoCompleto.length < 6) { setErro('Digite o código completo de 6 dígitos.'); return }
    setErro('')
    setCarregando(true)

    // TODO: const res = await api.post('/auth/verify-email', { email, code: codigoCompleto })
    // Mock: código 654321 é válido para teste
    await new Promise(r => setTimeout(r, 900))
    if (codigoCompleto !== '654321') {
      setErro('Código inválido ou expirado. Tente reenviar.')
      setCarregando(false)
      return
    }

    // TODO: após verificação, o back retorna token de sessão → chamar login real
    await login('demo@vacfamily.com', 'demo1234')
    setCarregando(false)
    navigate('/', { replace: true })
  }

  async function handleReenviar() {
    if (cooldown > 0) return
    // TODO: await api.post('/auth/resend-verification', { email })
    await new Promise(r => setTimeout(r, 500))
    iniciarCooldown()
  }

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
            Verificar e-mail
          </h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>
            Confirme seu endereço de e-mail
          </p>
        </div>

        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-6)' }}>
            <Link to="/cadastro" aria-label="Voltar para cadastro" style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 36, height: 36, borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border)', color: 'var(--color-text-muted)', flexShrink: 0,
            }}>
              <ArrowLeft size={16} aria-hidden />
            </Link>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--color-text)' }}>
              Confirmar e-mail
            </h2>
          </div>

          {/* Info */}
          <div style={{
            display: 'flex', gap: 'var(--space-3)', alignItems: 'flex-start',
            padding: 'var(--space-3) var(--space-4)',
            background: 'var(--color-primary-highlight)',
            borderRadius: 'var(--radius-md)',
            marginBottom: 'var(--space-5)',
          }}>
            <Mail size={16} style={{ color: 'var(--color-primary)', marginTop: 2, flexShrink: 0 }} aria-hidden />
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text)', lineHeight: 1.55 }}>
              Enviamos um código de 6 dígitos para{' '}
              <strong>{email || 'seu e-mail'}</strong>.
              Verifique sua caixa de entrada (e spam).
            </p>
          </div>

          {/* Inputs de dígito */}
          <div style={{ marginBottom: 'var(--space-5)' }}>
            <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 500, marginBottom: 'var(--space-3)', color: 'var(--color-text)' }}>
              Código de verificação
            </label>
            <div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'center' }} onPaste={handlePaste}>
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
                    width: 44, height: 52, textAlign: 'center',
                    fontSize: 'var(--text-lg)', fontWeight: 700,
                    borderRadius: 'var(--radius-md)',
                    border: `2px solid ${d ? 'var(--color-primary)' : 'var(--color-border)'}`,
                    background: 'var(--color-bg)', color: 'var(--color-text)',
                    outline: 'none', transition: 'border-color 150ms ease', fontFamily: 'inherit',
                  }}
                />
              ))}
            </div>
            <p style={{ textAlign: 'center', fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginTop: 'var(--space-2)' }}>
              (Mock: use <strong>654321</strong> para testar)
            </p>
          </div>

          {erro && <p role="alert" style={{ fontSize: 'var(--text-sm)', color: 'var(--color-error)', background: 'var(--color-error-highlight)', padding: 'var(--space-3) var(--space-4)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-4)' }}>{erro}</p>}

          <button
            type="button"
            onClick={handleVerificar}
            disabled={carregando || codigo.join('').length < 6}
            className="btn btn-primary"
            style={{ width: '100%', marginBottom: 'var(--space-4)' }}
          >
            {carregando ? 'Verificando…' : 'Confirmar e-mail'}
          </button>

          {/* Reenviar */}
          <div style={{ textAlign: 'center' }}>
            <button
              type="button"
              onClick={handleReenviar}
              disabled={cooldown > 0}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)',
                fontSize: 'var(--text-sm)', color: cooldown > 0 ? 'var(--color-text-faint)' : 'var(--color-primary)',
                fontWeight: 600, background: 'none', border: 'none',
                cursor: cooldown > 0 ? 'not-allowed' : 'pointer', padding: 0,
              }}
            >
              <RotateCcw size={14} aria-hidden />
              {cooldown > 0 ? `Reenviar em ${cooldown}s` : 'Reenviar código'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
