/**
 * api.ts — cliente HTTP central
 * - JWT injetado automaticamente via sessionStorage (chave vf_token)
 * - wakeUpBack(): acorda o back no Render free tier, retorna Promise<boolean>
 * - apiFetch(): retry automático (até 3×, backoff 1s/2s) para erros de rede
 *   causados pelo cold start do Render (~30s)
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
 * Retorna true se o back respondeu, false se ainda dormindo/offline.
 * Timeout de 35s para cobrir o cold start típico do Render.
 */
export async function wakeUpBack(): Promise<boolean> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 35_000)
    const res = await fetch(`${BASE_URL}/health`, {
      method: 'GET',
      signal: controller.signal,
    })
    clearTimeout(timeout)
    return res.ok
  } catch {
    return false
  }
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

interface ApiOptions extends Omit<RequestInit, 'body'> {
  body?: unknown
  /** Número máximo de tentativas em caso de erro de rede. Padrão: 3 */
  retries?: number
}

export async function apiFetch<T = unknown>(
  path: string,
  options: ApiOptions = {},
): Promise<T> {
  const { body, headers: extraHeaders, retries = 3, ...rest } = options
  const token = getToken()

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(extraHeaders as Record<string, string> | undefined),
  }
  if (token) headers['Authorization'] = `Bearer ${token}`

  let attempt = 0
  while (attempt < retries) {
    try {
      const res = await fetch(`${BASE_URL}${path}`, {
        ...rest,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
      })

      if (!res.ok) {
        let message = `Erro ${res.status}`
        try {
          const err = await res.json()
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

    } catch (err) {
      const isNetworkError = err instanceof TypeError && (
        (err as TypeError).message.includes('fetch') ||
        (err as TypeError).message.includes('network') ||
        (err as TypeError).message.includes('Failed')
      )

      // Só faz retry em erros de rede (cold start), não em erros HTTP (4xx/5xx)
      const isHttpError = err instanceof Error &&
        /^Erro (4|5)\d{2}/.test((err as Error).message)

      attempt++
      if (!isNetworkError || isHttpError || attempt >= retries) throw err

      // Backoff: 1s na 1ª tentativa, 2s na 2ª
      await sleep(attempt * 1_000)
    }
  }

  throw new Error('Sem resposta do servidor após várias tentativas.')
}
