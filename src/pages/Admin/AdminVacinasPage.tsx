/**
 * AdminVacinasPage — /admin/vacinas
 * CRUD completo de vacinas via API /vacinas.
 */
import { useState, useEffect, useMemo } from 'react'
import { Syringe, Plus, Pencil, Trash2, X, Check, Loader2 } from 'lucide-react'
import { apiFetch } from '@/services/api'

interface Vacina {
  id:           string
  nome:         string
  descricao:    string | null
  doses:        number
  faixa_etaria: string[]
  obrigatoria:  boolean
  ativo:        boolean
}

const FAIXAS = ['Recém-nascido', 'Lactente', 'Criança', 'Adolescente', 'Adulto', 'Idoso', 'Gestante']

const VAZIO: Omit<Vacina, 'id'> = {
  nome: '', descricao: '', doses: 1,
  faixa_etaria: [], obrigatoria: true, ativo: true,
}

export function AdminVacinasPage() {
  const [vacinas, setVacinas]     = useState<Vacina[]>([])
  const [loading, setLoading]     = useState(true)
  const [erro, setErro]           = useState('')
  const [busca, setBusca]         = useState('')
  const [modal, setModal]         = useState<'criar' | 'editar' | null>(null)
  const [selecionada, setSelecionada] = useState<Vacina | null>(null)
  const [form, setForm]           = useState<Omit<Vacina, 'id'>>(VAZIO)
  const [salvando, setSalvando]   = useState(false)
  const [deletando, setDeletando] = useState<string | null>(null)
  const [erroForm, setErroForm]   = useState('')

  function carregar() {
    setLoading(true)
    apiFetch<{ status: string; vacinas: Vacina[] }>('/vacinas')
      .then(r => setVacinas(r.vacinas))
      .catch(e => setErro(e.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => { carregar() }, [])

  const filtradas = useMemo(() =>
    vacinas.filter(v => v.nome.toLowerCase().includes(busca.toLowerCase())),
    [vacinas, busca])

  function abrirCriar() {
    setForm(VAZIO); setErroForm(''); setModal('criar')
  }

  function abrirEditar(v: Vacina) {
    setSelecionada(v)
    setForm({ nome: v.nome, descricao: v.descricao ?? '', doses: v.doses,
      faixa_etaria: v.faixa_etaria, obrigatoria: v.obrigatoria, ativo: v.ativo })
    setErroForm(''); setModal('editar')
  }

  function fechar() { setModal(null); setSelecionada(null) }

  function toggleFaixa(f: string) {
    setForm(prev => ({
      ...prev,
      faixa_etaria: prev.faixa_etaria.includes(f)
        ? prev.faixa_etaria.filter(x => x !== f)
        : [...prev.faixa_etaria, f],
    }))
  }

  async function handleSalvar() {
    if (!form.nome.trim()) { setErroForm('Nome é obrigatório'); return }
    setSalvando(true); setErroForm('')
    try {
      if (modal === 'criar') {
        const r = await apiFetch<{ status: string; vacina: Vacina }>('/vacinas', { method: 'POST', body: form })
        setVacinas(prev => [...prev, r.vacina].sort((a, b) => a.nome.localeCompare(b.nome)))
      } else if (selecionada) {
        const r = await apiFetch<{ status: string; vacina: Vacina }>(`/vacinas/${selecionada.id}`, { method: 'PUT', body: form })
        setVacinas(prev => prev.map(v => v.id === selecionada.id ? r.vacina : v))
      }
      fechar()
    } catch (e) {
      setErroForm(e instanceof Error ? e.message : 'Erro ao salvar')
    } finally {
      setSalvando(false)
    }
  }

  async function handleDelete(v: Vacina) {
    if (!confirm(`Remover a vacina "${v.nome}"? Esta ação não pode ser desfeita.`)) return
    setDeletando(v.id)
    try {
      await apiFetch(`/vacinas/${v.id}`, { method: 'DELETE' })
      setVacinas(prev => prev.filter(x => x.id !== v.id))
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Erro ao remover')
    } finally {
      setDeletando(null)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>

      {/* Cabeçalho */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
        <div>
          <h1 style={{
            fontFamily: 'var(--font-display)', fontSize: 'var(--text-xl)',
            fontWeight: 700, color: 'var(--color-text)', marginBottom: 'var(--space-1)',
          }}>Vacinas</h1>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>
            {loading ? 'Carregando...' : `${vacinas.length} vacina${vacinas.length !== 1 ? 's' : ''} cadastrada${vacinas.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            type="search" value={busca} onChange={e => setBusca(e.target.value)}
            placeholder="Buscar vacina..."
            style={{
              padding: 'var(--space-3) var(--space-4)',
              borderRadius: 'var(--radius-md)',
              border: '1.5px solid var(--color-border)',
              background: 'var(--color-bg)', color: 'var(--color-text)',
              fontSize: 'var(--text-sm)', outline: 'none',
            }}
          />
          <button
            onClick={abrirCriar}
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}
          >
            <Plus size={15} aria-hidden /> Nova vacina
          </button>
        </div>
      </div>

      {erro && <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-error)' }}>{erro}</p>}

      {loading && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', color: 'var(--color-text-muted)', fontSize: 'var(--text-sm)' }}>
          <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} aria-hidden /> Carregando...
        </div>
      )}

      {!loading && filtradas.length === 0 && (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          gap: 'var(--space-3)', padding: 'var(--space-12) var(--space-4)',
          color: 'var(--color-text-muted)', textAlign: 'center',
        }}>
          <Syringe size={36} style={{ color: 'var(--color-text-faint)' }} aria-hidden />
          <p style={{ fontSize: 'var(--text-sm)' }}>
            {busca ? 'Nenhuma vacina encontrada.' : 'Nenhuma vacina cadastrada ainda.'}
          </p>
          {!busca && (
            <button onClick={abrirCriar} className="btn btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginTop: 'var(--space-2)' }}>
              <Plus size={14} aria-hidden /> Cadastrar primeira vacina
            </button>
          )}
        </div>
      )}

      {/* Lista */}
      {!loading && filtradas.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          {filtradas.map(v => (
            <div key={v.id} style={{
              display: 'flex', alignItems: 'center', gap: 'var(--space-4)',
              padding: 'var(--space-4) var(--space-5)',
              background: 'var(--color-surface)', border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-lg)',
              opacity: v.ativo ? 1 : 0.6,
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: 'var(--radius-md)',
                background: 'var(--color-primary-highlight)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <Syringe size={18} style={{ color: 'var(--color-primary)' }} aria-hidden />
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-text)' }}>
                  {v.nome}
                  {!v.ativo && (
                    <span style={{
                      marginLeft: 'var(--space-2)', fontSize: 'var(--text-xs)',
                      background: 'var(--color-surface-offset)', color: 'var(--color-text-muted)',
                      padding: '2px 8px', borderRadius: 'var(--radius-full)',
                    }}>inativa</span>
                  )}
                </p>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                  {v.doses} dose{v.doses !== 1 ? 's' : ''}
                  {v.faixa_etaria.length > 0 && ` · ${v.faixa_etaria.join(', ')}`}
                  {v.obrigatoria && ' · Obrigatória'}
                </p>
                {v.descricao && (
                  <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-faint)', marginTop: 2,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '60ch' }}>
                    {v.descricao}
                  </p>
                )}
              </div>

              <div style={{ display: 'flex', gap: 'var(--space-2)', flexShrink: 0 }}>
                <button onClick={() => abrirEditar(v)} aria-label={`Editar ${v.nome}`}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    width: 36, height: 36, borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-border)', background: 'transparent',
                    color: 'var(--color-text-muted)', cursor: 'pointer',
                    transition: 'all var(--transition)',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-surface-offset)'; e.currentTarget.style.color = 'var(--color-text)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--color-text-muted)' }}
                >
                  <Pencil size={14} aria-hidden />
                </button>
                <button onClick={() => handleDelete(v)} disabled={deletando === v.id}
                  aria-label={`Remover ${v.nome}`}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    width: 36, height: 36, borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-border)', background: 'transparent',
                    color: 'var(--color-text-muted)', cursor: 'pointer',
                    transition: 'all var(--transition)',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-error-highlight)'; e.currentTarget.style.color = 'var(--color-error)'; e.currentTarget.style.borderColor = 'var(--color-error)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--color-text-muted)'; e.currentTarget.style.borderColor = 'var(--color-border)' }}
                >
                  {deletando === v.id
                    ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} aria-hidden />
                    : <Trash2 size={14} aria-hidden />
                  }
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal criar/editar */}
      {modal && (
        <div style={{
          position: 'fixed', inset: 0,
          background: 'oklch(0 0 0 / 0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 'var(--space-4)', zIndex: 100,
        }}
          onClick={e => { if (e.target === e.currentTarget) fechar() }}
        >
          <div style={{
            width: 'min(520px, 100%)',
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-xl)',
            boxShadow: 'var(--shadow-lg)',
            padding: 'var(--space-6)',
            display: 'flex', flexDirection: 'column', gap: 'var(--space-5)',
            maxHeight: '90dvh', overflowY: 'auto',
          }}>
            {/* Header modal */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--color-text)' }}>
                {modal === 'criar' ? 'Nova vacina' : 'Editar vacina'}
              </h2>
              <button onClick={fechar} aria-label="Fechar" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', display: 'flex', padding: 'var(--space-1)' }}>
                <X size={18} aria-hidden />
              </button>
            </div>

            {/* Campos */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>

              {/* Nome */}
              <label style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-text)' }}>Nome *</span>
                <input value={form.nome} onChange={e => setForm(p => ({ ...p, nome: e.target.value }))}
                  placeholder="Ex: Hepatite B"
                  style={{
                    padding: 'var(--space-3)', borderRadius: 'var(--radius-md)',
                    border: `1.5px solid ${erroForm && !form.nome ? 'var(--color-error)' : 'var(--color-border)'}`,
                    background: 'var(--color-bg)', color: 'var(--color-text)',
                    fontSize: 'var(--text-sm)', outline: 'none',
                  }}
                />
              </label>

              {/* Descrição */}
              <label style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-text)' }}>Descrição</span>
                <textarea value={form.descricao ?? ''} onChange={e => setForm(p => ({ ...p, descricao: e.target.value }))}
                  rows={2} placeholder="Descrição opcional..."
                  style={{
                    padding: 'var(--space-3)', borderRadius: 'var(--radius-md)',
                    border: '1.5px solid var(--color-border)',
                    background: 'var(--color-bg)', color: 'var(--color-text)',
                    fontSize: 'var(--text-sm)', outline: 'none', resize: 'vertical',
                  }}
                />
              </label>

              {/* Doses */}
              <label style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-text)' }}>Número de doses</span>
                <input type="number" min={1} max={10} value={form.doses}
                  onChange={e => setForm(p => ({ ...p, doses: Number(e.target.value) }))}
                  style={{
                    width: 80, padding: 'var(--space-3)', borderRadius: 'var(--radius-md)',
                    border: '1.5px solid var(--color-border)',
                    background: 'var(--color-bg)', color: 'var(--color-text)',
                    fontSize: 'var(--text-sm)', outline: 'none',
                  }}
                />
              </label>

              {/* Faixa etária */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-text)' }}>Faixa etária</span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
                  {FAIXAS.map(f => (
                    <button key={f} type="button" onClick={() => toggleFaixa(f)}
                      style={{
                        padding: 'var(--space-1) var(--space-3)',
                        borderRadius: 'var(--radius-full)',
                        border: `1.5px solid ${form.faixa_etaria.includes(f) ? 'var(--color-primary)' : 'var(--color-border)'}`,
                        background: form.faixa_etaria.includes(f) ? 'var(--color-primary-highlight)' : 'transparent',
                        color: form.faixa_etaria.includes(f) ? 'var(--color-primary)' : 'var(--color-text-muted)',
                        fontSize: 'var(--text-xs)', fontWeight: 500, cursor: 'pointer',
                        transition: 'all var(--transition)',
                      }}
                    >{f}</button>
                  ))}
                </div>
              </div>

              {/* Toggles */}
              <div style={{ display: 'flex', gap: 'var(--space-6)' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', cursor: 'pointer' }}>
                  <input type="checkbox" checked={form.obrigatoria}
                    onChange={e => setForm(p => ({ ...p, obrigatoria: e.target.checked }))}
                    style={{ width: 16, height: 16, accentColor: 'var(--color-primary)' }}
                  />
                  <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text)' }}>Obrigatória</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', cursor: 'pointer' }}>
                  <input type="checkbox" checked={form.ativo}
                    onChange={e => setForm(p => ({ ...p, ativo: e.target.checked }))}
                    style={{ width: 16, height: 16, accentColor: 'var(--color-primary)' }}
                  />
                  <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text)' }}>Ativa</span>
                </label>
              </div>

              {erroForm && <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-error)' }}>{erroForm}</p>}
            </div>

            {/* Ações */}
            <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end' }}>
              <button onClick={fechar} className="btn"
                style={{ border: '1px solid var(--color-border)', background: 'transparent', color: 'var(--color-text-muted)' }}>
                Cancelar
              </button>
              <button onClick={handleSalvar} disabled={salvando} className="btn btn-primary"
                style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                {salvando
                  ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} aria-hidden /> Salvando...</>
                  : <><Check size={14} aria-hidden /> {modal === 'criar' ? 'Criar' : 'Salvar'}</>
                }
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
