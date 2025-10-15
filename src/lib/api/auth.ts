const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:8787'

type ErrorPayload = { error: string }

async function parseJson<T>(response: Response): Promise<T> {
  const text = await response.text()
  const data = text ? safeParseJSON(text) : undefined

  if (!response.ok) {
    const message = (data as ErrorPayload | undefined)?.error ?? response.statusText ?? 'Request failed'
    const error = new Error(message)
    ;(error as any).status = response.status
    throw error
  }

  return data as T
}

function safeParseJSON(input: string) {
  try {
    return JSON.parse(input)
  } catch {
    return undefined
  }
}

export type NonceResponse = {
  address: string
  nonce: string
  expiresAt: string
}

export async function requestNonce(address: string): Promise<NonceResponse> {
  const url = new URL('/auth/nonce', API_BASE)
  url.searchParams.set('address', address)

  const response = await fetch(url.toString(), {
    method: 'GET',
    credentials: 'include',
  })

  return parseJson<NonceResponse>(response)
}

export async function postLogin(address: string, signature: string): Promise<void> {
  const response = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ address, signature }),
  })

  await parseJson<{ ok: true }>(response)
}

type SessionResponse = {
  user: {
    id: string
    address: string
    role: 'requester' | 'approver'
    name?: string
    department?: string
  }
}

export async function getSession(): Promise<SessionResponse | null> {
  const response = await fetch(`${API_BASE}/auth/me`, {
    method: 'GET',
    credentials: 'include',
  })

  if (response.status === 401) {
    return null
  }

  return parseJson<SessionResponse>(response)
}

export async function postLogout(): Promise<void> {
  const response = await fetch(`${API_BASE}/auth/logout`, {
    method: 'POST',
    credentials: 'include',
  })

  await parseJson<{ ok: true }>(response)
}
