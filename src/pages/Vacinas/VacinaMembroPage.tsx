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

  // Mostra todas as vacinas que têm ao menos uma dose pendente/aplicável,
  // independentemente de o membro já ter algum registro ou não.
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

      {/* Lista de vacinas — conteúdo omitido aqui por ser idêntico ao original */}
    </div>
  )
}
