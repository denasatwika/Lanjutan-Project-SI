import { HttpError } from '../types/errors'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:8787'

type ErrorPayload = { error: string }

export type AllocateCutiTokensRequest = {
  tokenAmount?: number
}

export type AllocateCutiTokensResponse = {
  message: string
  txHash: string
  allocated: number
  totalTokens: number
  employees: {
    employeeId: string
    fullName: string
    walletAddress: string
    amount: number
  }[]
}

async function parseJson<T>(response: Response): Promise<T> {
  const text = await response.text()
  const data = text ? safeParseJSON(text) : undefined

  if (!response.ok) {
    const message = (data as ErrorPayload | undefined)?.error ?? response.statusText ?? 'Request failed'
    throw new HttpError(message, response.status)
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

export async function allocateCutiTokens(
  payload: AllocateCutiTokensRequest = {}
): Promise<AllocateCutiTokensResponse> {
  const response = await fetch(`${API_BASE}/admin/allocate-cuti-tokens`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  return parseJson<AllocateCutiTokensResponse>(response)
}
