/**
 * api.ts — cliente HTTP central
 * Todas as chamadas ao backend passam por aqui.
 * O JWT é lido de sessionStorage (chave vf_token) e injetado automaticamente.
 */

const BASE_URL = import.meta.env.VITE_API_URL ?? 'https://vacfamily-back.onrender.com'

const TOKEN_KEY = 'vf_token'

export function getToken(): string | null {
  try { return sessionStorage.getItem(TOKEN_KEY) } catch { return null }
}

export function setToken(token: string): void {
  try { sessionStorage.setItem(TOKEN_KEY, token) } catch { /* noop */ }
}

export function clearToken(): void {
  try { sessionStorage.removeItem(TOKEN_KEY) } catch { /* noop */ }
}

/**
 * Acorda o back no Render (free tier hiberna após inatividade).
 * Fire-and-forget: não bloqueia nada, não falha se offline.
 */
export function wakeUpBack(): void {
  fetch(`${BASE_URL}/health`, { method: 'GET' }).catch(() => { /* noop — offline ou back dormindo */ })
}

interface ApiOptions extends Omit<RequestInit, 'body'> {
  body?: unknown
}

export async function apiFetch<T = unknown>(
  path: string,
  options: ApiOptions = {},
): Promise<T> {
  const { body, headers: extraHeaders, ...rest } = options
  const token = getToken()

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(extraHeaders as Record<string, string> | undefined),
  }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${BASE_URL}${path}`, {
    ...rest,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  if (!res.ok) {
    let message = `Erro ${res.status}`
    try {
      const err = await res.json()
      // Back retorna { errors: { campo: [msg] } } nos 400 do Zod
      if (err.errors && typeof err.errors === 'object') {
        const primeiroCampo = Object.keys(err.errors)[0]
        const msgs = err.errors[primeiroCampo]
        message = Array.isArray(msgs) && msgs.length > 0
          ? `${primeiroCampo}: ${msgs[0]}`
          : message
      } else {
        message = err.message ?? err.erro ?? message
      }
    } catch { /* ignora body não-JSON */ }
    throw new Error(message)
  }

  // 204 No Content
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}
