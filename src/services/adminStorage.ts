/**
 * adminStorage
 * Camada de persistência do painel admin via localStorage.
 * Toda função aqui pode ser substituída por chamadas de API sem
 * alterar os componentes consumidores.
 */

export interface CardConteudo {
  id: string
  titulo: string
  descricao: string
  cor: string   // var(--color-*) ou hex
  icone: string // nome do ícone Lucide como string
  ativo: boolean
  ordem: number
  criadoEm: string
}

export interface PerfilAdmin {
  id: string
  nome: string
  email: string
  criadoEm: string
  membros: number
}

const KEYS = {
  cards: 'vacfamily_admin_cards',
  usuarios: 'vacfamily_usuarios_snapshot',
} as const

// ── Cards de conteúdo ────────────────────────────────────────

export function getCards(): CardConteudo[] {
  try {
    const raw = localStorage.getItem(KEYS.cards)
    if (!raw) return defaultCards()
    return JSON.parse(raw) as CardConteudo[]
  } catch { return defaultCards() }
}

export function saveCards(cards: CardConteudo[]): void {
  localStorage.setItem(KEYS.cards, JSON.stringify(cards))
}

export function createCard(data: Omit<CardConteudo, 'id' | 'criadoEm' | 'ordem'>): CardConteudo {
  const cards = getCards()
  const novo: CardConteudo = {
    ...data,
    id: crypto.randomUUID(),
    criadoEm: new Date().toISOString(),
    ordem: cards.length,
  }
  saveCards([...cards, novo])
  return novo
}

export function updateCard(id: string, data: Partial<Omit<CardConteudo, 'id' | 'criadoEm'>>): void {
  const cards = getCards().map(c => c.id === id ? { ...c, ...data } : c)
  saveCards(cards)
}

export function deleteCard(id: string): void {
  saveCards(getCards().filter(c => c.id !== id))
}

export function reorderCards(ids: string[]): void {
  const cards = getCards()
  const reordenados = ids.map((id, i) => {
    const c = cards.find(c => c.id === id)!
    return { ...c, ordem: i }
  })
  saveCards(reordenados)
}

// ── Snapshot de usuários ─────────────────────────────────────
// O front não tem acesso ao banco — os usuários se auto-registram
// e cada um persiste seus dados no localStorage com sua própria chave.
// O admin ve apenas o snapshot gerado no registro.

export function registrarSnapshotUsuario(perfil: PerfilAdmin): void {
  const lista = getSnapshotUsuarios()
  const idx = lista.findIndex(u => u.id === perfil.id)
  if (idx >= 0) lista[idx] = perfil
  else lista.push(perfil)
  localStorage.setItem(KEYS.usuarios, JSON.stringify(lista))
}

export function getSnapshotUsuarios(): PerfilAdmin[] {
  try {
    const raw = localStorage.getItem(KEYS.usuarios)
    return raw ? (JSON.parse(raw) as PerfilAdmin[]) : []
  } catch { return [] }
}

export function deleteSnapshotUsuario(id: string): void {
  const lista = getSnapshotUsuarios().filter(u => u.id !== id)
  localStorage.setItem(KEYS.usuarios, JSON.stringify(lista))
}

// ── Cards padrão ─────────────────────────────────────────────

function defaultCards(): CardConteudo[] {
  const defaults: Omit<CardConteudo, 'id' | 'criadoEm' | 'ordem'>[] = [
    {
      titulo: 'Vacinas em dia protegem a família',
      descricao: 'Manter o calendário vacinal atualizado é a forma mais eficaz de prevenir doenças graves.',
      cor: 'var(--color-primary)',
      icone: 'ShieldCheck',
      ativo: true,
    },
    {
      titulo: 'Registre cada dose',
      descricao: 'Após cada vacina aplicada, registre no app para acompanhar o histórico completo.',
      cor: 'var(--color-success)',
      icone: 'Syringe',
      ativo: true,
    },
    {
      titulo: 'Lembretes automáticos',
      descricao: 'O VacFamily gera alertas de reforço automaticamente com base nas doses registradas.',
      cor: 'var(--color-warning)',
      icone: 'Bell',
      ativo: true,
    },
    {
      titulo: 'Toda a família em um lugar',
      descricao: 'Gerencie o histórico de todos os membros da família com facilidade.',
      cor: 'var(--color-blue)',
      icone: 'Users',
      ativo: true,
    },
  ]

  const cards = defaults.map((d, i) => ({
    ...d,
    id: crypto.randomUUID(),
    criadoEm: new Date().toISOString(),
    ordem: i,
  }))

  saveCards(cards)
  return cards
}
