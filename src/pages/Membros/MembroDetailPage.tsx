import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Edit2, Trash2, Calendar, User, ClipboardList, Syringe } from 'lucide-react'
import { useMembros, PARENTESCO_LABEL } from '@/contexts/MembrosContext'
import { Avatar } from '@/components/ui/Avatar'
import { calcularIdade, formatarData } from '@/utils/idade'
import { useState } from 'react'

export function MembroDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { buscarMembro, removerMembro } = useMembros()
  const [confirmarRemocao, setConfirmarRemocao] = useState(false)

  const membro = buscarMembro(id ?? '')

  if (!membro) {
    return (
      <div style={{ textAlign: 'center', padding: 'var(--space-16)' }}>
        <p style={{ color: 'var(--color-text-muted)' }}>Membro não encontrado.</p>
        <Link to="/membros" className="btn btn-ghost" style={{ marginTop: 'var(--space-4)' }}>Voltar para Família</Link>
      </div>
    )
  }

  function handleRemover() {
    removerMembro(membro!.id)
    navigate('/membros', { replace: true })
  }

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', paddingBottom: 'var(--space-8)' }}>
      {/* Voltar */}
      <button
        onClick={() => navigate('/membros')}
        style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)', marginBottom: 'var(--space-6)', minHeight: 44 }}
        aria-label="Voltar para Família"
      >
        <ArrowLeft size={18} aria-hidden /> Voltar para Família
      </button>

      {/* Perfil */}
      <div className="card" style={{ marginBottom: 'var(--space-4)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)', marginBottom: 'var(--space-5)' }}>
          <Avatar nome={membro.nome} tamanho={64} fotoUrl={membro.fotoUrl} />
          <div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--color-text)' }}>
              {membro.nome}
            </h2>
            <span className="badge badge-info" style={{ marginTop: 'var(--space-1)' }}>
              {PARENTESCO_LABEL[membro.parentesco]}
            </span>
          </div>
        </div>

        <hr className="divider" />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <Calendar size={16} style={{ color: 'var(--color-text-faint)', flexShrink: 0 }} aria-hidden />
            <div>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>Data de nascimento</p>
              <p style={{ fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--color-text)' }}>
                {formatarData(membro.dataNascimento)} · {calcularIdade(membro.dataNascimento)}
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <User size={16} style={{ color: 'var(--color-text-faint)', flexShrink: 0 }} aria-hidden />
            <div>
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>Parentesco</p>
              <p style={{ fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--color-text)' }}>
                {PARENTESCO_LABEL[membro.parentesco]}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Ações rápidas */}
      <div style={{ display: 'flex', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
        <Link
          to={`/historico?membro=${membro.id}`}
          className="btn btn-ghost"
          style={{ flex: 1, gap: 'var(--space-2)' }}
        >
          <ClipboardList size={16} aria-hidden /> Ver histórico
        </Link>
        <Link
          to={`/vacinas/membro/${membro.id}`}
          className="btn btn-ghost"
          style={{ flex: 1, gap: 'var(--space-2)' }}
        >
          <Syringe size={16} aria-hidden /> Gerenciar doses
        </Link>
      </div>

      {/* Editar / Remover */}
      <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
        <Link
          to={`/membros/${membro.id}/editar`}
          className="btn btn-ghost"
          style={{ flex: 1, gap: 'var(--space-2)' }}
        >
          <Edit2 size={16} aria-hidden /> Editar
        </Link>
        <button
          onClick={() => setConfirmarRemocao(true)}
          className="btn btn-ghost"
          style={{ flex: 1, gap: 'var(--space-2)', color: 'var(--color-error)', borderColor: 'var(--color-error-highlight)' }}
        >
          <Trash2 size={16} aria-hidden /> Remover
        </button>
      </div>

      {/* Modal confirmação */}
      {confirmarRemocao && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="dialog-title"
          style={{
            position: 'fixed', inset: 0, zIndex: 50,
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
            background: 'oklch(0 0 0 / 0.5)',
            padding: 'var(--space-4)',
          }}
          onClick={e => { if (e.target === e.currentTarget) setConfirmarRemocao(false) }}
        >
          <div className="card" style={{ width: '100%', maxWidth: 440, marginBottom: 'env(safe-area-inset-bottom)' }}>
            <h3 id="dialog-title" style={{ fontFamily: 'var(--font-display)', fontWeight: 700, marginBottom: 'var(--space-2)', color: 'var(--color-text)' }}>
              Remover membro?
            </h3>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-6)' }}>
              Isso removerá <strong>{membro.nome}</strong> e todo o histórico vacinal. Essa ação não pode ser desfeita.
            </p>
            <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
              <button onClick={() => setConfirmarRemocao(false)} className="btn btn-ghost" style={{ flex: 1 }}>Cancelar</button>
              <button
                onClick={handleRemover}
                className="btn"
                style={{ flex: 1, background: 'var(--color-error)', color: '#fff' }}
              >
                Remover
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
