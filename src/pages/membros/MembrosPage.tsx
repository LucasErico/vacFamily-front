import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Users } from 'lucide-react'
import { useMembros, PARENTESCO_LABEL } from '@/contexts/MembrosContext'
import { Avatar } from '@/components/ui/Avatar'
import { calcularIdade } from '@/utils/idade'

export function MembrosPage() {
  const { membros } = useMembros()
  const [busca, setBusca] = useState('')

  const filtrados = membros.filter(m =>
    m.nome.toLowerCase().includes(busca.toLowerCase())
  )

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', paddingBottom: 'var(--space-8)' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-6)' }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--color-text)' }}>
            Membros da família
          </h2>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', marginTop: 'var(--space-1)' }}>
            {membros.length} {membros.length === 1 ? 'membro' : 'membros'}
          </p>
        </div>
        <Link to="/membros/novo" className="btn btn-primary" style={{ gap: 'var(--space-2)' }}>
          <Plus size={18} aria-hidden />
          <span>Adicionar</span>
        </Link>
      </div>

      {/* Busca */}
      {membros.length > 0 && (
        <input
          type="search"
          placeholder="Buscar membro..."
          value={busca}
          onChange={e => setBusca(e.target.value)}
          className="input-field"
          style={{ marginBottom: 'var(--space-4)' }}
          aria-label="Buscar membro"
        />
      )}

      {/* Lista */}
      {filtrados.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 'var(--space-16) var(--space-8)', color: 'var(--color-text-muted)' }}>
          <Users size={48} style={{ margin: '0 auto var(--space-4)', color: 'var(--color-text-faint)' }} aria-hidden />
          <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, marginBottom: 'var(--space-2)', color: 'var(--color-text)' }}>
            {busca ? 'Nenhum resultado' : 'Nenhum membro ainda'}
          </h3>
          <p style={{ fontSize: 'var(--text-sm)', marginBottom: 'var(--space-6)', maxWidth: 280, margin: '0 auto var(--space-6)' }}>
            {busca ? 'Tente outro nome.' : 'Adicione os membros da sua família para acompanhar as vacinas.'}
          </p>
          {!busca && (
            <Link to="/membros/novo" className="btn btn-primary">
              <Plus size={18} aria-hidden /> Adicionar primeiro membro
            </Link>
          )}
        </div>
      ) : (
        <ul style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', listStyle: 'none', padding: 0 }} role="list">
          {filtrados.map(membro => (
            <li key={membro.id}>
              <Link
                to={`/membros/${membro.id}`}
                style={{ textDecoration: 'none' }}
                aria-label={`Ver perfil de ${membro.nome}`}
              >
                <div
                  className="card card-hover"
                  style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', padding: 'var(--space-4) var(--space-5)' }}
                >
                  <Avatar nome={membro.nome} tamanho={48} fotoUrl={membro.fotoUrl} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: 600, color: 'var(--color-text)', fontSize: 'var(--text-sm)', marginBottom: 'var(--space-1)' }}>
                      {membro.nome}
                    </p>
                    <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                      {PARENTESCO_LABEL[membro.parentesco]} · {calcularIdade(membro.dataNascimento)}
                    </p>
                  </div>
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-faint)' }}>›</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
