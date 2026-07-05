import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMembros } from '../../contexts/MembrosContext'
import { Avatar } from '../../components/ui/Avatar'
import { calcularIdade } from '../../utils/idade'
import { Search, UserPlus, Users } from 'lucide-react'

export default function MembrosPage() {
  const { membros } = useMembros()
  const [busca, setBusca] = useState('')

  const filtrados = membros.filter(m =>
    m.nome.toLowerCase().includes(busca.toLowerCase())
  )

  return (
    <div className="space-y-6">
      {/* Cabeçalho da página */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title">Membros da Família</h1>
          <p className="page-subtitle">{membros.length} {membros.length === 1 ? 'membro cadastrado' : 'membros cadastrados'}</p>
        </div>
        <Link to="/membros/novo" className="btn-primary">
          <UserPlus size={18} aria-hidden />
          Adicionar membro
        </Link>
      </div>

      {/* Busca */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden />
        <input
          type="search"
          placeholder="Buscar membro..."
          className="input-field pl-10"
          value={busca}
          onChange={e => setBusca(e.target.value)}
          aria-label="Buscar membro"
        />
      </div>

      {/* Lista */}
      {filtrados.length === 0 ? (
        <div className="card flex flex-col items-center justify-center py-16 text-center gap-4">
          <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
            <Users size={32} className="text-gray-400" aria-hidden />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">
              {busca ? 'Nenhum membro encontrado' : 'Nenhum membro cadastrado'}
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              {busca ? 'Tente outro termo de busca.' : 'Adicione o primeiro membro da família.'}
            </p>
          </div>
          {!busca && (
            <Link to="/membros/novo" className="btn-primary btn-sm">
              <UserPlus size={16} aria-hidden />
              Adicionar membro
            </Link>
          )}
        </div>
      ) : (
        <ul role="list" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtrados.map(membro => (
            <li key={membro.id}>
              <Link to={`/membros/${membro.id}`} className="card-hover flex items-center gap-4 no-underline group">
                <Avatar nome={membro.nome} id={membro.id} size="md" />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-gray-900 dark:text-gray-100 truncate group-hover:text-[#006B3F] transition-colors">
                    {membro.nome}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {membro.parentesco} · {calcularIdade(membro.dataNascimento)} anos
                  </p>
                </div>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-300 group-hover:text-[#006B3F] flex-shrink-0 transition-colors" aria-hidden>
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
