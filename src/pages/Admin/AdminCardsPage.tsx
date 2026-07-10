/**
 * AdminCardsPage — /admin/cards
 * CRUD completo dos cards do carrossel do Dashboard.
 *
 * Cores em HEX (não CSS vars) — obrigatório para funcionar
 * no background inline do carrossel.
 */
import { useState, useMemo } from 'react'
import {
  Plus, Pencil, Trash2, Eye, EyeOff, Newspaper,
  ShieldCheck, Syringe, Bell, Users, Info,
  Heart, Baby, Star, Stethoscope, Activity,
  ClipboardList, CalendarCheck, AlertTriangle, BookOpen, Smile,
} from 'lucide-react'
import {
  getCards, createCard, updateCard, deleteCard,
  type CardConteudo,
} from '@/services/adminStorage'

// ── Paleta de cores em HEX ────────────────────────────────────
const COR_OPTIONS = [
  { label: 'Teal (primário)',   value: '#01696f', preview: '#01696f' },
  { label: 'Verde sucesso',     value: '#437a22', preview: '#437a22' },
  { label: 'Laranja',           value: '#964219', preview: '#964219' },
  { label: 'Azul',              value: '#006494', preview: '#006494' },
  { label: 'Roxo',              value: '#7a39bb', preview: '#7a39bb' },
  { label: 'Vermelho',          value: '#a12c7b', preview: '#a12c7b' },
  { label: 'Rosa',              value: '#c2185b', preview: '#c2185b' },
  { label: 'Índigo',            value: '#3949ab', preview: '#3949ab' },
  { label: 'Ciano',             value: '#00838f', preview: '#00838f' },
  { label: 'Lima',              value: '#558b2f', preview: '#558b2f' },
  { label: 'Âmbar',             value: '#f57f17', preview: '#f57f17' },
  { label: 'Marrom',            value: '#5d4037', preview: '#5d4037' },
  { label: 'Cinza escuro',      value: '#424242', preview: '#424242' },
  { label: 'Azul marinho',      value: '#1a237e', preview: '#1a237e' },
  { label: 'Verde-água escuro', value: '#004d40', preview: '#004d40' },
]

// ── Ícones disponíveis ────────────────────────────────────────
const ICONE_OPTIONS = [
  { label: 'Escudo',        value: 'ShieldCheck',   icon: <ShieldCheck   size={16} aria-hidden /> },
  { label: 'Seringa',       value: 'Syringe',       icon: <Syringe       size={16} aria-hidden /> },
  { label: 'Sino',          value: 'Bell',          icon: <Bell          size={16} aria-hidden /> },
  { label: 'Pessoas',       value: 'Users',         icon: <Users         size={16} aria-hidden /> },
  { label: 'Info',          value: 'Info',          icon: <Info          size={16} aria-hidden /> },
  { label: 'Coração',       value: 'Heart',         icon: <Heart         size={16} aria-hidden /> },
  { label: 'Bebê',          value: 'Baby',          icon: <Baby          size={16} aria-hidden /> },
  { label: 'Estrela',       value: 'Star',          icon: <Star          size={16} aria-hidden /> },
  { label: 'Estetoscópio',  value: 'Stethoscope',   icon: <Stethoscope   size={16} aria-hidden /> },
  { label: 'Atividade',     value: 'Activity',      icon: <Activity      size={16} aria-hidden /> },
  { label: 'Prancheta',     value: 'ClipboardList', icon: <ClipboardList size={16} aria-hidden /> },
  { label: 'Calendário ok', value: 'CalendarCheck', icon: <CalendarCheck size={16} aria-hidden /> },
  { label: 'Alerta',        value: 'AlertTriangle', icon: <AlertTriangle size={16} aria-hidden /> },
  { label: 'Livro',         value: 'BookOpen',      icon: <BookOpen      size={16} aria-hidden /> },
  { label: 'Smile',         value: 'Smile',         icon: <Smile         size={16} aria-hidden /> },
]

interface FormState {
  titulo: string
  descricao: string
  cor: string
  icone: string
  ativo: boolean
}

const FORM_INICIAL: FormState = {
  titulo: '', descricao: '', cor: '#01696f', icone: 'ShieldCheck', ativo: true,
}

export function AdminCardsPage() {
  const [cards, setCards] = useState<CardConteudo[]>(() =>
    getCards().sort((a, b) => a.ordem - b.ordem)
  )
  const [editando, setEditando] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(FORM_INICIAL)

  function reload() { setCards(getCards().sort((a, b) => a.ordem - b.ordem)) }

  function abrirNovo() { setForm(FORM_INICIAL); setEditando('novo') }

  function abrirEdicao(card: CardConteudo) {
    setForm({ titulo: card.titulo, descricao: card.descricao, cor: card.cor, icone: card.icone, ativo: card.ativo })
    setEditando(card.id)
  }

  function handleSave() {
    if (!form.titulo.trim() || !form.descricao.trim()) return
    if (editando === 'novo') createCard(form)
    else if (editando) updateCard(editando, form)
    setEditando(null)
    reload()
  }

  function handleDelete(id: string) {
    if (!confirm('Excluir este card?')) return
    deleteCard(id)
    reload()
  }

  function toggleAtivo(id: string, ativo: boolean) {
    updateCard(id, { ativo: !ativo })
    reload()
  }

  const totalAtivos = useMemo(() => cards.filter(c => c.ativo).length, [cards])

  // Encontra a cor selecionada para preview
  const corSelecionada = COR_OPTIONS.find(c => c.value === form.cor)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'var(--text-xl)',
            fontWeight: 700,
            color: 'var(--color-text)',
            marginBottom: 'var(--space-1)',
          }}>
            Cards do carrossel
          </h1>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-muted)' }}>
            {totalAtivos} ativo{totalAtivos !== 1 ? 's' : ''} de {cards.length} total
          </p>
        </div>
        <button
          onClick={abrirNovo}
          className="btn btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}
        >
          <Plus size={16} aria-hidden /> Novo card
        </button>
      </div>

      {/* Formulário inline */}
      {editando !== null && (
        <div style={{
          background: 'var(--color-surface)',
          border: '1.5px solid var(--color-primary)',
          borderRadius: 'var(--radius-xl)',
          padding: 'var(--space-6)',
          display: 'flex', flexDirection: 'column', gap: 'var(--space-4)',
        }}>
          <h2 style={{ fontSize: 'var(--text-base)', fontWeight: 700, color: 'var(--color-text)' }}>
            {editando === 'novo' ? 'Novo card' : 'Editar card'}
          </h2>

          <Field label="Título" required>
            <input
              type="text"
              value={form.titulo}
              onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))}
              placeholder="Título do card"
              maxLength={80}
              style={inputStyle}
            />
          </Field>

          <Field label="Descrição" required>
            <textarea
              value={form.descricao}
              onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
              placeholder="Descrição breve..."
              maxLength={200}
              rows={3}
              style={{ ...inputStyle, resize: 'vertical' }}
            />
          </Field>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
            {/* Seletor de cor com preview */}
            <Field label="Cor de fundo">
              <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
                <div style={{
                  width: 28, height: 28, borderRadius: '6px', flexShrink: 0,
                  background: form.cor,
                  border: '2px solid var(--color-border)',
                }} aria-hidden />
                <select
                  value={form.cor}
                  onChange={e => setForm(f => ({ ...f, cor: e.target.value }))}
                  style={{ ...inputStyle, flex: 1 }}
                >
                  {COR_OPTIONS.map(c => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>
            </Field>

            {/* Seletor de ícone */}
            <Field label="Ícone">
              <select
                value={form.icone}
                onChange={e => setForm(f => ({ ...f, icone: e.target.value }))}
                style={inputStyle}
              >
                {ICONE_OPTIONS.map(i => (
                  <option key={i.value} value={i.value}>{i.label}</option>
                ))}
              </select>
            </Field>
          </div>

          {/* Preview do card */}
          <div style={{
            borderRadius: '12px',
            padding: '16px',
            background: form.cor,
            display: 'flex',
            gap: '12px',
            alignItems: 'flex-start',
          }}>
            <div style={{
              width: 42, height: 42,
              borderRadius: '10px',
              background: 'rgba(255,255,255,0.20)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', flexShrink: 0,
            }}>
              {ICONE_OPTIONS.find(i => i.value === form.icone)?.icon}
            </div>
            <div>
              <p style={{ color: '#fff', fontWeight: 800, fontSize: '15px', marginBottom: 4 }}>
                {form.titulo || 'Título do card'}
              </p>
              <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '12px', lineHeight: 1.5 }}>
                {form.descricao || 'Descrição do card aparece aqui...'}
              </p>
            </div>
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', cursor: 'pointer', fontSize: 'var(--text-sm)', color: 'var(--color-text)' }}>
            <input
              type="checkbox"
              checked={form.ativo}
              onChange={e => setForm(f => ({ ...f, ativo: e.target.checked }))}
            />
            Card ativo (visível no carrossel)
          </label>

          <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end' }}>
            <button onClick={() => setEditando(null)} className="btn btn-ghost">Cancelar</button>
            <button
              onClick={handleSave}
              disabled={!form.titulo.trim() || !form.descricao.trim()}
              className="btn btn-primary"
            >
              Salvar
            </button>
          </div>
        </div>
      )}

      {/* Lista de cards */}
      {cards.length === 0 ? (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          gap: 'var(--space-3)', padding: 'var(--space-12) var(--space-4)',
          color: 'var(--color-text-muted)', textAlign: 'center',
        }}>
          <Newspaper size={36} style={{ color: 'var(--color-text-faint)' }} aria-hidden />
          <p style={{ fontSize: 'var(--text-sm)' }}>Nenhum card criado ainda.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          {cards.map(card => (
            <div
              key={card.id}
              style={{
                display: 'flex', alignItems: 'center', gap: 'var(--space-4)',
                padding: 'var(--space-4) var(--space-5)',
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-lg)',
                opacity: card.ativo ? 1 : 0.55,
                transition: 'opacity 180ms ease',
              }}
            >
              {/* Bolinha de cor */}
              <div style={{
                width: 12, height: 40,
                borderRadius: '999px',
                background: card.cor,
                flexShrink: 0,
              }} aria-hidden />

              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-text)' }}>
                  {card.titulo}
                </p>
                <p style={{
                  fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {card.descricao}
                </p>
              </div>

              <div style={{ display: 'flex', gap: 'var(--space-1)', flexShrink: 0 }}>
                <IconBtn
                  icon={card.ativo ? <Eye size={15} aria-hidden /> : <EyeOff size={15} aria-hidden />}
                  label={card.ativo ? 'Desativar' : 'Ativar'}
                  onClick={() => toggleAtivo(card.id, card.ativo)}
                />
                <IconBtn
                  icon={<Pencil size={15} aria-hidden />}
                  label="Editar"
                  onClick={() => abrirEdicao(card)}
                />
                <IconBtn
                  icon={<Trash2 size={15} aria-hidden />}
                  label="Excluir"
                  onClick={() => handleDelete(card.id)}
                  danger
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
      <label style={{
        fontSize: 'var(--text-xs)', fontWeight: 600,
        color: 'var(--color-text-muted)',
        textTransform: 'uppercase', letterSpacing: '0.05em',
      }}>
        {label}{required && ' *'}
      </label>
      {children}
    </div>
  )
}

function IconBtn({ icon, label, onClick, danger }: {
  icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: 32, height: 32,
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--color-border)',
        background: 'transparent',
        color: 'var(--color-text-muted)',
        cursor: 'pointer',
        transition: 'all 180ms ease',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.background = danger ? 'var(--color-error-highlight)' : 'var(--color-surface-offset)'
        e.currentTarget.style.color = danger ? 'var(--color-error)' : 'var(--color-text)'
        if (danger) e.currentTarget.style.borderColor = 'var(--color-error)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = 'transparent'
        e.currentTarget.style.color = 'var(--color-text-muted)'
        e.currentTarget.style.borderColor = 'var(--color-border)'
      }}
    >
      {icon}
    </button>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: 'var(--space-3) var(--space-4)',
  borderRadius: 'var(--radius-md)',
  border: '1.5px solid var(--color-border)',
  background: 'var(--color-bg)',
  color: 'var(--color-text)',
  fontSize: 'var(--text-sm)',
  outline: 'none',
  fontFamily: 'inherit',
}
