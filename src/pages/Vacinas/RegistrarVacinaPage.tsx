import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { ArrowLeft, CheckCircle2 } from 'lucide-react'
import { useMembros, PARENTESCO_LABEL } from '@/contexts/MembrosContext'
import { useVacinas } from '@/contexts/VacinasContext'
import { useLembretes } from '@/contexts/LembretesContext'

type Step = 'membro' | 'vacina' | 'detalhes' | 'sucesso'

// Feedback tátil: vibra 2 vezes rapidamente ao salvar com sucesso
function vibrarSucesso() {
  if ('vibrate' in navigator) {
    navigator.vibrate([80, 60, 80])
  }
}

// Mensagens de erro em Linguagem Simples (ABNT NBR 17060 / relatório Design Inclusivo)
const ERROS_SIMPLES: Record<string, string> = {
  camposObrigatorios:
    'Por favor, preencha todos os campos marcados com *. São eles: data da vacina e local onde foi aplicada.',
  dataObrigatoria:
    'Por favor, informe a data em que a vacina foi tomada. Exemplo: 15/08/2026.',
  dataFutura:
    'A data informada ainda não chegou. Por favor, escolha uma data de hoje ou de dias anteriores.',
  localObrigatorio:
    'Por favor, informe onde a vacina foi aplicada. Exemplo: UBS Centro, Clínica São João.',
}

export function RegistrarVacinaPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { membros } = useMembros()
  const { vacinas, registrarDose } = useVacinas()
  const { adicionarLembrete } = useLembretes()

  const membroPreSelecionado = (location.state as { membroId?: string } | null)?.membroId ?? ''

  const [step, setStep] = useState<Step>(membroPreSelecionado ? 'vacina' : 'membro')
  const [membroId, setMembroId] = useState(membroPreSelecionado)
  const [vacinaId, setVacinaId] = useState('')
  const [numeroDose, setNumeroDose] = useState(1)
  const [dataAplicacao, setDataAplicacao] = useState(new Date().toISOString().slice(0, 10))
  const [localAplicacao, setLocalAplicacao] = useState('')
  const [lote, setLote] = useState('')
  const [observacoes, setObservacoes] = useState('')
  const [erro, setErro] = useState('')

  const membro = membros.find(m => m.id === membroId)
  const vacina = vacinas.find(v => v.id === vacinaId)

  const STEPS: Step[] = ['membro', 'vacina', 'detalhes']
  const stepIndex = STEPS.indexOf(step)

  function handleSalvar() {
    // Validações com mensagens em Linguagem Simples
    if (!dataAplicacao) {
      setErro(ERROS_SIMPLES.dataObrigatoria)
      return
    }
    if (new Date(dataAplicacao) > new Date()) {
      setErro(ERROS_SIMPLES.dataFutura)
      return
    }
    if (!localAplicacao.trim()) {
      setErro(ERROS_SIMPLES.localObrigatorio)
      return
    }
    if (!membroId || !vacinaId) {
      setErro(ERROS_SIMPLES.camposObrigatorios)
      return
    }

    registrarDose(
      { membroId, vacinaId, numeroDose, dataAplicacao, localAplicacao, lote: lote || undefined, observacoes: observacoes || undefined },
      (mId, vId, nDose, dataLembrete) => {
        adicionarLembrete({
          membroId: mId,
          vacinaId: vId,
          numeroDose: nDose,
          dataLembrete,
          status: 'pendente',
          automatico: true,
        })
      }
    )

    // Feedback tátil ao registrar com sucesso
    vibrarSucesso()
    setStep('sucesso')
  }

  if (step === 'sucesso') {
    return (
      <div
        style={{ maxWidth: 480, margin: '0 auto', paddingBottom: 'var(--space-8)', textAlign: 'center', paddingTop: 'var(--space-12)' }}
        role="status"
        aria-live="polite"
        aria-label="Dose registrada com sucesso"
      >
        <CheckCircle2 size={56} style={{ margin: '0 auto var(--space-4)', color: 'var(--color-success)' }} aria-hidden />
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--color-text)', marginBottom: 'var(--space-2)' }}>
          Dose registrada!
        </h2>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-8)', maxWidth: 300, margin: '0 auto var(--space-8)' }}>
          A dose {numeroDose} de <strong>{vacina?.nome}</strong> foi registrada para <strong>{membro?.nome}</strong>.
          {vacina && numeroDose < vacina.doses && (
            <> Um lembrete para a próxima dose foi criado automaticamente.</>
          )}
        </p>
        <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'center' }}>
          <button
            onClick={() => {
              setStep('membro'); setMembroId(''); setVacinaId('')
              setNumeroDose(1); setDataAplicacao(new Date().toISOString().slice(0, 10))
              setLocalAplicacao(''); setLote(''); setObservacoes(''); setErro('')
            }}
            className="btn btn-ghost"
            style={{ minHeight: 48 }}
          >
            Registrar outra
          </button>
          <button
            onClick={() => navigate('/vacinas')}
            className="btn btn-primary"
            style={{ minHeight: 48 }}
          >
            Ver vacinas
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', paddingBottom: 'var(--space-8)' }}>
      <button
        onClick={() => (stepIndex > 0 ? setStep(STEPS[stepIndex - 1]) : navigate(-1))}
        style={{
          display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
          color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)',
          marginBottom: 'var(--space-6)',
          minHeight: 48, // alvo de toque mínimo 48px (ABNT NBR 17060)
          padding: 'var(--space-2) 0',
        }}
        aria-label="Voltar"
      >
        <ArrowLeft size={18} aria-hidden /> Voltar
      </button>

      <div style={{ marginBottom: 'var(--space-6)' }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--color-text)', marginBottom: 'var(--space-3)' }}>
          Registrar dose
        </h2>
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          {STEPS.map((s, i) => (
            <div
              key={s}
              style={{
                flex: 1, height: 4, borderRadius: 'var(--radius-full)',
                background: i <= stepIndex ? 'var(--color-primary)' : 'var(--color-border)',
                transition: 'background 0.2s',
              }}
              aria-hidden
            />
          ))}
        </div>
      </div>

      {step === 'membro' && (
        <div>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-4)' }}>
            Para qual membro é esta dose?
          </p>
          <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }} role="list">
            {membros.map(m => (
              <li key={m.id}>
                <button
                  onClick={() => { setMembroId(m.id); setStep('vacina') }}
                  className="card card-hover"
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center',
                    gap: 'var(--space-4)', padding: 'var(--space-4) var(--space-5)',
                    cursor: 'pointer', textAlign: 'left',
                    minHeight: 48, // alvo de toque mínimo 48px
                    outline: m.id === membroId ? '2px solid var(--color-primary)' : undefined,
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: 600, fontSize: 'var(--text-sm)', color: 'var(--color-text)' }}>{m.nome}</p>
                    <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>{PARENTESCO_LABEL[m.parentesco]}</p>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {step === 'vacina' && (
        <div>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-4)' }}>
            Qual vacina foi aplicada?
          </p>
          <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }} role="list">
            {vacinas.map(v => (
              <li key={v.id}>
                <button
                  onClick={() => { setVacinaId(v.id); setNumeroDose(1); setStep('detalhes') }}
                  className="card card-hover"
                  style={{
                    width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
                    padding: 'var(--space-4) var(--space-5)', cursor: 'pointer', textAlign: 'left',
                    minHeight: 48, // alvo de toque mínimo 48px
                    outline: v.id === vacinaId ? '2px solid var(--color-primary)' : undefined,
                  }}
                >
                  <p style={{ fontWeight: 600, fontSize: 'var(--text-sm)', color: 'var(--color-text)' }}>{v.nome}</p>
                  <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                    {v.doses === 1 ? 'Dose única' : `${v.doses} doses`} · {v.doencasProtege.slice(0, 2).join(', ')}
                  </p>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {step === 'detalhes' && vacina && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div className="card" style={{ padding: 'var(--space-4) var(--space-5)' }}>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-1)' }}>Vacina selecionada</p>
            <p style={{ fontWeight: 600, fontSize: 'var(--text-sm)', color: 'var(--color-text)' }}>{vacina.nome}</p>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>para {membro?.nome}</p>
          </div>

          {vacina.doses > 1 && (
            <div>
              <label style={{ display: 'block', fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-2)', fontWeight: 500 }}>
                Número da dose
              </label>
              <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                {Array.from({ length: vacina.doses }, (_, i) => i + 1).map(n => (
                  <button
                    key={n}
                    onClick={() => setNumeroDose(n)}
                    className={numeroDose === n ? 'btn btn-primary' : 'btn btn-ghost'}
                    style={{ minWidth: 48, minHeight: 48 }} // alvo de toque mínimo 48px
                  >
                    {n}ª
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <label htmlFor="data" style={{ display: 'block', fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-2)', fontWeight: 500 }}>
              Data em que a vacina foi tomada *
            </label>
            <input
              id="data"
              type="date"
              value={dataAplicacao}
              max={new Date().toISOString().slice(0, 10)}
              onChange={e => { setDataAplicacao(e.target.value); setErro('') }}
              className="input-field"
              aria-describedby={erro ? 'erro-form' : undefined}
              style={{ minHeight: 48 }}
            />
          </div>

          <div>
            <label htmlFor="local" style={{ display: 'block', fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-2)', fontWeight: 500 }}>
              Onde a vacina foi aplicada? *
            </label>
            <input
              id="local"
              type="text"
              value={localAplicacao}
              onChange={e => { setLocalAplicacao(e.target.value); setErro('') }}
              placeholder="Ex: UBS Vila Madalena, Clínica São João"
              className="input-field"
              aria-describedby={erro ? 'erro-form' : undefined}
              style={{ minHeight: 48 }}
            />
          </div>

          <div>
            <label htmlFor="lote" style={{ display: 'block', fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-2)', fontWeight: 500 }}>
              Número do lote (opcional)
            </label>
            <input
              id="lote"
              type="text"
              value={lote}
              onChange={e => setLote(e.target.value)}
              placeholder="Ex: AB1234"
              className="input-field"
              style={{ minHeight: 48 }}
            />
          </div>

          <div>
            <label htmlFor="obs" style={{ display: 'block', fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-2)', fontWeight: 500 }}>
              Observações (opcional)
            </label>
            <textarea
              id="obs"
              value={observacoes}
              onChange={e => setObservacoes(e.target.value)}
              placeholder="Reações, observações do profissional de saúde..."
              rows={3}
              className="input-field"
              style={{ resize: 'vertical' }}
            />
          </div>

          {/* Mensagem de erro em Linguagem Simples com role=alert para leitores de tela */}
          {erro && (
            <p
              id="erro-form"
              role="alert"
              aria-live="assertive"
              style={{
                fontSize: 'var(--text-sm)',
                color: 'var(--color-error)',
                background: 'var(--color-error-highlight)',
                borderRadius: 'var(--radius-md)',
                padding: 'var(--space-3) var(--space-4)',
                lineHeight: 1.5,
              }}
            >
              ⚠️ {erro}
            </p>
          )}

          <button
            onClick={handleSalvar}
            className="btn btn-primary"
            style={{ width: '100%', minHeight: 48 }}
          >
            Salvar registro
          </button>
        </div>
      )}
    </div>
  )
}
