import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Users, ClipboardList, Syringe } from 'lucide-react'
import { useMembros, RELACAO_LABEL } from '@/contexts/MembrosContext'
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
            Minha Família
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
          placeholder="Buscar na família..."
          value={busca}
          onChange={e => setBusca(e.target.value)}
          className="input-field"
          style={{ marginBottom: 'var(--space-4)' }}
          aria-label="Buscar membro da família"
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
            {busca ? 'Tente outro nome.' : 'Adicione os membros da sua família para começar a acompanhar as vacinas.'}
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
              <div className="card" style={{ padding: 'var(--space-4) var(--space-5)' }}>
                {/* Linha principal: avatar + info + perfil */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
                  <Avatar nome={membro.nome} tamanho={48} fotoUrl={membro.foto_url} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: 700, fontSize: 'var(--text-sm)', color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {membro.nome}
                    </p>
                    <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                      {RELACAO_LABEL[membro.relacao]} · {calcularIdade(membro.data_nascimento)}
                    </p>
                  </div>
                  <Link
                    to={`/membros/${membro.id}`}
                    className="btn btn-ghost"
                    style={{ fontSize: 'var(--text-xs)', flexShrink: 0 }}
                    aria-label={`Ver perfil de ${membro.nome}`}
                  >
                    Perfil
                  </Link>
                </div>

                {/* Ações rápidas */}
                <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-3)', paddingTop: 'var(--space-3)', borderTop: '1px solid var(--color-divider)' }}>
                  <Link
                    to={`/vacinas/membro/${membro.id}`}
                    className="btn btn-ghost"
                    style={{ flex: 1, justifyContent: 'center', fontSize: 'var(--text-xs)', gap: 'var(--space-1)' }}
                  >
                    <Syringe size={14} aria-hidden /> Vacinas
                  </Link>
                  <Link
                    to={`/historico?membro=${membro.id}`}
                    className="btn btn-ghost"
                    style={{ flex: 1, justifyContent: 'center', fontSize: 'var(--text-xs)', gap: 'var(--space-1)' }}
                  >
                    <ClipboardList size={14} aria-hidden /> Histórico
                  </Link>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
