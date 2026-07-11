import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Plus, CheckCircle2, Trash2, ChevronDown } from 'lucide-react'
import { useMembros, RELACAO_LABEL } from '@/contexts/MembrosContext'
import { useVacinas, calcularDosesStatus, isAtrasada } from '@/contexts/VacinasContext'
import { useLembretes } from '@/contexts/LembretesContext'
import { Avatar } from '@/components/ui/Avatar'
import { VacinaStatusBadge } from '@/components/ui/VacinaStatusBadge'
import type { DoseStatus, CriarLembretePayload } from '@/types'

function formatarData(iso: string) {
  const [ano, mes, dia] = iso.split('-')
  return `${dia}/${mes}/${ano}`
}

type ModalState =
  | { tipo: 'nenhum' }
  | { tipo: 'marcarTomada'; dose: DoseStatus; vacinaNome: string }
  | { tipo: 'apagarDose'; dose: DoseStatus; vacinaNome: string; registroId: string }
  | { tipo: 'lembreteVinculado' }

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

function VacinaSkeletonRow() {
  return (
    <li>
      <div className="card" style={{ padding: 'var(--space-4) var(--space-5)', display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          <div className="skeleton skeleton-text" style={{ width: '55%' }} />
          <div className="skeleton skeleton-text" style={{ width: '30%' }} />
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-1)' }}>
          <div className="skeleton" style={{ width: 16, height: 16, borderRadius: 'var(--radius-full)' }} />
          <div className="skeleton" style={{ width: 16, height: 16, borderRadius: 'var(--radius-full)' }} />
        </div>
        <div className="skeleton" style={{ width: 16, height: 16, borderRadius: 'var(--radius-sm)' }} />
      </div>
    </li>
  )
}

export function VacinaMembroPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { membros } = useMembros()
  const {
    vacinas, registros, carregando,
    registrarDose, removerRegistro, buscarRegistrosMembro,
  } = useVacinas()
  const { adicionarLembrete, lembretes, removerLembrete } = useLembretes()

  const hoje = new Date().toISOString().slice(0, 10)

  const [membroSelecionadoId, setMembroSelecionadoId] = useState(id ?? '')
  const [seletorAberto, setSeletorAberto] = useState(false)
  const [vacinaExpandida, setVacinaExpandida] = useState<string | null>(null)
  const [modal, setModal] = useState<ModalState>({ tipo: 'nenhum' })

  const [dataConfirm, setDataConfirm] = useState(hoje)
  const [localConfirm, setLocalConfirm] = useState('')
  const [erroConfirm, setErroConfirm] = useState('')

  const membro = membros.find(m => m.id === membroSelecionadoId)
  const outrosMembros = membros.filter(m => m.id !== membroSelecionadoId)

  if (!membro) {
    return (
      <div style={{ textAlign: 'center', padding: 'var(--space-16)' }}>
        <p style={{ color: 'var(--color-text-muted)' }}>Membro não encontrado.</p>
        <Link to="/vacinas" className="btn btn-ghost" style={{ marginTop: 'var(--space-4)' }}>Voltar para Vacinas</Link>
      </div>
    )
  }

  const registrosMembro = buscarRegistrosMembro(membroSelecionadoId)

  // Exibe skeleton enquanto carregando (registros) ou vacinas ainda não chegaram do banco
  const aguardandoAPI = carregando || vacinas.length === 0

  const vacinasAplicaveis = !aguardandoAPI
    ? vacinas.filter(v => {
        const doses = calcularDosesStatus(v, registrosMembro, membro.data_nascimento)
        const dosesVisiveis = doses.filter(d => d.status !== 'nao_aplicavel')
        if (dosesVisiveis.length === 0) return false
        return dosesVisiveis.some(d => d.status !== 'aplicada')
      })
    : []

  function handleMarcarTomada() {
    if (!dataConfirm) { setErroConfirm('Informe a data de aplicação.'); return }
    if (dataConfirm > hoje) { setErroConfirm('A data não pode ser futura para uma dose já tomada.'); return }
    if (!localConfirm.trim()) { setErroConfirm('Informe o local de aplicação.'); return }
    if (modal.tipo !== 'marcarTomada') return

    registrarDose(
      {
        membro_id: membroSelecionadoId,
        vacina_id: modal.dose.vacinaId,
        numero_dose: modal.dose.numeroDose,
        data_aplicacao: dataConfirm,
        local_aplicacao: localConfirm,
      },
      (mId, vId, nDose, dataProxima) => {
        adicionarLembrete(lembreteVacinal(vId, mId, nDose, dataProxima))
      }
    )

    const lembreteExistente = lembretes.find(
      l =>
        l.membro_id === membroSelecionadoId &&
        l.vacina_id === modal.dose.vacinaId &&
        l.numero_dose === modal.dose.numeroDose &&
        l.status === 'pendente'
    )
    if (lembreteExistente) removerLembrete(lembreteExistente.id)

    setModal({ tipo: 'nenhum' })
    setDataConfirm(hoje); setLocalConfirm(''); setErroConfirm('')
  }

  function handleApagarDose() {
    if (modal.tipo !== 'apagarDose') return
    removerRegistro(modal.registroId)
    setModal({ tipo: 'nenhum' })
  }

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', paddingBottom: 'var(--space-8)' }}>

      {/* Cabeçalho */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-5)' }}>
        <button
          onClick={() => navigate('/vacinas')}
          style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)', minHeight: 44, flexShrink: 0 }}
          aria-label="Voltar para Vacinas"
        >
          <ArrowLeft size={18} aria-hidden /> Voltar
        </button>
        <div style={{ flex: 1 }} />
        <Link to="/vacinas/registrar" state={{ membroId: membroSelecionadoId }} className="btn btn-primary" style={{ gap: 'var(--space-2)', fontSize: 'var(--text-sm)' }}>
          <Plus size={16} aria-hidden /> Registrar dose
        </Link>
      </div>

      {/* Card do membro + seletor */}
      <div className="card" style={{ marginBottom: 'var(--space-5)', padding: 'var(--space-4) var(--space-5)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
          <Avatar nome={membro.nome} tamanho={48} fotoUrl={membro.foto_url} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontWeight: 700, color: 'var(--color-text)', fontSize: 'var(--text-base)' }}>{membro.nome}</p>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>{RELACAO_LABEL[membro.relacao]}</p>
          </div>
          {outrosMembros.length > 0 && (
            <button
              onClick={() => setSeletorAberto(v => !v)}
              className="btn btn-ghost"
              style={{ fontSize: 'var(--text-xs)', gap: 'var(--space-1)', flexShrink: 0 }}
              aria-expanded={seletorAberto}
            >
              Trocar <ChevronDown size={14} style={{ transform: seletorAberto ? 'rotate(180deg)' : 'none', transition: 'transform 150ms' }} aria-hidden />
            </button>
          )}
        </div>

        {seletorAberto && (
          <div style={{ marginTop: 'var(--space-3)', paddingTop: 'var(--space-3)', borderTop: '1px solid var(--color-divider)', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            {outrosMembros.map(m => (
              <button
                key={m.id}
                onClick={() => { setMembroSelecionadoId(m.id); setSeletorAberto(false); navigate(`/vacinas/membro/${m.id}`, { replace: true }) }}
                style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', padding: 'var(--space-2) var(--space-3)', borderRadius: 'var(--radius-md)', background: 'var(--color-surface-offset)', border: 'none', cursor: 'pointer', minHeight: 44, textAlign: 'left' }}
              >
                <Avatar nome={m.nome} tamanho={32} />
                <div>
                  <p style={{ fontWeight: 600, fontSize: 'var(--text-sm)', color: 'var(--color-text)' }}>{m.nome}</p>
                  <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>{RELACAO_LABEL[m.relacao]}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Lista de vacinas */}
      {aguardandoAPI ? (
        <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }} role="list" aria-label="Carregando vacinas..." aria-busy="true">
          {Array.from({ length: 5 }).map((_, i) => <VacinaSkeletonRow key={i} />)}
        </ul>
      ) : vacinasAplicaveis.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 'var(--space-12) var(--space-8)', color: 'var(--color-text-muted)' }}>
          <p style={{ fontSize: 'var(--text-sm)' }}>Nenhuma vacina pendente para {membro.nome.split(' ')[0]}. ✅</p>
        </div>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }} role="list">
          {vacinasAplicaveis.map(vacina => {
            const doses = calcularDosesStatus(vacina, registrosMembro, membro.data_nascimento)
              .filter(d => d.status !== 'nao_aplicavel')
            const aberto = vacinaExpandida === vacina.id

            return (
              <li key={vacina.id}>
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                  <button
                    onClick={() => setVacinaExpandida(aberto ? null : vacina.id)}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 'var(--space-4)', padding: 'var(--space-4) var(--space-5)', background: 'none', cursor: 'pointer', minHeight: 48, textAlign: 'left' }}
                    aria-expanded={aberto}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontWeight: 600, fontSize: 'var(--text-sm)', color: 'var(--color-text)' }}>{vacina.nome}</p>
                      <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                        {vacina.doses_total === 1 ? 'Dose única' : `${vacina.doses_total} doses`}
                      </p>
                    </div>
                    <div style={{ display: 'flex', gap: 'var(--space-1)', flexShrink: 0 }}>
                      {doses.map(d => (
                        <VacinaStatusBadge
                          key={d.numeroDose}
                          status={isAtrasada(d, membro.data_nascimento, hoje) ? 'atrasada' : d.status}
                          mostrarLabel={false}
                        />
                      ))}
                    </div>
                    <ChevronDown size={16} style={{ color: 'var(--color-text-faint)', flexShrink: 0, transform: aberto ? 'rotate(180deg)' : 'none', transition: 'transform 150ms' }} aria-hidden />
                  </button>

                  {aberto && (
                    <div>
                      <hr className="divider" style={{ margin: 0 }} />
                      <ul style={{ listStyle: 'none', padding: 'var(--space-2) 0' }} role="list">
                        {doses.map(dose => {
                          const atrasada = isAtrasada(dose, membro.data_nascimento, hoje)
                          const statusEfetivo: typeof dose.status = atrasada ? 'atrasada' : dose.status
                          const registro = registros.find(
                            r =>
                              r.vacina_id === vacina.id &&
                              (r.membro_id === membroSelecionadoId || r.membro_familiar_id === membroSelecionadoId) &&
                              r.numero_dose === dose.numeroDose
                          )

                          return (
                            <li key={dose.numeroDose} style={{ padding: 'var(--space-3) var(--space-5)', display: 'flex', alignItems: 'flex-start', gap: 'var(--space-3)', borderBottom: '1px solid var(--color-divider)' }}>
                              <VacinaStatusBadge status={statusEfetivo} mostrarLabel={false} />
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <p style={{ fontWeight: 600, fontSize: 'var(--text-sm)', color: 'var(--color-text)' }}>
                                  {dose.numeroDose}ªdose
                                  {atrasada && <span style={{ marginLeft: 'var(--space-2)', fontSize: 'var(--text-xs)', color: 'var(--color-error)', fontWeight: 600 }}>ATRASADA</span>}
                                </p>
                                {dose.status === 'aplicada' && registro && (
                                  <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                                    Aplicada em {formatarData(registro.data_aplicacao)}
                                    {registro.local_aplicacao ? ` · ${registro.local_aplicacao}` : ''}
                                  </p>
                                )}
                                {dose.status !== 'aplicada' && dose.dataRecomendada && (
                                  <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                                    Prevista para {formatarData(dose.dataRecomendada)}
                                  </p>
                                )}
                              </div>

                              <div style={{ display: 'flex', gap: 'var(--space-2)', flexShrink: 0 }}>
                                {dose.status !== 'aplicada' && (
                                  <button
                                    onClick={() => setModal({ tipo: 'marcarTomada', dose, vacinaNome: vacina.nome })}
                                    style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)', fontSize: 'var(--text-xs)', color: 'var(--color-success)', fontWeight: 600, padding: 'var(--space-2)', minHeight: 44, minWidth: 44, border: '1px solid var(--color-success-highlight)', borderRadius: 'var(--radius-md)', background: 'var(--color-success-highlight)' }}
                                    aria-label={`Marcar ${dose.numeroDose}ª dose de ${vacina.nome} como tomada`}
                                  >
                                    <CheckCircle2 size={14} aria-hidden />
                                    <span>Tomada</span>
                                  </button>
                                )}
                                {dose.status === 'aplicada' && registro && (
                                  <button
                                    onClick={() => setModal({ tipo: 'apagarDose', dose, vacinaNome: vacina.nome, registroId: registro.id })}
                                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-error)', padding: 'var(--space-2)', minHeight: 44, minWidth: 44 }}
                                    aria-label={`Apagar registro da ${dose.numeroDose}ª dose de ${vacina.nome}`}
                                  >
                                    <Trash2 size={15} aria-hidden />
                                  </button>
                                )}
                              </div>
                            </li>
                          )
                        })}
                      </ul>
                    </div>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {/* Modal: Marcar como tomada */}
      {modal.tipo === 'marcarTomada' && (
        <div role="dialog" aria-modal="true" aria-labelledby="modal-title" style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', background: 'oklch(0 0 0 / 0.5)', padding: 'var(--space-4)' }} onClick={e => { if (e.target === e.currentTarget) setModal({ tipo: 'nenhum' }) }}>
          <div className="card" style={{ width: '100%', maxWidth: 480, display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
              <CheckCircle2 size={20} style={{ color: 'var(--color-success)', flexShrink: 0 }} aria-hidden />
              <h3 id="modal-title" style={{ fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--color-text)', fontSize: 'var(--text-base)' }}>
                Marcar {modal.dose.numeroDose}ª dose como tomada
              </h3>
            </div>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
              Vacina: <strong>{modal.vacinaNome}</strong> · Membro: <strong>{membro.nome}</strong>
            </p>
            <div>
              <label htmlFor="data-confirm" style={{ display: 'block', fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-2)', fontWeight: 500 }}>Data de aplicação *</label>
              <input id="data-confirm" type="date" value={dataConfirm} max={hoje} onChange={e => { setDataConfirm(e.target.value); setErroConfirm('') }} className="input-field" style={{ minHeight: 48 }} />
            </div>
            <div>
              <label htmlFor="local-confirm" style={{ display: 'block', fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-2)', fontWeight: 500 }}>Local de aplicação *</label>
              <input id="local-confirm" type="text" value={localConfirm} onChange={e => { setLocalConfirm(e.target.value); setErroConfirm('') }} placeholder="Ex: UBS Centro" className="input-field" style={{ minHeight: 48 }} />
            </div>
            {erroConfirm && <p role="alert" style={{ fontSize: 'var(--text-xs)', color: 'var(--color-error)', background: 'var(--color-error-highlight)', borderRadius: 'var(--radius-md)', padding: 'var(--space-3)' }}>⚠️ {erroConfirm}</p>}
            <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
              <button onClick={() => { setModal({ tipo: 'nenhum' }); setErroConfirm('') }} className="btn btn-ghost" style={{ flex: 1 }}>Cancelar</button>
              <button onClick={handleMarcarTomada} className="btn btn-primary" style={{ flex: 1, gap: 'var(--space-2)' }}><CheckCircle2 size={15} aria-hidden /> Confirmar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Apagar dose */}
      {modal.tipo === 'apagarDose' && (
        <div role="dialog" aria-modal="true" aria-labelledby="modal-apagar-title" style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', background: 'oklch(0 0 0 / 0.5)', padding: 'var(--space-4)' }} onClick={e => { if (e.target === e.currentTarget) setModal({ tipo: 'nenhum' }) }}>
          <div className="card" style={{ width: '100%', maxWidth: 480, display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
              <Trash2 size={20} style={{ color: 'var(--color-error)', flexShrink: 0 }} aria-hidden />
              <h3 id="modal-apagar-title" style={{ fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--color-text)', fontSize: 'var(--text-base)' }}>
                Apagar registro desta dose?
              </h3>
            </div>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>
              Você está removendo o registro da <strong>{modal.dose.numeroDose}ª dose</strong> de <strong>{modal.vacinaNome}</strong> para <strong>{membro.nome}</strong>.
              Esta ação não pode ser desfeita.
            </p>
            <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
              <button onClick={() => setModal({ tipo: 'nenhum' })} className="btn btn-ghost" style={{ flex: 1 }}>Cancelar</button>
              <button onClick={handleApagarDose} className="btn" style={{ flex: 1, background: 'var(--color-error)', color: '#fff', gap: 'var(--space-2)' }}><Trash2 size={15} aria-hidden /> Apagar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
