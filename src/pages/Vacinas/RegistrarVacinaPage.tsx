import { useMemo, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, CalendarDays, Clock, Syringe, AlertTriangle } from 'lucide-react'
import { useMembros, RELACAO_LABEL } from '@/contexts/MembrosContext'
import { useVacinas, vacinaCompativel } from '@/contexts/VacinasContext'
import { useLembretes } from '@/contexts/LembretesContext'
import type { CriarLembretePayload, TipoCalendario, FaixaEtaria, RegistroVacinal, Vacina } from '@/types'

// ---------------------------------------------------------------------------
// Faixas por calendário — espelho exato do VacinasContext para consistência
// ---------------------------------------------------------------------------
const FAIXAS_POR_CALENDARIO: Record<TipoCalendario, FaixaEtaria[]> = {
  infantil:    ['recem_nascido', 'crianca', 'todas'],
  adolescente: ['adolescente', 'adulto', 'todas'],
  adulto:      ['adulto', 'todas'],
  gestante:    ['gestante', 'adulto', 'todas'],
  idoso:       ['idoso', 'adulto', 'todas'],
  especial:    ['recem_nascido', 'crianca', 'adolescente', 'adulto', 'gestante', 'idoso', 'todas'],
}

/**
 * Determina a faixa etária real do membro com base na data de nascimento.
 */
function faixaEtariaReal(dataNascimento: string): FaixaEtaria {
  const nascimento = new Date(dataNascimento)
  const hoje = new Date()
  const anosCompletos = hoje.getFullYear() - nascimento.getFullYear() -
    (hoje < new Date(hoje.getFullYear(), nascimento.getMonth(), nascimento.getDate()) ? 1 : 0)
  const diasCompletos = Math.floor((hoje.getTime() - nascimento.getTime()) / 86400000)

  if (diasCompletos < 28)  return 'recem_nascido'
  if (anosCompletos < 10)  return 'crianca'
  if (anosCompletos < 20)  return 'adolescente'
  if (anosCompletos < 60)  return 'adulto'
  return 'idoso'
}

/**
 * Retorna as faixas etárias de todos os ciclos que o membro já PASSOU.
 */
function faixasCiclosAnteriores(
  tipoCalendario: TipoCalendario,
  dataNascimento: string,
): FaixaEtaria[] {
  const faixaAtual = faixaEtariaReal(dataNascimento)
  const faixasDoCalendarioAtual = FAIXAS_POR_CALENDARIO[tipoCalendario]

  const ORDEM_FAIXAS: FaixaEtaria[] = ['recem_nascido', 'crianca', 'adolescente', 'adulto', 'idoso']
  const idxAtual = ORDEM_FAIXAS.indexOf(faixaAtual)

  const faixasPassadas = idxAtual > 0 ? ORDEM_FAIXAS.slice(0, idxAtual) : []

  return faixasPassadas.filter(f => !faixasDoCalendarioAtual.includes(f))
}

/**
 * Verifica se uma vacina pertence EXCLUSIVAMENTE a ciclos anteriores.
 */
function ehVacinaCicloAnterior(
  vacina: Vacina,
  tipoCalendario: TipoCalendario,
  faixasAnteriores: FaixaEtaria[],
): boolean {
  if (!Array.isArray(vacina.faixa_etaria) || vacina.faixa_etaria.length === 0) return false
  const temFaixaAnterior = vacina.faixa_etaria.some(f => faixasAnteriores.includes(f as FaixaEtaria))
  const pertenceAoAtual = vacinaCompativel(vacina, tipoCalendario)
  return temFaixaAnterior && !pertenceAoAtual
}

// ---------------------------------------------------------------------------
// Labels
// ---------------------------------------------------------------------------
const CICLO_LABEL: Record<TipoCalendario, string> = {
  infantil:    'Infantil',
  adolescente: 'Adolescente',
  adulto:      'Adulto',
  idoso:       'Idoso',
  gestante:    'Gestante',
  especial:    'Especial',
}

// ---------------------------------------------------------------------------
// Tipos internos
// ---------------------------------------------------------------------------
type Step = 'membro' | 'vacina' | 'detalhes' | 'sucesso'
type ModoSalvar = 'historico' | 'agendado'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function vibrarSucesso() {
  if ('vibrate' in navigator) navigator.vibrate([80, 60, 80])
}

function lembreteVacinal(
  vacinaId: string,
  membroFamiliarId: string,
  numeroDose: number,
  dataPrevista: string,
): CriarLembretePayload {
  return {
    vacina_id: vacinaId,
    membro_familiar_id: membroFamiliarId,
    tipo: 'reforco',
    titulo: `Dose ${numeroDose} — lembrete automático`,
    data_prevista: dataPrevista,
    automatico: true,
  }
}

function getIntervaloDias(vacina: Vacina): number {
  if (vacina.intervalos_por_fabricante) {
    const valores = Object.values(vacina.intervalos_por_fabricante)
    if (valores.length > 0) return valores[0]
  }
  return 30
}

function registroDoMembro(r: RegistroVacinal, membroId: string): boolean {
  return r.membro_id === membroId || r.membro_familiar_id === membroId
}

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------
export function RegistrarVacinaPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { membros } = useMembros()
  const { vacinas, registros: todosRegistros, registrarDose } = useVacinas()
  const { adicionarLembrete } = useLembretes()

  const membroPreSelecionado = (location.state as { membroId?: string } | null)?.membroId ?? ''

  const [step, setStep]                     = useState<Step>(membroPreSelecionado ? 'vacina' : 'membro')
  const [membroId, setMembroId]             = useState(membroPreSelecionado)
  const [vacinaId, setVacinaId]             = useState('')
  const [numeroDose, setNumeroDose]         = useState(1)
  const [dataAplicacao, setDataAplicacao]   = useState('')
  const [localAplicacao, setLocalAplicacao] = useState('')
  const [erro, setErro]                     = useState('')
  const [modoSalvo, setModoSalvo]           = useState<ModoSalvar>('historico')

  const hoje = new Date().toISOString().slice(0, 10)
  const membro = membros.find(m => m.id === membroId)
  const vacina = vacinas.find(v => v.id === vacinaId)
  const dataFutura = dataAplicacao > hoje

  const STEPS: Step[] = ['membro', 'vacina', 'detalhes']
  const stepIndex = STEPS.indexOf(step)

  // ---------------------------------------------------------------------------
  // Vacinas de ciclos anteriores
  // ---------------------------------------------------------------------------
  const vacinasCicloAnterior = useMemo(() => {
    if (!membro) return []
    const tipo = membro.tipo_calendario
    const faixasAnt = faixasCiclosAnteriores(tipo, membro.data_nascimento)
    return vacinas.filter(v => ehVacinaCicloAnterior(v, tipo, faixasAnt))
  }, [membro, vacinas])

  // ---------------------------------------------------------------------------
  // Registros do membro atual
  // ---------------------------------------------------------------------------
  function registrosMembro(): RegistroVacinal[] {
    return todosRegistros.filter(r => registroDoMembro(r, membroId))
  }

  // ---------------------------------------------------------------------------
  // Validação de sequência de doses
  // ---------------------------------------------------------------------------
  function validarSequenciaDose(vacinaIdAlvo: string, dose: number): string | null {
    if (dose <= 1) return null
    const temAnterior = registrosMembro().some(
      r => r.vacina_id === vacinaIdAlvo && r.numero_dose === dose - 1
    )
    if (!temAnterior) {
      return `Dose ${dose - 1} não encontrada no histórico. Registre a dose ${dose - 1} antes de prosseguir.`
    }
    return null
  }

  function validarDataComDoseAnterior(vacinaIdAlvo: string, dose: number, data: string): string | null {
    if (dose <= 1) return null
    const anterior = registrosMembro().find(
      r => r.vacina_id === vacinaIdAlvo && r.numero_dose === dose - 1
    )
    if (anterior && data <= anterior.data_aplicacao) {
      const fmt = anterior.data_aplicacao.split('-').reverse().join('/')
      return `A data da dose ${dose} não pode ser anterior ou igual à data da dose ${dose - 1} (${fmt}).`
    }
    return null
  }

  // ---------------------------------------------------------------------------
  // Selecionar vacina — detecta próxima dose pendente
  // ---------------------------------------------------------------------------
  function selecionarVacina(id: string) {
    setVacinaId(id)
    setErro('')
    const v = vacinas.find(vac => vac.id === id)
    if (!v || v.doses_total <= 1) { setNumeroDose(1); setStep('detalhes'); return }

    const aplicadas = registrosMembro().filter(r => r.vacina_id === id).map(r => r.numero_dose)
    const proxima = Array.from({ length: v.doses_total }, (_, i) => i + 1)
      .find(n => !aplicadas.includes(n)) ?? 1
    setNumeroDose(proxima)
    setStep('detalhes')
  }

  // ---------------------------------------------------------------------------
  // Salvar
  // ---------------------------------------------------------------------------
  function handleSalvar() {
    if (!dataAplicacao) { setErro('Por favor, informe a data da vacina.'); return }
    if (!membroId || !vacinaId) { setErro('Dados incompletos.'); return }

    const erroSeq = validarSequenciaDose(vacinaId, numeroDose)
    if (erroSeq) { setErro(erroSeq); return }

    const erroData = validarDataComDoseAnterior(vacinaId, numeroDose, dataAplicacao)
    if (erroData) { setErro(erroData); return }

    if (dataFutura) {
      if (!vacina) return
      const base = new Date(dataAplicacao)
      const intervalo = getIntervaloDias(vacina)
      for (let d = numeroDose; d <= vacina.doses_total; d++) {
        const offset = (d - numeroDose) * intervalo
        const dataPrev = new Date(base.getTime() + offset * 86400000).toISOString().slice(0, 10)
        adicionarLembrete(lembreteVacinal(vacinaId, membroId, d, dataPrev))
      }
    } else {
      if (!localAplicacao.trim()) { setErro('Por favor, informe onde a vacina foi aplicada.'); return }
      registrarDose(
        { membro_id: membroId, vacina_id: vacinaId, numero_dose: numeroDose, data_aplicacao: dataAplicacao, local_aplicacao: localAplicacao },
        (mId, vId, nDose, dataProxima) => adicionarLembrete(lembreteVacinal(vId, mId, nDose, dataProxima))
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

  // ---------------------------------------------------------------------------
  // Card de vacina reutilizável
  // ---------------------------------------------------------------------------
  function CardVacina({ v }: { v: Vacina }) {
    const aplicadas = registrosMembro().filter(r => r.vacina_id === v.id).length
    const completa = aplicadas >= v.doses_total
    return (
      <li>
        <button
          onClick={() => !completa && selecionarVacina(v.id)}
          disabled={completa}
          className="card card-hover"
          style={{
            width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
            padding: 'var(--space-4) var(--space-5)', cursor: completa ? 'default' : 'pointer',
            textAlign: 'left', minHeight: 48,
            outline: v.id === vacinaId ? '2px solid var(--color-primary)' : undefined,
            opacity: completa ? 0.5 : 1,
          }}
          aria-disabled={completa}
        >
          <div style={{ display: 'flex', width: '100%', alignItems: 'center', gap: 'var(--space-3)' }}>
            <p style={{ fontWeight: 600, fontSize: 'var(--text-sm)', color: 'var(--color-text)', flex: 1 }}>{v.nome}</p>
            {completa && (
              <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--color-success)', background: 'var(--color-success-highlight)', padding: '2px var(--space-2)', borderRadius: 'var(--radius-full)' }}>
                Completa
              </span>
            )}
          </div>
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginTop: 'var(--space-1)' }}>
            {v.doses_total === 1 ? 'Dose única' : `${aplicadas}/${v.doses_total} doses`}
            {v.doencas_previstas?.length ? ` · ${v.doencas_previstas.slice(0, 2).join(', ')}` : ''}
          </p>
        </button>
      </li>
    )
  }

  // ---------------------------------------------------------------------------
  // Tela de sucesso
  // ---------------------------------------------------------------------------
  if (step === 'sucesso') {
    return (
      <div style={{ maxWidth: 480, margin: '0 auto', paddingBottom: 'var(--space-8)', textAlign: 'center', paddingTop: 'var(--space-12)' }} role="status" aria-live="polite">
        <CheckCircle2 size={56} style={{ margin: '0 auto var(--space-4)', color: 'var(--color-success)' }} aria-hidden />
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--color-text)', marginBottom: 'var(--space-2)' }}>
          {modoSalvo === 'agendado' ? 'Vacina agendada!' : 'Dose registrada!'}
        </h2>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', maxWidth: 320, margin: '0 auto var(--space-8)' }}>
          {modoSalvo === 'agendado'
            ? `Os lembretes das doses de ${vacina?.nome} para ${membro?.nome} foram criados.`
            : `A dose ${numeroDose} de ${vacina?.nome} foi registrada para ${membro?.nome}.${vacina && numeroDose < vacina.doses_total ? ' Um lembrete para a próxima dose foi criado automaticamente.' : ''}`
          }
        </p>
        <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'center' }}>
          <button onClick={resetar} className="btn btn-ghost" style={{ minHeight: 48 }}>Registrar outra</button>
          <button onClick={() => navigate('/vacinas')} className="btn btn-primary" style={{ minHeight: 48 }}>Ver vacinas</button>
        </div>
      </div>
    )
  }

  // ---------------------------------------------------------------------------
  // Wizard
  // ---------------------------------------------------------------------------
  return (
    <div style={{ maxWidth: 480, margin: '0 auto', paddingBottom: 'var(--space-8)' }}>
      {/* Botão voltar */}
      <button
        onClick={() => (stepIndex > 0 ? setStep(STEPS[stepIndex - 1]) : navigate(-1))}
        style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)', marginBottom: 'var(--space-6)', minHeight: 48, padding: 'var(--space-2) 0' }}
        aria-label="Voltar"
      >
        <ArrowLeft size={18} aria-hidden /> Voltar
      </button>

      {/* Barra de progresso */}
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--color-text)', marginBottom: 'var(--space-3)' }}>Registrar vacina</h2>
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          {STEPS.map((s, i) => (
            <div key={s} style={{ flex: 1, height: 4, borderRadius: 'var(--radius-full)', background: i <= stepIndex ? 'var(--color-primary)' : 'var(--color-border)', transition: 'background 0.2s' }} aria-hidden />
          ))}
        </div>
      </div>

      {/* ── Step 1: Membro ── */}
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
                    <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                      {RELACAO_LABEL[m.relacao]} · Ciclo {CICLO_LABEL[m.tipo_calendario]}
                    </p>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ── Step 2: Vacina ── */}
      {step === 'vacina' && membro && (
        <div>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-4)' }}>
            Qual vacina para <strong>{membro.nome.split(' ')[0]}</strong>?
          </p>

          {/* Vacinas do ciclo atual do membro */}
          <p style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 'var(--space-3)' }}>
            Ciclo {CICLO_LABEL[membro.tipo_calendario]}
          </p>
          <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', marginBottom: vacinasCicloAnterior.length > 0 ? 'var(--space-6)' : 0 }} role="list">
            {vacinas
              .filter(v => vacinaCompativel(v, membro.tipo_calendario))
              .map(v => <CardVacina key={v.id} v={v} />)
            }
          </ul>

          {/* Ciclos Anteriores (opcional, se existirem) */}
          {vacinasCicloAnterior.length > 0 && (
            <>
              <p style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 'var(--space-3)' }}>
                Ciclos Anteriores
              </p>
              <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }} role="list">
                {vacinasCicloAnterior.map(v => <CardVacina key={v.id} v={v} />)}
              </ul>
            </>
          )}
        </div>
      )}

      {/* ── Step 3: Detalhes ── */}
      {step === 'detalhes' && vacina && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {/* Resumo */}
          <div className="card" style={{ padding: 'var(--space-4) var(--space-5)' }}>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-1)' }}>Vacina selecionada</p>
            <p style={{ fontWeight: 600, fontSize: 'var(--text-sm)', color: 'var(--color-text)' }}>{vacina.nome}</p>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>para {membro?.nome}</p>
          </div>

          {/* Seletor de dose */}
          {vacina.doses_total > 1 && (
            <div>
              <label style={{ display: 'block', fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-2)', fontWeight: 500 }}>
                Número da dose
              </label>
              <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                {Array.from({ length: vacina.doses_total }, (_, i) => i + 1).map(n => {
                  const erroN = validarSequenciaDose(vacinaId, n)
                  const bloqueada = !!erroN
                  return (
                    <button
                      key={n}
                      onClick={() => { if (!bloqueada) { setNumeroDose(n); setErro('') } }}
                      disabled={bloqueada}
                      className={numeroDose === n ? 'btn btn-primary' : 'btn btn-ghost'}
                      style={{ minWidth: 48, minHeight: 48, opacity: bloqueada ? 0.4 : 1, cursor: bloqueada ? 'not-allowed' : 'pointer' }}
                      title={bloqueada ? (erroN ?? '') : ''}
                      aria-disabled={bloqueada}
                    >
                      {n}ª
                    </button>
                  )
                })}
              </div>
              {validarSequenciaDose(vacinaId, numeroDose) && (
                <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'flex-start', marginTop: 'var(--space-2)', padding: 'var(--space-3) var(--space-4)', background: 'var(--color-warning-highlight)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-warning)' }}>
                  <AlertTriangle size={14} style={{ color: 'var(--color-warning)', flexShrink: 0, marginTop: 2 }} aria-hidden />
                  <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-warning)' }}>
                    {validarSequenciaDose(vacinaId, numeroDose)}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Data */}
          <div>
            <label htmlFor="data" style={{ display: 'block', fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-2)', fontWeight: 500 }}>
              Data da vacina *
            </label>
            <input
              id="data" type="date" value={dataAplicacao}
              onChange={e => { setDataAplicacao(e.target.value); setErro('') }}
              className="input-field" style={{ minHeight: 48 }}
            />
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-faint)', marginTop: 'var(--space-1)' }}>
              Datas passadas serão salvas no histórico. Datas futuras serão agendadas.
            </p>
          </div>

          {/* Banner agendado */}
          {dataAplicacao && dataFutura && (
            <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'flex-start', padding: 'var(--space-3) var(--space-4)', background: 'var(--color-primary-highlight)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-primary)' }}>
              <CalendarDays size={16} style={{ color: 'var(--color-primary)', flexShrink: 0, marginTop: 2 }} aria-hidden />
              <div>
                <p style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--color-primary)' }}>Vacina será agendada</p>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginTop: 'var(--space-1)' }}>
                  {vacina.doses_total > 1
                    ? `Lembretes para as ${vacina.doses_total - numeroDose + 1} doses restantes serão criados na Agenda.`
                    : 'Um lembrete será criado automaticamente na Agenda.'}
                </p>
              </div>
            </div>
          )}

          {/* Banner histórico */}
          {dataAplicacao && !dataFutura && (
            <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'flex-start', padding: 'var(--space-3) var(--space-4)', background: 'var(--color-success-highlight)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-success)' }}>
              <Clock size={16} style={{ color: 'var(--color-success)', flexShrink: 0, marginTop: 2 }} aria-hidden />
              <div>
                <p style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--color-success)' }}>Dose será registrada no histórico</p>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginTop: 'var(--space-1)' }}>
                  A dose será salva no histórico vacinal de {membro?.nome?.split(' ')[0]}.
                </p>
              </div>
            </div>
          )}

          {/* Local */}
          {dataAplicacao && !dataFutura && (
            <div>
              <label htmlFor="local" style={{ display: 'block', fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-2)', fontWeight: 500 }}>
                Onde foi aplicada? *
              </label>
              <input
                id="local" type="text" value={localAplicacao}
                onChange={e => { setLocalAplicacao(e.target.value); setErro('') }}
                placeholder="Ex: UBS Vila Madalena, Clínica São João"
                className="input-field" style={{ minHeight: 48 }}
              />
            </div>
          )}

          {/* Erro */}
          {erro && (
            <p role="alert" aria-live="assertive" style={{ fontSize: 'var(--text-sm)', color: 'var(--color-error)', background: 'var(--color-error-highlight)', borderRadius: 'var(--radius-md)', padding: 'var(--space-3) var(--space-4)', lineHeight: 1.5 }}>
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
