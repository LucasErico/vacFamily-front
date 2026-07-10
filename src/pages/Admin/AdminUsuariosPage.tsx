/**
 * AdminUsuariosPage — /admin/usuarios
 * Lista e remove snapshots de usuários registrados.
 */
import { useState, useMemo } from 'react'
import { Trash2, Users } from 'lucide-react'
import { getSnapshotUsuarios, deleteSnapshotUsuario, type PerfilAdmin } from '@/services/adminStorage'

export function AdminUsuariosPage() {
  const [usuarios, setUsuarios] = useState<PerfilAdmin[]>(() => getSnapshotUsuarios())
  const [busca, setBusca] = useState('')

  const filtrados = useMemo(() =>
    usuarios.filter(u =>
      u.nome.toLowerCase().includes(busca.toLowerCase()) ||
      u.email.toLowerCase().includes(busca.toLowerCase())
    ), [usuarios, busca])

  function handleDelete(id: string) {
    if (!confirm('Remover este usuário do painel? Esta ação não afeta o login do usuário.')) return
    deleteSnapshotUsuario(id)
    setUsuarios(getSnapshotUsuarios())
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <div>
        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'var(--text-xl)',
          fontWeight: 700,
          color: 'var(--color-text)',
          marginBottom: 'var(--space-1)',
        }}>
          Usuários
        </h1>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>
          Snapshot dos perfis registrados no app.
        </p>
      </div>

      {/* Busca */}
      <input
        type="search"
        value={busca}
        onChange={e => setBusca(e.target.value)}
        placeholder="Buscar por nome ou e-mail..."
        aria-label="Buscar usuários"
        style={{
          width: '100%', maxWidth: 380,
          padding: 'var(--space-3) var(--space-4)',
          borderRadius: 'var(--radius-md)',
          border: '1.5px solid var(--color-border)',
          background: 'var(--color-bg)',
          color: 'var(--color-text)',
          fontSize: 'var(--text-sm)',
          outline: 'none',
        }}
      />

      {filtrados.length === 0 ? (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          gap: 'var(--space-3)', padding: 'var(--space-12) var(--space-4)',
          color: 'var(--color-text-muted)', textAlign: 'center',
        }}>
          <Users size={36} style={{ color: 'var(--color-text-faint)' }} aria-hidden />
          <p style={{ fontSize: 'var(--text-sm)' }}>
            {busca ? 'Nenhum usuário encontrado.' : 'Nenhum usuário registrado ainda.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          {filtrados.map(u => (
            <div
              key={u.id}
              style={{
                display: 'flex', alignItems: 'center', gap: 'var(--space-4)',
                padding: 'var(--space-4) var(--space-5)',
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-lg)',
              }}
            >
              {/* Avatar */}
              <div style={{
                width: 40, height: 40,
                borderRadius: 'var(--radius-full)',
                background: 'var(--color-primary-highlight)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 700, fontSize: 'var(--text-sm)',
                color: 'var(--color-primary)', flexShrink: 0,
              }}>
                {u.nome.charAt(0).toUpperCase()}
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-text)' }}>
                  {u.nome}
                </p>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                  {u.email} · {u.membros} membro{u.membros !== 1 ? 's' : ''}
                </p>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-faint)' }}>
                  Registrado em {new Date(u.criadoEm).toLocaleDateString('pt-BR')}
                </p>
              </div>

              {/* Ação */}
              <button
                onClick={() => handleDelete(u.id)}
                aria-label={`Remover ${u.nome} do painel`}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: 36, height: 36,
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)',
                  background: 'transparent',
                  color: 'var(--color-text-muted)',
                  cursor: 'pointer',
                  transition: 'all var(--transition)',
                  flexShrink: 0,
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'var(--color-error-highlight)'
                  e.currentTarget.style.color = 'var(--color-error)'
                  e.currentTarget.style.borderColor = 'var(--color-error)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'transparent'
                  e.currentTarget.style.color = 'var(--color-text-muted)'
                  e.currentTarget.style.borderColor = 'var(--color-border)'
                }}
              >
                <Trash2 size={15} aria-hidden />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
