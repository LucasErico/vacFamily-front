/**
 * adminStorage
 * Camada de acesso a dados do painel admin.
 *
 * Cards: consome a API REST /conteudo (banco remoto).
 * Snapshot de usuários: mantido em sessionStorage (somente leitura local).
 *
 * IMPORTANTE: cores dos cards devem ser HEX (não CSS vars), pois
 * são usadas em style={{ background: card.cor }} — CSS vars não
 * resolvem em propriedades inline fora do escopo de variáveis.
 */
import { apiFetch } from './api'

export interface CardConteudo {
  id: string
  titulo: string
  descricao: string
  cor: string    // hex obrigatório
  icone: string  // nome do ícone Lucide como string
  ativo: boolean
  ordem: number
  criado_em?: string
}

export interface PerfilAdmin {
  id: string
  nome: string
  email: string
  criadoEm: string
  membros: number
}

// ── Cards de conteúdo (API remota) ────────────────────────────

/** Lista todos os cards (ativos + inativos) para o painel admin */
export async function getCardsAdmin(): Promise<CardConteudo[]> {
  const res = await apiFetch<{ cards: CardConteudo[] }>('/conteudo/admin')
  return res.cards.sort((a, b) => a.ordem - b.ordem)
}

/** Lista apenas cards ativos (para o Dashboard) */
export async function getCardsPublicos(): Promise<CardConteudo[]> {
  const res = await apiFetch<{ cards: CardConteudo[] }>('/conteudo')
  return res.cards
}

export async function createCard(
  data: Omit<CardConteudo, 'id' | 'criado_em'>
): Promise<CardConteudo> {
  const res = await apiFetch<{ card: CardConteudo }>('/conteudo', {
    method: 'POST',
    body: data,
  })
  return res.card
}

export async function updateCard(
  id: string,
  data: Partial<Omit<CardConteudo, 'id' | 'criado_em'>>
): Promise<CardConteudo> {
  const res = await apiFetch<{ card: CardConteudo }>(`/conteudo/${id}`, {
    method: 'PUT',
    body: data,
  })
  return res.card
}

export async function deleteCard(id: string): Promise<void> {
  await apiFetch(`/conteudo/${id}`, { method: 'DELETE' })
}

// ── Snapshot de usuários (sessionStorage local) ───────────────

const KEY_USUARIOS = 'vacfamily_usuarios_snapshot'

export function registrarSnapshotUsuario(perfil: PerfilAdmin): void {
  const lista = getSnapshotUsuarios()
  const idx = lista.findIndex(u => u.id === perfil.id)
  if (idx >= 0) lista[idx] = perfil
  else lista.push(perfil)
  try { sessionStorage.setItem(KEY_USUARIOS, JSON.stringify(lista)) } catch { /* noop */ }
}

export function getSnapshotUsuarios(): PerfilAdmin[] {
  try {
    const raw = sessionStorage.getItem(KEY_USUARIOS)
    return raw ? (JSON.parse(raw) as PerfilAdmin[]) : []
  } catch { return [] }
}

export function deleteSnapshotUsuario(id: string): void {
  const lista = getSnapshotUsuarios().filter(u => u.id !== id)
  try { sessionStorage.setItem(KEY_USUARIOS, JSON.stringify(lista)) } catch { /* noop */ }
}
