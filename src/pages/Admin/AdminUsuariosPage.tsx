/**
 * AdminUsuariosPage — /admin/usuarios
 * Lista usuários reais via GET /admin/usuarios. Permite remoção via DELETE /admin/usuarios/:id.
 */
import { useState, useEffect, useMemo } from 'react'
import { Trash2, Users, Loader2, ShieldCheck } from 'lucide-react'
import { apiFetch } from '@/services/api'

interface Usuario {
  id:        string
  email:     string
  nome:      string
  membros:   number
  criadoEm:  string
  admin:     boolean
}

export function AdminUsuariosPage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [loading, setLoading]   = useState(true)
  const [erro, setErro]         = useState('')
  const [busca, setBusca]       = useState('')
  const [deletando, setDeletando] = useState<string | null>(null)

  function carregar() {
    setLoading(true)
    apiFetch<{ status: string; usuarios: Usuario[] }>('/admin/usuarios')
      .then(r => setUsuarios(r.usuarios))
      .catch(e => setErro(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => { carregar() }, [])

  const filtrados = useMemo(() =>
    usuarios.filter(u =>
      u.nome.toLowerCase().includes(busca.toLowerCase()) ||
      u.email.toLowerCase().includes(busca.toLowerCase())
    ), [usuarios, busca])

  async function handleDelete(u: Usuario) {
    if (u.admin) {
      alert('Não é possível remover um administrador.')
      return
    }
    if (!confirm(`Remover o usuário "${u.nome}" permanentemente? Esta ação não pode ser desfeita.`)) return
    setDeletando(u.id)
    try {
      await apiFetch(`/admin/usuarios/${u.id}`, { method: 'DELETE' })
      setUsuarios(prev => prev.filter(x => x.id !== u.id))
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Erro ao remover usuário')
    } finally {
      setDeletando(null)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
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
        <input
          type="search" value={busca} onChange={e => setBusca(e.target.value)}
          placeholder="Buscar por nome ou e-mail..."
          aria-label="Buscar usuários"
          style={{
            width: '100%', maxWidth: 320,
            padding: 'var(--space-3) var(--space-4)',
            borderRadius: 'var(--radius-md)',
            border: '1.5px solid var(--color-border)',
            background: 'var(--color-bg)', color: 'var(--color-text)',
            fontSize: 'var(--text-sm)', outline: 'none',
          }}
        />
      </div>

      {loading && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>
          <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} aria-hidden />
          Carregando usuários...
        </div>
      )}

      {erro && <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-error)' }}>{erro}</p>}

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

      {!loading && filtrados.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          {filtrados.map(u => (
            <div key={u.id} style={{
              display: 'flex', alignItems: 'center', gap: 'var(--space-4)',
              padding: 'var(--space-4) var(--space-5)',
              background: 'var(--color-surface)', border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-lg)',
            }}>
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
                  transition: 'all var(--transition)', flexShrink: 0,
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
          ))}
        </div>
      )}
    </div>
  )
}
