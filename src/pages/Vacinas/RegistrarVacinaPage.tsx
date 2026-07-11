import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, CalendarDays, Clock } from 'lucide-react'
import { useMembros, RELACAO_LABEL } from '@/contexts/MembrosContext'
import { useVacinas } from '@/contexts/VacinasContext'
import { useLembretes } from '@/contexts/LembretesContext'

type Step = 'membro' | 'vacina' | 'detalhes' | 'sucesso'
type ModoSalvar = 'historico' | 'agendado'

function vibrarSucesso() {
  if ('vibrate' in navigator) navigator.vibrate([80, 60, 80])
}

const ERROS_SIMPLES: Record<string, string> = {
  camposObrigatorios: 'Por favor, preencha todos os campos marcados com *.',
  dataObrigatoria: 'Por favor, informe a data da vacina. Exemplo: 15/08/2026.',
  localObrigatorio: 'Por favor, informe onde a vacina foi ou será aplicada. Exemplo: UBS Centro.',
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
  const [dataAplicacao, setDataAplicacao] = useState('')
  const [localAplicacao, setLocalAplicacao] = useState('')
  const [erro, setErro] = useState('')
  const [modoSalvo, setModoSalvo] = useState<ModoSalvar>('historico')

  const hoje = new Date().toISOString().slice(0, 10)
  const membro = membros.find(m => m.id === membroId)
  const vacina = vacinas.find(v => v.id === vacinaId)
  const dataFutura = dataAplicacao > hoje

  const STEPS: Step[] = ['membro', 'vacina', 'detalhes']
  const stepIndex = STEPS.indexOf(step)

  function handleSalvar() {
    if (!dataAplicacao) { setErro(ERROS_SIMPLES.dataObrigatoria); return }
    if (!membroId || !vacinaId) { setErro(ERROS_SIMPLES.camposObrigatorios); return }

    if (dataFutura) {
      if (!vacina) return
      const dataBase = new Date(dataAplicacao)
      for (let d = numeroDose; d <= vacina.doses; d++) {
        const offset = (d - numeroDose) * (vacina.intervaloDias ?? 0)
        const dataLembrete = new Date(dataBase.getTime() + offset * 86400000)
          .toISOString().slice(0, 10)
        adicionarLembrete({
          membro_id: membroId,
          vacina_id: vacinaId,
          numero_dose: d,
          data_lembrete: dataLembrete,
          status: 'pendente',
          automatico: true,
        })
      }
    } else {
      if (!localAplicacao.trim()) { setErro(ERROS_SIMPLES.localObrigatorio); return }
      registrarDose(
        {
          membro_id: membroId,
          vacina_id: vacinaId,
          numero_dose: numeroDose,
          data_aplicacao: dataAplicacao,
          local_aplicacao: localAplicacao,
        },
        (mId, vId, nDose, dataLembrete) => {
          adicionarLembrete({
            membro_id: mId,
            vacina_id: vId,
            numero_dose: nDose,
            data_lembrete: dataLembrete,
            status: 'pendente',
            automatico: true,
          })
        }
      )
    }

    setModoSalvo(dataFutura ? 'agendado' : 'historico')
    vibrarSucesso()
    setStep('sucesso')
  }

  function resetar() {
    setStep('membro'); setMembroId(''); setVacinaId('')
    setNumeroDose(1); setDataAplicacao(''); setLocalAplicacao('')
    setErro('')
  }

  if (step === 'sucesso') {
    return (
      <div
        style={{ maxWidth: 480, margin: '0 auto', paddingBottom: 'var(--space-8)', textAlign: 'center', paddingTop: 'var(--space-12)' }}
        role="status"
        aria-live="polite"
      >
        <CheckCircle2 size={56} style={{ margin: '0 auto var(--space-4)', color: 'var(--color-success)' }} aria-hidden />
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--color-text)', marginBottom: 'var(--space-2)' }}>
          {modoSalvo === 'agendado' ? 'Vacina agendada!' : 'Dose registrada!'}
        </h2>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', maxWidth: 320, margin: '0 auto var(--space-8)' }}>
          {modoSalvo === 'agendado'
            ? `Os lembretes das doses de ${vacina?.nome} para ${membro?.nome} foram criados. Você pode acompanhar na Agenda.`
            : `A dose ${numeroDose} de ${vacina?.nome} foi registrada para ${membro?.nome}.${vacina && numeroDose < vacina.doses ? ' Um lembrete para a próxima dose foi criado automaticamente.' : ''}`
          }
        </p>
        <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'center' }}>
          <button onClick={resetar} className="btn btn-ghost" style={{ minHeight: 48 }}>Registrar outra</button>
          <button onClick={() => navigate('/vacinas')} className="btn btn-primary" style={{ minHeight: 48 }}>Ver vacinas</button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', paddingBottom: 'var(--space-8)' }}>
      <button
        onClick={() => (stepIndex > 0 ? setStep(STEPS[stepIndex - 1]) : navigate(-1))}
        style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)', marginBottom: 'var(--space-6)', minHeight: 48, padding: 'var(--space-2) 0' }}
        aria-label="Voltar"
      >
        <ArrowLeft size={18} aria-hidden /> Voltar
      </button>

      <div style={{ marginBottom: 'var(--space-6)' }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--color-text)', marginBottom: 'var(--space-3)' }}>
          Registrar vacina
        </h2>
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          {STEPS.map((s, i) => (
            <div key={s} style={{ flex: 1, height: 4, borderRadius: 'var(--radius-full)', background: i <= stepIndex ? 'var(--color-primary)' : 'var(--color-border)', transition: 'background 0.2s' }} aria-hidden />
          ))}
        </div>
      </div>

      {/* Step 1: Membro */}
      {step === 'membro' && (
        <div>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-4)' }}>
            Para quem da família é esta vacina?
          </p>
          <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }} role="list">
            {membros.map(m => (
              <li key={m.id}>
                <button
                  onClick={() => { setMembroId(m.id); setStep('vacina') }}
                  className="card card-hover"
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 'var(--space-4)', padding: 'var(--space-4) var(--space-5)', cursor: 'pointer', textAlign: 'left', minHeight: 48, outline: m.id === membroId ? '2px solid var(--color-primary)' : undefined }}
                >
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: 600, fontSize: 'var(--text-sm)', color: 'var(--color-text)' }}>{m.nome}</p>
                    <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>{RELACAO_LABEL[m.relacao]}</p>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Step 2: Vacina */}
      {step === 'vacina' && (
        <div>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-4)' }}>
            Qual vacina?
          </p>
          <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }} role="list">
            {vacinas.map(v => (
              <li key={v.id}>
                <button
                  onClick={() => { setVacinaId(v.id); setNumeroDose(1); setStep('detalhes') }}
                  className="card card-hover"
                  style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', padding: 'var(--space-4) var(--space-5)', cursor: 'pointer', textAlign: 'left', minHeight: 48, outline: v.id === vacinaId ? '2px solid var(--color-primary)' : undefined }}
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

      {/* Step 3: Detalhes */}
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
                  <button key={n} onClick={() => setNumeroDose(n)} className={numeroDose === n ? 'btn btn-primary' : 'btn btn-ghost'} style={{ minWidth: 48, minHeight: 48 }}>{n}ª</button>
                ))}
              </div>
            </div>
          )}

          <div>
            <label htmlFor="data" style={{ display: 'block', fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-2)', fontWeight: 500 }}>
              Data da vacina *
            </label>
            <input
              id="data"
              type="date"
              value={dataAplicacao}
              onChange={e => { setDataAplicacao(e.target.value); setErro('') }}
              className="input-field"
              style={{ minHeight: 48 }}
              aria-describedby={erro ? 'erro-form' : undefined}
            />
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-faint)', marginTop: 'var(--space-1)' }}>
              Datas anteriores a hoje serão registradas no histórico. Datas futuras serão agendadas.
            </p>
          </div>

          {dataAplicacao && dataFutura && (
            <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'flex-start', padding: 'var(--space-3) var(--space-4)', background: 'var(--color-primary-highlight)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-primary)' }}>
              <CalendarDays size={16} style={{ color: 'var(--color-primary)', flexShrink: 0, marginTop: 2 }} aria-hidden />
              <div>
                <p style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--color-primary)' }}>Vacina será agendada</p>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginTop: 'var(--space-1)' }}>
                  Como a data ainda não chegou, {vacina.doses > 1 ? `lembretes para as ${vacina.doses - numeroDose + 1} doses restantes serão criados` : 'um lembrete será criado'} automaticamente na Agenda.
                </p>
              </div>
            </div>
          )}

          {dataAplicacao && !dataFutura && (
            <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'flex-start', padding: 'var(--space-3) var(--space-4)', background: 'var(--color-success-highlight)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-success)' }}>
              <Clock size={16} style={{ color: 'var(--color-success)', flexShrink: 0, marginTop: 2 }} aria-hidden />
              <div>
                <p style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--color-success)' }}>Dose será registrada no histórico</p>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginTop: 'var(--space-1)' }}>
                  A data informada já passou. A dose será salva no histórico vacinal de {membro?.nome?.split(' ')[0]}.
                </p>
              </div>
            </div>
          )}

          {!dataFutura && (
            <div>
              <label htmlFor="local" style={{ display: 'block', fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-2)', fontWeight: 500 }}>
                Onde foi aplicada? *
              </label>
              <input id="local" type="text" value={localAplicacao} onChange={e => { setLocalAplicacao(e.target.value); setErro('') }} placeholder="Ex: UBS Vila Madalena, Clínica São João" className="input-field" style={{ minHeight: 48 }} />
            </div>
          )}

          {erro && (
            <p id="erro-form" role="alert" aria-live="assertive" style={{ fontSize: 'var(--text-sm)', color: 'var(--color-error)', background: 'var(--color-error-highlight)', borderRadius: 'var(--radius-md)', padding: 'var(--space-3) var(--space-4)', lineHeight: 1.5 }}>
              ⚠️ {erro}
            </p>
          )}

          <button onClick={handleSalvar} className="btn btn-primary" style={{ width: '100%', minHeight: 48 }}>
            {dataFutura ? 'Agendar vacina' : 'Salvar no histórico'}
          </button>
        </div>
      )}
    </div>
  )
}
