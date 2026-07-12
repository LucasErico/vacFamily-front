/**
 * AdminUsuariosPage — /admin/usuarios
 * CRUD completo: listar, criar, editar (nome/email/senha/admin) e remover.
 */
import { useState, useEffect, useMemo, useRef } from 'react'
import {
  Trash2, Users, Loader2, ShieldCheck,
  UserPlus, Pencil, X, Eye, EyeOff, Save,
} from 'lucide-react'
import {
  getUsuariosAdmin,
  createUsuario,
  updateUsuario,
  deleteUsuario,
  type PerfilAdmin,
} from '@/services/adminStorage'

// ── Tipos ─────────────────────────────────────────────────
type Modo = 'criar' | 'editar'

interface FormState {
  nome:  string
  email: string
  senha: string
  admin: boolean
}

const FORM_VAZIO: FormState = { nome: '', email: '', senha: '', admin: false }

// ── Componente principal ──────────────────────────────────
export function AdminUsuariosPage() {
  const [usuarios, setUsuarios]     = useState<PerfilAdmin[]>([])
  const [loading, setLoading]       = useState(true)
  const [erro, setErro]             = useState('')
  const [busca, setBusca]           = useState('')
  const [deletando, setDeletando]   = useState<string | null>(null)

  // Modal
  const [modalAberto, setModalAberto] = useState(false)
  const [modo, setModo]               = useState<Modo>('criar')
  const [usuarioEditando, setUsuarioEditando] = useState<PerfilAdmin | null>(null)
  const [form, setForm]               = useState<FormState>(FORM_VAZIO)
  const [formErro, setFormErro]       = useState('')
  const [salvando, setSalvando]       = useState(false)
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const primeiroInput = useRef<HTMLInputElement>(null)

  function carregar() {
    setLoading(true)
    setErro('')
    getUsuariosAdmin()
      .then(r => setUsuarios(r))
      .catch(e => setErro(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => { carregar() }, [])

  // Foca o primeiro input ao abrir o modal
  useEffect(() => {
    if (modalAberto) setTimeout(() => primeiroInput.current?.focus(), 50)
  }, [modalAberto])

  const filtrados = useMemo(() =>
    usuarios.filter(u =>
      u.nome.toLowerCase().includes(busca.toLowerCase()) ||
      u.email.toLowerCase().includes(busca.toLowerCase())
    ), [usuarios, busca])

  // ── Abrir modal ─────────────────────────────────────────
  function abrirCriar() {
    setModo('criar')
    setUsuarioEditando(null)
    setForm(FORM_VAZIO)
    setFormErro('')
    setMostrarSenha(false)
    setModalAberto(true)
  }

  function abrirEditar(u: PerfilAdmin) {
    setModo('editar')
    setUsuarioEditando(u)
    setForm({ nome: u.nome, email: u.email, senha: '', admin: u.admin ?? false })
    setFormErro('')
    setMostrarSenha(false)
    setModalAberto(true)
  }

  function fecharModal() {
    if (salvando) return
    setModalAberto(false)
  }

  // ── Salvar (criar ou editar) ─────────────────────────────
  async function handleSalvar(e: React.FormEvent) {
    e.preventDefault()
    setFormErro('')

    if (!form.nome.trim())  return setFormErro('Nome é obrigatório.')
    if (!form.email.trim()) return setFormErro('E-mail é obrigatório.')
    if (modo === 'criar' && form.senha.length < 6) return setFormErro('Senha deve ter ao menos 6 caracteres.')
    if (modo === 'editar' && form.senha && form.senha.length < 6) return setFormErro('Nova senha deve ter ao menos 6 caracteres.')

    setSalvando(true)
    try {
      if (modo === 'criar') {
        const novo = await createUsuario({
          nome:  form.nome.trim(),
          email: form.email.trim(),
          senha: form.senha,
          admin: form.admin,
        })
        setUsuarios(prev => [novo, ...prev])
      } else if (usuarioEditando) {
        const payload: Record<string, unknown> = {}
        if (form.nome.trim()  !== usuarioEditando.nome)  payload.nome  = form.nome.trim()
        if (form.email.trim() !== usuarioEditando.email) payload.email = form.email.trim()
        if (form.senha)                                   payload.senha = form.senha
        if (form.admin !== (usuarioEditando.admin ?? false)) payload.admin = form.admin

        if (Object.keys(payload).length === 0) {
          setFormErro('Nenhuma alteração detectada.')
          setSalvando(false)
          return
        }

        await updateUsuario(usuarioEditando.id, payload)
        setUsuarios(prev => prev.map(u =>
          u.id === usuarioEditando.id
            ? { ...u, nome: form.nome.trim(), email: form.email.trim(), admin: form.admin }
            : u
        ))
      }
      setModalAberto(false)
    } catch (err) {
      setFormErro(err instanceof Error ? err.message : 'Erro ao salvar usuário.')
    } finally {
      setSalvando(false)
    }
  }

  // ── Remover ─────────────────────────────────────────────
  async function handleDelete(u: PerfilAdmin) {
    if (u.admin) { alert('Não é possível remover um administrador.'); return }
    if (!confirm(`Remover "${u.nome}" permanentemente? Esta ação não pode ser desfeita.`)) return
    setDeletando(u.id)
    try {
      await deleteUsuario(u.id)
      setUsuarios(prev => prev.filter(x => x.id !== u.id))
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Erro ao remover usuário')
    } finally {
      setDeletando(null)
    }
  }

  // ── Render ────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>

      {/* Cabeçalho */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
        <div>
          <h1 style={{
            fontFamily: 'var(--font-display)', fontSize: 'var(--text-xl)',
            fontWeight: 700, color: 'var(--color-text)', marginBottom: 'var(--space-1)',
          }}>
            Usuários
          </h1>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>
            {loading ? 'Carregando...' : `${usuarios.length} usuário${usuarios.length !== 1 ? 's' : ''} cadastrado${usuarios.length !== 1 ? 's' : ''}`}
          </p>
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            type="search" value={busca} onChange={e => setBusca(e.target.value)}
            placeholder="Buscar por nome ou e-mail..."
            aria-label="Buscar usuários"
            style={{
              width: '100%', maxWidth: 280,
              padding: 'var(--space-3) var(--space-4)',
              borderRadius: 'var(--radius-md)',
              border: '1.5px solid var(--color-border)',
              background: 'var(--color-bg)', color: 'var(--color-text)',
              fontSize: 'var(--text-sm)', outline: 'none',
            }}
          />
          <button
            onClick={abrirCriar}
            style={{
              display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
              padding: 'var(--space-3) var(--space-4)',
              borderRadius: 'var(--radius-md)',
              background: 'var(--color-primary)', color: '#fff',
              border: 'none', fontWeight: 600, fontSize: 'var(--text-sm)',
              cursor: 'pointer', whiteSpace: 'nowrap',
            }}
          >
            <UserPlus size={16} aria-hidden />
            Novo usuário
          </button>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>
          <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} aria-hidden />
          Carregando usuários...
        </div>
      )}

      {/* Erro de carregamento */}
      {erro && <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-error)' }}>{erro}</p>}

      {/* Lista vazia */}
      {!loading && filtrados.length === 0 && (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          gap: 'var(--space-3)', padding: 'var(--space-12) var(--space-4)',
          color: 'var(--color-text-muted)', textAlign: 'center',
        }}>
          <Users size={36} style={{ color: 'var(--color-text-faint)' }} aria-hidden />
          <p style={{ fontSize: 'var(--text-sm)' }}>
            {busca ? 'Nenhum usuário encontrado.' : 'Nenhum usuário cadastrado ainda.'}
          </p>
        </div>
      )}

      {/* Lista de usuários */}
      {!loading && filtrados.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          {filtrados.map(u => (
            <div key={u.id} style={{
              display: 'flex', alignItems: 'center', gap: 'var(--space-4)',
              padding: 'var(--space-4) var(--space-5)',
              background: 'var(--color-surface)', border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-lg)',
            }}>
              {/* Avatar */}
              <div style={{
                width: 40, height: 40, borderRadius: 'var(--radius-full)',
                background: u.admin ? 'var(--color-primary)' : 'var(--color-primary-highlight)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 700, fontSize: 'var(--text-sm)',
                color: u.admin ? '#fff' : 'var(--color-primary)', flexShrink: 0,
              }}>
                {u.admin
                  ? <ShieldCheck size={18} aria-hidden />
                  : (u.nome.charAt(0) || u.email.charAt(0)).toUpperCase()
                }
              </div>

              {/* Dados */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-text)' }}>
                  {u.nome || '(sem nome)'}
                  {u.admin && (
                    <span style={{
                      marginLeft: 'var(--space-2)', fontSize: 'var(--text-xs)',
                      background: 'var(--color-primary-highlight)', color: 'var(--color-primary)',
                      padding: '2px 8px', borderRadius: 'var(--radius-full)', fontWeight: 600,
                    }}>admin</span>
                  )}
                </p>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                  {u.email} · {u.membros} membro{u.membros !== 1 ? 's' : ''}
                </p>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-faint)' }}>
                  Registrado em {new Date(u.criadoEm).toLocaleDateString('pt-BR')}
                </p>
              </div>

              {/* Ações */}
              <div style={{ display: 'flex', gap: 'var(--space-2)', flexShrink: 0 }}>
                {/* Botão editar */}
                <button
                  onClick={() => abrirEditar(u)}
                  aria-label={`Editar ${u.nome}`}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    width: 36, height: 36, borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-border)', background: 'transparent',
                    color: 'var(--color-text-muted)', cursor: 'pointer',
                    transition: 'all var(--transition)',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = 'var(--color-primary-highlight)'
                    e.currentTarget.style.color = 'var(--color-primary)'
                    e.currentTarget.style.borderColor = 'var(--color-primary)'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = 'transparent'
                    e.currentTarget.style.color = 'var(--color-text-muted)'
                    e.currentTarget.style.borderColor = 'var(--color-border)'
                  }}
                >
                  <Pencil size={15} aria-hidden />
                </button>

                {/* Botão remover */}
                <button
                  onClick={() => handleDelete(u)}
                  disabled={deletando === u.id || u.admin}
                  aria-label={`Remover ${u.nome}`}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    width: 36, height: 36, borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-border)', background: 'transparent',
                    color: u.admin ? 'var(--color-text-faint)' : 'var(--color-text-muted)',
                    cursor: u.admin ? 'not-allowed' : 'pointer',
                    opacity: u.admin ? 0.4 : 1,
                    transition: 'all var(--transition)',
                  }}
                  onMouseEnter={e => { if (!u.admin) {
                    e.currentTarget.style.background = 'var(--color-error-highlight)'
                    e.currentTarget.style.color = 'var(--color-error)'
                    e.currentTarget.style.borderColor = 'var(--color-error)'
                  }}}
                  onMouseLeave={e => { if (!u.admin) {
                    e.currentTarget.style.background = 'transparent'
                    e.currentTarget.style.color = 'var(--color-text-muted)'
                    e.currentTarget.style.borderColor = 'var(--color-border)'
                  }}}
                >
                  {deletando === u.id
                    ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} aria-hidden />
                    : <Trash2 size={15} aria-hidden />
                  }
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Modal criar / editar ── */}
      {modalAberto && (
        <div
          role="dialog" aria-modal="true"
          aria-label={modo === 'criar' ? 'Criar usuário' : 'Editar usuário'}
          onClick={e => { if (e.target === e.currentTarget) fecharModal() }}
          style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'oklch(0 0 0 / 0.45)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 'var(--space-4)',
          }}
        >
          <div style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-xl)',
            padding: 'var(--space-6)',
            width: '100%', maxWidth: 460,
            display: 'flex', flexDirection: 'column', gap: 'var(--space-5)',
            boxShadow: 'var(--shadow-lg)',
          }}>
            {/* Cabeçalho do modal */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--color-text)' }}>
                {modo === 'criar' ? 'Novo usuário' : 'Editar usuário'}
              </h2>
              <button
                onClick={fecharModal} disabled={salvando}
                aria-label="Fechar"
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: 32, height: 32, borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)', background: 'transparent',
                  color: 'var(--color-text-muted)', cursor: 'pointer',
                }}
              >
                <X size={16} aria-hidden />
              </button>
            </div>

            {/* Formulário */}
            <form onSubmit={handleSalvar} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>

              {/* Nome */}
              <label style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
                <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-text)' }}>Nome</span>
                <input
                  ref={primeiroInput}
                  type="text" value={form.nome}
                  onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                  placeholder="Nome completo"
                  required
                  style={inputStyle}
                />
              </label>

              {/* Email */}
              <label style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
                <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-text)' }}>E-mail</span>
                <input
                  type="email" value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="email@exemplo.com"
                  required
                  style={inputStyle}
                />
              </label>

              {/* Senha */}
              <label style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
                <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-text)' }}>
                  {modo === 'criar' ? 'Senha' : 'Nova senha'}
                  {modo === 'editar' && (
                    <span style={{ fontWeight: 400, color: 'var(--color-text-muted)', marginLeft: 'var(--space-1)' }}>
                      (deixe em branco para manter)
                    </span>
                  )}
                </span>
                <div style={{ position: 'relative' }}>
                  <input
                    type={mostrarSenha ? 'text' : 'password'}
                    value={form.senha}
                    onChange={e => setForm(f => ({ ...f, senha: e.target.value }))}
                    placeholder={modo === 'criar' ? 'Mínimo 6 caracteres' : 'Nova senha (opcional)'}
                    required={modo === 'criar'}
                    style={{ ...inputStyle, paddingRight: 'var(--space-10)' }}
                  />
                  <button
                    type="button"
                    onClick={() => setMostrarSenha(v => !v)}
                    aria-label={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}
                    style={{
                      position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: 'var(--color-text-muted)', display: 'flex',
                    }}
                  >
                    {mostrarSenha ? <EyeOff size={16} aria-hidden /> : <Eye size={16} aria-hidden />}
                  </button>
                </div>
              </label>

              {/* Flag admin */}
              <label style={{
                display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
                padding: 'var(--space-3) var(--space-4)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                cursor: 'pointer', userSelect: 'none',
                background: form.admin ? 'var(--color-primary-highlight)' : 'transparent',
              }}>
                <input
                  type="checkbox" checked={form.admin}
                  onChange={e => setForm(f => ({ ...f, admin: e.target.checked }))}
                  style={{ width: 16, height: 16, accentColor: 'var(--color-primary)', cursor: 'pointer' }}
                />
                <div>
                  <p style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-text)' }}>
                    Administrador
                  </p>
                  <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                    Acesso total ao painel admin
                  </p>
                </div>
              </label>

              {/* Erro do formulário */}
              {formErro && (
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-error)', margin: 0 }}>
                  {formErro}
                </p>
              )}

              {/* Botões */}
              <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end', marginTop: 'var(--space-1)' }}>
                <button
                  type="button" onClick={fecharModal} disabled={salvando}
                  style={{
                    padding: 'var(--space-3) var(--space-5)',
                    borderRadius: 'var(--radius-md)',
                    border: '1.5px solid var(--color-border)',
                    background: 'transparent', color: 'var(--color-text-muted)',
                    fontWeight: 600, fontSize: 'var(--text-sm)', cursor: 'pointer',
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit" disabled={salvando}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
                    padding: 'var(--space-3) var(--space-5)',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--color-primary)', color: '#fff',
                    border: 'none', fontWeight: 600, fontSize: 'var(--text-sm)',
                    cursor: salvando ? 'not-allowed' : 'pointer',
                    opacity: salvando ? 0.7 : 1,
                  }}
                >
                  {salvando
                    ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} aria-hidden /> Salvando...</>
                    : <><Save size={14} aria-hidden /> {modo === 'criar' ? 'Criar usuário' : 'Salvar alterações'}</>
                  }
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Estilo compartilhado de input ─────────────────────────────
const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: 'var(--space-3) var(--space-4)',
  borderRadius: 'var(--radius-md)',
  border: '1.5px solid var(--color-border)',
  background: 'var(--color-bg)',
  color: 'var(--color-text)',
  fontSize: 'var(--text-sm)',
  outline: 'none',
}
