/**
 * RegisterPage — /cadastro
 *
 * Funcionalidades:
 *  - Medidor de força de senha (5 níveis) com sugestões inline
 *  - Confirmação de senha
 *  - Show/hide em ambos os campos de senha
 *  - Checkbox "Modo Teste" que pula a verificação de e-mail
 *  - Ao cadastrar sem modo teste → navega para /verificar-email
 *  - Ao cadastrar com modo teste → entra direto no app
 *
 * TODO (back-end):
 *  POST /auth/register  { nome, email, senha }
 *  Retorna: { requiresVerification: boolean, userId: string }
 *  - Se requiresVerification true → navegar para /verificar-email com state.email
 *  - Se false (modo teste/admin) → chamar login real e navegar para /
 *
 * Segurança:
 *  - O FRONT nunca criptografa a senha. Ela trafega em texto sobre HTTPS.
 *  - O BACK recebe a senha em texto e aplica bcrypt (custo ≥ 12) antes de salvar.
 *  - O banco NUNCA armazena a senha em texto puro — apenas o hash bcrypt.
 *  - O e-mail também deve ser normalizado (lower + trim) no back antes de salvar.
 */
import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { registrarSnapshotUsuario } from '@/services/adminStorage'
import { Syringe, Eye, EyeOff, FlaskConical } from 'lucide-react'

// ── Lógica de força de senha ─────────────────────────────────
interface ForcaSenha {
  nivel: 0 | 1 | 2 | 3 | 4  // 0=muito fraca … 4=muito forte
  label: string
  cor: string
  sugestoes: string[]
}

const NIVEIS = [
  { label: 'Muito fraca', cor: '#dc2626' },
  { label: 'Fraca',       cor: '#f97316' },
  { label: 'Média',       cor: '#eab308' },
  { label: 'Forte',       cor: '#22c55e' },
  { label: 'Muito forte', cor: '#15803d' },
] as const

function avaliarSenha(senha: string): ForcaSenha {
  const sugestoes: string[] = []
  if (senha.length < 8)         sugestoes.push('Mínimo 8 caracteres')
  if (senha.length < 12)        sugestoes.push('Ideal: 12 ou mais caracteres')
  if (!/[A-Z]/.test(senha))    sugestoes.push('Adicione uma letra maiúscula')
  if (!/[a-z]/.test(senha))    sugestoes.push('Adicione uma letra minúscula')
  if (!/[0-9]/.test(senha))    sugestoes.push('Adicione um número')
  if (!/[^A-Za-z0-9]/.test(senha)) sugestoes.push('Adicione um símbolo (!@#$%...)')

  let pontos = 0
  if (senha.length >= 8)            pontos++
  if (senha.length >= 12)           pontos++
  if (/[A-Z]/.test(senha) && /[a-z]/.test(senha)) pontos++
  if (/[0-9]/.test(senha))          pontos++
  if (/[^A-Za-z0-9]/.test(senha))  pontos++

  const nivel = Math.min(pontos, 4) as 0 | 1 | 2 | 3 | 4
  return { nivel, label: NIVEIS[nivel].label, cor: NIVEIS[nivel].cor, sugestoes }
}

// ── Componente principal ─────────────────────────────────────
export function RegisterPage() {
  const { login } = useAuth()
  const navigate = useNavigate()

  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [mostrarConfirmar, setMostrarConfirmar] = useState(false)
  const [modoTeste, setModoTeste] = useState(false)
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)

  const forca = senha ? avaliarSenha(senha) : null
  const senhasDiferem = confirmar && senha !== confirmar

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!nome.trim() || !email.trim() || !senha || !confirmar) {
      setErro('Preencha todos os campos.'); return
    }
    if (senha.length < 8) { setErro('A senha deve ter ao menos 8 caracteres.'); return }
    if (senha !== confirmar) { setErro('As senhas não coincidem.'); return }
    if (forca && forca.nivel < 1) { setErro('Sua senha é muito fraca. Adicione mais caracteres ou variedade.'); return }

    setErro('')
    setCarregando(true)

    // TODO (back-end): substituir por chamada real
    // const { data, error } = await api.post('/auth/register', { nome, email, senha })
    // if (error) { setErro(error.message); setCarregando(false); return }
    // const { requiresVerification, userId } = data
    //
    // Mock atual:
    const mockRequiresVerification = !modoTeste

    // Registra snapshot para painel admin (usando dados reais quando back integrado)
    registrarSnapshotUsuario({
      id: `usr_${Date.now()}`,
      nome: nome.trim(),
      email: email.trim().toLowerCase(),
      criadoEm: new Date().toISOString(),
      membros: 0,
    })

    if (mockRequiresVerification) {
      setCarregando(false)
      // Navega para verificação passando o email como state
      navigate('/verificar-email', { state: { email: email.trim().toLowerCase() } })
      return
    }

    // Modo teste: entra direto
    const result = await login('demo@vacfamily.com', 'demo1234')
    setCarregando(false)
    if (result.ok) {
      navigate('/', { replace: true })
    } else {
      setErro(result.erro ?? 'Erro ao criar conta. Tente novamente.')
    }
  }

  return (
    <div style={{
      minHeight: '100dvh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', padding: 'var(--space-4)', background: 'var(--color-bg)',
    }}>
      <div style={{ width: '100%', maxWidth: '420px' }}>
        {/* Logo */}
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
            Crie sua conta gratuitamente
          </p>
        </div>

        <div className="card">
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-lg)', fontWeight: 700, marginBottom: 'var(--space-6)', color: 'var(--color-text)' }}>
            Criar conta
          </h2>

          <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>

            {/* Nome */}
            <div>
              <label htmlFor="nome" style={labelStyle}>Nome completo</label>
              <input id="nome" type="text" autoComplete="name" value={nome}
                onChange={e => setNome(e.target.value)} placeholder="Seu nome"
                className="input-field" />
            </div>

            {/* E-mail */}
            <div>
              <label htmlFor="email" style={labelStyle}>E-mail</label>
              <input id="email" type="email" autoComplete="email" value={email}
                onChange={e => setEmail(e.target.value)} placeholder="seu@email.com"
                className="input-field" />
            </div>

            {/* Senha + medidor */}
            <div>
              <label htmlFor="senha" style={labelStyle}>Senha</label>
              <div style={{ position: 'relative' }}>
                <input
                  id="senha"
                  type={mostrarSenha ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={senha}
                  onChange={e => setSenha(e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  className="input-field"
                  style={{ paddingRight: 'var(--space-12)' }}
                  aria-describedby="forca-senha-desc"
                />
                <button type="button" onClick={() => setMostrarSenha(v => !v)}
                  aria-label={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}
                  style={showBtnStyle}>
                  {mostrarSenha ? <EyeOff size={18} aria-hidden /> : <Eye size={18} aria-hidden />}
                </button>
              </div>

              {/* Barra de força */}
              {senha && forca && (
                <div style={{ marginTop: 'var(--space-2)' }}>
                  <div style={{ display: 'flex', gap: 3, marginBottom: 'var(--space-1)' }}>
                    {[0, 1, 2, 3, 4].map(i => (
                      <div key={i} style={{
                        flex: 1, height: 4, borderRadius: 2,
                        background: i <= forca.nivel ? forca.cor : 'var(--color-border)',
                        transition: 'background 250ms ease',
                      }} aria-hidden />
                    ))}
                  </div>
                  <p style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: forca.cor }}>
                    {forca.label}
                  </p>
                  {/* Sugestões */}
                  {forca.sugestoes.length > 0 && (
                    <ul
                      id="forca-senha-desc"
                      aria-live="polite"
                      style={{
                        marginTop: 'var(--space-2)',
                        display: 'flex', flexDirection: 'column', gap: 'var(--space-1)',
                        listStyle: 'none', padding: 0,
                      }}
                    >
                      {forca.sugestoes.slice(0, 3).map(s => (
                        <li key={s} style={{
                          fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)',
                          display: 'flex', alignItems: 'center', gap: 4,
                        }}>
                          <span style={{ color: forca!.cor, fontWeight: 700, fontSize: 10 }}>●</span>
                          {s}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>

            {/* Confirmar senha */}
            <div>
              <label htmlFor="confirmar" style={labelStyle}>Confirmar senha</label>
              <div style={{ position: 'relative' }}>
                <input
                  id="confirmar"
                  type={mostrarConfirmar ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={confirmar}
                  onChange={e => setConfirmar(e.target.value)}
                  placeholder="Repita a senha"
                  className={`input-field${senhasDiferem ? ' error' : ''}`}
                  style={{ paddingRight: 'var(--space-12)' }}
                  aria-describedby={senhasDiferem ? 'erro-confirmar' : undefined}
                />
                <button type="button" onClick={() => setMostrarConfirmar(v => !v)}
                  aria-label={mostrarConfirmar ? 'Ocultar confirmação' : 'Mostrar confirmação'}
                  style={showBtnStyle}>
                  {mostrarConfirmar ? <EyeOff size={18} aria-hidden /> : <Eye size={18} aria-hidden />}
                </button>
              </div>
              {senhasDiferem && (
                <p id="erro-confirmar" role="alert" style={{ fontSize: 'var(--text-xs)', color: 'var(--color-error)', marginTop: 'var(--space-1)' }}>
                  As senhas não coincidem.
                </p>
              )}
            </div>

            {/* Modo teste */}
            <label style={{
              display: 'flex', alignItems: 'flex-start', gap: 'var(--space-3)',
              padding: 'var(--space-3) var(--space-4)',
              background: modoTeste ? 'var(--color-warning-highlight)' : 'var(--color-surface-offset)',
              borderRadius: 'var(--radius-md)',
              border: `1.5px solid ${modoTeste ? 'var(--color-warning)' : 'var(--color-border)'}`,
              cursor: 'pointer',
              transition: 'all 200ms ease',
            }}>
              <input
                type="checkbox"
                checked={modoTeste}
                onChange={e => setModoTeste(e.target.checked)}
                style={{ marginTop: 2, flexShrink: 0, accentColor: 'var(--color-warning)', width: 16, height: 16 }}
              />
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 2 }}>
                  <FlaskConical size={14} style={{ color: 'var(--color-warning)' }} aria-hidden />
                  <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-text)' }}>
                    Modo Teste
                  </span>
                </div>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
                  Pula a confirmação de e-mail. Use apenas para contas de desenvolvimento.
                </p>
              </div>
            </label>

            {/* Erro geral */}
            {erro && (
              <p role="alert" style={{
                fontSize: 'var(--text-sm)', color: 'var(--color-error)',
                background: 'var(--color-error-highlight)',
                padding: 'var(--space-3) var(--space-4)', borderRadius: 'var(--radius-md)',
              }}>{erro}</p>
            )}

            <button
              type="submit"
              disabled={carregando || !!senhasDiferem}
              className="btn btn-primary"
              style={{ width: '100%', marginTop: 'var(--space-2)' }}
            >
              {carregando ? 'Criando conta…' : modoTeste ? 'Criar conta (Modo Teste)' : 'Criar conta'}
            </button>
          </form>

          <p style={{ marginTop: 'var(--space-5)', textAlign: 'center', fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>
            Já tem conta?{' '}
            <Link to="/login" style={{ color: 'var(--color-primary)', fontWeight: 600 }}>Entrar</Link>
          </p>
        </div>
      </div>
    </div>
  )
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 'var(--text-sm)', fontWeight: 500,
  marginBottom: 'var(--space-2)', color: 'var(--color-text)',
}
const showBtnStyle: React.CSSProperties = {
  position: 'absolute', right: 'var(--space-3)', top: '50%', transform: 'translateY(-50%)',
  color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center',
  minWidth: '44px', minHeight: '44px', justifyContent: 'center',
}
