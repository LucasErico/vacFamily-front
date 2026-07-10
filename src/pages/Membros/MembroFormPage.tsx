import { useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useMembros, PARENTESCO_LABEL } from '@/contexts/MembrosContext'
import type { Parentesco } from '@/types'

const PARENTESCOS = Object.entries(PARENTESCO_LABEL) as [Parentesco, string][]

// Mensagens de erro em Linguagem Simples (ABNT NBR 17060 / relatório Design Inclusivo)
const ERROS_SIMPLES = {
  nome: 'Por favor, informe o nome completo da pessoa. Exemplo: Maria da Silva.',
  dataNascimentoObrigatoria: 'Por favor, informe a data de nascimento da pessoa.',
  dataNascimentoFutura:
    'A data informada ainda não chegou. Por favor, escolha uma data de hoje ou de dias anteriores.',
}

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
    if (!nome.trim()) e.nome = ERROS_SIMPLES.nome
    if (!dataNascimento) {
      e.dataNascimento = ERROS_SIMPLES.dataNascimentoObrigatoria
    } else if (new Date(dataNascimento) > new Date()) {
      e.dataNascimento = ERROS_SIMPLES.dataNascimentoFutura
    }
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
        style={{
          display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
          color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)',
          marginBottom: 'var(--space-6)',
          minHeight: 48, // alvo de toque mínimo 48px (ABNT NBR 17060)
          padding: 'var(--space-2) 0',
        }}
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
            <label
              htmlFor="nome"
              style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 500, marginBottom: 'var(--space-2)', color: 'var(--color-text)' }}
            >
              Nome completo *
            </label>
            <input
              id="nome"
              type="text"
              autoComplete="name"
              value={nome}
              onChange={e => { setNome(e.target.value); setErros(prev => ({ ...prev, nome: '' })) }}
              className={`input-field${erros.nome ? ' error' : ''}`}
              aria-describedby={erros.nome ? 'erro-nome' : undefined}
              aria-invalid={!!erros.nome}
              placeholder="Ex: Maria da Silva"
              style={{ minHeight: 48 }} // alvo de toque mínimo 48px
            />
            {erros.nome && (
              <p
                id="erro-nome"
                role="alert"
                aria-live="assertive"
                style={{
                  fontSize: 'var(--text-sm)',
                  color: 'var(--color-error)',
                  background: 'var(--color-error-highlight)',
                  borderRadius: 'var(--radius-md)',
                  padding: 'var(--space-2) var(--space-3)',
                  marginTop: 'var(--space-2)',
                  lineHeight: 1.5,
                }}
              >
                ⚠️ {erros.nome}
              </p>
            )}
          </div>

          {/* Data nascimento */}
          <div>
            <label
              htmlFor="dataNasc"
              style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 500, marginBottom: 'var(--space-2)', color: 'var(--color-text)' }}
            >
              Data de nascimento *
            </label>
            <input
              id="dataNasc"
              type="date"
              value={dataNascimento}
              onChange={e => { setDataNascimento(e.target.value); setErros(prev => ({ ...prev, dataNascimento: '' })) }}
              max={new Date().toISOString().split('T')[0]}
              className={`input-field${erros.dataNascimento ? ' error' : ''}`}
              aria-describedby={erros.dataNascimento ? 'erro-data' : undefined}
              aria-invalid={!!erros.dataNascimento}
              style={{ minHeight: 48 }} // alvo de toque mínimo 48px
            />
            {erros.dataNascimento && (
              <p
                id="erro-data"
                role="alert"
                aria-live="assertive"
                style={{
                  fontSize: 'var(--text-sm)',
                  color: 'var(--color-error)',
                  background: 'var(--color-error-highlight)',
                  borderRadius: 'var(--radius-md)',
                  padding: 'var(--space-2) var(--space-3)',
                  marginTop: 'var(--space-2)',
                  lineHeight: 1.5,
                }}
              >
                ⚠️ {erros.dataNascimento}
              </p>
            )}
          </div>

          {/* Parentesco */}
          <div>
            <label
              htmlFor="parentesco"
              style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 500, marginBottom: 'var(--space-2)', color: 'var(--color-text)' }}
            >
              Parentesco
            </label>
            <select
              id="parentesco"
              value={parentesco}
              onChange={e => setParentesco(e.target.value as Parentesco)}
              className="input-field"
              style={{ cursor: 'pointer', minHeight: 48 }} // alvo de toque mínimo 48px
            >
              {PARENTESCOS.map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
          </div>

          {/* Botões */}
          <div style={{ display: 'flex', gap: 'var(--space-3)', paddingTop: 'var(--space-2)' }}>
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="btn btn-ghost"
              style={{ flex: 1, minHeight: 48 }} // alvo de toque mínimo 48px
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              style={{ flex: 2, minHeight: 48 }} // alvo de toque mínimo 48px
            >
              {isEdicao ? 'Salvar alterações' : 'Adicionar membro'}
            </button>
          </div>

        </form>
      </div>
    </div>
  )
}
