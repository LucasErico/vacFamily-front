import { useState } from 'react'
import { Bell, CheckCheck, Trash2, Plus } from 'lucide-react'
import { useLembretes } from '@/contexts/LembretesContext'
import { useMembros } from '@/contexts/MembrosContext'
import { useVacinas } from '@/contexts/VacinasContext'
import type { Lembrete } from '@/types'

type Filtro = 'todos' | 'pendente' | 'enviado' | 'cancelado'

const FILTROS: { valor: Filtro; label: string }[] = [
  { valor: 'todos',     label: 'Todos' },
  { valor: 'pendente',  label: 'Pendentes' },
  { valor: 'enviado',   label: 'Concluídos' },
  { valor: 'cancelado', label: 'Cancelados' },
]

function formatarData(iso: string) {
  const [ano, mes, dia] = iso.split('-')
  return `${dia}/${mes}/${ano}`
}

function isAtrasado(dataLembrete: string) {
  return new Date(dataLembrete) < new Date(new Date().toISOString().slice(0, 10))
}

export function LembretesPage() {
  const { lembretes, marcarStatus, removerLembrete, adicionarLembrete } = useLembretes()
  const { membros } = useMembros()
  const { vacinas } = useVacinas()
  const [filtro, setFiltro] = useState<Filtro>('todos')
  const [modalAberto, setModalAberto] = useState(false)

  const [fMembroId, setFMembroId] = useState('')
  const [fVacinaId, setFVacinaId] = useState('')
  const [fNumeroDose, setFNumeroDose] = useState(1)
  const [fData, setFData] = useState('')
  const [fErro, setFErro] = useState('')

  const filtrados = lembretes
    .filter(l => filtro === 'todos' ? true : l.status === filtro)
    .sort((a, b) => a.dataLembrete.localeCompare(b.dataLembrete))

  const automaticos = filtrados.filter(l => l.automatico)
  const manuais     = filtrados.filter(l => !l.automatico)

  function nomeMembro(id: string) {
    return membros.find(m => m.id === id)?.nome ?? 'Membro'
  }
  function nomeVacina(id: string) {
    return vacinas.find(v => v.id === id)?.nome ?? 'Vacina'
  }

  function handleSalvarManual() {
    if (!fMembroId || !fVacinaId || !fData) {
      setFErro('Preencha todos os campos.')
      return
    }
    adicionarLembrete({
      membroId: fMembroId,
      vacinaId: fVacinaId,
      numeroDose: fNumeroDose,
      dataLembrete: fData,
      status: 'pendente',
      automatico: false,
    })
    setModalAberto(false)
    setFMembroId(''); setFVacinaId(''); setFNumeroDose(1); setFData(''); setFErro('')
  }

  function renderLembrete(l: Lembrete) {
    const atrasado = l.status === 'pendente' && isAtrasado(l.dataLembrete)
    return (
      <li
        key={l.id}
        style={{
          display: 'flex', alignItems: 'flex-start', gap: 'var(--space-3)',
          padding: 'var(--space-4) var(--space-5)',
          opacity: l.status === 'cancelado' ? 0.45 : 1,
        }}
      >
        <div style={{ flexShrink: 0, width: 44, textAlign: 'center', paddingTop: 2 }}>
          <p style={{
            fontSize: 'var(--text-xs)', fontWeight: 700,
            color: atrasado ? 'var(--color-error)' : l.status === 'enviado' ? 'var(--color-success)' : 'var(--color-primary)',
          }}>
            {formatarData(l.dataLembrete)}
          </p>
          {atrasado && (
            <p style={{ fontSize: 10, color: 'var(--color-error)', fontWeight: 600 }}>Atrasado</p>
          )}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontWeight: 600, fontSize: 'var(--text-sm)', color: 'var(--color-text)' }}>
            {nomeVacina(l.vacinaId)}
          </p>
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
            {nomeMembro(l.membroId)} · {l.numeroDose}ª dose
            {l.automatico && (
              <span style={{ marginLeft: 'var(--space-2)', color: 'var(--color-primary)', fontWeight: 500 }}>Automático</span>
            )}
          </p>
        </div>

        {l.status === 'pendente' && (
          <div style={{ display: 'flex', gap: 'var(--space-2)', flexShrink: 0 }}>
            <button
              onClick={() => marcarStatus(l.id, 'enviado')}
              style={{ color: 'var(--color-success)', padding: 'var(--space-2)', minHeight: 44, minWidth: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              aria-label="Marcar como concluído"
            >
              <CheckCheck size={17} aria-hidden />
            </button>
            <button
              onClick={() => marcarStatus(l.id, 'cancelado')}
              style={{ color: 'var(--color-text-faint)', padding: 'var(--space-2)', minHeight: 44, minWidth: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              aria-label="Cancelar lembrete"
            >
              <Trash2 size={16} aria-hidden />
            </button>
          </div>
        )}
        {l.status !== 'pendente' && (
          <button
            onClick={() => removerLembrete(l.id)}
            style={{ color: 'var(--color-text-faint)', padding: 'var(--space-2)', minHeight: 44, minWidth: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            aria-label="Remover lembrete"
          >
            <Trash2 size={16} aria-hidden />
          </button>
        )}
      </li>
    )
  }

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', paddingBottom: 'var(--space-8)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-6)' }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--color-text)' }}>
            Lembretes
          </h2>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)', marginTop: 'var(--space-1)' }}>
            {lembretes.filter(l => l.status === 'pendente').length} pendente{lembretes.filter(l => l.status === 'pendente').length !== 1 ? 's' : ''}
          </p>
        </div>
        <button onClick={() => setModalAberto(true)} className="btn btn-primary" style={{ gap: 'var(--space-2)' }}>
          <Plus size={18} aria-hidden />
          <span>Novo</span>
        </button>
      </div>

      <div
        style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-5)', overflowX: 'auto', paddingBottom: 2 }}
        role="group"
        aria-label="Filtrar lembretes"
      >
        {FILTROS.map(f => (
          <button
            key={f.valor}
            onClick={() => setFiltro(f.valor)}
            className={filtro === f.valor ? 'btn btn-primary' : 'btn btn-ghost'}
            style={{ fontSize: 'var(--text-xs)', whiteSpace: 'nowrap', flexShrink: 0 }}
            aria-pressed={filtro === f.valor}
          >
            {f.label}
          </button>
        ))}
      </div>

      {filtrados.length === 0 && (
        <div style={{ textAlign: 'center', padding: 'var(--space-16) var(--space-8)', color: 'var(--color-text-muted)' }}>
          <Bell size={48} style={{ margin: '0 auto var(--space-4)', color: 'var(--color-text-faint)' }} aria-hidden />
          <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, marginBottom: 'var(--space-2)', color: 'var(--color-text)' }}>
            {filtro === 'todos' ? 'Nenhum lembrete ainda' : 'Nenhum lembrete neste filtro'}
          </h3>
          <p style={{ fontSize: 'var(--text-sm)', maxWidth: 280, margin: '0 auto var(--space-6)' }}>
            {filtro === 'todos'
              ? 'Registre uma dose com múltiplas etapas para gerar lembretes automáticos, ou adicione um manualmente.'
              : 'Tente outro filtro.'}
          </p>
          {filtro === 'todos' && (
            <button onClick={() => setModalAberto(true)} className="btn btn-primary">
              <Plus size={18} aria-hidden /> Adicionar lembrete
            </button>
          )}
        </div>
      )}

      {filtrados.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
          {automaticos.length > 0 && (
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: 'var(--space-3) var(--space-5)', background: 'var(--color-surface-offset)' }}>
                <p style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Reforços automáticos
                </p>
              </div>
              <ul style={{ listStyle: 'none', padding: 0 }} role="list">
                {automaticos.map((l, i) => (
                  <>
                    {i > 0 && <hr className="divider" style={{ margin: 0 }} />}
                    {renderLembrete(l)}
                  </>
                ))}
              </ul>
            </div>
          )}

          {manuais.length > 0 && (
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: 'var(--space-3) var(--space-5)', background: 'var(--color-surface-offset)' }}>
                <p style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Lembretes manuais
                </p>
              </div>
              <ul style={{ listStyle: 'none', padding: 0 }} role="list">
                {manuais.map((l, i) => (
                  <>
                    {i > 0 && <hr className="divider" style={{ margin: 0 }} />}
                    {renderLembrete(l)}
                  </>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {modalAberto && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'oklch(0 0 0 / 0.5)',
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
            zIndex: 50, padding: 'var(--space-4)',
          }}
          role="dialog"
          aria-modal="true"
          aria-label="Novo lembrete"
          onClick={e => { if (e.target === e.currentTarget) setModalAberto(false) }}
        >
          <div
            className="card"
            style={{
              width: '100%', maxWidth: 480,
              padding: 'var(--space-6)',
              display: 'flex', flexDirection: 'column', gap: 'var(--space-4)',
            }}
          >
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-base)', fontWeight: 700, color: 'var(--color-text)' }}>
              Novo lembrete
            </h3>

            <div>
              <label htmlFor="m-membro" style={{ display: 'block', fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-2)', fontWeight: 500 }}>
                Membro *
              </label>
              <select id="m-membro" value={fMembroId} onChange={e => setFMembroId(e.target.value)} className="input-field">
                <option value="">Selecione...</option>
                {membros.map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}
              </select>
            </div>

            <div>
              <label htmlFor="m-vacina" style={{ display: 'block', fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-2)', fontWeight: 500 }}>
                Vacina *
              </label>
              <select id="m-vacina" value={fVacinaId} onChange={e => setFVacinaId(e.target.value)} className="input-field">
                <option value="">Selecione...</option>
                {vacinas.map(v => <option key={v.id} value={v.id}>{v.nome}</option>)}
              </select>
            </div>

            <div>
              <label htmlFor="m-dose" style={{ display: 'block', fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-2)', fontWeight: 500 }}>
                Número da dose
              </label>
              <input id="m-dose" type="number" min={1} max={9} value={fNumeroDose} onChange={e => setFNumeroDose(Number(e.target.value))} className="input-field" />
            </div>

            <div>
              <label htmlFor="m-data" style={{ display: 'block', fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginBottom: 'var(--space-2)', fontWeight: 500 }}>
                Data *
              </label>
              <input id="m-data" type="date" value={fData} onChange={e => setFData(e.target.value)} className="input-field" />
            </div>

            {fErro && <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-error)' }} role="alert">{fErro}</p>}

            <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end' }}>
              <button onClick={() => { setModalAberto(false); setFErro('') }} className="btn btn-ghost">Cancelar</button>
              <button onClick={handleSalvarManual} className="btn btn-primary">Salvar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
