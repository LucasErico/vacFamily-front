import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { registrarSnapshotUsuario } from '@/services/adminStorage'
import { Syringe } from 'lucide-react'

export function RegisterPage() {
  const { login } = useAuth()
  const navigate = useNavigate()

  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [carregando, setCarregando] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!nome || !email || !senha) { setErro('Preencha todos os campos.'); return }
    if (senha.length < 6) { setErro('A senha deve ter ao menos 6 caracteres.'); return }
    setErro('')
    setCarregando(true)

    // TODO (back-end): substituir por chamada real de cadastro
    // Ex: const { data, error } = await supabase.auth.signUp({ email, password: senha })
    // Por ora usa o mock de login demo
    const result = await login('demo@vacfamily.com', 'demo1234')

    if (result.ok) {
      // Registra snapshot para o painel admin visualizar o usuário
      // Quando o back estiver integrado, usar o id/email reais do usuário criado
      registrarSnapshotUsuario({
        id: `usr_${Date.now()}`,
        nome: nome.trim(),
        email: email.trim().toLowerCase(),
        criadoEm: new Date().toISOString(),
        membros: 0,
      })

      setCarregando(false)
      navigate('/', { replace: true })
    } else {
      setErro(result.erro ?? 'Erro ao criar conta. Tente novamente.')
      setCarregando(false)
    }
  }

  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--space-4)',
        background: 'var(--color-bg)',
      }}
    >
      <div style={{ width: '100%', maxWidth: '420px' }}>
        <div style={{ textAlign: 'center', marginBottom: 'var(--space-8)' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '56px',
              height: '56px',
              borderRadius: 'var(--radius-xl)',
              background: 'var(--color-primary)',
              marginBottom: 'var(--space-4)',
            }}
          >
            <Syringe size={28} color="var(--color-text-inverse)" aria-hidden />
          </div>
          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'var(--text-xl)',
              fontWeight: 800,
              color: 'var(--color-text)',
              marginBottom: 'var(--space-1)',
            }}
          >
            VacFamily
          </h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>
            Crie sua conta gratuitamente
          </p>
        </div>

        <div className="card">
          <h2
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'var(--text-lg)',
              fontWeight: 700,
              marginBottom: 'var(--space-6)',
              color: 'var(--color-text)',
            }}
          >
            Criar conta
          </h2>

          <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <div>
              <label htmlFor="nome" style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 500, marginBottom: 'var(--space-2)', color: 'var(--color-text)' }}>
                Nome completo
              </label>
              <input
                id="nome"
                type="text"
                autoComplete="name"
                value={nome}
                onChange={e => setNome(e.target.value)}
                placeholder="Seu nome"
                className="input-field"
              />
            </div>

            <div>
              <label htmlFor="email" style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 500, marginBottom: 'var(--space-2)', color: 'var(--color-text)' }}>
                E-mail
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="seu@email.com"
                className="input-field"
              />
            </div>

            <div>
              <label htmlFor="senha" style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 500, marginBottom: 'var(--space-2)', color: 'var(--color-text)' }}>
                Senha
              </label>
              <input
                id="senha"
                type="password"
                autoComplete="new-password"
                value={senha}
                onChange={e => setSenha(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                className="input-field"
              />
            </div>

            {erro && (
              <p
                role="alert"
                style={{
                  fontSize: 'var(--text-sm)',
                  color: 'var(--color-error)',
                  background: 'var(--color-error-highlight)',
                  padding: 'var(--space-3) var(--space-4)',
                  borderRadius: 'var(--radius-md)',
                }}
              >
                {erro}
              </p>
            )}

            <button
              type="submit"
              disabled={carregando}
              className="btn btn-primary"
              style={{ width: '100%', marginTop: 'var(--space-2)' }}
            >
              {carregando ? 'Criando conta…' : 'Criar conta'}
            </button>
          </form>

          <p style={{ marginTop: 'var(--space-5)', textAlign: 'center', fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>
            Já tem conta?{' '}
            <Link to="/login" style={{ color: 'var(--color-primary)', fontWeight: 600 }}>
              Entrar
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
