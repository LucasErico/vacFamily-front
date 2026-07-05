import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Syringe, ChevronDown, ChevronUp } from 'lucide-react'
import { useMembros, PARENTESCO_LABEL } from '@/contexts/MembrosContext'
import { useVacinas, calcularDosesStatus } from '@/contexts/VacinasContext'
import { Avatar } from '@/components/ui/Avatar'
import { VacinaStatusBadge } from '@/components/ui/VacinaStatusBadge'
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
  const [expandido, setExpandido] = useState<string | null>(null)

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', paddingBottom: 'var(--space-8)' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-6)' }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--color-text)' }}>
            Vacinas
          </h2>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', marginTop: 'var(--space-1)' }}>
            Acompanhe o calendário de cada membro
          </p>
        </div>
        <Link to="/vacinas/registrar" className="btn btn-primary" style={{ gap: 'var(--space-2)' }}>
          <Plus size={18} aria-hidden />
          <span>Registrar</span>
        </Link>
      </div>

      {/* Lista por membro */}
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
            const aberto = expandido === membro.id
            const vacinasAplicaveis = vacinas.filter(v =>
              calcularDosesStatus(v, registrosMembro, membro.dataNascimento).some(d => d.status !== 'nao_aplicavel')
            )

            return (
              <li key={membro.id}>
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                  {/* Cabeçalho do membro */}
                  <button
                    onClick={() => setExpandido(aberto ? null : membro.id)}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center',
                      gap: 'var(--space-4)', padding: 'var(--space-4) var(--space-5)',
                      background: 'none', cursor: 'pointer', minHeight: 44,
                    }}
                    aria-expanded={aberto}
                    aria-label={`Vacinas de ${membro.nome}`}
                  >
                    <Avatar nome={membro.nome} tamanho={40} fotoUrl={membro.fotoUrl} />
                    <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                      <p style={{ fontWeight: 600, color: 'var(--color-text)', fontSize: 'var(--text-sm)' }}>
                        {membro.nome}
                      </p>
                      <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                        {PARENTESCO_LABEL[membro.parentesco]}
                      </p>
                    </div>
                    <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: resumo.cor, marginRight: 'var(--space-2)' }}>
                      {resumo.label}
                    </span>
                    {aberto
                      ? <ChevronUp size={16} style={{ color: 'var(--color-text-faint)', flexShrink: 0 }} aria-hidden />
                      : <ChevronDown size={16} style={{ color: 'var(--color-text-faint)', flexShrink: 0 }} aria-hidden />
                    }
                  </button>

                  {/* Detalhe de vacinas */}
                  {aberto && (
                    <div>
                      <hr className="divider" style={{ margin: 0 }} />
                      <ul style={{ listStyle: 'none', padding: 'var(--space-2) 0' }} role="list">
                        {vacinasAplicaveis.map(vacina => {
                          const doses = calcularDosesStatus(vacina, registrosMembro, membro.dataNascimento)
                            .filter(d => d.status !== 'nao_aplicavel')
                          return (
                            <li
                              key={vacina.id}
                              style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                padding: 'var(--space-3) var(--space-5)', gap: 'var(--space-3)',
                              }}
                            >
                              <div style={{ minWidth: 0, flex: 1 }}>
                                <p style={{ fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--color-text)' }}>
                                  {vacina.nome}
                                </p>
                                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                                  {vacina.doses === 1 ? 'Dose única' : `${vacina.doses} doses`}
                                </p>
                              </div>
                              <div style={{ display: 'flex', gap: 'var(--space-2)', flexShrink: 0 }}>
                                {doses.map(d => (
                                  <VacinaStatusBadge key={d.numeroDose} status={d.status} mostrarLabel={false} />
                                ))}
                              </div>
                            </li>
                          )
                        })}
                      </ul>
                      <div style={{ padding: 'var(--space-3) var(--space-5)', borderTop: '1px solid var(--color-divider)' }}>
                        <Link
                          to="/vacinas/registrar"
                          state={{ membroId: membro.id }}
                          className="btn btn-ghost"
                          style={{ width: '100%', gap: 'var(--space-2)', fontSize: 'var(--text-sm)' }}
                        >
                          <Plus size={15} aria-hidden /> Registrar dose para {membro.nome.split(' ')[0]}
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
