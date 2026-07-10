import { Link } from 'react-router-dom'
import { Plus, Syringe } from 'lucide-react'
import { useMembros, PARENTESCO_LABEL } from '@/contexts/MembrosContext'
import { useVacinas, calcularDosesStatus } from '@/contexts/VacinasContext'
import { Avatar } from '@/components/ui/Avatar'
import type { StatusDose } from '@/types'

function resumoStatus(statuses: StatusDose[]): { label: string; cor: string } {
  if (statuses.includes('atrasada'))  return { label: 'Com atraso',  cor: 'var(--color-error)' }
  if (statuses.includes('pendente'))  return { label: 'Pendente',    cor: 'var(--color-warning)' }
  if (statuses.every(s => s === 'aplicada' || s === 'nao_aplicavel'))
    return { label: 'Em dia', cor: 'var(--color-success)' }
  return { label: 'Verificar', cor: 'var(--color-text-muted)' }
}

export function VacinasPage() {
  const { membros } = useMembros()
  const { vacinas, buscarRegistrosMembro } = useVacinas()

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', paddingBottom: 'var(--space-8)' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-6)' }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--color-text)' }}>
            Vacinas
          </h2>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', marginTop: 'var(--space-1)' }}>
            Selecione um membro para gerenciar as doses
          </p>
        </div>
        <Link to="/vacinas/registrar" className="btn btn-primary" style={{ gap: 'var(--space-2)' }}>
          <Plus size={18} aria-hidden />
          <span>Registrar</span>
        </Link>
      </div>

      {/* Lista por membro — cada card é um link para /vacinas/membro/:id */}
      {membros.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 'var(--space-16) var(--space-8)', color: 'var(--color-text-muted)' }}>
          <Syringe size={48} style={{ margin: '0 auto var(--space-4)', color: 'var(--color-text-faint)' }} aria-hidden />
          <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, marginBottom: 'var(--space-2)', color: 'var(--color-text)' }}>
            Nenhum membro cadastrado
          </h3>
          <p style={{ fontSize: 'var(--text-sm)', maxWidth: 280, margin: '0 auto var(--space-6)' }}>
            Cadastre os membros da família para acompanhar as vacinas.
          </p>
          <Link to="/membros/novo" className="btn btn-primary">
            <Plus size={18} aria-hidden /> Adicionar membro
          </Link>
        </div>
      ) : (
        <ul style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', listStyle: 'none', padding: 0 }} role="list">
          {membros.map(membro => {
            const registrosMembro = buscarRegistrosMembro(membro.id)
            const todasDoses = vacinas.flatMap(v =>
              calcularDosesStatus(v, registrosMembro, membro.dataNascimento).map(d => d.status)
            )
            const resumo = resumoStatus(todasDoses)

            return (
              <li key={membro.id}>
                <Link
                  to={`/vacinas/membro/${membro.id}`}
                  style={{ textDecoration: 'none' }}
                  aria-label={`Gerenciar vacinas de ${membro.nome}`}
                >
                  <div
                    className="card card-hover"
                    style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', padding: 'var(--space-4) var(--space-5)' }}
                  >
                    <Avatar nome={membro.nome} tamanho={44} fotoUrl={membro.fotoUrl} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontWeight: 600, color: 'var(--color-text)', fontSize: 'var(--text-sm)' }}>
                        {membro.nome}
                      </p>
                      <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                        {PARENTESCO_LABEL[membro.parentesco]}
                      </p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flexShrink: 0 }}>
                      <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: resumo.cor }}>
                        {resumo.label}
                      </span>
                      <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-faint)' }}>›</span>
                    </div>
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
