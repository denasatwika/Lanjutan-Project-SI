import { HttpError } from '../types/errors'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? 'http://localhost:8787'

type ErrorPayload = { error: string }

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

export type EmployeeWallet = {
  id: string
  employeeId: string
  address: `0x${string}`
  isPrimary: boolean
  isVerified: boolean
  nickname?: string | null
  walletType: string
  lastUsedAt?: string | null
  createdAt: string
  updatedAt: string
}

type GetWalletsOptions = {
  signal?: AbortSignal
  employeeId?: string
}

function buildWalletsUrl(options?: GetWalletsOptions) {
  if (!options?.employeeId) return `${API_BASE}/wallets`
  const url = new URL(`${API_BASE}/wallets`)
  url.searchParams.set('employeeId', options.employeeId)
  return url.toString()
}

export async function getWallets(options?: GetWalletsOptions): Promise<EmployeeWallet[]> {
  const response = await fetch(buildWalletsUrl(options), {
    method: 'GET',
    credentials: 'include',
    signal: options?.signal,
  })

  return parseJson<EmployeeWallet[]>(response)
}
