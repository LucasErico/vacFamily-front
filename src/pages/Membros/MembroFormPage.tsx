import { useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useMembros, RELACAO_LABEL } from '@/contexts/MembrosContext'
import type { Relacao, TipoCalendario } from '@/types'

const RELACOES = Object.entries(RELACAO_LABEL) as [Relacao, string][]

type Sexo = 'M' | 'F' | 'outro'

const SEXO_LABEL: Record<Sexo, string> = {
  M:     'Masculino',
  F:     'Feminino',
  outro: 'Outro / Prefiro não informar',
}

const CALENDARIO_LABEL: Record<TipoCalendario, string> = {
  infantil:    'Infantil (0–12 anos)',
  adolescente: 'Adolescente (12–19 anos)',
  adulto:      'Adulto (19–59 anos)',
  gestante:    'Gestante',
  idoso:       'Idoso (60+ anos)',
  especial:    'Especial / Imunossuprimido',
}

// Inferir calendário a partir da data de nascimento
function inferirCalendario(dataNasc: string): TipoCalendario {
  if (!dataNasc) return 'adulto'
  const hoje = new Date()
  const nasc = new Date(dataNasc)
  const anos = (hoje.getTime() - nasc.getTime()) / (1000 * 60 * 60 * 24 * 365.25)
  if (anos < 12) return 'infantil'
  if (anos < 19) return 'adolescente'
  if (anos >= 60) return 'idoso'
  return 'adulto'
}

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
  const [dataNascimento, setDataNascimento] = useState(membroExistente?.data_nascimento ?? '')
  const [relacao, setRelacao] = useState<Relacao>(membroExistente?.relacao ?? 'filho')
  const [sexo, setSexo] = useState<Sexo>(membroExistente?.sexo ?? 'outro')
  const [tipoCalendario, setTipoCalendario] = useState<TipoCalendario>(
    membroExistente?.tipo_calendario ?? 'adulto'
  )
  const [observacoes, setObservacoes] = useState(membroExistente?.observacoes ?? '')
  const [erros, setErros] = useState<Record<string, string>>({})
  const [enviando, setEnviando] = useState(false)

  // Auto-inferir calendário ao mudar data de nascimento
  function handleDataNascChange(val: string) {
    setDataNascimento(val)
    setErros(prev => ({ ...prev, dataNascimento: '' }))
    if (val) setTipoCalendario(inferirCalendario(val))
  }

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

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const errosValidacao = validar()
    if (Object.keys(errosValidacao).length > 0) { setErros(errosValidacao); return }

    setEnviando(true)
    try {
      const payload = {
        nome,
        data_nascimento: dataNascimento,
        sexo,
        relacao,
        tipo_calendario: tipoCalendario,
        ...(observacoes.trim() ? { observacoes: observacoes.trim() } : {}),
      }

      if (isEdicao) {
        await atualizarMembro(membroExistente!.id, payload)
        navigate(`/membros/${membroExistente!.id}`, { replace: true })
      } else {
        const novo = await adicionarMembro(payload)
        navigate(`/membros/${novo.id}`, { replace: true })
      }
    } catch {
      setErros({ geral: 'Erro ao salvar. Tente novamente.' })
    } finally {
      setEnviando(false)
    }
  }

  const labelStyle = {
    display: 'block', fontSize: 'var(--text-sm)', fontWeight: 500,
    marginBottom: 'var(--space-2)', color: 'var(--color-text)',
  } as const

  const erroStyle = {
    fontSize: 'var(--text-sm)', color: 'var(--color-error)',
    background: 'var(--color-error-highlight)', borderRadius: 'var(--radius-md)',
    padding: 'var(--space-2) var(--space-3)', marginTop: 'var(--space-2)', lineHeight: 1.5,
  } as const

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', paddingBottom: 'var(--space-8)' }}>
      <button
        onClick={() => navigate(-1)}
        style={{
          display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
          color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)',
          marginBottom: 'var(--space-6)', minHeight: 48, padding: 'var(--space-2) 0',
        }}
      >
        <ArrowLeft size={18} aria-hidden /> Voltar
      </button>

      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-lg)', fontWeight: 700, marginBottom: 'var(--space-6)', color: 'var(--color-text)' }}>
        {isEdicao ? 'Editar membro' : 'Novo membro'}
      </h2>

      <div className="card">
        <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>

          {erros.geral && (
            <p role="alert" style={{ fontSize: 'var(--text-sm)', color: 'var(--color-error)', background: 'var(--color-error-highlight)', borderRadius: 'var(--radius-md)', padding: 'var(--space-2) var(--space-3)' }}>
              ⚠️ {erros.geral}
            </p>
          )}

          {/* Nome */}
          <div>
            <label htmlFor="nome" style={labelStyle}>Nome completo *</label>
            <input
              id="nome" type="text" autoComplete="name"
              value={nome}
              onChange={e => { setNome(e.target.value); setErros(prev => ({ ...prev, nome: '' })) }}
              className={`input-field${erros.nome ? ' error' : ''}`}
              aria-describedby={erros.nome ? 'erro-nome' : undefined}
              aria-invalid={!!erros.nome}
              placeholder="Ex: Maria da Silva"
              style={{ minHeight: 48 }}
            />
            {erros.nome && <p id="erro-nome" role="alert" aria-live="assertive" style={erroStyle}>⚠️ {erros.nome}</p>}
          </div>

          {/* Data nascimento */}
          <div>
            <label htmlFor="dataNasc" style={labelStyle}>Data de nascimento *</label>
            <input
              id="dataNasc" type="date"
              value={dataNascimento}
              onChange={e => handleDataNascChange(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
              className={`input-field${erros.dataNascimento ? ' error' : ''}`}
              aria-describedby={erros.dataNascimento ? 'erro-data' : undefined}
              aria-invalid={!!erros.dataNascimento}
              style={{ minHeight: 48 }}
            />
            {erros.dataNascimento && <p id="erro-data" role="alert" aria-live="assertive" style={erroStyle}>⚠️ {erros.dataNascimento}</p>}
          </div>

          {/* Sexo */}
          <div>
            <label htmlFor="sexo" style={labelStyle}>Sexo biológico *</label>
            <select
              id="sexo" value={sexo}
              onChange={e => setSexo(e.target.value as Sexo)}
              className="input-field"
              style={{ cursor: 'pointer', minHeight: 48 }}
            >
              {(Object.entries(SEXO_LABEL) as [Sexo, string][]).map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
          </div>

          {/* Relação familiar */}
          <div>
            <label htmlFor="relacao" style={labelStyle}>Parentesco</label>
            <select
              id="relacao" value={relacao}
              onChange={e => setRelacao(e.target.value as Relacao)}
              className="input-field"
              style={{ cursor: 'pointer', minHeight: 48 }}
            >
              {RELACOES.map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
          </div>

          {/* Tipo calendário */}
          <div>
            <label htmlFor="calendario" style={labelStyle}>Calendário vacinal</label>
            <select
              id="calendario" value={tipoCalendario}
              onChange={e => setTipoCalendario(e.target.value as TipoCalendario)}
              className="input-field"
              style={{ cursor: 'pointer', minHeight: 48 }}
            >
              {(Object.entries(CALENDARIO_LABEL) as [TipoCalendario, string][]).map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginTop: 'var(--space-1)' }}>
              Sugerido automaticamente pela data de nascimento. Você pode ajustar.
            </p>
          </div>

          {/* Observações (opcional) */}
          <div>
            <label htmlFor="obs" style={labelStyle}>Observações <span style={{ fontWeight: 400, color: 'var(--color-text-muted)' }}>(opcional)</span></label>
            <textarea
              id="obs"
              value={observacoes}
              onChange={e => setObservacoes(e.target.value)}
              className="input-field"
              rows={3}
              maxLength={1000}
              placeholder="Alergias, condições especiais, etc."
              style={{ resize: 'vertical', minHeight: 80 }}
            />
          </div>

          {/* Botões */}
          <div style={{ display: 'flex', gap: 'var(--space-3)', paddingTop: 'var(--space-2)' }}>
            <button type="button" onClick={() => navigate(-1)} className="btn btn-ghost" style={{ flex: 1, minHeight: 48 }} disabled={enviando}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" style={{ flex: 2, minHeight: 48 }} disabled={enviando}>
              {enviando ? 'Salvando…' : isEdicao ? 'Salvar alterações' : 'Adicionar membro'}
            </button>
          </div>

        </form>
      </div>
    </div>
  )
}
