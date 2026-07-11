import { useState, type FormEvent } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useA11y } from '@/contexts/AccessibilityContext'
import { Syringe, Eye, EyeOff, Sun, Moon, Accessibility } from 'lucide-react'
import { AccessibilityPanel } from '@/components/ui/AccessibilityPanel'

export function LoginPage() {
  const { login } = useAuth()
  const { theme, toggleTheme } = useA11y()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? '/'

  const [email, setEmail]                   = useState('')
  const [senha, setSenha]                   = useState('')
  const [mostrarSenha, setMostrarSenha]     = useState(false)
  const [erro, setErro]                     = useState('')
  const [carregando, setCarregando]         = useState(false)
  const [painelAberto, setPainelAberto]     = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!email || !senha) { setErro('Preencha todos os campos.'); return }
    setErro('')
    setCarregando(true)
    const result = await login(email, senha)
    setCarregando(false)
    if (result.ok) {
      navigate(from, { replace: true })
    } else {
      setErro(result.erro ?? 'Erro ao fazer login.')
    }
  }

  return (
    <div style={{
      minHeight: '100dvh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', padding: 'var(--space-4)', background: 'var(--color-bg)',
    }}>
      <div style={{
        position: 'fixed', top: 'var(--space-3)', right: 'var(--space-3)',
        display: 'flex', alignItems: 'center', gap: 'var(--space-1)', zIndex: 10,
      }}>
        <button className="theme-toggle" onClick={toggleTheme}
          aria-label={`Alternar para modo ${theme === 'dark' ? 'claro' : 'escuro'}`}
          title={`Modo ${theme === 'dark' ? 'claro' : 'escuro'}`}>
          {theme === 'dark' ? <Sun size={20} aria-hidden /> : <Moon size={20} aria-hidden />}
        </button>
        <button className="theme-toggle" onClick={() => setPainelAberto(v => !v)}
          aria-label="Opções de acessibilidade" aria-expanded={painelAberto} aria-haspopup="dialog" title="Acessibilidade">
          <Accessibility size={20} aria-hidden />
        </button>
      </div>

      {painelAberto && <AccessibilityPanel onClose={() => setPainelAberto(false)} />}

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
            VacFamily
          </h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>
            Acompanhamento vacinal da sua família
          </p>
        </div>

        <div className="card">
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-lg)', fontWeight: 700, marginBottom: 'var(--space-6)', color: 'var(--color-text)' }}>
            Entrar
          </h2>

          <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <div>
              <label htmlFor="email" style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 500, marginBottom: 'var(--space-2)', color: 'var(--color-text)' }}>
                E-mail
              </label>
              <input id="email" type="email" autoComplete="email" value={email}
                onChange={e => setEmail(e.target.value)} placeholder="seu@email.com"
                className={`input-field${erro ? ' error' : ''}`}
                aria-describedby={erro ? 'erro-login' : undefined} />
            </div>

            <div>
              <label htmlFor="senha" style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 500, marginBottom: 'var(--space-2)', color: 'var(--color-text)' }}>
                Senha
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  id="senha"
                  type={mostrarSenha ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={senha}
                  onChange={e => setSenha(e.target.value)}
                  placeholder="Sua senha"
                  className={`input-field${erro ? ' error' : ''}`}
                  style={{ paddingRight: 'var(--space-12)' }}
                  aria-describedby={erro ? 'erro-login' : undefined}
                />
                <button type="button" onClick={() => setMostrarSenha(v => !v)}
                  aria-label={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}
                  style={{
                    position: 'absolute', right: 'var(--space-3)', top: '50%', transform: 'translateY(-50%)',
                    color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center',
                    minWidth: '44px', minHeight: '44px', justifyContent: 'center',
                  }}>
                  {mostrarSenha ? <EyeOff size={18} aria-hidden /> : <Eye size={18} aria-hidden />}
                </button>
              </div>
              <div style={{ textAlign: 'right', marginTop: 'var(--space-2)' }}>
                <Link to="/esqueci-senha"
                  style={{ fontSize: 'var(--text-xs)', color: 'var(--color-primary)', fontWeight: 600 }}>
                  Esqueci minha senha
                </Link>
              </div>
            </div>

            {erro && (
              <p id="erro-login" role="alert" style={{
                fontSize: 'var(--text-sm)', color: 'var(--color-error)',
                background: 'var(--color-error-highlight)',
                padding: 'var(--space-3) var(--space-4)', borderRadius: 'var(--radius-md)',
              }}>{erro}</p>
            )}

            <button type="submit" disabled={carregando} className="btn btn-primary"
              style={{ width: '100%', marginTop: 'var(--space-2)' }}>
              {carregando ? 'Entrando…' : 'Entrar'}
            </button>
          </form>

          <p style={{ marginTop: 'var(--space-5)', textAlign: 'center', fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>
            Não tem conta?{' '}
            <Link to="/cadastro" style={{ color: 'var(--color-primary)', fontWeight: 600 }}>Criar conta</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
