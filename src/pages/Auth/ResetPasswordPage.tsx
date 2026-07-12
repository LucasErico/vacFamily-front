/**
 * ResetPasswordPage — /reset-password
 *
 * Chamada pelo link mágico do Supabase.
 * O access_token chega no hash da URL:
 *   /reset-password#access_token=XXX&type=recovery
 *
 * Fluxo:
 *  1. Lê o access_token do hash
 *  2. Usuário digita a nova senha
 *  3. POST /auth/reset-password com Authorization: Bearer <access_token>
 *     e body { senha }
 */
import { useState, useEffect, type FormEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Syringe, Eye, EyeOff, ShieldCheck, AlertCircle } from 'lucide-react'
import { apiFetch } from '@/services/api'

export function ResetPasswordPage() {
  const navigate = useNavigate()
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [tokenError, setTokenError] = useState(false)

  const [senha, setSenha] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [mostrarConfirmar, setMostrarConfirmar] = useState(false)
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [sucesso, setSucesso] = useState(false)

  // Lê o access_token do hash da URL ao montar
  useEffect(() => {
    const hash = window.location.hash.substring(1)
    const params = new URLSearchParams(hash)
    const token = params.get('access_token')
    const type  = params.get('type')
    if (token && type === 'recovery') {
      setAccessToken(token)
    } else {
      setTokenError(true)
    }
  }, [])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (senha.length < 6) { setErro('A senha deve ter ao menos 6 caracteres.'); return }
    if (senha !== confirmar) { setErro('As senhas não coincidem.'); return }
    setErro('')
    setCarregando(true)
    try {
      await apiFetch('/auth/reset-password', {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
        body: { senha },
      })
      setSucesso(true)
      setTimeout(() => navigate('/login'), 2500)
    } catch (err) {
      const msg = (err as Error).message ?? ''
      if (msg.includes('expired') || msg.includes('expirado')) {
        setErro('O link expirou. Solicite um novo em “Esqueci minha senha”.')
      } else {
        setErro('Erro ao redefinir a senha. Tente novamente.')
      }
    } finally {
      setCarregando(false)
    }
  }

  // Link inválido ou ausente
  if (tokenError) {
    return (
      <AuthLayout titulo="Link inválido" subtitulo="">
        <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-4)', padding: 'var(--space-8)', textAlign: 'center' }}>
          <AlertCircle size={40} color="var(--color-error)" aria-hidden />
          <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>
            Este link é inválido ou já expirou.
          </p>
          <Link to="/esqueci-senha" className="btn btn-primary" style={{ width: '100%', textAlign: 'center' }}>
            Solicitar novo link
          </Link>
        </div>
      </AuthLayout>
    )
  }

  // Sucesso
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
    <AuthLayout titulo="Nova senha" subtitulo="Escolha uma senha segura">
      <div className="card">
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--color-text)', marginBottom: 'var(--space-6)' }}>
          Redefinir senha
        </h2>

        <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {/* Nova senha */}
          <div>
            <label htmlFor="nova-senha" style={labelStyle}>Nova senha</label>
            <div style={{ position: 'relative' }}>
              <input
                id="nova-senha"
                type={mostrarSenha ? 'text' : 'password'}
                autoComplete="new-password"
                value={senha}
                onChange={e => setSenha(e.target.value)}
                placeholder="Mínimo 6 caracteres"
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
                value={confirmar}
                onChange={e => setConfirmar(e.target.value)}
                placeholder="Repita a nova senha"
                className="input-field"
                style={{ paddingRight: 'var(--space-12)' }}
              />
              <button type="button" onClick={() => setMostrarConfirmar(v => !v)} aria-label={mostrarConfirmar ? 'Ocultar confirmação' : 'Mostrar confirmação'} style={showBtnStyle}>
                {mostrarConfirmar ? <EyeOff size={18} aria-hidden /> : <Eye size={18} aria-hidden />}
              </button>
            </div>
          </div>

          {erro && (
            <p role="alert" style={erroBlockStyle}>{erro}</p>
          )}

          <button
            type="submit"
            disabled={carregando || senha.length < 6 || !confirmar}
            className="btn btn-primary"
            style={{ width: '100%' }}
          >
            {carregando ? 'Salvando…' : 'Redefinir senha'}
          </button>
        </form>
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
          {subtitulo && <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>{subtitulo}</p>}
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
