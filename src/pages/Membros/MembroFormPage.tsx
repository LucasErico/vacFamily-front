import { useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useMembros, PARENTESCO_LABEL } from '@/contexts/MembrosContext'
import type { Parentesco } from '@/types'

const PARENTESCOS = Object.entries(PARENTESCO_LABEL) as [Parentesco, string][]

export function MembroFormPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const { adicionarMembro, atualizarMembro, buscarMembro } = useMembros()

  const membroExistente = id ? buscarMembro(id) : undefined
  const isEdicao = !!membroExistente

  const [nome, setNome] = useState(membroExistente?.nome ?? '')
  const [dataNascimento, setDataNascimento] = useState(membroExistente?.dataNascimento ?? '')
  const [parentesco, setParentesco] = useState<Parentesco>(membroExistente?.parentesco ?? 'filho')
  const [erros, setErros] = useState<Record<string, string>>({})

  function validar() {
    const e: Record<string, string> = {}
    if (!nome.trim()) e.nome = 'Nome é obrigatório.'
    if (!dataNascimento) e.dataNascimento = 'Data de nascimento é obrigatória.'
    else if (new Date(dataNascimento) > new Date()) e.dataNascimento = 'Data não pode ser no futuro.'
    return e
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const errosValidacao = validar()
    if (Object.keys(errosValidacao).length > 0) { setErros(errosValidacao); return }

    if (isEdicao) {
      atualizarMembro(membroExistente!.id, { nome, dataNascimento, parentesco })
      navigate(`/membros/${membroExistente!.id}`, { replace: true })
    } else {
      const novo = adicionarMembro({ nome, dataNascimento, parentesco })
      navigate(`/membros/${novo.id}`, { replace: true })
    }
  }

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', paddingBottom: 'var(--space-8)' }}>
      <button
        onClick={() => navigate(-1)}
        style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)', marginBottom: 'var(--space-6)', minHeight: 44 }}
      >
        <ArrowLeft size={18} aria-hidden /> Voltar
      </button>

      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-lg)', fontWeight: 700, marginBottom: 'var(--space-6)', color: 'var(--color-text)' }}>
        {isEdicao ? 'Editar membro' : 'Novo membro'}
      </h2>

      <div className="card">
        <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>

          {/* Nome */}
          <div>
            <label htmlFor="nome" style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 500, marginBottom: 'var(--space-2)', color: 'var(--color-text)' }}>
              Nome completo *
            </label>
            <input
              id="nome"
              type="text"
              autoComplete="name"
              value={nome}
              onChange={e => setNome(e.target.value)}
              className={`input-field${erros.nome ? ' error' : ''}`}
              aria-describedby={erros.nome ? 'erro-nome' : undefined}
              placeholder="Ex: Maria Silva"
            />
            {erros.nome && <p id="erro-nome" role="alert" style={{ fontSize: 'var(--text-xs)', color: 'var(--color-error)', marginTop: 'var(--space-1)' }}>{erros.nome}</p>}
          </div>

          {/* Data nascimento */}
          <div>
            <label htmlFor="dataNasc" style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 500, marginBottom: 'var(--space-2)', color: 'var(--color-text)' }}>
              Data de nascimento *
            </label>
            <input
              id="dataNasc"
              type="date"
              value={dataNascimento}
              onChange={e => setDataNascimento(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
              className={`input-field${erros.dataNascimento ? ' error' : ''}`}
              aria-describedby={erros.dataNascimento ? 'erro-data' : undefined}
            />
            {erros.dataNascimento && <p id="erro-data" role="alert" style={{ fontSize: 'var(--text-xs)', color: 'var(--color-error)', marginTop: 'var(--space-1)' }}>{erros.dataNascimento}</p>}
          </div>

          {/* Parentesco */}
          <div>
            <label htmlFor="parentesco" style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 500, marginBottom: 'var(--space-2)', color: 'var(--color-text)' }}>
              Parentesco
            </label>
            <select
              id="parentesco"
              value={parentesco}
              onChange={e => setParentesco(e.target.value as Parentesco)}
              className="input-field"
              style={{ cursor: 'pointer' }}
            >
              {PARENTESCOS.map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
          </div>

          {/* Botões */}
          <div style={{ display: 'flex', gap: 'var(--space-3)', paddingTop: 'var(--space-2)' }}>
            <button type="button" onClick={() => navigate(-1)} className="btn btn-ghost" style={{ flex: 1 }}>Cancelar</button>
            <button type="submit" className="btn btn-primary" style={{ flex: 2 }}>
              {isEdicao ? 'Salvar alterações' : 'Adicionar membro'}
            </button>
          </div>

        </form>
      </div>
    </div>
  )
}
